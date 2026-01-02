from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.voyage import Voyage
from app.models.widget_config import WidgetConfig
from app.schemas.voyage import VoyageCreate, VoyageUpdate, Voyage as VoyageSchema

router = APIRouter(
    prefix="/voyages",
    tags=["voyages"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=VoyageSchema, dependencies=[Depends(require_admin)])
def create_voyage(
    voyage: VoyageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new voyage."""
    # Check that the voyage is being created for the current user's operator
    if voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create voyages for another operator")
    
    # Check uniqueness of external_trip_id per operator
    if voyage.external_trip_id:
        existing = db.query(Voyage).filter(
            Voyage.operator_id == voyage.operator_id,
            Voyage.external_trip_id == voyage.external_trip_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="External trip ID already exists for this operator")

    # Validate widget config belongs to the same operator if provided
    if voyage.widget_config_id is not None:
        config = db.query(WidgetConfig).filter(WidgetConfig.id == voyage.widget_config_id).first()
        if not config or config.operator_id != current_user.operator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid widget config for this operator")

    # Create voyage instance
    db_voyage = Voyage(
        operator_id=voyage.operator_id,
        external_trip_id=voyage.external_trip_id,
        widget_config_id=voyage.widget_config_id,
        departure_port=voyage.departure_port,
        arrival_port=voyage.arrival_port,
        departure_datetime=voyage.departure_datetime,
        arrival_datetime=voyage.arrival_datetime,
        route_geometry=voyage.route_geometry,
        status=voyage.status,
    )
    db.add(db_voyage)
    db.commit()
    db.refresh(db_voyage)
    return db_voyage


@router.get("/", response_model=List[VoyageSchema])
def list_voyages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List voyages for the current operator."""

    return db.query(Voyage).filter(Voyage.operator_id == current_user.operator_id).all()


@router.get("/{voyage_id}", response_model=VoyageSchema)
def get_voyage(
    voyage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a voyage by ID."""

    db_voyage = db.query(Voyage).filter(Voyage.id == voyage_id).first()
    if not db_voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")

    if db_voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return db_voyage


@router.patch("/{voyage_id}", response_model=VoyageSchema, dependencies=[Depends(require_admin)])
def update_voyage(
    voyage_id: int,
    voyage_update: VoyageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a voyage."""

    db_voyage = db.query(Voyage).filter(Voyage.id == voyage_id).first()
    if not db_voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")

    if db_voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update voyages for another operator")

    # Check uniqueness if external_trip_id is being updated
    if voyage_update.external_trip_id is not None and voyage_update.external_trip_id != db_voyage.external_trip_id:
        existing = db.query(Voyage).filter(
            Voyage.operator_id == db_voyage.operator_id,
            Voyage.external_trip_id == voyage_update.external_trip_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="External trip ID already exists for this operator")

    # Update fields if provided
    if voyage_update.external_trip_id is not None:
        db_voyage.external_trip_id = voyage_update.external_trip_id
    if voyage_update.departure_port is not None:
        db_voyage.departure_port = voyage_update.departure_port
    if voyage_update.arrival_port is not None:
        db_voyage.arrival_port = voyage_update.arrival_port
    if "widget_config_id" in voyage_update.model_fields_set:
        if voyage_update.widget_config_id is not None:
            config = db.query(WidgetConfig).filter(WidgetConfig.id == voyage_update.widget_config_id).first()
            if not config or config.operator_id != current_user.operator_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid widget config for this operator")
        db_voyage.widget_config_id = voyage_update.widget_config_id
    if voyage_update.departure_datetime is not None:
        db_voyage.departure_datetime = voyage_update.departure_datetime
    if voyage_update.arrival_datetime is not None:
        db_voyage.arrival_datetime = voyage_update.arrival_datetime
    if voyage_update.route_geometry is not None:
        db_voyage.route_geometry = voyage_update.route_geometry
    if voyage_update.status is not None:
        db_voyage.status = voyage_update.status

    db.commit()
    db.refresh(db_voyage)
    return db_voyage