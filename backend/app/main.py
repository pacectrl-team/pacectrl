from fastapi import FastAPI

from app.core.database import Base, engine
from app.core.middleware import ApiLoggingMiddleware
from app.api.operator.auth import router as auth_router
from app.api.operator.operators import router as operators_router
from app.api.operator.users import router as users_router
from app.api.operator.voyages import router as voyages_router
from app.api.operator.voyage_speed_estimates import router as voyage_speed_estimates_router
from app.api.operator.widget_configs import router as widget_configs_router
from app.api.public.widget import router as public_widget_router


# Initialize FastAPI application
app = FastAPI(title="PaceCtrl API")

# Add API logging middleware
app.add_middleware(ApiLoggingMiddleware)

# Tables are created via Alembic migrations in production
# Base.metadata.create_all(bind=engine)  # Commented out for production

# Add the various routes available
app.include_router(auth_router, prefix="/api/v1/operator")
app.include_router(operators_router, prefix="/api/v1/operator")
app.include_router(users_router, prefix="/api/v1/operator")
app.include_router(voyages_router, prefix="/api/v1/operator")
app.include_router(voyage_speed_estimates_router, prefix="/api/v1/operator")
app.include_router(widget_configs_router, prefix="/api/v1/operator")
app.include_router(public_widget_router, prefix="/api/v1/public")

@app.get("/health")
def read_health():
    """
    Health check endpoint.
    Returns status to verify API is running.
    """
    return {"status": "ok"}
