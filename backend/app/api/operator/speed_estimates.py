from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.route import Route
from app.models.ship import Ship
from app.models.speed_to_emissions_estimate import SpeedToEmissionsEstimate
from app.models.user import User
from app.schemas.speed_to_emissions_estimate import (
    AllSpeedEstimatesResponse,
    RouteShipAnchorsOut,
    SpeedEstimateAnchor,
    SpeedEstimateAnchorOut,
    SpeedEstimateAnchorsResponse,
    SpeedEstimateAnchorsUpsert,
)

PROFILES = ("slow", "standard", "fast")

router = APIRouter(
    prefix="/speed-estimates",
    tags=["speed-estimates"],
    dependencies=[Depends(get_current_user)],
)


def _get_operator_route_and_ship(
    db: Session,
    current_user: User,
    route_id: int,
    ship_id: int,
) -> tuple[Route, Ship]:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Route belongs to another operator")

    ship = db.query(Ship).filter(Ship.id == ship_id).first()
    if not ship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")
    if ship.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ship belongs to another operator")

    return route, ship


@router.get("/", response_model=AllSpeedEstimatesResponse)
def list_all_speed_estimates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return all speed-to-emissions estimates for the current operator.
    """
    operator_id = current_user.operator_id

    # Join through Route to filter by operator, also join Ship to get names
    estimates = (
        db.query(SpeedToEmissionsEstimate, Route, Ship)
        .join(Route, SpeedToEmissionsEstimate.route_id == Route.id)
        .join(Ship, SpeedToEmissionsEstimate.ship_id == Ship.id)
        .filter(Route.operator_id == operator_id)
        .order_by(Route.name, Ship.name, SpeedToEmissionsEstimate.profile)
        .all()
    )

    # Group by route+ship combination
    grouped: Dict[tuple, Dict] = {}
    for estimate, route, ship in estimates:
        key = (route.id, ship.id)

        if key not in grouped:
            grouped[key] = {
                "route_id": route.id,
                "route_name": route.name,
                "ship_id": ship.id,
                "ship_name": ship.name,
                "anchors": {},
            }

        # Add this anchor to the group
        grouped[key]["anchors"][estimate.profile] = SpeedEstimateAnchorOut(
            id=estimate.id,
            profile=estimate.profile,
            speed_knots=float(estimate.speed_knots),
            expected_emissions_kg_co2=float(estimate.expected_emissions_kg_co2),
            expected_arrival_delta_minutes=estimate.expected_arrival_delta_minutes,
            created_at=estimate.created_at,
        )

    # Convert to list of response objects
    items: List[RouteShipAnchorsOut] = [
        RouteShipAnchorsOut(**data) for data in grouped.values()
    ]

    return AllSpeedEstimatesResponse(items=items)


@router.get(
    "/routes/{route_id}/ships/{ship_id}/anchors",
    response_model=SpeedEstimateAnchorsResponse,
)
def get_speed_anchors(
    route_id: int,
    ship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return anchors for the operator's route+ship combination."""

    if current_user.role not in {"admin", "captain"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    _get_operator_route_and_ship(db, current_user, route_id, ship_id)

    anchors = (
        db.query(SpeedToEmissionsEstimate)
        .filter(
            SpeedToEmissionsEstimate.route_id == route_id,
            SpeedToEmissionsEstimate.ship_id == ship_id,
        )
        .all()
    )

    if not anchors:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No anchors configured for this route and ship",
        )

    anchor_map: Dict[str, SpeedEstimateAnchorOut] = {}
    for anchor in anchors:
        anchor_map[anchor.profile] = anchor

    if any(profile not in anchor_map for profile in PROFILES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incomplete anchors configured for this route and ship",
        )

    return SpeedEstimateAnchorsResponse(anchors=anchor_map)


@router.put(
    "/routes/{route_id}/ships/{ship_id}/anchors",
    response_model=SpeedEstimateAnchorsResponse,
    dependencies=[Depends(require_admin)],
)
def upsert_speed_anchors(
    route_id: int,
    ship_id: int,
    payload: SpeedEstimateAnchorsUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update anchors for the operator's route+ship pairing."""

    _get_operator_route_and_ship(db, current_user, route_id, ship_id)

    existing = (
        db.query(SpeedToEmissionsEstimate)
        .filter(
            SpeedToEmissionsEstimate.route_id == route_id,
            SpeedToEmissionsEstimate.ship_id == ship_id,
        )
        .all()
    )
    existing_map = {anchor.profile: anchor for anchor in existing}

    for profile in PROFILES:
        anchor_payload: SpeedEstimateAnchor = getattr(payload, profile)
        anchor = existing_map.get(profile)
        if anchor:
            anchor.speed_knots = anchor_payload.speed_knots
            anchor.expected_emissions_kg_co2 = anchor_payload.expected_emissions_kg_co2
            anchor.expected_arrival_delta_minutes = anchor_payload.expected_arrival_delta_minutes
        else:
            db.add(
                SpeedToEmissionsEstimate(
                    route_id=route_id,
                    ship_id=ship_id,
                    profile=profile,
                    speed_knots=anchor_payload.speed_knots,
                    expected_emissions_kg_co2=anchor_payload.expected_emissions_kg_co2,
                    expected_arrival_delta_minutes=anchor_payload.expected_arrival_delta_minutes,
                )
            )

    # Remove any stale anchors with unexpected profiles for this pairing
    for profile, anchor in existing_map.items():
        if profile not in PROFILES:
            db.delete(anchor)

    db.commit()

    refreshed = (
        db.query(SpeedToEmissionsEstimate)
        .filter(
            SpeedToEmissionsEstimate.route_id == route_id,
            SpeedToEmissionsEstimate.ship_id == ship_id,
        )
        .all()
    )
    anchor_map: Dict[str, SpeedEstimateAnchorOut] = {anchor.profile: anchor for anchor in refreshed}

    return SpeedEstimateAnchorsResponse(anchors=anchor_map)
