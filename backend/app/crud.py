import calendar
import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas


def to_cents(amount: float) -> int:
    return int(Decimal(str(amount)).quantize(Decimal("0.01")) * 100)


def to_major(cents: int | None) -> float:
    return round((cents or 0) / 100, 2)


def list_transactions(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    tx_type: str | None = None,
    category: str | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
) -> list[models.Transaction]:
    stmt = select(models.Transaction).order_by(
        models.Transaction.date.desc(), models.Transaction.id.desc()
    )
    if tx_type:
        stmt = stmt.where(models.Transaction.type == tx_type)
    if category:
        stmt = stmt.where(models.Transaction.category == category)
    if date_from:
        stmt = stmt.where(models.Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(models.Transaction.date <= date_to)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


def get_transaction(db: Session, tx_id: int) -> models.Transaction | None:
    return db.get(models.Transaction, tx_id)


def create_transaction(
    db: Session, data: schemas.TransactionCreate
) -> models.Transaction:
    tx = models.Transaction(
        type=data.type.value,
        amount_cents=to_cents(data.amount),
        category=data.category,
        description=data.description,
        date=data.date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def update_transaction(
    db: Session, tx: models.Transaction, data: schemas.TransactionUpdate
) -> models.Transaction:
    updates = data.model_dump(exclude_unset=True)
    if "amount" in updates:
        tx.amount_cents = to_cents(updates.pop("amount"))
    if "type" in updates and updates["type"] is not None:
        updates["type"] = updates["type"].value
    for field, value in updates.items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, tx: models.Transaction) -> None:
    db.delete(tx)
    db.commit()


def list_categories(
    db: Session, tx_type: str | None = None
) -> list[str]:
    stmt = select(models.Transaction.category).distinct()
    if tx_type:
        stmt = stmt.where(models.Transaction.type == tx_type)
    stmt = stmt.order_by(models.Transaction.category)
    return list(db.scalars(stmt))


# ---------- Budgets ----------


def list_budgets(db: Session) -> list[models.Budget]:
    return list(db.scalars(select(models.Budget).order_by(models.Budget.category)))


def get_budget(db: Session, budget_id: int) -> models.Budget | None:
    return db.get(models.Budget, budget_id)


def get_budget_by_category(
    db: Session, category: str
) -> models.Budget | None:
    return db.scalar(select(models.Budget).where(models.Budget.category == category))


def create_budget(db: Session, data: schemas.BudgetCreate) -> models.Budget:
    budget = models.Budget(
        category=data.category,
        monthly_limit_cents=to_cents(data.monthly_limit),
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def update_budget(
    db: Session, budget: models.Budget, data: schemas.BudgetUpdate
) -> models.Budget:
    updates = data.model_dump(exclude_unset=True)
    if "monthly_limit" in updates:
        budget.monthly_limit_cents = to_cents(updates.pop("monthly_limit"))
    for field, value in updates.items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(db: Session, budget: models.Budget) -> None:
    db.delete(budget)
    db.commit()


def spent_this_month(
    db: Session,
    category: str,
    month_start: datetime.date,
) -> float:
    last_day = calendar.monthrange(month_start.year, month_start.month)[1]
    month_end_exclusive = month_start.replace(day=last_day) + datetime.timedelta(
        days=1
    )
    total = db.scalar(
        select(func.coalesce(func.sum(models.Transaction.amount_cents), 0)).where(
            models.Transaction.type == "expense",
            models.Transaction.category == category,
            models.Transaction.date >= month_start,
            models.Transaction.date < month_end_exclusive,
        )
    )
    return to_major(total)
