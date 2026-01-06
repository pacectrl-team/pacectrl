from sqlalchemy import Column, Integer, ForeignKey, Numeric, String, TIMESTAMP, func, CheckConstraint

from app.core.database import Base


class ChoiceIntent(Base):
    __tablename__ = "choice_intents"

    intent_id = Column(String, primary_key=True)  #"int_AbC123", unique across all operators, a string because public ID --> hard to guess
    voyage_id = Column(Integer, ForeignKey("voyages.id", ondelete="CASCADE"), nullable=False)

    slider_value = Column(Numeric(4, 3), nullable=False)  # 0..1
    delta_pct_from_standard = Column(Numeric(5, 2), nullable=False)
    selected_speed_kn = Column(Numeric(6, 2), nullable=True)

    consumed_at = Column(TIMESTAMP(timezone=True), nullable=True)  # helps idempotency

    ip_hash = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("slider_value >= 0 AND slider_value <= 1", name="ck_intent_slider_range"),
        CheckConstraint("delta_pct_from_standard >= -100 AND delta_pct_from_standard <= 100", name="ck_intent_delta_pct_range"),
    )
