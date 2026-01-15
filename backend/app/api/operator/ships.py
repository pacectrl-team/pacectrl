from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.ship import Ship
from app.models.user import User
from app.schemas.ship import ShipCreate, ShipUpdate, Ship as ShipSchema

router = APIRouter(
    prefix="/ships",
    tags=["ships"],
    dependencies=[Depends(get_current_user)],
)


@router.post(
    "/",
    response_model=ShipSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_ship(
    payload: ShipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new ship for the current operator."""

    existing = (
        db.query(Ship)
        .filter(Ship.operator_id == current_user.operator_id, Ship.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A ship with this name already exists for the operator",
        )

    db_ship = Ship(
        operator_id=current_user.operator_id,
        name=payload.name,
        imo_number=payload.imo_number,
    )
    db.add(db_ship)
    db.commit()
    db.refresh(db_ship)
    return db_ship


@router.get("/", response_model=List[ShipSchema])
def list_ships(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List ships for the current operator."""

    return (
        db.query(Ship)
        .filter(Ship.operator_id == current_user.operator_id)
        .order_by(Ship.name.asc())
        .all()
    )


@router.get("/{ship_id}", response_model=ShipSchema)
def get_ship(
    ship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a ship scoped to the current operator."""

    db_ship = (
        db.query(Ship)
        .filter(Ship.id == ship_id, Ship.operator_id == current_user.operator_id)
        .first()
    )
    if not db_ship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")

    return db_ship


@router.patch(
    "/{ship_id}",
    response_model=ShipSchema,
    dependencies=[Depends(require_admin)],
)
def update_ship(
    ship_id: int,
    payload: ShipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a ship owned by the current operator."""

    db_ship = (
        db.query(Ship)
        .filter(Ship.id == ship_id, Ship.operator_id == current_user.operator_id)
        .first()
    )
    if not db_ship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")

    if "name" in payload.model_fields_set and payload.name is not None:
        name_conflict = (
            db.query(Ship)
            .filter(
                Ship.operator_id == current_user.operator_id,
                Ship.name == payload.name,
                Ship.id != ship_id,
            )
            .first()
        )
        if name_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A ship with this name already exists for the operator",
            )
        db_ship.name = payload.name

    if "imo_number" in payload.model_fields_set:
        db_ship.imo_number = payload.imo_number

    db.commit()
    db.refresh(db_ship)
    return db_ship


@router.delete(
    "/{ship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_ship(
    ship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a ship owned by the current operator."""

    db_ship = (
        db.query(Ship)
        .filter(Ship.id == ship_id, Ship.operator_id == current_user.operator_id)
        .first()
    )
    if not db_ship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")

    db.delete(db_ship)
    db.commit()
    return None
