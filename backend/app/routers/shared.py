from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import SharedAccess, User

router = APIRouter(prefix="/api/shared", tags=["shared"])


def _to_read(s: SharedAccess) -> schemas.SharedAccessRead:
    return schemas.SharedAccessRead(
        id=s.id,
        shared_with_email=s.shared_with_email,
        permission=s.permission,
        created_at=s.created_at,
    )


@router.get("", response_model=list[schemas.SharedAccessRead])
def list_shared(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.scalars(
        select(SharedAccess).where(SharedAccess.owner_id == user.id)
    )
    return [_to_read(s) for s in rows]


@router.post("", response_model=schemas.SharedAccessRead, status_code=201)
def create_shared(
    data: schemas.SharedAccessCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.scalar(
        select(SharedAccess).where(
            SharedAccess.owner_id == user.id,
            SharedAccess.shared_with_email == data.email,
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already shared with this user")
    s = SharedAccess(
        owner_id=user.id,
        shared_with_email=data.email,
        permission=data.permission,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _to_read(s)


@router.delete("/{shared_id}", status_code=204)
def delete_shared(
    shared_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = db.get(SharedAccess, shared_id)
    if s is None or s.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Shared access not found")
    db.delete(s)
    db.commit()
