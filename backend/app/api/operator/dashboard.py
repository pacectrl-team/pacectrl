from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, cast, Date, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.choice_intent import ChoiceIntent
from app.models.confirmed_choice import ConfirmedChoice
from app.models.route import Route
from app.models.ship import Ship
from app.models.user import User
from app.models.voyage import Voyage
from app.models.widget_config import WidgetConfig
from app.schemas.dashboard import (
    ConfirmedChoicesPerDay,
    OperatorOverview,
    VoyageMetrics,
    VoyagesDashboardResponse,
    VoyageStatusBreakdown,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=OperatorOverview)
def get_operator_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return a count of each entity type belonging to the current operator."""
    operator_id = current_user.operator_id

    return OperatorOverview(
        voyages=db.query(Voyage).filter(Voyage.operator_id == operator_id).count(),
        routes=db.query(Route).filter(Route.operator_id == operator_id).count(),
        widget_configs=db.query(WidgetConfig).filter(WidgetConfig.operator_id == operator_id).count(),
        users=db.query(User).filter(User.operator_id == operator_id).count(),
        ships=db.query(Ship).filter(Ship.operator_id == operator_id).count(),
    )


@router.get("/voyages", response_model=VoyagesDashboardResponse)
def get_voyages_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return aggregated dashboard data for the current operator.

    Includes global headline numbers, a confirmed-choices time-series for the
    last 30 days, and per-voyage intent/choice statistics.
    """
    operator_id = current_user.operator_id
    now = datetime.now(tz=timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # --- Fetch all voyages for this operator ---
    voyages: List[Voyage] = (
        db.query(Voyage)
        .filter(Voyage.operator_id == operator_id)
        .all()
    )
    voyage_ids = [v.id for v in voyages]

    # Pre-load routes and ships into dicts so we can look them up per-voyage
    # without hitting the database again inside the loop below.
    route_map: Dict[int, Route] = {
        r.id: r for r in db.query(Route).filter(Route.operator_id == operator_id).all()
    }
    ship_map: Dict[int, Ship] = {
        s.id: s for s in db.query(Ship).filter(Ship.operator_id == operator_id).all()
    }

    # --- Intent aggregates (one row per voyage) ---
    # We count intents grouped into three buckets using CASE expressions:
    #   active   = not consumed AND not yet expired
    #   consumed = has a consumed_at timestamp
    #   expired  = not consumed AND expires_at is in the past
    intent_agg_rows = []
    if voyage_ids:
        intent_agg_rows = (
            db.query(
                ChoiceIntent.voyage_id,
                func.count().label("total_intents"),
                func.sum(
                    case(
                        (
                            and_(
                                ChoiceIntent.consumed_at.is_(None),
                                ChoiceIntent.expires_at > now,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("active_intents"),
                func.sum(
                    case(
                        (ChoiceIntent.consumed_at.isnot(None), 1),
                        else_=0,
                    )
                ).label("consumed_intents"),
                func.sum(
                    case(
                        (
                            and_(
                                ChoiceIntent.consumed_at.is_(None),
                                ChoiceIntent.expires_at <= now,
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("expired_intents"),
            )
            .filter(ChoiceIntent.voyage_id.in_(voyage_ids))
            .group_by(ChoiceIntent.voyage_id)
            .all()
        )

    intent_by_voyage: Dict[int, object] = {row.voyage_id: row for row in intent_agg_rows}

    # --- Confirmed-choice aggregates (one row per voyage) ---
    cc_agg_rows = []
    if voyage_ids:
        cc_agg_rows = (
            db.query(
                ConfirmedChoice.voyage_id,
                func.count().label("confirmed_choices_count"),
                func.avg(ConfirmedChoice.delta_pct_from_standard).label("avg_delta_pct"),
                func.percentile_cont(0.5)
                .within_group(ConfirmedChoice.delta_pct_from_standard.asc())
                .label("median_delta_pct"),
                func.min(ConfirmedChoice.delta_pct_from_standard).label("min_delta_pct"),
                func.max(ConfirmedChoice.delta_pct_from_standard).label("max_delta_pct"),
                func.avg(ConfirmedChoice.slider_value).label("avg_slider_value"),
            )
            .filter(ConfirmedChoice.voyage_id.in_(voyage_ids))
            .group_by(ConfirmedChoice.voyage_id)
            .all()
        )

    cc_by_voyage: Dict[int, object] = {row.voyage_id: row for row in cc_agg_rows}

    # --- Global confirmed-choice counts ---
    total_confirmed_choices: int = 0
    confirmed_choices_last_30_days: int = 0
    if voyage_ids:
        total_confirmed_choices = (
            db.query(ConfirmedChoice)
            .filter(ConfirmedChoice.voyage_id.in_(voyage_ids))
            .count()
        )
        confirmed_choices_last_30_days = (
            db.query(ConfirmedChoice)
            .filter(
                ConfirmedChoice.voyage_id.in_(voyage_ids),
                ConfirmedChoice.confirmed_at >= thirty_days_ago,
            )
            .count()
        )

    # --- Operator-wide average and median delta % ---
    avg_delta_all: Optional[float] = None
    median_delta_all: Optional[float] = None
    if voyage_ids and total_confirmed_choices > 0:
        avg_row = (
            db.query(func.avg(ConfirmedChoice.delta_pct_from_standard))
            .filter(ConfirmedChoice.voyage_id.in_(voyage_ids))
            .scalar()
        )
        avg_delta_all = float(avg_row) if avg_row is not None else None

        median_row = (
            db.query(
                func.percentile_cont(0.5).within_group(
                    ConfirmedChoice.delta_pct_from_standard.asc()
                )
            )
            .filter(ConfirmedChoice.voyage_id.in_(voyage_ids))
            .scalar()
        )
        median_delta_all = float(median_row) if median_row is not None else None

    # --- Confirmed choices per day for the last 30 days (time-series) ---
    per_day_rows = []
    if voyage_ids:
        per_day_rows = (
            db.query(
                cast(ConfirmedChoice.confirmed_at, Date).label("day"),
                func.count().label("count"),
            )
            .filter(
                ConfirmedChoice.voyage_id.in_(voyage_ids),
                ConfirmedChoice.confirmed_at >= thirty_days_ago,
            )
            .group_by(cast(ConfirmedChoice.confirmed_at, Date))
            .order_by(cast(ConfirmedChoice.confirmed_at, Date))
            .all()
        )

    confirmed_choices_per_day = [
        ConfirmedChoicesPerDay(day=row.day, count=row.count)
        for row in per_day_rows
    ]

    # --- Total active intents across all operator voyages right now ---
    total_active_intents: int = 0
    if voyage_ids:
        total_active_intents = (
            db.query(ChoiceIntent)
            .filter(
                ChoiceIntent.voyage_id.in_(voyage_ids),
                ChoiceIntent.consumed_at.is_(None),
                ChoiceIntent.expires_at > now,
            )
            .count()
        )

    # --- Voyage status breakdown ---
    status_counts: Dict[str, int] = {"planned": 0, "completed": 0, "cancelled": 0}
    for v in voyages:
        if v.status in status_counts:
            status_counts[v.status] += 1

    # --- Assemble per-voyage metrics ---
    voyage_metrics: List[VoyageMetrics] = []
    for v in voyages:
        route = route_map.get(v.route_id)
        ship = ship_map.get(v.ship_id)
        intents = intent_by_voyage.get(v.id)
        cc = cc_by_voyage.get(v.id)

        # Combine voyage date with route time to get full datetimes
        departure_datetime = (
            datetime.combine(v.departure_date, route.departure_time)
            if route else datetime(v.departure_date.year, v.departure_date.month, v.departure_date.day)
        )
        arrival_datetime = (
            datetime.combine(v.arrival_date, route.arrival_time)
            if route else datetime(v.arrival_date.year, v.arrival_date.month, v.arrival_date.day)
        )

        # Calculate the average voted arrival time.
        # Passengers vote on a speed change % (delta_pct). Since distance is fixed,
        # travel time is inversely proportional to speed:
        #   new_duration = standard_duration / (1 + delta_pct / 100)
        # A negative delta means slower speed → later arrival.
        voted_arrival_datetime: Optional[datetime] = None
        avg_delta_pct_for_voyage = float(cc.avg_delta_pct) if cc and cc.avg_delta_pct is not None else None
        if avg_delta_pct_for_voyage is not None:
            standard_duration = arrival_datetime - departure_datetime
            speed_factor = 1 + avg_delta_pct_for_voyage / 100
            if speed_factor > 0:
                voted_duration = standard_duration / speed_factor
                voted_arrival_datetime = departure_datetime + voted_duration

        voyage_metrics.append(
            VoyageMetrics(
                voyage_id=v.id,
                external_trip_id=v.external_trip_id,
                status=v.status,
                route_name=route.name if route else "",
                departure_port=route.departure_port if route else "",
                arrival_port=route.arrival_port if route else "",
                ship_name=ship.name if ship else "",
                departure_datetime=departure_datetime,
                arrival_datetime=arrival_datetime,
                voted_arrival_datetime=voted_arrival_datetime,
                total_intents=int(intents.total_intents) if intents else 0,
                active_intents=int(intents.active_intents) if intents else 0,
                consumed_intents=int(intents.consumed_intents) if intents else 0,
                expired_intents=int(intents.expired_intents) if intents else 0,
                confirmed_choices_count=int(cc.confirmed_choices_count) if cc else 0,
                avg_delta_pct=avg_delta_pct_for_voyage,
                median_delta_pct=float(cc.median_delta_pct) if cc and cc.median_delta_pct is not None else None,
                min_delta_pct=float(cc.min_delta_pct) if cc and cc.min_delta_pct is not None else None,
                max_delta_pct=float(cc.max_delta_pct) if cc and cc.max_delta_pct is not None else None,
                avg_slider_value=float(cc.avg_slider_value) if cc and cc.avg_slider_value is not None else None,
            )
        )

    # Most recent departures first
    voyage_metrics.sort(key=lambda vm: vm.departure_datetime, reverse=True)

    return VoyagesDashboardResponse(
        total_voyages=len(voyages),
        total_confirmed_choices=total_confirmed_choices,
        confirmed_choices_last_30_days=confirmed_choices_last_30_days,
        total_active_intents=total_active_intents,
        voyage_status_breakdown=VoyageStatusBreakdown(**status_counts),
        avg_delta_pct_all_confirmed=avg_delta_all,
        median_delta_pct_all_confirmed=median_delta_all,
        confirmed_choices_per_day=confirmed_choices_per_day,
        voyages=voyage_metrics,
    )