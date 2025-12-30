from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VoyageSpeedEstimateBase(BaseModel):
    """Base schema for voyage speed estimate data."""
    voyage_id: int
    profile: str = Field(..., pattern="^(eco|standard|fast)$")
    speed_knots: float  # speed in knots
    expected_emissions_kg_co2: float  # expected emissions in kg CO2
    expected_arrival_delay_minutes: int  # expected arrival delay in minutes


class VoyageSpeedEstimateCreate(VoyageSpeedEstimateBase):
    """Schema for creating a voyage speed estimate."""
    pass  # All fields required

class VoyageSpeedEstimateUpdate(BaseModel):
    """Schema for updating a voyage speed estimate (partial)."""
    profile: Optional[str] = Field(None, pattern="^(eco|standard|fast)$")
    speed_knots: Optional[float] = None  # speed in knots
    expected_emissions_kg_co2: Optional[float] = None  # expected emissions in kg CO2
    expected_arrival_delay_minutes: Optional[int] = None  # expected arrival delay in minutes


class VoyageSpeedEstimate(VoyageSpeedEstimateBase):
    """Schema for voyage speed estimate responses (includes ID and timestamps)."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility


