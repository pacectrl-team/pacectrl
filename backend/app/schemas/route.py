from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class RouteBase(BaseModel):
    """Shared route attributes."""

    name: str = Field(..., min_length=1, max_length=255)
    departure_port: str = Field(..., min_length=1, max_length=255)
    arrival_port: str = Field(..., min_length=1, max_length=255)
    departure_time: time
    arrival_time: time
    route_geometry: Optional[dict] = None
    is_active: bool = True

    @field_serializer("departure_time", "arrival_time")
    @classmethod
    def serialize_time_hhmm(cls, v: time) -> str:
        """Always emit HH:MM (no seconds / microseconds)."""
        return v.strftime("%H:%M")


class RouteCreate(RouteBase):
    """Payload for creating routes."""

    pass


class RouteUpdate(BaseModel):
    """Partial route updates."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    departure_port: Optional[str] = Field(None, min_length=1, max_length=255)
    arrival_port: Optional[str] = Field(None, min_length=1, max_length=255)
    departure_time: Optional[time] = None
    arrival_time: Optional[time] = None
    route_geometry: Optional[dict] = None
    is_active: Optional[bool] = None


class Route(RouteBase):
    """Response schema for routes."""

    id: int
    operator_id: int
    created_at: datetime

    class Config:
        from_attributes = True
