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


def _register_and_login(client: TestClient) -> str:
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123"},
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    return res.json()["access_token"]


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_register_and_login(client):
    reg = client.post(
        "/api/auth/register",
        json={"email": "user@test.com", "password": "pass1234"},
    )
    assert reg.status_code == 201
    assert reg.json()["email"] == "user@test.com"

    login = client.post(
        "/api/auth/login",
        json={"email": "user@test.com", "password": "pass1234"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_duplicate_registration(client):
    client.post(
        "/api/auth/register",
        json={"email": "dup@test.com", "password": "pass1234"},
    )
    dup = client.post(
        "/api/auth/register",
        json={"email": "dup@test.com", "password": "pass1234"},
    )
    assert dup.status_code == 409


def test_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "user@test.com", "password": "pass1234"},
    )
    res = client.post(
        "/api/auth/login",
        json={"email": "user@test.com", "password": "wrong"},
    )
    assert res.status_code == 401


def test_protected_endpoint_without_token(client):
    assert client.get("/api/transactions").status_code == 401


def test_me_endpoint(client):
    token = _register_and_login(client)
    me = client.get("/api/auth/me", headers=_auth_header(token))
    assert me.status_code == 200
    assert me.json()["email"] == "test@example.com"


def test_transaction_crud_cycle(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    created = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 25.5,
            "category": "Food",
            "description": "Lunch",
            "date": "2026-08-21",
        },
        headers=h,
    )
    assert created.status_code == 201
    tx = created.json()
    assert tx["amount"] == 25.5 and tx["type"] == "expense"

    updated = client.patch(
        f"/api/transactions/{tx['id']}", json={"amount": 30.0}, headers=h
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 30.0

    listed = client.get("/api/transactions", headers=h).json()
    assert len(listed) == 1

    deleted = client.delete(f"/api/transactions/{tx['id']}", headers=h)
    assert deleted.status_code == 204
    assert client.get("/api/transactions", headers=h).json() == []


def test_transaction_validation(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    assert client.post(
        "/api/transactions",
        json={"type": "expense", "amount": -5, "category": "Food", "date": "2026-08-01"},
        headers=h,
    ).status_code == 422
    assert client.post(
        "/api/transactions",
        json={"type": "unknown", "amount": 5, "category": "Food", "date": "2026-08-01"},
        headers=h,
    ).status_code == 422
    assert client.get("/api/transactions/999", headers=h).status_code == 404


def test_filters(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 100, "category": "Salary", "date": "2026-07-01"},
        headers=h,
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 10, "category": "Food", "date": "2026-08-15"},
        headers=h,
    )
    assert len(client.get("/api/transactions", params={"type": "income"}, headers=h).json()) == 1
    assert (
        len(client.get("/api/transactions", params={"date_to": "2026-07-31"}, headers=h).json())
        == 1
    )
    assert client.get("/api/transactions/categories", headers=h).json() == ["Food", "Salary"]


def test_statistics_summary_and_breakdown(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    today = datetime.date.today().isoformat()
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 3000, "category": "Salary", "date": today},
        headers=h,
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 800, "category": "Food", "date": today},
        headers=h,
    )
    summary = client.get("/api/statistics/summary", headers=h).json()
    assert summary["income"] == 3000
    assert summary["expense"] == 800
    assert summary["balance"] == 2200
    assert summary["count"] == 2

    by_category = client.get("/api/statistics/by-category", headers=h).json()
    assert by_category == [{"category": "Food", "total": 800}]


def test_budget_lifecycle_and_spent(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    today = datetime.date.today()
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 300,
            "category": "Food",
            "date": today.isoformat(),
        },
        headers=h,
    )

    created = client.post(
        "/api/budgets", json={"category": "Food", "monthly_limit": 1000}, headers=h
    )
    assert created.status_code == 201
    assert created.json()["spent"] == 300

    duplicate = client.post(
        "/api/budgets", json={"category": "Food", "monthly_limit": 500}, headers=h
    )
    assert duplicate.status_code == 409

    budgets = client.get("/api/budgets", headers=h).json()
    assert budgets[0]["monthly_limit"] == 1000

    patched = client.patch(
        f"/api/budgets/{budgets[0]['id']}", json={"monthly_limit": 200}, headers=h
    )
    assert patched.json()["monthly_limit"] == 200

    assert (
        client.delete(f"/api/budgets/{budgets[0]['id']}", headers=h).status_code == 204
    )


def test_money_rounding_in_cents(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 10.1, "category": "Food", "date": "2026-08-01"},
        headers=h,
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 20.2, "category": "Food", "date": "2026-08-02"},
        headers=h,
    )
    summary = client.get("/api/statistics/summary", headers=h).json()
    assert summary["expense"] == 30.3

    by_category = client.get("/api/statistics/by-category", headers=h).json()
    assert by_category == [{"category": "Food", "total": 30.3}]


def test_csv_export_import_roundtrip(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 50, "category": "Food", "date": "2026-08-01"},
        headers=h,
    )
    export = client.get("/api/csv/export", headers=h)
    assert export.status_code == 200
    csv_text = export.text

    imported = client.post(
        "/api/csv/import",
        files={"file": ("data.csv", csv_text.encode(), "text/csv")},
        headers=h,
    )
    assert imported.status_code == 200
    assert imported.json()["imported"] == 1
    assert len(client.get("/api/transactions", headers=h).json()) == 2


def test_csv_import_skips_invalid_rows(client):
    token = _register_and_login(client)
    h = _auth_header(token)

    bad_csv = (
        "type,amount,category,description,date\n"
        "expense,50,Food,,2026-08-01\n"
        "expense,bad,Food,,2026-08-01\n"
        "unknown,50,Food,,2026-08-01\n"
    )
    result = client.post(
        "/api/csv/import",
        files={"file": ("bad.csv", bad_csv.encode(), "text/csv")},
        headers=h,
    )
    assert result.json() == {"imported": 1, "skipped": 2}


def test_user_data_isolation(client):
    token1 = _register_and_login(client)
    h1 = _auth_header(token1)

    client.post(
        "/api/auth/register",
        json={"email": "user2@test.com", "password": "pass1234"},
    )
    res2 = client.post(
        "/api/auth/login",
        json={"email": "user2@test.com", "password": "pass1234"},
    )
    h2 = _auth_header(res2.json()["access_token"])

    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 500, "category": "Salary", "date": "2026-08-01"},
        headers=h1,
    )

    assert len(client.get("/api/transactions", headers=h1).json()) == 1
    assert len(client.get("/api/transactions", headers=h2).json()) == 0
