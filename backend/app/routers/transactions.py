import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[schemas.TransactionRead])
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    type: str | None = None,
    category: str | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
):
    return crud.list_transactions(
        db,
        skip=skip,
        limit=limit,
        tx_type=type,
        category=category,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=schemas.TransactionRead, status_code=201)
def create_transaction(data: schemas.TransactionCreate, db=Depends(get_db)):
    return crud.create_transaction(db, data)


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    return crud.list_categories(db)


@router.get("/{tx_id}", response_model=schemas.TransactionRead)
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = crud.get_transaction(db, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.patch("/{tx_id}", response_model=schemas.TransactionRead)
def update_transaction(
    tx_id: int, data: schemas.TransactionUpdate, db: Session = Depends(get_db)
):
    tx = crud.get_transaction(db, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return crud.update_transaction(db, tx, data)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = crud.get_transaction(db, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    crud.delete_transaction(db, tx)
