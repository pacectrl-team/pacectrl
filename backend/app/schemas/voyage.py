from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class VoyageBase(BaseModel):
    """Base schema for voyage data."""
    operator_id: int
    external_trip_id: str
    widget_config_id: int
    route_id: int
    ship_id: int
    departure_date: date
    arrival_date: date
    status: str = Field("planned", pattern="^(planned|completed|cancelled)$")
    voyage_creation_rule_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_date_ordering(self) -> "VoyageBase":
        """arrival_date must not be before departure_date when both are set."""
        if self.departure_date and self.arrival_date:
            if self.arrival_date < self.departure_date:
                raise ValueError(
                    f"arrival_date ({self.arrival_date}) must be "
                    f">= departure_date ({self.departure_date})"
                )
        return self


class VoyageCreate(VoyageBase):
    """
    Schema for creating a voyage.

    arrival_date is optional — if omitted, it is automatically derived from the
    route's duration_nights (arrival_date = departure_date + duration_nights days).
    Pass an explicit arrival_date to override the route default.
    """
    arrival_date: Optional[date] = None  # type: ignore[assignment]  # overrides required field in VoyageBase


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
    ship_id: int
    intent_count: int = 0

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility

