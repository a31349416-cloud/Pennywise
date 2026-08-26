import calendar
import datetime
import secrets
import string
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from . import models, schemas


def to_cents(amount: float) -> int:
    return int(Decimal(str(amount)).quantize(Decimal("0.01")) * 100)


def to_major(cents: int | None) -> float:
    return round((cents or 0) / 100, 2)


def get_family_user_ids(db: Session, user_id: int) -> list[int]:
    """Return all user ids in the same family, or just the user if no family."""
    user = db.get(models.User, user_id)
    if user is None or user.family_id is None:
        return [user_id]
    rows = db.scalars(select(models.User.id).where(models.User.family_id == user.family_id))
    ids = list(rows)
    return ids if ids else [user_id]


def _family_filter(column, user_id: int, db: Session):
    ids = get_family_user_ids(db, user_id)
    if len(ids) == 1:
        return column == ids[0]
    return column.in_(ids)


def _adjust_account_balance(
    account: models.Account, tx_type: str, amount_cents: int, *, reverse: bool = False
) -> None:
    """Apply or revert a transaction's effect on an account balance."""
    if tx_type == "income":
        account.balance_cents += -amount_cents if reverse else amount_cents
    else:  # expense
        account.balance_cents += amount_cents if reverse else -amount_cents


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
    account_id: int | None = None,
    member: str | None = None,
) -> list[models.Transaction]:
    stmt = (
        select(models.Transaction)
        .where(_family_filter(models.Transaction.user_id, user_id, db))
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
    if account_id is not None:
        stmt = stmt.where(models.Transaction.account_id == account_id)
    if member is not None:
        stmt = stmt.where(models.Transaction.member == member)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


def get_transaction(db: Session, tx_id: int, user_id: int) -> models.Transaction | None:
    tx = db.get(models.Transaction, tx_id)
    if tx is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if tx.user_id not in allowed:
        return None
    return tx


def create_transaction(
    db: Session, data: schemas.TransactionCreate, user_id: int
) -> models.Transaction:
    # Validate account ownership if account_id is provided (family accounts are shared).
    if data.account_id is not None:
        acc = db.get(models.Account, data.account_id)
        if acc is None:
            raise ValueError("Account not found")
        allowed_acc = get_family_user_ids(db, user_id)
        if acc.user_id not in allowed_acc:
            raise ValueError("Account not found")
    tx = models.Transaction(
        user_id=user_id,
        type=data.type.value,
        amount_cents=to_cents(data.amount),
        category=data.category,
        description=data.description,
        date=data.date,
        account_id=data.account_id,
        member=data.member,
    )
    db.add(tx)
    # Update linked account balance atomically with the transaction.
    if data.account_id is not None:
        acc = db.get(models.Account, data.account_id)
        if acc is not None:
            _adjust_account_balance(acc, tx.type, tx.amount_cents)
            db.add(acc)
    db.commit()
    db.refresh(tx)
    return tx


def update_transaction(
    db: Session, tx: models.Transaction, data: schemas.TransactionUpdate
) -> models.Transaction:
    # Snapshot old values for balance reconciliation.
    old_amount = tx.amount_cents
    old_type = tx.type
    old_account_id = tx.account_id

    updates = data.model_dump(exclude_unset=True)
    if "account_id" in updates and updates["account_id"] is not None:
        new_acc = db.get(models.Account, updates["account_id"])
        if new_acc is None or new_acc.user_id != tx.user_id:
            raise ValueError("Account not found")
    if "amount" in updates:
        tx.amount_cents = to_cents(updates.pop("amount"))
    if "type" in updates and updates["type"] is not None:
        updates["type"] = updates["type"].value
    for field, value in updates.items():
        setattr(tx, field, value)

    # Reconcile account balances: revert old, apply new.
    if old_account_id is not None:
        old_acc = db.get(models.Account, old_account_id)
        if old_acc is not None:
            _adjust_account_balance(old_acc, old_type, old_amount, reverse=True)
            db.add(old_acc)
    if tx.account_id is not None:
        new_acc = db.get(models.Account, tx.account_id)
        if new_acc is not None:
            _adjust_account_balance(new_acc, tx.type, tx.amount_cents)
            db.add(new_acc)
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, tx: models.Transaction) -> None:
    # Revert linked account balance before deleting.
    if tx.account_id is not None:
        acc = db.get(models.Account, tx.account_id)
        if acc is not None:
            _adjust_account_balance(acc, tx.type, tx.amount_cents, reverse=True)
            db.add(acc)
    db.delete(tx)
    db.commit()


