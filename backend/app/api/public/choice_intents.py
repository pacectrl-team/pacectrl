import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.voyage import Voyage
from app.models.choice_intent import ChoiceIntent
from app.schemas.choice_intent import ChoiceIntentCreate, ChoiceIntentResponse, DEFAULT_INTENT_TTL_MINUTES

router = APIRouter(prefix="/choice-intents", tags=["choice-intents"])


def generate_intent_id() -> str:
    """Generate a public-facing intent ID."""
    return f"int_{uuid.uuid4().hex[:12]}"


def hash_ip(ip: Optional[str]) -> Optional[str]:
    """Hash the IP; return None if missing."""
    if not ip:
        return None
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()

# May have to add some kind of cache or rate-limiting later to avoid abuse. Also some kind of memory for fast lookup of recent voyages.
@router.post("/", response_model=ChoiceIntentResponse, status_code=201)
def create_choice_intent(
    payload: ChoiceIntentCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create a choice intent from the public widget slider."""

    voyage = db.query(Voyage).filter(Voyage.id == payload.voyage_id).first()
    if not voyage:
        raise HTTPException(status_code=404, detail="Voyage not found")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=DEFAULT_INTENT_TTL_MINUTES)
    intent_id = generate_intent_id()

    client_ip = request.client.host if request.client else None
    ua = request.headers.get("User-Agent")

    db_intent = ChoiceIntent(
        intent_id=intent_id,
        voyage_id=payload.voyage_id,
        slider_value=payload.slider_value,
        delta_pct_from_standard=payload.delta_pct_from_standard,
        selected_speed_kn=payload.selected_speed_kn,
        consumed_at=None,
        ip_hash=hash_ip(client_ip),
        user_agent=ua,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc)
    )

    db.add(db_intent)
    db.commit()
    db.refresh(db_intent)

    return db_intent