import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas


def list_transactions(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    tx_type: str | None = None,
    category: str | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
) -> list[models.Transaction]:
    stmt = select(models.Transaction).order_by(
        models.Transaction.date.desc(), models.Transaction.id.desc()
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


def get_transaction(db: Session, tx_id: int) -> models.Transaction | None:
    return db.get(models.Transaction, tx_id)


def create_transaction(
    db: Session, data: schemas.TransactionCreate
) -> models.Transaction:
    tx = models.Transaction(**data.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def update_transaction(
    db: Session, tx: models.Transaction, data: schemas.TransactionUpdate
) -> models.Transaction:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, tx: models.Transaction) -> None:
    db.delete(tx)
    db.commit()


def list_categories(db: Session) -> list[str]:
    stmt = select(models.Transaction.category).distinct().order_by(
        models.Transaction.category
    )
    return list(db.scalars(stmt))
