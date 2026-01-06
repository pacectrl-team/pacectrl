from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, Field


DEFAULT_INTENT_TTL_MINUTES = 60  # Default time-to-live for choice intents, can be changed if needed.


class ChoiceIntentBase(BaseModel):
    voyage_id: int = Field(..., ge=1)
    slider_value: float = Field(..., ge=0.0, le=1.0)
    delta_pct_from_standard: float = Field(..., ge=-100.0, le=100.0)
    selected_speed_kn: Optional[float] = Field(None, ge=0.0)


class ChoiceIntentCreate(ChoiceIntentBase):
    pass


class ChoiceIntentResponse(BaseModel):
    intent_id: str
    voyage_id: int
    slider_value: float
    delta_pct_from_standard: float
    selected_speed_kn: Optional[float]
    created_at: datetime
    expires_at: datetime
    # Remove fields that should not be exposed publicly

    class Config:
        from_attributes = True


class ChoiceIntent(BaseModel):
    intent_id: str
    voyage_id: int
    slider_value: float
    delta_pct_from_standard: float
    selected_speed_kn: Optional[float]
    ip_hash: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    expires_at: datetime
    consumed_at: Optional[datetime] = None

    class Config:
        from_attributes = True