from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.confirmed_choice import ConfirmedChoice
from app.models.choice_intent import ChoiceIntent
from app.models.voyage import Voyage
from app.schemas.confirmed_choice import ConfirmedChoiceCreate, ConfirmedChoice as ConfirmedChoiceSchema

router = APIRouter(prefix="/confirmed-choices", tags=["confirmed-choices"])


@router.post("/", response_model=ConfirmedChoiceSchema, status_code=201)
def create_confirmed_choice(
    payload: ConfirmedChoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a confirmed choice from a choice intent and booking ID."""

    # Get the choice intent data first to derive voyage_id
    intent = db.query(ChoiceIntent).filter(ChoiceIntent.intent_id == payload.intent_id).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Choice intent not found")

    # Verify the voyage belongs to the user's operator
    voyage = db.query(Voyage).filter(
        Voyage.id == intent.voyage_id,
        Voyage.operator_id == current_user.operator_id
    ).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found or access denied")

    # Check if a confirmed choice already exists for this voyage + booking
    existing = db.query(ConfirmedChoice).filter(
        ConfirmedChoice.voyage_id == intent.voyage_id,
        ConfirmedChoice.booking_id == payload.booking_id
    ).first()
    if existing:
        return existing

    # Create the confirmed choice
    db_choice = ConfirmedChoice(
        voyage_id=intent.voyage_id,
        intent_id=payload.intent_id,
        booking_id=payload.booking_id,
        slider_value=intent.slider_value,
        delta_pct_from_standard=intent.delta_pct_from_standard,
        selected_speed_kn=intent.selected_speed_kn,
    )

    db.add(db_choice)
    db.commit()
    db.refresh(db_choice)

    return db_choice


@router.get("/{choice_id}", response_model=ConfirmedChoiceSchema)
def get_confirmed_choice(
    choice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific confirmed choice by ID."""

    choice = db.query(ConfirmedChoice).join(Voyage).filter(
        ConfirmedChoice.id == choice_id,
        Voyage.operator_id == current_user.operator_id
    ).first()

    if not choice:
        raise HTTPException(status_code=404, detail="Confirmed choice not found")

    return choice


@router.get("/", response_model=List[ConfirmedChoiceSchema])
def get_confirmed_choices_for_voyage(
    voyage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all confirmed choices for a specific voyage."""

    # Verify the voyage belongs to the users operator
    voyage = db.query(Voyage).filter(
        Voyage.id == voyage_id,
        Voyage.operator_id == current_user.operator_id
    ).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found or access denied")

    # Get all confirmed choices for the voyage
    choices = db.query(ConfirmedChoice).filter(ConfirmedChoice.voyage_id == voyage_id).all()

    return choices