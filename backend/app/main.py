from fastapi import FastAPI

from app.core.database import Base, engine
from app.core.middleware import ApiLoggingMiddleware
from app.api.operator.operators import router as operators_router


# Initialize FastAPI application
app = FastAPI(title="PaceCtrl API")

# Add API logging middleware
app.add_middleware(ApiLoggingMiddleware)

# Tables are created via Alembic migrations in production
# Base.metadata.create_all(bind=engine)  # Commented out for production

# Include the operator router under operator API prefix
app.include_router(operators_router, prefix="/api/v1/operator")

@app.get("/health")
def read_health():
    """
    Health check endpoint.
    Returns status to verify API is running.
    """
    return {"status": "ok"}
