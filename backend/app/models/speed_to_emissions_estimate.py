from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class SpeedToEmissionsEstimate(Base):
    """Anchors expected speed, emissions, and arrival deltas per ship/route pairing."""

    __tablename__ = "speed_to_emissions_estimates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(Integer,ForeignKey("routes.id", ondelete="CASCADE"),nullable=False,index=True)
    ship_id = Column(Integer, ForeignKey("ships.id", ondelete="CASCADE"), nullable=False, index=True)
    profile = Column(String, nullable=False)  # 'slow', 'standard', 'fast'
    speed_knots = Column(Numeric(5, 2), nullable=False)
    expected_emissions_kg_co2 = Column(Numeric(12, 2), nullable=False)
    expected_arrival_delta_minutes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "route_id",
            "ship_id",
            "profile",
            name="uq_speed_estimates_route_ship_profile",
        ),
        CheckConstraint("profile IN ('slow','standard','fast')", name="ck_speed_estimates_profile"),
        CheckConstraint("speed_knots > 0", name="ck_speed_estimates_speed_positive"),
        CheckConstraint("expected_emissions_kg_co2 >= 0", name="ck_speed_estimates_emissions_non_negative"),
    )

    route = relationship("Route", back_populates="speed_estimates")
    ship = relationship("Ship", back_populates="speed_estimates")
