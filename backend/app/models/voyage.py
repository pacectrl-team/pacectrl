from sqlalchemy import Column, Date, Integer, String, ForeignKey, TIMESTAMP, func, UniqueConstraint, CheckConstraint
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
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="RESTRICT"), nullable=False, index=True)
    ship_id = Column(Integer, ForeignKey("ships.id", ondelete="RESTRICT"), nullable=False, index=True)
    departure_date = Column(Date, nullable=False)
    arrival_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="planned")  # planned | completed | cancelled
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Unique constraint on (operator_id, external_trip_id) to ensure uniqueness per operator
    __table_args__ = (
        UniqueConstraint("operator_id", "external_trip_id", name="uq_operator_external_trip"),
        UniqueConstraint("operator_id", "route_id", "departure_date", name="uq_operator_route_departure_date"),
        CheckConstraint("status IN ('planned','completed','cancelled')", name="ck_voyage_status"),
    )

    operator = relationship("Operator", back_populates="voyages")
    widget_config = relationship("WidgetConfig", back_populates="voyages")
    route = relationship("Route", back_populates="voyages")
    ship = relationship("Ship", back_populates="voyages")