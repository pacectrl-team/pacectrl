from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Operator(Base):
    """Represents an operator tenant that owns users, ships, voyages, and widget settings."""

    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    public_key = Column(String, unique=True, nullable=True)
    webhook_secret = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship to users, one-to-many
    users = relationship("User", back_populates="operator")
    # Relationship to voyages, one-to-many
    voyages = relationship("Voyage", back_populates="operator")
    # Relationship to widget configs, one-to-many
    widget_configs = relationship("WidgetConfig", back_populates="operator")
    # Relationship to ships, one-to-many
    ships = relationship("Ship", back_populates="operator", cascade="all, delete-orphan")
