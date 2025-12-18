from sqlalchemy import Column, DateTime, Integer, String, func

from app.core.database import Base


class Operator(Base):
    """Represents an operator tenant that owns users, ships, voyages, and widget settings."""

    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    public_key = Column(String, unique=True, nullable=True)
    webhook_secret = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
