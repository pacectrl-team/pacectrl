from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, Field


class SpeedEstimateAnchor(BaseModel):
    """Single speed/emissions anchor for a ship+route profile."""

    speed_knots: float = Field(..., gt=0)
    expected_emissions_kg_co2: float = Field(..., ge=0)
    expected_arrival_delta_minutes: int


class SpeedEstimateAnchorOut(SpeedEstimateAnchor):
    """Anchor returned from the API including metadata."""

    id: int
    profile: str
    created_at: datetime

    class Config:
        from_attributes = True


class SpeedEstimateAnchorsUpsert(BaseModel):
    """Payload for upserting all anchors for a ship+route combination."""

    slow: SpeedEstimateAnchor
    standard: SpeedEstimateAnchor
    fast: SpeedEstimateAnchor


class SpeedEstimateAnchorsResponse(BaseModel):
    """Response wrapper keyed by profile for easy consumption."""

    anchors: Dict[str, SpeedEstimateAnchorOut]


class RouteShipAnchorsOut(BaseModel):
    """
    Speed estimates grouped by route+ship combination.
    Contains route/ship identifiers and all configured anchors.
    """

    route_id: int
    route_name: str
    ship_id: int
    ship_name: str
    anchors: Dict[str, SpeedEstimateAnchorOut]


class AllSpeedEstimatesResponse(BaseModel):
    """Response containing all speed estimates for an operator."""

    items: List[RouteShipAnchorsOut]
