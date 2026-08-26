import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[schemas.TransactionRead])
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    type: str | None = None,
    category: str | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    account_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return crud.list_transactions(
        db,
        user_id=user.id,
        skip=skip,
        limit=limit,
        tx_type=type,
        category=category,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id,
    )


@router.post("", response_model=schemas.TransactionRead, status_code=201)
def create_transaction(
    data: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return crud.create_transaction(db, data, user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/categories", response_model=list[str])
def list_categories(
    type: str | None = Query(None, pattern="^(income|expense)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return crud.list_categories(db, user.id, tx_type=type)


@router.get("/{tx_id}", response_model=schemas.TransactionRead)
def get_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tx = crud.get_transaction(db, tx_id, user.id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.patch("/{tx_id}", response_model=schemas.TransactionRead)
def update_transaction(
    tx_id: int,
    data: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tx = crud.get_transaction(db, tx_id, user.id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    try:
        return crud.update_transaction(db, tx, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tx = crud.get_transaction(db, tx_id, user.id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    crud.delete_transaction(db, tx)
