# Import models here so Alembic autogenerate sees the metadata
from app.models.operator import Operator  # noqa: F401
from app.models.api_log import ApiLog  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.voyage import Voyage  # noqa: F401
from app.models.voyage_speed_estimate import VoyageSpeedEstimate  # noqa: F401
from app.models.choice_intent import ChoiceIntent  # noqa: F401
from app.models.widget_config import WidgetConfig  # noqa: F401
from app.models.confirmed_choice import ConfirmedChoice  # noqa: F401
from app.models.ship import Ship  # noqa: F401
