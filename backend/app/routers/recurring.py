import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import RecurringTransaction, Transaction, User

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def _to_read(r: RecurringTransaction) -> schemas.RecurringRead:
    return schemas.RecurringRead(
        id=r.id,
        type=r.type,
        amount=r.amount,
        category=r.category,
        description=r.description,
        frequency=r.frequency,
        day_of_month=r.day_of_month,
        next_date=r.next_date,
        active=r.active,
        created_at=r.created_at,
    )


def _advance_next_date(r: RecurringTransaction) -> None:
    freq = r.frequency
    if freq == "daily":
        r.next_date = r.next_date + datetime.timedelta(days=1)
    elif freq == "weekly":
        r.next_date = r.next_date + datetime.timedelta(weeks=1)
    elif freq == "monthly":
        m = r.next_date.month + 1
        y = r.next_date.year
        if m > 12:
            m = 1
            y += 1
        day = min(r.day_of_month or r.next_date.day, 28)
        r.next_date = datetime.date(y, m, day)
    elif freq == "yearly":
        r.next_date = r.next_date.replace(year=r.next_date.year + 1)


@router.get("", response_model=list[schemas.RecurringRead])
def list_recurring(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(RecurringTransaction)
        .where(RecurringTransaction.user_id == user.id)
        .order_by(RecurringTransaction.next_date)
    )
    return [_to_read(r) for r in rows]


@router.post("", response_model=schemas.RecurringRead, status_code=201)
def create_recurring(
    data: schemas.RecurringCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = RecurringTransaction(
        user_id=user.id,
        type=data.type.value,
        amount_cents=crud.to_cents(data.amount),
        category=data.category,
        description=data.description,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
        next_date=data.next_date,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_read(r)


@router.get("/{recurring_id}", response_model=schemas.RecurringRead)
def get_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(RecurringTransaction, recurring_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return _to_read(r)


@router.patch("/{recurring_id}", response_model=schemas.RecurringRead)
def update_recurring(
    recurring_id: int,
    data: schemas.RecurringUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(RecurringTransaction, recurring_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    updates = data.model_dump(exclude_unset=True)
    if "amount" in updates:
        r.amount_cents = crud.to_cents(updates.pop("amount"))
    if "type" in updates and updates["type"] is not None:
        updates["type"] = updates["type"].value
    for field, value in updates.items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return _to_read(r)


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(RecurringTransaction, recurring_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    db.delete(r)
    db.commit()


@router.post("/process")
def process_due(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.date.today()
    due = db.scalars(
        select(RecurringTransaction).where(
            RecurringTransaction.user_id == user.id,
            RecurringTransaction.active == True,
            RecurringTransaction.next_date <= today,
        )
    )
    processed = 0
    for r in due:
        tx = Transaction(
            user_id=user.id,
            type=r.type,
            amount_cents=r.amount_cents,
            category=r.category,
            description=r.description,
            date=r.next_date,
        )
        db.add(tx)
        _advance_next_date(r)
        db.add(r)
        processed += 1
    db.commit()
    return {"processed": processed}
