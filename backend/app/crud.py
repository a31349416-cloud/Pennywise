import calendar
import datetime
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from . import models, schemas


def to_cents(amount: float) -> int:
    return int(Decimal(str(amount)).quantize(Decimal("0.01")) * 100)


def to_major(cents: int | None) -> float:
    return round((cents or 0) / 100, 2)


def list_transactions(
    db: Session,
    *,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    tx_type: str | None = None,
    category: str | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
) -> list[models.Transaction]:
    stmt = (
        select(models.Transaction)
        .where(models.Transaction.user_id == user_id)
        .order_by(models.Transaction.date.desc(), models.Transaction.id.desc())
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


def get_transaction(db: Session, tx_id: int, user_id: int) -> models.Transaction | None:
    tx = db.get(models.Transaction, tx_id)
    if tx is None or tx.user_id != user_id:
        return None
    return tx


def create_transaction(
    db: Session, data: schemas.TransactionCreate, user_id: int
) -> models.Transaction:
    tx = models.Transaction(
        user_id=user_id,
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
    db: Session, user_id: int, tx_type: str | None = None
) -> list[str]:
    stmt = (
        select(models.Transaction.category)
        .where(models.Transaction.user_id == user_id)
        .distinct()
    )
    if tx_type:
        stmt = stmt.where(models.Transaction.type == tx_type)
    stmt = stmt.order_by(models.Transaction.category)
    return list(db.scalars(stmt))


# ---------- Budgets ----------


def list_budgets(db: Session, user_id: int) -> list[models.Budget]:
    return list(
        db.scalars(
            select(models.Budget)
            .where(models.Budget.user_id == user_id)
            .order_by(models.Budget.category)
        )
    )


def get_budget(db: Session, budget_id: int, user_id: int) -> models.Budget | None:
    budget = db.get(models.Budget, budget_id)
    if budget is None or budget.user_id != user_id:
        return None
    return budget


def get_budget_by_category(
    db: Session, category: str, user_id: int
) -> models.Budget | None:
    return db.scalar(
        select(models.Budget).where(
            models.Budget.category == category,
            models.Budget.user_id == user_id,
        )
    )


def create_budget(db: Session, data: schemas.BudgetCreate, user_id: int) -> models.Budget:
    budget = models.Budget(
        user_id=user_id,
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
    user_id: int,
) -> float:
    last_day = calendar.monthrange(month_start.year, month_start.month)[1]
    month_end_exclusive = month_start.replace(day=last_day) + datetime.timedelta(
        days=1
    )
    total = db.scalar(
        select(func.coalesce(func.sum(models.Transaction.amount_cents), 0)).where(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "expense",
            models.Transaction.category == category,
            models.Transaction.date >= month_start,
            models.Transaction.date < month_end_exclusive,
        )
    )
    return to_major(total)


# ---------- Accounts ----------


def list_accounts(db: Session, user_id: int) -> list[models.Account]:
    return list(
        db.scalars(
            select(models.Account)
            .where(models.Account.user_id == user_id)
            .order_by(models.Account.name)
        )
    )


def get_account(db: Session, account_id: int, user_id: int) -> models.Account | None:
    acc = db.get(models.Account, account_id)
    if acc is None or acc.user_id != user_id:
        return None
    return acc


def create_account(db: Session, data: schemas.AccountCreate, user_id: int) -> models.Account:
    acc = models.Account(
        user_id=user_id,
        name=data.name,
        type=data.type,
        balance_cents=to_cents(data.balance),
        currency=data.currency,
        icon=data.icon,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


def update_account(db: Session, acc: models.Account, data: schemas.AccountUpdate) -> models.Account:
    updates = data.model_dump(exclude_unset=True)
    if "balance" in updates:
        acc.balance_cents = to_cents(updates.pop("balance"))
    for field, value in updates.items():
        setattr(acc, field, value)
    db.commit()
    db.refresh(acc)
    return acc


def delete_account(db: Session, acc: models.Account) -> None:
    db.delete(acc)
    db.commit()


# ---------- Tags ----------


def list_tags(db: Session, user_id: int) -> list[models.Tag]:
    return list(
        db.scalars(
            select(models.Tag)
            .where(models.Tag.user_id == user_id)
            .order_by(models.Tag.name)
        )
    )


def get_tag(db: Session, tag_id: int, user_id: int) -> models.Tag | None:
    tag = db.get(models.Tag, tag_id)
    if tag is None or tag.user_id != user_id:
        return None
    return tag


def create_tag(db: Session, data: schemas.TagCreate, user_id: int) -> models.Tag:
    tag = models.Tag(user_id=user_id, name=data.name, color=data.color)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: models.Tag) -> None:
    db.execute(
        delete(models.TransactionTag).where(models.TransactionTag.tag_id == tag.id)
    )
    db.delete(tag)
    db.commit()


def set_transaction_tags(db: Session, tx_id: int, tag_ids: list[int]) -> None:
    db.execute(
        delete(models.TransactionTag).where(models.TransactionTag.transaction_id == tx_id)
    )
    for tag_id in tag_ids:
        db.execute(
            models.TransactionTag.__table__.insert().values(
                transaction_id=tx_id, tag_id=tag_id
            )
        )
    db.commit()


def get_transaction_tags(db: Session, tx_id: int) -> list[int]:
    return list(
        db.scalars(
            select(models.TransactionTag.tag_id).where(
                models.TransactionTag.transaction_id == tx_id
            )
        )
    )


# ---------- Recurring Transactions ----------


def list_recurring(db: Session, user_id: int) -> list[models.RecurringTransaction]:
    return list(
        db.scalars(
            select(models.RecurringTransaction)
            .where(models.RecurringTransaction.user_id == user_id)
            .order_by(models.RecurringTransaction.next_date)
        )
    )


def get_recurring(db: Session, rec_id: int, user_id: int) -> models.RecurringTransaction | None:
    rec = db.get(models.RecurringTransaction, rec_id)
    if rec is None or rec.user_id != user_id:
        return None
    return rec


def create_recurring(db: Session, data: schemas.RecurringCreate, user_id: int) -> models.RecurringTransaction:
    rec = models.RecurringTransaction(
        user_id=user_id,
        type=data.type.value,
        amount_cents=to_cents(data.amount),
        category=data.category,
        description=data.description,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
        next_date=data.next_date,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def update_recurring(db: Session, rec: models.RecurringTransaction, data: schemas.RecurringUpdate) -> models.RecurringTransaction:
    updates = data.model_dump(exclude_unset=True)
    if "amount" in updates:
        rec.amount_cents = to_cents(updates.pop("amount"))
    if "type" in updates and updates["type"] is not None:
        updates["type"] = updates["type"].value
    for field, value in updates.items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


def delete_recurring(db: Session, rec: models.RecurringTransaction) -> None:
    db.delete(rec)
    db.commit()


def process_recurring(db: Session, user_id: int) -> int:
    """Create transactions from due recurring items and advance next_date."""
    import datetime as _dt
    today = _dt.date.today()
    due = list(
        db.scalars(
            select(models.RecurringTransaction).where(
                models.RecurringTransaction.user_id == user_id,
                models.RecurringTransaction.active == True,
                models.RecurringTransaction.next_date <= today,
            )
        )
    )
    count = 0
    for rec in due:
        tx = models.Transaction(
            user_id=user_id,
            type=rec.type,
            amount_cents=rec.amount_cents,
            category=rec.category,
            description=rec.description,
            date=rec.next_date,
        )
        db.add(tx)
        if rec.frequency == "daily":
            rec.next_date = rec.next_date + _dt.timedelta(days=1)
        elif rec.frequency == "weekly":
            rec.next_date = rec.next_date + _dt.timedelta(weeks=1)
        elif rec.frequency == "monthly":
            m = rec.next_date.month + 1
            y = rec.next_date.year
            if m > 12:
                m = 1
                y += 1
            d = min(rec.day_of_month or rec.next_date.day, 28)
            rec.next_date = _dt.date(y, m, d)
        elif rec.frequency == "yearly":
            rec.next_date = rec.next_date.replace(year=rec.next_date.year + 1)
        count += 1
    db.commit()
    return count


# ---------- Savings Goals ----------


def list_goals(db: Session, user_id: int) -> list[models.SavingsGoal]:
    return list(
        db.scalars(
            select(models.SavingsGoal)
            .where(models.SavingsGoal.user_id == user_id)
            .order_by(models.SavingsGoal.name)
        )
    )


def get_goal(db: Session, goal_id: int, user_id: int) -> models.SavingsGoal | None:
    goal = db.get(models.SavingsGoal, goal_id)
    if goal is None or goal.user_id != user_id:
        return None
    return goal


def create_goal(db: Session, data: schemas.GoalCreate, user_id: int) -> models.SavingsGoal:
    goal = models.SavingsGoal(
        user_id=user_id,
        name=data.name,
        target_cents=to_cents(data.target),
        deadline=data.deadline,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update_goal(db: Session, goal: models.SavingsGoal, data: schemas.GoalUpdate) -> models.SavingsGoal:
    updates = data.model_dump(exclude_unset=True)
    if "target" in updates:
        goal.target_cents = to_cents(updates.pop("target"))
    if "current" in updates:
        goal.current_cents = to_cents(updates.pop("current"))
    for field, value in updates.items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, goal: models.SavingsGoal) -> None:
    db.delete(goal)
    db.commit()


# ---------- Reminders ----------


def list_reminders(db: Session, user_id: int) -> list[models.Reminder]:
    return list(
        db.scalars(
            select(models.Reminder)
            .where(models.Reminder.user_id == user_id)
            .order_by(models.Reminder.remind_date)
        )
    )


def get_reminder(db: Session, reminder_id: int, user_id: int) -> models.Reminder | None:
    rem = db.get(models.Reminder, reminder_id)
    if rem is None or rem.user_id != user_id:
        return None
    return rem


def create_reminder(db: Session, data: schemas.ReminderCreate, user_id: int) -> models.Reminder:
    rem = models.Reminder(
        user_id=user_id,
        title=data.title,
        amount_cents=to_cents(data.amount),
        remind_date=data.remind_date,
        repeat=data.repeat,
    )
    db.add(rem)
    db.commit()
    db.refresh(rem)
    return rem


def update_reminder(db: Session, rem: models.Reminder, data: schemas.ReminderUpdate) -> models.Reminder:
    updates = data.model_dump(exclude_unset=True)
    if "amount" in updates:
        rem.amount_cents = to_cents(updates.pop("amount"))
    for field, value in updates.items():
        setattr(rem, field, value)
    db.commit()
    db.refresh(rem)
    return rem


def delete_reminder(db: Session, rem: models.Reminder) -> None:
    db.delete(rem)
    db.commit()


def upcoming_reminders(db: Session, user_id: int, days: int = 7) -> list[models.Reminder]:
    import datetime as _dt
    today = _dt.date.today()
    until = today + _dt.timedelta(days=days)
    return list(
        db.scalars(
            select(models.Reminder).where(
                models.Reminder.user_id == user_id,
                models.Reminder.active == True,
                models.Reminder.remind_date >= today,
                models.Reminder.remind_date <= until,
            )
        )
    )


# ---------- Shared Access ----------


def list_shared(db: Session, user_id: int) -> list[models.SharedAccess]:
    return list(
        db.scalars(
            select(models.SharedAccess)
            .where(models.SharedAccess.owner_id == user_id)
        )
    )


def create_shared(db: Session, data: schemas.SharedAccessCreate, user_id: int) -> models.SharedAccess:
    shared = models.SharedAccess(
        owner_id=user_id,
        shared_with_email=data.email,
        permission=data.permission,
    )
    db.add(shared)
    db.commit()
    db.refresh(shared)
    return shared


def delete_shared(db: Session, shared_id: int, user_id: int) -> None:
    shared = db.get(models.SharedAccess, shared_id)
    if shared and shared.owner_id == user_id:
        db.delete(shared)
        db.commit()


def user_has_access(db: Session, email: str, owner_id: int) -> models.SharedAccess | None:
    return db.scalar(
        select(models.SharedAccess).where(
            models.SharedAccess.owner_id == owner_id,
            models.SharedAccess.shared_with_email == email,
        )
    )
