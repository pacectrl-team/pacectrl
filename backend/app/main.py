from fastapi import FastAPI

from app.core.database import engine, Base
from app.api.operator.todos import router as todos_router

# Create all database tables based on models
# This runs on app startup
Base.metadata.create_all(bind=engine)

# Initialize FastAPI application
app = FastAPI(title="PaceCtrl API")

# Include the todos router under operator API prefix
app.include_router(todos_router, prefix="/api/v1/operator")

@app.get("/health")
def read_health():
    """
    Health check endpoint.
    Returns status to verify API is running.
    """
    return {"status": "ok"}
