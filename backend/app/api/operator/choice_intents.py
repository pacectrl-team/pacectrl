from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.choice_intent import ChoiceIntent
from app.models.voyage import Voyage
from app.schemas.choice_intent import ChoiceIntent as ChoiceIntentSchema

router = APIRouter(prefix="/choice-intents", tags=["choice-intents"])


@router.get("/", response_model=List[ChoiceIntentSchema])
def get_choice_intents_for_voyage(
    voyage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all choice intents for a specific voyage, scoped to the current user's operator."""

    # Verify the voyage belongs to the user's operator
    voyage = db.query(Voyage).filter(
        Voyage.id == voyage_id,
        Voyage.operator_id == current_user.operator_id
    ).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found or access denied")

    # Get all choice intents for the voyage
    intents = db.query(ChoiceIntent).filter(ChoiceIntent.voyage_id == voyage_id).all()

    return intents