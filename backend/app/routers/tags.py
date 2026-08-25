from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Tag, TransactionTag, User

router = APIRouter(prefix="/api/tags", tags=["tags"])


class TagIdsBody(BaseModel):
    tag_ids: list[int]


def _to_read(tag: Tag) -> schemas.TagRead:
    return schemas.TagRead(
        id=tag.id,
        name=tag.name,
        color=tag.color,
    )


@router.get("", response_model=list[schemas.TagRead])
def list_tags(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(Tag)
        .where(Tag.user_id == user.id)
        .order_by(Tag.name)
    )
    return [_to_read(t) for t in rows]


@router.post("", response_model=schemas.TagRead, status_code=201)
def create_tag(
    data: schemas.TagCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = Tag(
        user_id=user.id,
        name=data.name,
        color=data.color,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return _to_read(tag)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = db.get(Tag, tag_id)
    if tag is None or tag.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    for link in db.scalars(
        select(TransactionTag).where(TransactionTag.tag_id == tag_id)
    ):
        db.delete(link)
    db.delete(tag)
    db.commit()


@router.get("/transaction/{tx_id}", response_model=list[int])
def get_tags_for_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(TransactionTag.tag_id).where(TransactionTag.transaction_id == tx_id)
    return list(db.scalars(stmt))


@router.put("/transaction/{tx_id}", status_code=200)
def set_tags_for_transaction(
    tx_id: int,
    body: TagIdsBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for link in db.scalars(
        select(TransactionTag).where(TransactionTag.transaction_id == tx_id)
    ):
        db.delete(link)
    for tag_id in body.tag_ids:
        tag = db.get(Tag, tag_id)
        if tag is None or tag.user_id != user.id:
            raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
        db.add(TransactionTag(transaction_id=tx_id, tag_id=tag_id))
    db.commit()
    return {"tag_ids": body.tag_ids}
