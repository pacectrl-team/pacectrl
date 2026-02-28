from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class VoyageCreationRuleBase(BaseModel):
    """Shared fields for voyage creation rules."""

    name: str = Field(..., min_length=1, max_length=255)
    # Template pattern string, e.g. "HEL-TLL-{YYYY}-{MM}-{DD}"
    pattern: str = Field(..., min_length=1, max_length=500)
    route_id: int
    ship_id: int
    # widget_config_id is required — every auto-created voyage needs a widget config.
    widget_config_id: int
    is_active: bool = True


class VoyageCreationRuleCreate(VoyageCreationRuleBase):
    """Payload for creating a voyage creation rule."""

    pass


class VoyageCreationRuleUpdate(BaseModel):
    """Partial update payload for a voyage creation rule."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    pattern: Optional[str] = Field(None, min_length=1, max_length=500)
    route_id: Optional[int] = None
    ship_id: Optional[int] = None
    widget_config_id: Optional[int] = None
    is_active: Optional[bool] = None


class VoyageCreationRule(VoyageCreationRuleBase):
    """Response schema for voyage creation rules."""

    id: int
    operator_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VoyageCreationRuleApply(BaseModel):
    """
    Payload for the /apply endpoint.

    When from_date is provided, only planned voyages with
    departure_date >= from_date are updated.
    When omitted, all planned voyages linked to the rule are updated.
    """

    from_date: Optional[date] = None


class VoyageEnsure(BaseModel):
    """Payload for POST /voyages/ensure."""

    external_trip_id: str = Field(..., min_length=1)
