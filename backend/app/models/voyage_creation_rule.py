from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class VoyageCreationRule(Base):
    """
    A per-operator rule that auto-creates (or links) a Voyage when an
    external_trip_id matches the stored pattern.

    The pattern is a template string using supported tokens:
      {YYYY}, {MM}, {DD}  — extract departure_date from the trip ID
      {*}                 — wildcard segment (any non-separator characters)

    Example:  HEL-TLL-{YYYY}-{MM}-{DD}
    """

    __tablename__ = "voyage_creation_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Owning operator — cascade delete removes all rules for a deleted operator.
    operator_id = Column(
        Integer,
        ForeignKey("operators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Human-readable label for the rule (unique per operator).
    name = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("operator_id", "name", name="uq_voyage_creation_rules_operator_name"),
    )

    # Template string, e.g. "HEL-TLL-{YYYY}-{MM}-{DD}"
    pattern = Column(String, nullable=False)

    # Default route assigned to voyages created by this rule.
    route_id = Column(
        Integer,
        ForeignKey("routes.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Default ship assigned to voyages created by this rule.
    ship_id = Column(
        Integer,
        ForeignKey("ships.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Default widget config — required so every auto-created voyage has a
    # widget configuration from the start.
    widget_config_id = Column(
        Integer,
        ForeignKey("widget_configs.id", ondelete="RESTRICT"),
        nullable=False,
    )

    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    # updated_at is managed at the ORM layer via onupdate so it works across
    # all supported databases without requiring a DB-level trigger.
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    operator = relationship("Operator", back_populates="voyage_creation_rules")
    route = relationship("Route")
    ship = relationship("Ship")
    widget_config = relationship("WidgetConfig")
    # Voyages that were created (or linked) by this rule.
    voyages = relationship("Voyage", back_populates="voyage_creation_rule")
