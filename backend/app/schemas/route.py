from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, Field, field_serializer, model_validator


class RouteBase(BaseModel):
    """Shared route attributes."""

    name: str = Field(..., min_length=1, max_length=255)
    departure_port: str = Field(..., min_length=1, max_length=255)
    arrival_port: str = Field(..., min_length=1, max_length=255)
    departure_time: time
    arrival_time: time
    duration_nights: int = Field(0, ge=0)
    route_geometry: Optional[dict] = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_route_logic(self) -> "RouteBase":
        """Enforce route sanity constraints."""
        # Departure and arrival must differ
        if (
            self.departure_port
            and self.arrival_port
            and self.departure_port.strip().lower() == self.arrival_port.strip().lower()
        ):
            raise ValueError("departure_port and arrival_port must be different")

        # For same-day routes, arrival must come after departure
        if (
            self.duration_nights == 0
            and self.departure_time is not None
            and self.arrival_time is not None
            and self.arrival_time <= self.departure_time
        ):
            raise ValueError(
                f"For same-day routes (duration_nights=0), "
                f"arrival_time ({self.arrival_time}) must be after "
                f"departure_time ({self.departure_time})"
            )
        return self

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
    duration_nights: Optional[int] = Field(None, ge=0)
    route_geometry: Optional[dict] = None
    is_active: Optional[bool] = None


class Route(RouteBase):
    """Response schema for routes."""

    id: int
    operator_id: int
    created_at: datetime

    class Config:
        from_attributes = True
