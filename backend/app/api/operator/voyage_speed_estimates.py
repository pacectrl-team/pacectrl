from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.voyage_speed_estimate import VoyageSpeedEstimate
from app.schemas.voyage_speed_estimate import (
    VoyageSpeedEstimateCreate,
    VoyageSpeedEstimateUpdate,
    VoyageSpeedEstimate as VoyageSpeedEstimateSchema,
)
from app.models.voyage import Voyage

router = APIRouter(
    prefix="/voyage_speed_estimates",
    tags=["voyage_speed_estimates"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=VoyageSpeedEstimateSchema, dependencies=[Depends(require_admin)])
def create_voyage_speed_estimate(
    payload: VoyageSpeedEstimateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new voyage speed estimate."""

    # Validate that the voyage exists and belongs to current operator
    db_voyage = db.query(Voyage).filter(Voyage.id == payload.voyage_id).first()
    if not db_voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")
    
    # Check if current user has access to the voyage
    if db_voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot add speed estimates for voyages of another operator")

    # Enforce unique profile per voyage (eco/standard/fast)
    if payload.profile:
        existing = db.query(VoyageSpeedEstimate).filter(
            VoyageSpeedEstimate.voyage_id == payload.voyage_id,
            VoyageSpeedEstimate.profile == payload.profile,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile already exists for this voyage")

    # Create speed estimate
    db_voyage_speed_estimate = VoyageSpeedEstimate(
        voyage_id=payload.voyage_id,
        profile=payload.profile,
        speed_knots=payload.speed_knots,
        expected_emissions_kg_co2=payload.expected_emissions_kg_co2,
        expected_arrival_delay_minutes=payload.expected_arrival_delay_minutes,
    )
    db.add(db_voyage_speed_estimate)
    db.commit()
    db.refresh(db_voyage_speed_estimate)
    return db_voyage_speed_estimate


@router.get("/", response_model=List[VoyageSpeedEstimateSchema])
def list_voyage_speed_estimates(
    voyage_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List speed estimates for current operator (optionally filter by voyage_id)."""

    # Join to voyages to enforce tenant scoping
    q = db.query(VoyageSpeedEstimate).join(Voyage, Voyage.id == VoyageSpeedEstimate.voyage_id)
    q = q.filter(Voyage.operator_id == current_user.operator_id)
    if voyage_id is not None:
        q = q.filter(VoyageSpeedEstimate.voyage_id == voyage_id)
    return q.all()


@router.get("/{estimate_id}", response_model=VoyageSpeedEstimateSchema)
def get_voyage_speed_estimate(
    estimate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a speed estimate by ID, scoped to current operator."""

    # Join to voyages to ensure estimate belongs to current operator
    db_estimate = (
        db.query(VoyageSpeedEstimate)
        .join(Voyage, Voyage.id == VoyageSpeedEstimate.voyage_id)
        .filter(VoyageSpeedEstimate.id == estimate_id, Voyage.operator_id == current_user.operator_id)
        .first()
    )
    if not db_estimate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage speed estimate not found")
    return db_estimate


@router.patch("/{estimate_id}", response_model=VoyageSpeedEstimateSchema, dependencies=[Depends(require_admin)])
def update_voyage_speed_estimate(
    estimate_id: int,
    payload: VoyageSpeedEstimateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a voyage speed estimate (partial), scoped to current operator."""

    # Fetch scoped to operator
    db_estimate = (
        db.query(VoyageSpeedEstimate)
        .join(Voyage, Voyage.id == VoyageSpeedEstimate.voyage_id)
        .filter(VoyageSpeedEstimate.id == estimate_id, Voyage.operator_id == current_user.operator_id)
        .first()
    )
    if not db_estimate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage speed estimate not found")

    # Enforce uniqueness if profile changes
    if payload.profile is not None and payload.profile != db_estimate.profile:
        existing = db.query(VoyageSpeedEstimate).filter(
            VoyageSpeedEstimate.voyage_id == db_estimate.voyage_id,
            VoyageSpeedEstimate.profile == payload.profile,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile already exists for this voyage")

    if payload.profile is not None:
        db_estimate.profile = payload.profile
    if payload.speed_knots is not None:
        db_estimate.speed_knots = payload.speed_knots
    if payload.expected_emissions_kg_co2 is not None:
        db_estimate.expected_emissions_kg_co2 = payload.expected_emissions_kg_co2
    if payload.expected_arrival_delay_minutes is not None:
        db_estimate.expected_arrival_delay_minutes = payload.expected_arrival_delay_minutes

    db.commit()
    db.refresh(db_estimate)
    return db_estimate


@router.delete("/{estimate_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_voyage_speed_estimate(
    estimate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a voyage speed estimate."""

    db_estimate = (
        db.query(VoyageSpeedEstimate)
        .join(Voyage, Voyage.id == VoyageSpeedEstimate.voyage_id)
        .filter(VoyageSpeedEstimate.id == estimate_id, Voyage.operator_id == current_user.operator_id)
        .first()
    )
    if not db_estimate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage speed estimate not found")

    db.delete(db_estimate)
    db.commit()
    return None