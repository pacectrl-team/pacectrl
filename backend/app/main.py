from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.core.middleware import ApiLoggingMiddleware
from app.core.config import settings
from app.api.operator.auth import router as auth_router
from app.api.operator.operators import router as operators_router
from app.api.operator.users import router as users_router
from app.api.operator.voyages import router as voyages_router
from app.api.operator.speed_estimates import router as speed_estimates_router
from app.api.operator.widget_configs import router as widget_configs_router
from app.api.operator.choice_intents import router as choice_intents_router
from app.api.operator.confirmed_choices import router as confirmed_choices_router
from app.api.operator.ships import router as ships_router
from app.api.operator.routes import router as routes_router
from app.api.public.widget import router as public_widget_router
from app.api.public.choice_intents import router as public_choice_intents_router
from app.api.public.widget_assets import router as widget_assets_router
from app.api.operator.dashboard import router as dashboard_router
from app.api.operator.audit_logs import router as audit_logs_router



# Initialize FastAPI application
app = FastAPI(title="PaceCtrl API")

# Add API logging middleware
app.add_middleware(ApiLoggingMiddleware)

# Configure CORS (allow public widget interactions)
cors_origins = settings.get_cors_origins()
allow_credentials = False if cors_origins == ["*"] else True
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tables are created via Alembic migrations in production
# Base.metadata.create_all(bind=engine)  # Commented out for production

# Add the various routes available
# Operator routes, behind authentication
app.include_router(auth_router, prefix="/api/v1/operator")
app.include_router(operators_router, prefix="/api/v1/operator")
app.include_router(users_router, prefix="/api/v1/operator")
app.include_router(voyages_router, prefix="/api/v1/operator")
app.include_router(speed_estimates_router, prefix="/api/v1/operator")
app.include_router(widget_configs_router, prefix="/api/v1/operator")
app.include_router(choice_intents_router, prefix="/api/v1/operator")
app.include_router(confirmed_choices_router, prefix="/api/v1/operator")
app.include_router(ships_router, prefix="/api/v1/operator")
app.include_router(routes_router, prefix="/api/v1/operator")
app.include_router(dashboard_router, prefix="/api/v1/operator")
app.include_router(audit_logs_router, prefix="/api/v1/operator")

# Public routes, no authentication
app.include_router(public_widget_router, prefix="/api/v1/public")
app.include_router(public_choice_intents_router, prefix="/api/v1/public")

# Widget assets route
app.include_router(widget_assets_router)

@app.get("/health")
def read_health():
    """
    Health check endpoint.
    Returns status to verify API is running.
    """
    return {"status": "ok"}
