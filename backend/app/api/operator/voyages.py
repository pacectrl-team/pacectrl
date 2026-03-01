from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user, get_operator_from_jwt_or_secret, require_admin
from app.core.pattern import extract_departure_date
from app.models.confirmed_choice import ConfirmedChoice
from app.models.operator import Operator
from app.models.user import User
from app.models.voyage import Voyage
from app.models.voyage_creation_rule import VoyageCreationRule
from app.models.choice_intent import ChoiceIntent
from app.models.widget_config import WidgetConfig
from app.models.route import Route
from app.models.ship import Ship
from app.schemas.voyage import VoyageCreate, VoyageUpdate, Voyage as VoyageSchema
from app.schemas.voyage_creation_rule import VoyageEnsure

router = APIRouter(
    prefix="/voyages",
    tags=["voyages"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=VoyageSchema, dependencies=[Depends(require_admin)])
def create_voyage(
    voyage: VoyageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new voyage."""
    # Check that the voyage is being created for the current user's operator
    if voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create voyages for another operator")
    
    # Check uniqueness of external_trip_id per operator
    if voyage.external_trip_id:
        existing = db.query(Voyage).filter(
            Voyage.operator_id == voyage.operator_id,
            Voyage.external_trip_id == voyage.external_trip_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="External trip ID already exists for this operator")

    # Validate widget config belongs to the same operator if provided
    if voyage.widget_config_id is not None:
        config = db.query(WidgetConfig).filter(WidgetConfig.id == voyage.widget_config_id).first()
        if not config or config.operator_id != current_user.operator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid widget config for this operator")

    db_route = db.query(Route).filter(Route.id == voyage.route_id).first()
    if not db_route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if db_route.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Route belongs to another operator")

    db_ship = db.query(Ship).filter(Ship.id == voyage.ship_id).first()
    if not db_ship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")
    if db_ship.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ship belongs to another operator")

    # Derive arrival_date from the route's duration_nights if the caller did not supply one.
    if voyage.arrival_date is None:
        arrival_date = voyage.departure_date + timedelta(days=db_route.duration_nights)
    else:
        arrival_date = voyage.arrival_date

    if arrival_date < voyage.departure_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arrival date cannot be before departure date")

    existing_route_departure = db.query(Voyage).filter(
        Voyage.operator_id == voyage.operator_id,
        Voyage.route_id == voyage.route_id,
        Voyage.departure_date == voyage.departure_date,
    ).first()
    if existing_route_departure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A voyage already exists for this route on the selected departure date",
        )

    # Create voyage instance
    db_voyage = Voyage(
        operator_id=voyage.operator_id,
        external_trip_id=voyage.external_trip_id,
        widget_config_id=voyage.widget_config_id,
        status=voyage.status,
        route_id=voyage.route_id,
        ship_id=voyage.ship_id,
        departure_date=voyage.departure_date,
        arrival_date=arrival_date,
    )
    db.add(db_voyage)
    db.commit()
    db.refresh(db_voyage)
    return db_voyage


@router.post(
    "/ensure",
    response_model=VoyageSchema,
    status_code=status.HTTP_200_OK,
)
def ensure_voyage(
    payload: VoyageEnsure,
    db: Session = Depends(get_db),
    operator: Operator = Depends(get_operator_from_jwt_or_secret),
):
    """
    Ensure a voyage exists for the given external_trip_id.

    Accepts either a JWT Bearer token or an X-Webhook-Secret header, so
    operator backends can call this without a user login session.

    Behaviour:
    1. If a voyage already exists for (operator, external_trip_id) it is
       returned immediately — the call is idempotent.
    2. Active voyage creation rules are tested in order (by id).  The first
       rule whose pattern matches the external_trip_id is used to create
       a new voyage (departure_date extracted from the pattern; arrival_date
       derived from the route's duration_nights).
    3. If no rule matches, 404 is returned.
    """

    # Idempotency — return the voyage if it already exists.
    existing = (
        db.query(Voyage)
        .filter(
            Voyage.operator_id == operator.id,
            Voyage.external_trip_id == payload.external_trip_id,
        )
        .first()
    )
    if existing:
        return existing

    # Try each active rule in insertion order.
    rules = (
        db.query(VoyageCreationRule)
        .filter(
            VoyageCreationRule.operator_id == operator.id,
            VoyageCreationRule.is_active == True,  # noqa: E712
        )
        .order_by(VoyageCreationRule.id.asc())
        .all()
    )

    matched_rule = None
    departure_date = None

    for rule in rules:
        d = extract_departure_date(rule.pattern, payload.external_trip_id)
        if d is not None:
            matched_rule = rule
            departure_date = d
            break

    if matched_rule is None or departure_date is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active voyage creation rule matched this external_trip_id",
        )

    # Fetch the route to derive arrival_date from duration_nights.
    route = db.query(Route).filter(Route.id == matched_rule.route_id).first()
    arrival_date = departure_date + timedelta(days=route.duration_nights)

    db_voyage = Voyage(
        operator_id=operator.id,
        external_trip_id=payload.external_trip_id,
        route_id=matched_rule.route_id,
        ship_id=matched_rule.ship_id,
        widget_config_id=matched_rule.widget_config_id,
        departure_date=departure_date,
        arrival_date=arrival_date,
        status="planned",
        voyage_creation_rule_id=matched_rule.id,
    )
    db.add(db_voyage)
    db.commit()
    db.refresh(db_voyage)
    return db_voyage
def _attach_intent_counts(db: Session, voyages: list[Voyage]) -> list[dict]:
    """Attach intent_count to each voyage."""
    voyage_ids = [v.id for v in voyages]
    if not voyage_ids:
        return []
    counts = (
        db.query(ChoiceIntent.voyage_id, func.count(ChoiceIntent.intent_id))
        .filter(ChoiceIntent.voyage_id.in_(voyage_ids))
        .group_by(ChoiceIntent.voyage_id)
        .all()
    )
    count_map = {vid: cnt for vid, cnt in counts}
    results = []
    for v in voyages:
        d = {c.name: getattr(v, c.name) for c in v.__table__.columns}
        d["intent_count"] = count_map.get(v.id, 0)
        results.append(d)
    return results


@router.get("/", response_model=List[VoyageSchema])
def list_voyages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List voyages for the current operator."""
    voyages = db.query(Voyage).filter(Voyage.operator_id == current_user.operator_id).all()
    return _attach_intent_counts(db, voyages)


@router.get("/{voyage_id}", response_model=VoyageSchema)
def get_voyage(
    voyage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a voyage by ID."""

    db_voyage = db.query(Voyage).filter(Voyage.id == voyage_id).first()
    if not db_voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")

    if db_voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return _attach_intent_counts(db, [db_voyage])[0]


@router.patch("/{voyage_id}", response_model=VoyageSchema, dependencies=[Depends(require_admin)])
def update_voyage(
    voyage_id: int,
    voyage_update: VoyageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a voyage."""

    db_voyage = db.query(Voyage).filter(Voyage.id == voyage_id).first()
    if not db_voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")

    if db_voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update voyages for another operator")

    # Check uniqueness if external_trip_id is being updated
    if voyage_update.external_trip_id is not None and voyage_update.external_trip_id != db_voyage.external_trip_id:
        existing = db.query(Voyage).filter(
            Voyage.operator_id == db_voyage.operator_id,
            Voyage.external_trip_id == voyage_update.external_trip_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="External trip ID already exists for this operator")

    # Update fields if provided
    if voyage_update.external_trip_id is not None:
        db_voyage.external_trip_id = voyage_update.external_trip_id
    if "widget_config_id" in voyage_update.model_fields_set:
        if voyage_update.widget_config_id is not None:
            config = db.query(WidgetConfig).filter(WidgetConfig.id == voyage_update.widget_config_id).first()
            if not config or config.operator_id != current_user.operator_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid widget config for this operator")
        db_voyage.widget_config_id = voyage_update.widget_config_id
    if voyage_update.status is not None:
        db_voyage.status = voyage_update.status

    new_route_id = db_voyage.route_id
    if "route_id" in voyage_update.model_fields_set:
        if voyage_update.route_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Route cannot be unset")
        db_route = db.query(Route).filter(Route.id == voyage_update.route_id).first()
        if not db_route:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
        if db_route.operator_id != current_user.operator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Route belongs to another operator")
        new_route_id = voyage_update.route_id
        db_voyage.route_id = voyage_update.route_id

    if "ship_id" in voyage_update.model_fields_set:
        if voyage_update.ship_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ship cannot be unset")
        db_ship = db.query(Ship).filter(Ship.id == voyage_update.ship_id).first()
        if not db_ship:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")
        if db_ship.operator_id != current_user.operator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ship belongs to another operator")
        db_voyage.ship_id = voyage_update.ship_id

    if voyage_update.departure_date is not None:
        db_voyage.departure_date = voyage_update.departure_date

    # Auto-derive arrival_date when departure_date or route changes but arrival_date is not explicitly set.
    departure_or_route_changed = (
        voyage_update.departure_date is not None or "route_id" in voyage_update.model_fields_set
    )
    if "arrival_date" in voyage_update.model_fields_set:
        # Caller explicitly provided arrival_date — validate it is not null before applying.
        if voyage_update.arrival_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="arrival_date cannot be unset",
            )
        db_voyage.arrival_date = voyage_update.arrival_date
    elif departure_or_route_changed:
        # Re-derive from the (potentially updated) route's duration_nights.
        resolved_route = db.query(Route).filter(Route.id == db_voyage.route_id).first()
        db_voyage.arrival_date = db_voyage.departure_date + timedelta(days=resolved_route.duration_nights)

    if db_voyage.arrival_date < db_voyage.departure_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arrival date cannot be before departure date")

    new_departure_date = db_voyage.departure_date

    existing_route_departure = (
        db.query(Voyage)
        .filter(
            Voyage.operator_id == db_voyage.operator_id,
            Voyage.route_id == new_route_id,
            Voyage.departure_date == new_departure_date,
            Voyage.id != db_voyage.id,
        )
        .first()
    )
    if existing_route_departure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A voyage already exists for this route on the selected departure date",
        )

    db.commit()
    db.refresh(db_voyage)
    return db_voyage


@router.delete("/{voyage_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_voyage(
    voyage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a voyage. Cascades to related choice intents. Only allowed when there are no confirmed choices on it."""

    db_voyage = db.query(Voyage).filter(Voyage.id == voyage_id).first()
    if not db_voyage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")

    if db_voyage.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete voyages for another operator")

    # Prevent deletion if confirmed bookings already exist — that data should be kept for auditing.
    confirmed_count = db.query(ConfirmedChoice).filter(ConfirmedChoice.voyage_id == voyage_id).count()
    if confirmed_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete voyage with {confirmed_count} confirmed choice(s). Cancel it instead.",
        )

    db.delete(db_voyage)
    db.commit()
    return None
