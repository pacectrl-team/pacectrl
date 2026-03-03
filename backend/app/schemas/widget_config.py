import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

# Accepts: #RGB, #RRGGBB, #RGBA, #RRGGBBAA,
#          rgb(...), rgba(...), hsl(...), hsla(...), color(...)
#          CSS named colours (letters only, e.g. "white", "transparent")
_CSS_COLOR_RE = re.compile(
    r"^(#[0-9a-fA-F]{3,8}"
    r"|(?:rgb|rgba|hsl|hsla|color)\([^)]*\)"
    r"|[a-zA-Z][-a-zA-Z]*)$"
)


def _validate_css_color(value: str) -> str:
    """Raise ValueError if value is not a recognisable CSS colour."""
    if not _CSS_COLOR_RE.match(value.strip()):
        raise ValueError(
            f"{value!r} is not a valid CSS colour. "
            "Use hex (#RGB / #RRGGBB), rgb(), rgba(), hsl(), hsla(), or a named colour."
        )
    return value


class ThemeData(BaseModel):
    """Theme settings for the widget."""

    # Slider track colours (filled / unfilled portions of the range input)
    slider_slow_color: str = Field(..., description="Slider track color for the slow (eco) portion")
    slider_fast_color: str = Field(..., description="Slider track color for the fast (rush) portion")

    # Card background gradient hue endpoints (any CSS colour – HSL recommended)
    background_hue_slow_color: Optional[str] = Field(
        None,
        description="Background card gradient colour when slider is at the slow end (default: hsl(140,82%,92%))",
    )
    background_hue_fast_color: Optional[str] = Field(
        None,
        description="Background card gradient colour when slider is at the fast end (default: hsl(0,82%,92%))",
    )

    # General appearance
    font_color: str = Field(..., description="Color for text")
    background_color: str = Field(..., description="Fallback / base background color")
    border_color: str = Field(..., description="Border color")
    border_width: int = Field(..., ge=0, description="Border width in pixels")
    font_size: int = Field(..., gt=0, description="Font size in pixels")
    font_family: str = Field(..., description="Font family")
    rounding_px: int = Field(..., ge=0, description="Rounding radius in pixels")
    slider_dot_color: str = Field(..., description="Color for slider dot / thumb")

    # --- CSS colour validators ---
    @field_validator(
        "slider_slow_color",
        "slider_fast_color",
        "font_color",
        "background_color",
        "border_color",
        "slider_dot_color",
    )
    @classmethod
    def check_required_colors(cls, v: str) -> str:
        """Validate that all required colour fields contain a valid CSS colour."""
        return _validate_css_color(v)

    @field_validator("background_hue_slow_color", "background_hue_fast_color")
    @classmethod
    def check_optional_colors(cls, v: Optional[str]) -> Optional[str]:
        """Validate optional colour fields when a value is provided."""
        if v is not None:
            return _validate_css_color(v)
        return v

    # Customisable labels shown inside the widget
    slider_label: Optional[str] = Field(None, description="Label text above the slider (default: 'Vote on the trip speed')")
    scale_label_slow: Optional[str] = Field(None, description="Scale label at the slow end (default: 'Calmer seas')")
    scale_label_fast: Optional[str] = Field(None, description="Scale label at the fast end (default: 'Arrive sooner')")
    info_text: Optional[str] = Field(None, description="Explanatory text shown when the info button is clicked")
    mood_slow_text: Optional[str] = Field(None, description="Mood label when speed is slower than standard (default: 'Plenty of time')")
    mood_standard_text: Optional[str] = Field(None, description="Mood label at standard speed (default: 'Balanced')")
    mood_fast_text: Optional[str] = Field(None, description="Mood label when speed is faster than standard (default: 'Racing')")

    # Layout
    widget_width: Optional[str] = Field(
        None,
        description="Static CSS width for the widget (e.g. '480px', '100%'). If omitted, defaults to min(640px, 100%).",
    )


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
    updated_at: datetime

    class Config:
        from_attributes = True