def list_categories(
    db: Session, user_id: int, tx_type: str | None = None
) -> list[str]:
    stmt = (
        select(models.Transaction.category)
        .where(_family_filter(models.Transaction.user_id, user_id, db))
        .distinct()
    )
    if tx_type:
        stmt = stmt.where(models.Transaction.type == tx_type)
    stmt = stmt.order_by(models.Transaction.category)
    return list(db.scalars(stmt))


# ---------- Budgets ----------


def list_budgets(db: Session, user_id: int) -> list[models.Budget]:
    # Family-shared budgets
    return list(
        db.scalars(
            select(models.Budget)
            .where(_family_filter(models.Budget.user_id, user_id, db))
            .order_by(models.Budget.category)
        )
    )


def get_budget(db: Session, budget_id: int, user_id: int) -> models.Budget | None:
    budget = db.get(models.Budget, budget_id)
    if budget is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if budget.user_id not in allowed:
        return None
    return budget


def get_budget_by_category(
    db: Session, category: str, user_id: int
) -> models.Budget | None:
    ids = get_family_user_ids(db, user_id)
    stmt = select(models.Budget).where(models.Budget.category == category)
    if len(ids) == 1:
        stmt = stmt.where(models.Budget.user_id == ids[0])
    else:
        stmt = stmt.where(models.Budget.user_id.in_(ids))
    return db.scalar(stmt)


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
            _family_filter(models.Transaction.user_id, user_id, db),
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
            .where(_family_filter(models.Account.user_id, user_id, db))
            .order_by(models.Account.name)
        )
    )


def get_account(db: Session, account_id: int, user_id: int) -> models.Account | None:
    acc = db.get(models.Account, account_id)
    if acc is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if acc.user_id not in allowed:
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
    # Prevent orphaning transactions; unlink instead of leaving dangling FK.
    linked = db.scalar(
        select(func.count()).select_from(models.Transaction).where(models.Transaction.account_id == acc.id)
    )
    if linked and int(linked) > 0:
        # Unlink transactions instead of blocking delete — keeps history but removes account ref.
        db.execute(
            models.Transaction.__table__.update()
            .where(models.Transaction.account_id == acc.id)
            .values(account_id=None)
        )
    db.delete(acc)
    db.commit()


# ---------- Tags ----------


def list_tags(db: Session, user_id: int) -> list[models.Tag]:
    return list(
        db.scalars(
            select(models.Tag)
            .where(_family_filter(models.Tag.user_id, user_id, db))
            .order_by(models.Tag.name)
        )
    )


def get_tag(db: Session, tag_id: int, user_id: int) -> models.Tag | None:
    tag = db.get(models.Tag, tag_id)
    if tag is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if tag.user_id not in allowed:
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
            .where(_family_filter(models.RecurringTransaction.user_id, user_id, db))
            .order_by(models.RecurringTransaction.next_date)
        )
    )


def get_recurring(db: Session, rec_id: int, user_id: int) -> models.RecurringTransaction | None:
    rec = db.get(models.RecurringTransaction, rec_id)
    if rec is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if rec.user_id not in allowed:
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
    """Create transactions from due recurring items and advance next_date.

    Handles catch-up for missed periods (e.g. app not opened for months)
    by looping until next_date is in the future. Safety cap prevents
    runaway creation (e.g. daily over years).
    """
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
        # Use day_of_month as anchor for monthly so Feb28 -> Mar31 recovers.
        iterations = 0
        while rec.next_date <= today and iterations < 365:
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
                d = min(
                    rec.day_of_month or rec.next_date.day,
                    calendar.monthrange(y, m)[1],
                )
                rec.next_date = _dt.date(y, m, d)
            elif rec.frequency == "yearly":
                rec.next_date = rec.next_date.replace(year=rec.next_date.year + 1)
            else:
                break
            count += 1
            iterations += 1
    db.commit()
    return count


# ---------- Savings Goals ----------


