from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class WidgetConfig(Base):
    """Reusable widget theme/config template scoped to an operator."""

    __tablename__ = "widget_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False) # Name of the widget config
    description = Column(String, nullable=True) # Optional description
    config = Column(JSON, nullable=False) # JSON blob storing widget settings
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("operator_id", "name", name="uq_operator_widget_config_name"),
    )

    operator = relationship("Operator", back_populates="widget_configs")
    voyages = relationship("Voyage", back_populates="widget_config")