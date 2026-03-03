from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, Field, model_validator


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

    @model_validator(mode="after")
    def validate_profile_ordering(self) -> "SpeedEstimateAnchorsUpsert":
        """
        Enforce physical ordering across profiles:
          speed:  slow  <=  standard  <=  fast
          delta:  slow  >=  0  (arrives later than schedule)
                  fast  <=  0  (arrives earlier than schedule)
        """
        # --- speed ordering ---
        if self.slow.speed_knots > self.standard.speed_knots:
            raise ValueError(
                f"slow speed ({self.slow.speed_knots} kn) must be "
                f"<= standard speed ({self.standard.speed_knots} kn)"
            )
        if self.standard.speed_knots > self.fast.speed_knots:
            raise ValueError(
                f"standard speed ({self.standard.speed_knots} kn) must be "
                f"<= fast speed ({self.fast.speed_knots} kn)"
            )

        # --- arrival delta sign constraints ---
        if self.slow.expected_arrival_delta_minutes < 0:
            raise ValueError(
                f"slow profile arrival delta ({self.slow.expected_arrival_delta_minutes} min) "
                "must be >= 0 (slow voyages arrive later than or on schedule)"
            )
        if self.fast.expected_arrival_delta_minutes > 0:
            raise ValueError(
                f"fast profile arrival delta ({self.fast.expected_arrival_delta_minutes} min) "
                "must be <= 0 (fast voyages arrive earlier than or on schedule)"
            )

        return self


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
