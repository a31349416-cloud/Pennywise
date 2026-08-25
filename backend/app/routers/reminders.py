import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Reminder, User

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


def _to_read(r: Reminder) -> schemas.ReminderRead:
    return schemas.ReminderRead(
        id=r.id,
        title=r.title,
        amount=r.amount,
        remind_date=r.remind_date,
        repeat=r.repeat,
        active=r.active,
        created_at=r.created_at,
    )


@router.get("", response_model=list[schemas.ReminderRead])
def list_reminders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(Reminder)
        .where(Reminder.user_id == user.id)
        .order_by(Reminder.remind_date)
    )
    return [_to_read(r) for r in rows]


@router.post("", response_model=schemas.ReminderRead, status_code=201)
def create_reminder(
    data: schemas.ReminderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = Reminder(
        user_id=user.id,
        title=data.title,
        amount_cents=crud.to_cents(data.amount),
        remind_date=data.remind_date,
        repeat=data.repeat,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_read(r)


@router.get("/{reminder_id}", response_model=schemas.ReminderRead)
def get_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(Reminder, reminder_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return _to_read(r)


@router.patch("/{reminder_id}", response_model=schemas.ReminderRead)
def update_reminder(
    reminder_id: int,
    data: schemas.ReminderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(Reminder, reminder_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    updates = data.model_dump(exclude_unset=True)
    if "amount" in updates:
        r.amount_cents = crud.to_cents(updates.pop("amount"))
    for field, value in updates.items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return _to_read(r)


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.get(Reminder, reminder_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(r)
    db.commit()


@router.get("/upcoming", response_model=list[schemas.ReminderRead])
def upcoming_reminders(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.date.today()
    cutoff = today + datetime.timedelta(days=days)
    rows = db.scalars(
        select(Reminder)
        .where(
            Reminder.user_id == user.id,
            Reminder.active == True,
            Reminder.remind_date >= today,
            Reminder.remind_date <= cutoff,
        )
        .order_by(Reminder.remind_date)
    )
    return [_to_read(r) for r in rows]
