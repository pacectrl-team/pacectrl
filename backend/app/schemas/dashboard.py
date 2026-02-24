from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class OperatorOverview(BaseModel):
    voyages: int
    routes: int
    widget_configs: int
    users: int
    ships: int


class VoyageMetrics(BaseModel):
    voyage_id: int
    external_trip_id: Optional[str]
    status: str
    route_name: str
    departure_port: str
    arrival_port: str
    ship_name: str
    # Scheduled datetimes (date from voyage + time from route)
    departure_datetime: datetime
    arrival_datetime: datetime
    # Average voted arrival time based on passengers' speed preferences
    voted_arrival_datetime: Optional[datetime]
    # Intent counts
    total_intents: int
    active_intents: int
    consumed_intents: int
    expired_intents: int
    # Confirmed-choice stats
    confirmed_choices_count: int
    avg_delta_pct: Optional[float]
    median_delta_pct: Optional[float]
    min_delta_pct: Optional[float]
    max_delta_pct: Optional[float]
    avg_slider_value: Optional[float]


class ConfirmedChoicesPerDay(BaseModel):
    day: date
    count: int


class VoyageStatusBreakdown(BaseModel):
    planned: int
    completed: int
    cancelled: int


class VoyagesDashboardResponse(BaseModel):
    total_voyages: int
    total_confirmed_choices: int
    confirmed_choices_last_30_days: int
    total_active_intents: int
    voyage_status_breakdown: VoyageStatusBreakdown
    avg_delta_pct_all_confirmed: Optional[float]
    median_delta_pct_all_confirmed: Optional[float]
    confirmed_choices_per_day: List[ConfirmedChoicesPerDay]
    voyages: List[VoyageMetrics]
