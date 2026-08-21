import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _month_start() -> datetime.date:
    today = datetime.date.today()
    return today.replace(day=1)


def _to_read(db: Session, budget) -> schemas.BudgetRead:
    return schemas.BudgetRead(
        id=budget.id,
        category=budget.category,
        monthly_limit=budget.monthly_limit,
        spent=crud.spent_this_month(db, budget.category, _month_start()),
    )


@router.get("", response_model=list[schemas.BudgetRead])
def list_budgets(db: Session = Depends(get_db)):
    return [_to_read(db, b) for b in crud.list_budgets(db)]


@router.post("", response_model=schemas.BudgetRead, status_code=201)
def create_budget(data: schemas.BudgetCreate, db: Session = Depends(get_db)):
    if crud.get_budget_by_category(db, data.category):
        raise HTTPException(
            status_code=409,
            detail=f"Budget for category '{data.category}' already exists",
        )
    return _to_read(db, crud.create_budget(db, data))


@router.patch("/{budget_id}", response_model=schemas.BudgetRead)
def update_budget(
    budget_id: int, data: schemas.BudgetUpdate, db: Session = Depends(get_db)
):
    budget = crud.get_budget(db, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    new_category = data.category
    if new_category and new_category != budget.category:
        existing = crud.get_budget_by_category(db, new_category)
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Budget for category '{new_category}' already exists",
            )
    return _to_read(db, crud.update_budget(db, budget, data))


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, db: Session = Depends(get_db)):
    budget = crud.get_budget(db, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    crud.delete_budget(db, budget)
