import datetime

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    SessionLocal().close()


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_transaction_crud_cycle(client):
    created = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 25.5,
            "category": "Food",
            "description": "Lunch",
            "date": "2026-08-21",
        },
    )
    assert created.status_code == 201
    tx = created.json()
    assert tx["amount"] == 25.5 and tx["type"] == "expense"

    updated = client.patch(
        f"/api/transactions/{tx['id']}", json={"amount": 30.0}
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 30.0

    listed = client.get("/api/transactions").json()
    assert len(listed) == 1

    deleted = client.delete(f"/api/transactions/{tx['id']}")
    assert deleted.status_code == 204
    assert client.get("/api/transactions").json() == []


def test_transaction_validation(client):
    assert client.post(
        "/api/transactions",
        json={"type": "expense", "amount": -5, "category": "Food", "date": "2026-08-01"},
    ).status_code == 422
    assert client.post(
        "/api/transactions",
        json={"type": "unknown", "amount": 5, "category": "Food", "date": "2026-08-01"},
    ).status_code == 422
    assert client.get("/api/transactions/999").status_code == 404


def test_filters(client):
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 100, "category": "Salary", "date": "2026-07-01"},
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 10, "category": "Food", "date": "2026-08-15"},
    )
    assert len(client.get("/api/transactions", params={"type": "income"}).json()) == 1
    assert (
        len(client.get("/api/transactions", params={"date_to": "2026-07-31"}).json())
        == 1
    )
    assert client.get("/api/transactions/categories").json() == ["Food", "Salary"]


def test_statistics_summary_and_breakdown(client):
    today = datetime.date.today().isoformat()
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 3000, "category": "Salary", "date": today},
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 800, "category": "Food", "date": today},
    )
    summary = client.get("/api/statistics/summary").json()
    assert summary["income"] == 3000
    assert summary["expense"] == 800
    assert summary["balance"] == 2200
    assert summary["count"] == 2

    by_category = client.get("/api/statistics/by-category").json()
    assert by_category == [{"category": "Food", "total": 800}]


def test_budget_lifecycle_and_spent(client):
    today = datetime.date.today()
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 300,
            "category": "Food",
            "date": today.isoformat(),
        },
    )

    created = client.post(
        "/api/budgets", json={"category": "Food", "monthly_limit": 1000}
    )
    assert created.status_code == 201
    assert created.json()["spent"] == 300

    duplicate = client.post(
        "/api/budgets", json={"category": "Food", "monthly_limit": 500}
    )
    assert duplicate.status_code == 409

    budgets = client.get("/api/budgets").json()
    assert budgets[0]["monthly_limit"] == 1000

    patched = client.patch(f"/api/budgets/{budgets[0]['id']}", json={"monthly_limit": 200})
    assert patched.json()["monthly_limit"] == 200

    assert (
        client.delete(f"/api/budgets/{budgets[0]['id']}").status_code == 204
    )


def test_csv_export_import_roundtrip(client):
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 50, "category": "Food", "date": "2026-08-01"},
    )
    export = client.get("/api/csv/export")
    assert export.status_code == 200
    csv_text = export.text

    imported = client.post(
        "/api/csv/import",
        files={"file": ("data.csv", csv_text.encode(), "text/csv")},
    )
    assert imported.status_code == 200
    assert imported.json()["imported"] == 1
    assert len(client.get("/api/transactions").json()) == 2


def test_csv_import_skips_invalid_rows(client):
    bad_csv = (
        "type,amount,category,description,date\n"
        "expense,50,Food,,2026-08-01\n"
        "expense,bad,Food,,2026-08-01\n"
        "unknown,50,Food,,2026-08-01\n"
    )
    result = client.post(
        "/api/csv/import",
        files={"file": ("bad.csv", bad_csv.encode(), "text/csv")},
    )
    assert result.json() == {"imported": 1, "skipped": 2}
