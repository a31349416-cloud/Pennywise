from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/family", tags=["family"])


@router.get("", response_model=schemas.FamilyRead | None)
def get_my_family(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    fam = crud.get_family(db, user.id)
    if fam is None:
        return None
    members = crud.list_family_members(db, user.id)
    return schemas.FamilyRead(
        id=fam.id,
        name=fam.name,
        invite_code=fam.invite_code,
        owner_id=fam.owner_id,
        created_at=fam.created_at,
        member_count=len(members),
    )


@router.post("/create", response_model=schemas.FamilyRead, status_code=201)
def create_family(
    data: schemas.FamilyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        fam = crud.create_family(db, user.id, data.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return schemas.FamilyRead(
        id=fam.id,
        name=fam.name,
        invite_code=fam.invite_code,
        owner_id=fam.owner_id,
        created_at=fam.created_at,
        member_count=1,
    )


@router.post("/join", response_model=schemas.FamilyRead)
def join_family(
    data: schemas.FamilyJoin,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        fam = crud.join_family(db, user.id, data.invite_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    members = crud.list_family_members(db, user.id)
    return schemas.FamilyRead(
        id=fam.id,
        name=fam.name,
        invite_code=fam.invite_code,
        owner_id=fam.owner_id,
        created_at=fam.created_at,
        member_count=len(members),
    )


@router.post("/leave", status_code=204)
def leave_family(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        crud.leave_family(db, user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/members", response_model=list[schemas.FamilyMemberRead])
def list_members(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if crud.get_family(db, user.id) is None:
        raise HTTPException(status_code=404, detail="Not in a family")
    return crud.list_family_members(db, user.id)
