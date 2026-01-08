from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, Field


class ConfirmedChoiceBase(BaseModel):
    voyage_id: int = Field(..., ge=1)
    slider_value: float = Field(..., ge=0.0, le=1.0)
    delta_pct_from_standard: float = Field(..., ge=-100.0, le=100.0)
    selected_speed_kn: Optional[float] = Field(None, ge=0.0)


class ConfirmedChoiceCreate(BaseModel):
    intent_id: str  # When creating a confirmed choice, we need to link it to the intent used to create it
    booking_id: str

class ConfirmedChoice(BaseModel):
    id: int
    voyage_id: int
    intent_id: Optional[str] = None
    booking_id: str
    slider_value: float
    delta_pct_from_standard: float
    selected_speed_kn: Optional[float] = None
    confirmed_at: datetime

    class Config:
        from_attributes = True
