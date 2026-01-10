from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class AnchorOut(BaseModel):
    """Three anchor points for the public widget. Each trip has three points, eco, standard and fast"""
    profile: str
    speed_knots: float
    expected_emissions_kg_co2: float
    expected_arrival_delay_minutes: int


class PublicWidgetConfigOut(BaseModel):
    """Public widget configuration output schema."""
    id: int
    name: str
    description: Optional[str]
    default_speed_percentage: float
    default_departure_datetime: Optional[datetime]
    default_arrival_datetime: Optional[datetime]
    status: str
    #derived is computed server-side just to help the widget. holds min/max speeds etc.
    derived: Dict[str, float]
    theme: Dict[str, Any]
    anchors: Dict[str, AnchorOut]  #key by profile: "eco", "standard", "fast"
    widget_script_url: Optional[str] = Field(
        default=None,
        description="Absolute URL to the PaceCtrl widget bundle (widget.js).",
    )

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility
