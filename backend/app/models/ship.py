from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Ship(Base):
    """Represents a vessel operated by an operator tenant."""

    __tablename__ = "ships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    imo_number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("operator_id", "name", name="uq_ship_operator_name"),
    )

    operator = relationship("Operator", back_populates="ships")
