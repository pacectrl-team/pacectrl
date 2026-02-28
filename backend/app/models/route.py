from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Time, UniqueConstraint, func, text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Route(Base):
    """Represents a reusable schedule template for voyages."""

    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    departure_port = Column(String, nullable=False)
    arrival_port = Column(String, nullable=False)
    departure_time = Column(Time, nullable=False)
    arrival_time = Column(Time, nullable=False)
    # Number of calendar days from departure to arrival (0 = same day, 1 = overnight, etc.)
    # Used to auto-derive arrival_date when creating a voyage from this route.
    duration_nights = Column(Integer, nullable=False, server_default=text("0"), default=0)
    route_geometry = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("operator_id", "name", name="uq_route_operator_name"),
    )

    operator = relationship("Operator", back_populates="routes")
    voyages = relationship("Voyage", back_populates="route")
    speed_estimates = relationship("SpeedToEmissionsEstimate", back_populates="route", cascade="all, delete-orphan")
