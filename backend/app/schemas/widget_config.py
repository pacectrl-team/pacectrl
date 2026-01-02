from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ThemeData(BaseModel):
    """Theme settings for the widget."""
    slow_color: str = Field(..., description="Color for slow speed option")
    fast_color: str = Field(..., description="Color for fast speed option")
    font_color: str = Field(..., description="Color for text")
    background_color: str = Field(..., description="Background color")
    border_color: str = Field(..., description="Border color")
    border_width: int = Field(..., ge=0, description="Border width in pixels")
    font_size: int = Field(..., gt=0, description="Font size in pixels")
    font_family: str = Field(..., description="Font family")
    rounding_px: int = Field(..., ge=0, description="Rounding radius in pixels")
    slider_dot_color: str = Field(..., description="Color for slider dot")


class WidgetConfigData(BaseModel):
    """Structured data for widget configuration."""
    default_speed_percentage: float = Field(..., ge=0, le=100, description="Default speed as percentage (0-100) between min and max from voyage estimates")
    theme: ThemeData


class WidgetConfigBase(BaseModel):
    """Shared attributes for widget config operations."""

    operator_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    config: WidgetConfigData
    is_active: bool = True


class WidgetConfigCreate(WidgetConfigBase):
    """Payload for creating a widget config."""

    pass


class WidgetConfigUpdate(BaseModel):
    """Partial update for widget configs."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    config: Optional[WidgetConfigData] = None
    is_active: Optional[bool] = None


class WidgetConfig(WidgetConfigBase):
    """Response schema for widget configs."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True