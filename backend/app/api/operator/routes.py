from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.route import Route
from app.models.user import User
from app.schemas.route import RouteCreate, RouteUpdate, Route as RouteSchema

router = APIRouter(
    prefix="/routes",
    tags=["routes"],
    dependencies=[Depends(get_current_user)],
)


def _get_operator_scoped_route(
    db: Session,
    operator_id: int,
    route_id: int,
) -> Route:
    route = (
        db.query(Route)
        .filter(Route.id == route_id, Route.operator_id == operator_id)
        .first()
    )
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return route


@router.post(
    "/",
    response_model=RouteSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_route(
    payload: RouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new route for the current operator."""

    existing = (
        db.query(Route)
        .filter(Route.operator_id == current_user.operator_id, Route.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A route with this name already exists for the operator",
        )

    db_route = Route(
        operator_id=current_user.operator_id,
        name=payload.name,
        departure_port=payload.departure_port,
        arrival_port=payload.arrival_port,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        route_geometry=payload.route_geometry,
        is_active=payload.is_active,
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route


@router.get("/", response_model=List[RouteSchema])
def list_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List routes for the current operator (admins and captains)."""

    if current_user.role not in {"admin", "captain"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return (
        db.query(Route)
        .filter(Route.operator_id == current_user.operator_id)
        .order_by(Route.name.asc())
        .all()
    )


@router.get("/{route_id}", response_model=RouteSchema)
def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a specific route for the current operator."""

    if current_user.role not in {"admin", "captain"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return _get_operator_scoped_route(db, current_user.operator_id, route_id)


@router.patch(
    "/{route_id}",
    response_model=RouteSchema,
    dependencies=[Depends(require_admin)],
)
def update_route(
    route_id: int,
    payload: RouteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a route belonging to the current operator."""

    db_route = _get_operator_scoped_route(db, current_user.operator_id, route_id)

    if payload.name is not None and payload.name != db_route.name:
        conflict = (
            db.query(Route)
            .filter(
                Route.operator_id == current_user.operator_id,
                Route.name == payload.name,
                Route.id != route_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A route with this name already exists for the operator",
            )
        db_route.name = payload.name

    if payload.departure_port is not None:
        db_route.departure_port = payload.departure_port
    if payload.arrival_port is not None:
        db_route.arrival_port = payload.arrival_port
    if payload.departure_time is not None:
        db_route.departure_time = payload.departure_time
    if payload.arrival_time is not None:
        db_route.arrival_time = payload.arrival_time
    if "route_geometry" in payload.model_fields_set:
        db_route.route_geometry = payload.route_geometry
    if payload.is_active is not None:
        db_route.is_active = payload.is_active

    db.commit()
    db.refresh(db_route)
    return db_route


@router.delete(
    "/{route_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a route belonging to the current operator."""

    db_route = _get_operator_scoped_route(db, current_user.operator_id, route_id)

    db.delete(db_route)
    db.commit()
    return None
