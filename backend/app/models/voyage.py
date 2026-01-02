from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

class Voyage(Base):
    """
    Represents a voyage (trip) managed by an operator.
    """
    __tablename__ = "voyages"

    id = Column(Integer, primary_key=True, autoincrement=True)  # voyage_id
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)  # FK to operators
    external_trip_id = Column(String, nullable=True)
    widget_config_id = Column(Integer, ForeignKey("widget_configs.id", ondelete="SET NULL"), nullable=True)
    departure_port = Column(String, nullable=True)
    arrival_port = Column(String, nullable=True)
    departure_datetime = Column(TIMESTAMP, nullable=False)
    arrival_datetime = Column(TIMESTAMP, nullable=False)
    route_geometry = Column(JSON, nullable=True)  # GeoJSON as JSONB
    status = Column(String, nullable=False, default="planned")  # planned | completed | cancelled
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Unique constraint on (operator_id, external_trip_id) to ensure uniqueness per operator
    __table_args__ = (
        UniqueConstraint("operator_id", "external_trip_id", name="uq_operator_external_trip"),
        CheckConstraint("status IN ('planned','completed','cancelled')", name="ck_voyage_status"),
    )

    operator = relationship("Operator", back_populates="voyages")
    widget_config = relationship("WidgetConfig", back_populates="voyages")
    voyage_speed_estimates = relationship("VoyageSpeedEstimate", back_populates="voyage")