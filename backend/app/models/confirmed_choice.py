from sqlalchemy import Column, Integer, ForeignKey, Numeric, String, TIMESTAMP, func, CheckConstraint, UniqueConstraint

from app.core.database import Base

class ConfirmedChoice(Base):
    __tablename__ = "confirmed_choices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    voyage_id = Column(Integer, ForeignKey("voyages.id", ondelete="CASCADE"), nullable=False)

    intent_id = Column(String, ForeignKey("choice_intents.intent_id", ondelete="SET NULL"), nullable=True) # FK to choice_intents.intent_id, these can be deleted, hence nullable
    booking_id = Column(String, nullable=False)

    slider_value = Column(Numeric(4, 3), nullable=False)  # 0..1
    delta_pct_from_standard = Column(Numeric(5, 2), nullable=False) # + faster, - slower
    selected_speed_kn = Column(Numeric(6, 2), nullable=True)

    confirmed_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        # always a timestamp when confirmed
        CheckConstraint("confirmed_at IS NOT NULL", name="ck_confirmed_choices_confirmed_at_not_null"),

        # prevent duplicate confirmed choices for same voyage + booking. Note that same booking_id can appear in multiple voyages (e.g., return trips)
        UniqueConstraint("voyage_id", "booking_id", name="uq_confirmed_choices_voyage_booking"),

        CheckConstraint("slider_value >= 0 AND slider_value <= 1", name="ck_confirmed_choices_slider_range"),
        CheckConstraint("delta_pct_from_standard >= -100 AND delta_pct_from_standard <= 100", name="ck_confirmed_choices_delta_pct_range"),
    )