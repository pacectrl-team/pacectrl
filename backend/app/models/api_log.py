from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ApiLog(Base):
    """Logs all API requests for auditing and analytics."""

    __tablename__ = "api_logs"

    api_log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(UUID(as_uuid=True), nullable=False, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    method = Column(String, nullable=False)
    path = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)
    response_ms = Column(Integer, nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    voyage_id = Column(Integer, ForeignKey("voyages.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_hash = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Relationships for easier querying
    operator = relationship("Operator")
    user = relationship("User")
    voyage = relationship("Voyage")