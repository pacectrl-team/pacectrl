from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.voyage import Voyage
from app.models.widget_config import WidgetConfig
from app.models.voyage_speed_estimate import VoyageSpeedEstimate
from app.schemas.public_widget import PublicWidgetConfigOut
from app.core.config import settings

router = APIRouter(
    prefix="/widget",
    tags=["widget"]
)


def _resolve_public_base_url(request: Request) -> str:
    if settings.public_base_url:
        return settings.public_base_url.rstrip("/")
    return str(request.base_url).rstrip("/")


@router.get("/config", response_model=PublicWidgetConfigOut)
def get_config(
    request: Request,
    external_trip_id: Optional[str] = Query(None, description="External trip ID to fetch config for"),
    voyage_id: Optional[int] = Query(None, description="Voyage ID to fetch config for"),
    db: Session = Depends(get_db),
):
    """
    Return the widget configuration for a given external_trip_id or voyage_id.
    """
    if not external_trip_id and not voyage_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either external_trip_id or voyage_id must be provided")

    # Find the voyage
    voyage_query = db.query(Voyage)
    if external_trip_id:
        voyage = voyage_query.filter(Voyage.external_trip_id == external_trip_id).first()
    else:
        voyage = voyage_query.filter(Voyage.id == voyage_id).first()

    if not voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")

    # Get widget config if linked
    widget_config = None
    if voyage.widget_config_id:
        widget_config = db.query(WidgetConfig).filter(WidgetConfig.id == voyage.widget_config_id).first()

    if not widget_config:
        # Use default config if none linked, could also be a row in the DB that is easy to edit via admin. But for now, hardcoded.
        widget_config = WidgetConfig(
            name="Default",
            description="Default widget configuration",
            config={
                "default_speed_percentage": 50,
                "theme": {}
            }
        )

    # Get speed estimates
    speed_estimates = db.query(VoyageSpeedEstimate).filter(VoyageSpeedEstimate.voyage_id == voyage.id).all()

    #enforce three anchor points, one per profile
    if not speed_estimates:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No speed estimates found for this voyage")
    
    profiles = {estimate.profile for estimate in speed_estimates}
    required_profiles = {"eco", "standard", "fast"}
    if not required_profiles.issubset(profiles):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete speed estimates for this voyage")

    # Build anchors dict for the response, keyed by profile, eco/standard/fast
    anchors = {}
    for estimate in speed_estimates:
        anchors[estimate.profile] = {
            "profile": estimate.profile,
            "speed_knots": estimate.speed_knots,
            "expected_emissions_kg_co2": estimate.expected_emissions_kg_co2,
            "expected_arrival_delay_minutes": estimate.expected_arrival_delay_minutes,
        }

    # Compute derived values for the widget to have easy access to (widget loads faster)
    derived = {
        "min_speed": min((estimate.speed_knots for estimate in speed_estimates), default=0),
        "max_speed": max((estimate.speed_knots for estimate in speed_estimates), default=0),
    }

    # response construction
    public_base = _resolve_public_base_url(request)

    response = {
        "id": voyage.id,
        "name": widget_config.name if widget_config else "Default",
        "description": widget_config.description if widget_config else None,
        "default_speed_percentage": widget_config.config.get("default_speed_percentage", 50) if widget_config else 50,
        "default_departure_datetime": voyage.departure_datetime,
        "default_arrival_datetime": voyage.arrival_datetime,
        "status": voyage.status,
        "derived": derived,
        "theme": widget_config.config.get("theme", {}) if widget_config else {},
        "anchors": anchors,
        "widget_script_url": f"{public_base}/widget.js" if public_base else None,
    }

    return response