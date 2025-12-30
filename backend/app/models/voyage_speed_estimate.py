from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func, UniqueConstraint, Numeric, CheckConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class VoyageSpeedEstimate(Base):
    """Speed/emission estimates for a voyage, one row per profile (eco/standard/fast)."""

    __tablename__ = "voyage_speed_estimates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voyage_id = Column(Integer, ForeignKey("voyages.id", ondelete="CASCADE"), nullable=False)
    profile = Column(String, nullable=False, default="standard")  # eco | standard | fast
    speed_knots = Column(Numeric(5, 2), nullable=False)
    expected_emissions_kg_co2 = Column(Numeric(12, 2), nullable=False)
    expected_arrival_delay_minutes = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("voyage_id", "profile", name="uq_voyage_profile"),
        CheckConstraint("profile IN ('eco','standard','fast')", name="ck_profile_valid"),
    )

    voyage = relationship("Voyage", back_populates="voyage_speed_estimates")