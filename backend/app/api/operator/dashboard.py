from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.voyage import Voyage
from app.models.route import Route
from app.models.ship import Ship
from app.models.widget_config import WidgetConfig
from pydantic import BaseModel

# Pydantic schema for the overview response. Counts of various entities.
class OperatorOverview(BaseModel):
    voyages: int
    routes: int
    widget_configs: int
    users: int
    ships: int

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/overview", response_model=OperatorOverview)
def get_operator_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get aggregated counts for the current operator's entities.
    """
    operator_id = current_user.operator_id

    # Count voyages for the operator
    # This creates a query for Voyage objects, filters by operator_id, and counts the results
    voyages_count = db.query(Voyage).filter(Voyage.operator_id == operator_id).count()

    # Count routes for the operator
    routes_count = db.query(Route).filter(Route.operator_id == operator_id).count()

    # Count widget configs for the operator
    # Widget configs are linked to voyages, so we count them directly
    widget_configs_count = db.query(WidgetConfig).filter(WidgetConfig.operator_id == operator_id).count()

    # Count users for the operator
    users_count = db.query(User).filter(User.operator_id == operator_id).count()

    # Count ships for the operator
    ships_count = db.query(Ship).filter(Ship.operator_id == operator_id).count()

    return OperatorOverview(
        voyages=voyages_count,
        routes=routes_count,
        widget_configs=widget_configs_count,
        users=users_count,
        ships=ships_count,
    )