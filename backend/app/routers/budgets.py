import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _month_start() -> datetime.date:
    today = datetime.date.today()
    return today.replace(day=1)


def _to_read(db: Session, budget, user_id: int) -> schemas.BudgetRead:
    return schemas.BudgetRead(
        id=budget.id,
        category=budget.category,
        monthly_limit=budget.monthly_limit,
        spent=crud.spent_this_month(db, budget.category, _month_start(), user_id),
    )


@router.get("", response_model=list[schemas.BudgetRead])
def list_budgets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return [_to_read(db, b, user.id) for b in crud.list_budgets(db, user.id)]


@router.post("", response_model=schemas.BudgetRead, status_code=201)
def create_budget(
    data: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if crud.get_budget_by_category(db, data.category, user.id):
        raise HTTPException(
            status_code=409,
            detail=f"Budget for category '{data.category}' already exists",
        )
    return _to_read(db, crud.create_budget(db, data, user.id), user.id)


@router.patch("/{budget_id}", response_model=schemas.BudgetRead)
def update_budget(
    budget_id: int,
    data: schemas.BudgetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    budget = crud.get_budget(db, budget_id, user.id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    new_category = data.category
    if new_category and new_category != budget.category:
        existing = crud.get_budget_by_category(db, new_category, user.id)
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Budget for category '{new_category}' already exists",
            )
    return _to_read(db, crud.update_budget(db, budget, data), user.id)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    budget = crud.get_budget(db, budget_id, user.id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    crud.delete_budget(db, budget)
