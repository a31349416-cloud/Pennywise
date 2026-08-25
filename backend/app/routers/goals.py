from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import SavingsGoal, User

router = APIRouter(prefix="/api/goals", tags=["goals"])


def _to_read(g: SavingsGoal) -> schemas.GoalRead:
    return schemas.GoalRead(
        id=g.id,
        name=g.name,
        target=g.target,
        current=g.current,
        deadline=g.deadline,
        created_at=g.created_at,
    )


@router.get("", response_model=list[schemas.GoalRead])
def list_goals(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(SavingsGoal)
        .where(SavingsGoal.user_id == user.id)
        .order_by(SavingsGoal.name)
    )
    return [_to_read(g) for g in rows]


@router.post("", response_model=schemas.GoalRead, status_code=201)
def create_goal(
    data: schemas.GoalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    g = SavingsGoal(
        user_id=user.id,
        name=data.name,
        target_cents=crud.to_cents(data.target),
        deadline=data.deadline,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return _to_read(g)


@router.get("/{goal_id}", response_model=schemas.GoalRead)
def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    g = db.get(SavingsGoal, goal_id)
    if g is None or g.user_id != user.id:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    return _to_read(g)


@router.patch("/{goal_id}", response_model=schemas.GoalRead)
def update_goal(
    goal_id: int,
    data: schemas.GoalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    g = db.get(SavingsGoal, goal_id)
    if g is None or g.user_id != user.id:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    updates = data.model_dump(exclude_unset=True)
    if "target" in updates:
        g.target_cents = crud.to_cents(updates.pop("target"))
    if "current" in updates:
        g.current_cents = crud.to_cents(updates.pop("current"))
    for field, value in updates.items():
        setattr(g, field, value)
    db.commit()
    db.refresh(g)
    return _to_read(g)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    g = db.get(SavingsGoal, goal_id)
    if g is None or g.user_id != user.id:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    db.delete(g)
    db.commit()