def list_goals(db: Session, user_id: int) -> list[models.SavingsGoal]:
    return list(
        db.scalars(
            select(models.SavingsGoal)
            .where(_family_filter(models.SavingsGoal.user_id, user_id, db))
            .order_by(models.SavingsGoal.name)
        )
    )


def get_goal(db: Session, goal_id: int, user_id: int) -> models.SavingsGoal | None:
    goal = db.get(models.SavingsGoal, goal_id)
    if goal is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if goal.user_id not in allowed:
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
            .where(_family_filter(models.Reminder.user_id, user_id, db))
            .order_by(models.Reminder.remind_date)
        )
    )


def get_reminder(db: Session, reminder_id: int, user_id: int) -> models.Reminder | None:
    rem = db.get(models.Reminder, reminder_id)
    if rem is None:
        return None
    allowed = get_family_user_ids(db, user_id)
    if rem.user_id not in allowed:
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
    # Family-aware
    return upcoming_reminders_family(db, user_id, days)


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


# ---------- Family ----------


def _generate_invite_code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        exists = db.scalar(select(models.Family).where(models.Family.invite_code == code))
        if not exists:
            return code
    raise RuntimeError("Could not generate invite code")


def create_family(db: Session, user_id: int, name: str) -> models.Family:
    user = db.get(models.User, user_id)
    if user is None:
        raise ValueError("User not found")
    if user.family_id is not None:
        raise ValueError("Already in a family. Leave first.")
    code = _generate_invite_code(db)
    family = models.Family(name=name.strip(), invite_code=code, owner_id=user_id)
    db.add(family)
    db.flush()  # get family.id
    user.family_id = family.id
    db.add(user)
    db.commit()
    db.refresh(family)
    return family


def join_family(db: Session, user_id: int, invite_code: str) -> models.Family:
    user = db.get(models.User, user_id)
    if user is None:
        raise ValueError("User not found")
    if user.family_id is not None:
        raise ValueError("Already in a family. Leave first.")
    code = invite_code.strip().upper()
    family = db.scalar(select(models.Family).where(models.Family.invite_code == code))
    if family is None:
        raise ValueError("Invalid invite code")
    user.family_id = family.id
    db.add(user)
    db.commit()
    db.refresh(family)
    return family


def leave_family(db: Session, user_id: int) -> None:
    user = db.get(models.User, user_id)
    if user is None or user.family_id is None:
        raise ValueError("Not in a family")
    fid = user.family_id
    user.family_id = None
    db.add(user)
    db.flush()
    # If owner leaves and family empty, delete family
    remaining = db.scalar(select(func.count()).select_from(models.User).where(models.User.family_id == fid))
    if remaining == 0:
        fam = db.get(models.Family, fid)
        if fam:
            db.delete(fam)
    elif user.id == db.scalar(select(models.Family.owner_id).where(models.Family.id == fid)):
        # Transfer ownership to oldest remaining member
        oldest = db.scalar(select(models.User).where(models.User.family_id == fid).order_by(models.User.id))
        if oldest:
            fam = db.get(models.Family, fid)
            if fam:
                fam.owner_id = oldest.id
                db.add(fam)
    db.commit()


def get_family(db: Session, user_id: int) -> models.Family | None:
    user = db.get(models.User, user_id)
    if user is None or user.family_id is None:
        return None
    return db.get(models.Family, user.family_id)


def list_family_members(db: Session, user_id: int) -> list[models.User]:
    user = db.get(models.User, user_id)
    if user is None or user.family_id is None:
        return []
    return list(db.scalars(select(models.User).where(models.User.family_id == user.family_id).order_by(models.User.email)))


def upcoming_reminders_family(db: Session, user_id: int, days: int = 7) -> list[models.Reminder]:
    today = datetime.date.today()
    until = today + datetime.timedelta(days=days)
    ids = get_family_user_ids(db, user_id)
    stmt = select(models.Reminder).where(
        models.Reminder.user_id.in_(ids) if len(ids) > 1 else models.Reminder.user_id == ids[0],
        models.Reminder.active == True,
        models.Reminder.remind_date >= today,
        models.Reminder.remind_date <= until,
    ).order_by(models.Reminder.remind_date)
    return list(db.scalars(stmt))
