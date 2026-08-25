from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Account, User

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _to_read(account: Account) -> schemas.AccountRead:
    return schemas.AccountRead(
        id=account.id,
        name=account.name,
        type=account.type,
        balance=account.balance,
        currency=account.currency,
        icon=account.icon,
        created_at=account.created_at,
    )


@router.get("", response_model=list[schemas.AccountRead])
def list_accounts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(Account)
        .where(Account.user_id == user.id)
        .order_by(Account.name)
    )
    return [_to_read(a) for a in rows]


@router.post("", response_model=schemas.AccountRead, status_code=201)
def create_account(
    data: schemas.AccountCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = Account(
        user_id=user.id,
        name=data.name,
        type=data.type,
        balance_cents=crud.to_cents(data.balance),
        currency=data.currency,
        icon=data.icon,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_read(account)


@router.get("/{account_id}", response_model=schemas.AccountRead)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return _to_read(account)


@router.patch("/{account_id}", response_model=schemas.AccountRead)
def update_account(
    account_id: int,
    data: schemas.AccountUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    updates = data.model_dump(exclude_unset=True)
    if "balance" in updates:
        account.balance_cents = crud.to_cents(updates.pop("balance"))
    for field, value in updates.items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return _to_read(account)


@router.delete("/{account_id}", status_code=204)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
