from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.pattern import compile_pattern
from app.models.route import Route
from app.models.ship import Ship
from app.models.user import User
from app.models.voyage import Voyage
from app.models.voyage_creation_rule import VoyageCreationRule
from app.models.widget_config import WidgetConfig
from app.schemas.voyage_creation_rule import (
    VoyageCreationRule as VoyageCreationRuleSchema,
    VoyageCreationRuleApply,
    VoyageCreationRuleCreate,
    VoyageCreationRuleUpdate,
)

router = APIRouter(
    prefix="/voyage-creation-rules",
    tags=["voyage-creation-rules"],
    dependencies=[Depends(get_current_user)],
)


def _get_scoped_rule(db: Session, operator_id: int, rule_id: int) -> VoyageCreationRule:
    """Fetch a rule by ID, scoped to the given operator. Raises 404 if not found."""
    rule = (
        db.query(VoyageCreationRule)
        .filter(
            VoyageCreationRule.id == rule_id,
            VoyageCreationRule.operator_id == operator_id,
        )
        .first()
    )
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage creation rule not found")
    return rule


def _validate_pattern(pattern: str) -> None:
    """Compile the pattern and raise 400 if it contains unrecognised tokens."""
    try:
        compile_pattern(pattern)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _validate_fk_ownership(
    db: Session,
    operator_id: int,
    route_id: int | None = None,
    ship_id: int | None = None,
    widget_config_id: int | None = None,
) -> None:
    """
    Verify that the provided FK IDs all belong to the given operator.
    Raises 403 or 404 as appropriate.
    """
    if route_id is not None:
        route = db.query(Route).filter(Route.id == route_id).first()
        if not route:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
        if route.operator_id != operator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Route belongs to another operator")

    if ship_id is not None:
        ship = db.query(Ship).filter(Ship.id == ship_id).first()
        if not ship:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ship not found")
        if ship.operator_id != operator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ship belongs to another operator")

    if widget_config_id is not None:
        widget_config = db.query(WidgetConfig).filter(WidgetConfig.id == widget_config_id).first()
        if not widget_config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget config not found")
        if widget_config.operator_id != operator_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Widget config belongs to another operator",
            )


@router.post(
    "/",
    response_model=VoyageCreationRuleSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_voyage_creation_rule(
    payload: VoyageCreationRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new voyage creation rule for the current operator."""

    # Validate the pattern compiles cleanly.
    _validate_pattern(payload.pattern)

    # Ensure name is unique per operator.
    existing = (
        db.query(VoyageCreationRule)
        .filter(
            VoyageCreationRule.operator_id == current_user.operator_id,
            VoyageCreationRule.name == payload.name,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A voyage creation rule with this name already exists for the operator",
        )

    # Validate all FK references belong to the operator.
    _validate_fk_ownership(
        db,
        current_user.operator_id,
        route_id=payload.route_id,
        ship_id=payload.ship_id,
        widget_config_id=payload.widget_config_id,
    )

    db_rule = VoyageCreationRule(
        operator_id=current_user.operator_id,
        name=payload.name,
        pattern=payload.pattern,
        route_id=payload.route_id,
        ship_id=payload.ship_id,
        widget_config_id=payload.widget_config_id,
        is_active=payload.is_active,
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.get("/", response_model=List[VoyageCreationRuleSchema])
def list_voyage_creation_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all voyage creation rules for the current operator, ordered by name."""

    return (
        db.query(VoyageCreationRule)
        .filter(VoyageCreationRule.operator_id == current_user.operator_id)
        .order_by(VoyageCreationRule.name.asc())
        .all()
    )


@router.get("/{rule_id}", response_model=VoyageCreationRuleSchema)
def get_voyage_creation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a specific voyage creation rule."""

    return _get_scoped_rule(db, current_user.operator_id, rule_id)


@router.patch(
    "/{rule_id}",
    response_model=VoyageCreationRuleSchema,
    dependencies=[Depends(require_admin)],
)
def update_voyage_creation_rule(
    rule_id: int,
    payload: VoyageCreationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a voyage creation rule."""

    db_rule = _get_scoped_rule(db, current_user.operator_id, rule_id)

    # Validate pattern if it is being changed.
    if payload.pattern is not None:
        _validate_pattern(payload.pattern)

    # Validate name uniqueness if it is being changed.
    if payload.name is not None and payload.name != db_rule.name:
        conflict = (
            db.query(VoyageCreationRule)
            .filter(
                VoyageCreationRule.operator_id == current_user.operator_id,
                VoyageCreationRule.name == payload.name,
                VoyageCreationRule.id != rule_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A voyage creation rule with this name already exists for the operator",
            )

    # Validate FK ownership for any FK field that is being changed.
    _validate_fk_ownership(
        db,
        current_user.operator_id,
        route_id=payload.route_id,
        ship_id=payload.ship_id,
        widget_config_id=payload.widget_config_id,
    )

    # Apply updates for any fields included in the request.
    if payload.name is not None:
        db_rule.name = payload.name
    if payload.pattern is not None:
        db_rule.pattern = payload.pattern
    if payload.route_id is not None:
        db_rule.route_id = payload.route_id
    if payload.ship_id is not None:
        db_rule.ship_id = payload.ship_id
    if payload.widget_config_id is not None:
        db_rule.widget_config_id = payload.widget_config_id
    if payload.is_active is not None:
        db_rule.is_active = payload.is_active

    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.delete(
    "/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_voyage_creation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a voyage creation rule.

    Voyages previously created by this rule keep their data — the
    voyage_creation_rule_id FK is set to NULL automatically by the database.
    """

    db_rule = _get_scoped_rule(db, current_user.operator_id, rule_id)
    db.delete(db_rule)
    db.commit()


@router.post(
    "/{rule_id}/apply",
    dependencies=[Depends(require_admin)],
)
def apply_voyage_creation_rule(
    rule_id: int,
    payload: VoyageCreationRuleApply,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Apply the current rule settings to all planned voyages that were created
    by this rule.

    Updates route_id, ship_id, and widget_config_id on each matched voyage to
    reflect the rule's current configuration.

    If from_date is provided, only voyages with departure_date >= from_date
    are updated.  If omitted, all linked planned voyages are updated.

    Returns the number of voyages that were updated.
    """

    db_rule = _get_scoped_rule(db, current_user.operator_id, rule_id)

    # Build query for planned voyages linked to this rule.
    query = db.query(Voyage).filter(
        Voyage.voyage_creation_rule_id == rule_id,
        Voyage.operator_id == current_user.operator_id,
        Voyage.status == "planned",
    )

    if payload.from_date is not None:
        query = query.filter(Voyage.departure_date >= payload.from_date)

    voyages = query.all()

    for voyage in voyages:
        voyage.route_id = db_rule.route_id
        voyage.ship_id = db_rule.ship_id
        voyage.widget_config_id = db_rule.widget_config_id

    db.commit()

    return {"updated_count": len(voyages)}
