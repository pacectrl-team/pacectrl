from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class VoyageBase(BaseModel):
    """Base schema for voyage data."""
    operator_id: int
    external_trip_id: Optional[str] = None
    widget_config_id: Optional[int] = None
    route_id: int
    ship_id: int
    departure_date: date
    arrival_date: date
    status: str = Field("planned", pattern="^(planned|completed|cancelled)$")


class VoyageCreate(VoyageBase):
    """Schema for creating a voyage."""
    pass  # All fields required except optionals


class VoyageUpdate(BaseModel):
    """Schema for updating a voyage (partial)."""
    external_trip_id: Optional[str] = None
    widget_config_id: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(planned|completed|cancelled)$")
    route_id: Optional[int] = None
    ship_id: Optional[int] = None
    departure_date: Optional[date] = None
    arrival_date: Optional[date] = None


class Voyage(VoyageBase):
    """Schema for voyage responses (includes ID and timestamps)."""
    id: int
    created_at: datetime
    widget_config_id: Optional[int] = None
    ship_id: int

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility

