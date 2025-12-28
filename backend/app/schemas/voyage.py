from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VoyageBase(BaseModel):
    """Base schema for voyage data."""
    operator_id: int
    external_trip_id: Optional[str] = None
    departure_port: Optional[str] = None
    arrival_port: Optional[str] = None
    departure_datetime: datetime
    arrival_datetime: datetime
    route_geometry: Optional[dict] = None  # JSONB as dict
    status: str = Field(..., pattern="^(planned|completed|cancelled)$")  # Match model defaults


class VoyageCreate(VoyageBase):
    """Schema for creating a voyage."""
    pass  # All fields required except optionals


class VoyageUpdate(BaseModel):
    """Schema for updating a voyage (partial)."""
    external_trip_id: Optional[str] = None
    departure_port: Optional[str] = None
    arrival_port: Optional[str] = None
    departure_datetime: Optional[datetime] = None
    arrival_datetime: Optional[datetime] = None
    route_geometry: Optional[dict] = None
    status: Optional[str] = Field(None, pattern="^(planned|completed|cancelled)$")


class Voyage(VoyageBase):
    """Schema for voyage responses (includes ID and timestamps)."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility

