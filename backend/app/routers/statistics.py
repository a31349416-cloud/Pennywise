import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import crud
from ..auth import get_current_user
from ..database import get_db
from ..models import Transaction, User

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


def _period_filter(stmt, date_from: datetime.date | None, date_to: datetime.date | None):
    if date_from:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.date <= date_to)
    return stmt


@router.get("/summary")
def summary(
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    member: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ids = crud.get_family_user_ids(db, user.id)
    base_stmt = select(Transaction).where(
        Transaction.user_id.in_(ids) if len(ids) > 1 else Transaction.user_id == ids[0]
    )
    if member:
        base_stmt = base_stmt.where(Transaction.member == member)
    base = _period_filter(base_stmt, date_from, date_to).subquery()
    income = db.scalar(
        select(func.coalesce(func.sum(base.c.amount_cents), 0)).where(
            base.c.type == "income"
        )
    )
    expense = db.scalar(
        select(func.coalesce(func.sum(base.c.amount_cents), 0)).where(
            base.c.type == "expense"
        )
    )
    count = db.scalar(select(func.count()).select_from(base))
    income = round(int(income or 0) / 100, 2)
    expense = round(int(expense or 0) / 100, 2)
    return {
        "income": income,
        "expense": expense,
        "balance": round(income - expense, 2),
        "count": int(count or 0),
    }


@router.get("/by-category")
def by_category(
    type: str = Query("expense", pattern="^(income|expense)$"),
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    member: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ids = crud.get_family_user_ids(db, user.id)
    base_where = (
        (Transaction.user_id.in_(ids) if len(ids) > 1 else Transaction.user_id == ids[0]),
    )
    stmt = _period_filter(
        select(
            Transaction.category,
            func.sum(Transaction.amount_cents).label("total_cents"),
        ).where(Transaction.type == type, *base_where),
        date_from,
        date_to,
    )
    if member:
        stmt = stmt.where(Transaction.member == member)
    rows = db.execute(
        stmt.group_by(Transaction.category).order_by(func.sum(Transaction.amount_cents).desc())
    ).all()
    return [
        {"category": r[0], "total": round(int(r[1] or 0) / 100, 2)} for r in rows
    ]


@router.get("/monthly")
def monthly(
    months: int = Query(6, ge=1, le=24),
    member: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.date.today()
    first_of_month = today.replace(day=1)
    start_year, start_month = first_of_month.year, first_of_month.month
    for _ in range(months - 1):
        start_month -= 1
        if start_month == 0:
            start_month = 12
            start_year -= 1
    start_date = datetime.date(start_year, start_month, 1)

    ids = crud.get_family_user_ids(db, user.id)
    user_filter = Transaction.user_id.in_(ids) if len(ids) > 1 else Transaction.user_id == ids[0]
    month_expr = func.strftime("%Y-%m", Transaction.date).label("month")
    stmt = (
        select(
            month_expr,
            Transaction.type,
            func.sum(Transaction.amount_cents).label("total_cents"),
        )
        .where(Transaction.date >= start_date, user_filter)
        .group_by(month_expr, Transaction.type)
        .order_by(month_expr)
    )
    if member:
        stmt = stmt.where(Transaction.member == member)
    data: dict[str, dict[str, float]] = {}
    for month, tx_type, total_cents in db.execute(stmt).all():
        data.setdefault(month, {"income": 0.0, "expense": 0.0})[tx_type] = round(
            int(total_cents or 0) / 100, 2
        )
    return [
        {"month": m, "income": v["income"], "expense": v["expense"]}
        for m, v in sorted(data.items())
    ]


@router.get("/yearly")
def yearly(
    years: int = Query(3, ge=1, le=10),
    member: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.date.today()
    start_date = datetime.date(today.year - years + 1, 1, 1)
    ids = crud.get_family_user_ids(db, user.id)
    user_filter = Transaction.user_id.in_(ids) if len(ids) > 1 else Transaction.user_id == ids[0]
    month_expr = func.strftime("%Y-%m", Transaction.date).label("month")
    stmt = (
        select(
            month_expr,
            Transaction.type,
            func.sum(Transaction.amount_cents).label("total_cents"),
        )
        .where(Transaction.date >= start_date, user_filter)
        .group_by(month_expr, Transaction.type)
        .order_by(month_expr)
    )
    if member:
        stmt = stmt.where(Transaction.member == member)
    data: dict[str, dict[str, float]] = {}
    for month, tx_type, total_cents in db.execute(stmt).all():
        data.setdefault(month, {"income": 0.0, "expense": 0.0})[tx_type] = round(
            int(total_cents or 0) / 100, 2
        )
    return [
        {"month": m, "income": v["income"], "expense": v["expense"]}
        for m, v in sorted(data.items())
    ]


@router.get("/category-trend")
def category_trend(
    category: str,
    months: int = Query(6, ge=1, le=24),
    member: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.date.today()
    first_of_month = today.replace(day=1)
    start_year, start_month = first_of_month.year, first_of_month.month
    for _ in range(months - 1):
        start_month -= 1
        if start_month == 0:
            start_month = 12
            start_year -= 1
    start_date = datetime.date(start_year, start_month, 1)
    ids = crud.get_family_user_ids(db, user.id)
    user_filter = Transaction.user_id.in_(ids) if len(ids) > 1 else Transaction.user_id == ids[0]
    month_expr = func.strftime("%Y-%m", Transaction.date).label("month")
    stmt = (
        select(
            month_expr,
            func.sum(Transaction.amount_cents).label("total_cents"),
        )
        .where(
            user_filter,
            Transaction.type == "expense",
            Transaction.category == category,
            Transaction.date >= start_date,
        )
        .group_by(month_expr)
        .order_by(month_expr)
    )
    if member:
        stmt = stmt.where(Transaction.member == member)
    return [
        {"month": m, "total": round(int(cents or 0) / 100, 2)}
        for m, cents in db.execute(stmt).all()
    ]
