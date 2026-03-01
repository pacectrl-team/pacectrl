"""add_validation_constraints

Revision ID: 47a6dcb1db34
Revises: 9df85cdffc39
Create Date: 2026-03-01 16:10:48.291650

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "47a6dcb1db34"
down_revision: Union[str, None] = "9df85cdffc39"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # Data migration: correct inverted arrival_delta signs in existing rows.
    # The correct convention is:
    #   slow  profile: delta >= 0  (arrives later  than scheduled)
    #   fast  profile: delta <= 0  (arrives earlier than scheduled)
    # Existing seed data had the signs backwards, so we flip them here.
    # -----------------------------------------------------------------------
    op.execute(
        "UPDATE speed_to_emissions_estimates "
        "SET expected_arrival_delta_minutes = ABS(expected_arrival_delta_minutes) "
        "WHERE profile = 'slow' AND expected_arrival_delta_minutes < 0"
    )
    op.execute(
        "UPDATE speed_to_emissions_estimates "
        "SET expected_arrival_delta_minutes = -ABS(expected_arrival_delta_minutes) "
        "WHERE profile = 'fast' AND expected_arrival_delta_minutes > 0"
    )

    # Unique constraint on voyage_creation_rules(operator_id, name) — auto-detected
    op.create_unique_constraint(
        "uq_voyage_creation_rules_operator_name",
        "voyage_creation_rules",
        ["operator_id", "name"],
    )

    # -----------------------------------------------------------------------
    # Check constraints — Alembic does not auto-detect these for PostgreSQL,
    # so they are added manually below.
    # -----------------------------------------------------------------------

    # Slow voyages: arrival delta must be >= 0 (arrives later than schedule)
    op.create_check_constraint(
        "ck_speed_estimates_slow_delta_non_negative",
        "speed_to_emissions_estimates",
        "profile != 'slow' OR expected_arrival_delta_minutes >= 0",
    )
    # Fast voyages: arrival delta must be <= 0 (arrives earlier than schedule)
    op.create_check_constraint(
        "ck_speed_estimates_fast_delta_non_positive",
        "speed_to_emissions_estimates",
        "profile != 'fast' OR expected_arrival_delta_minutes <= 0",
    )

    # choice_intents: selected speed must be positive when provided
    op.create_check_constraint(
        "ck_intent_speed_positive",
        "choice_intents",
        "selected_speed_kn IS NULL OR selected_speed_kn > 0",
    )
    # Narrow intent_id column from unbounded TEXT to VARCHAR(20);
    # all generated IDs follow the pattern "int_<12 hex chars>" = 16 chars.
    op.alter_column(
        "choice_intents",
        "intent_id",
        existing_type=sa.TEXT(),
        type_=sa.String(20),
        existing_nullable=False,
    )

    # confirmed_choices: selected speed must be positive when provided
    op.create_check_constraint(
        "ck_confirmed_choices_speed_positive",
        "confirmed_choices",
        "selected_speed_kn IS NULL OR selected_speed_kn > 0",
    )

    # users: role must be one of the two allowed values
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('admin', 'captain')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_voyage_creation_rules_operator_name",
        "voyage_creation_rules",
        type_="unique",
    )
    op.drop_constraint(
        "ck_speed_estimates_slow_delta_non_negative",
        "speed_to_emissions_estimates",
        type_="check",
    )
    op.drop_constraint(
        "ck_speed_estimates_fast_delta_non_positive",
        "speed_to_emissions_estimates",
        type_="check",
    )
    op.drop_constraint("ck_intent_speed_positive", "choice_intents", type_="check")
    op.alter_column(
        "choice_intents",
        "intent_id",
        existing_type=sa.String(20),
        type_=sa.TEXT(),
        existing_nullable=False,
    )
    op.drop_constraint(
        "ck_confirmed_choices_speed_positive",
        "confirmed_choices",
        type_="check",
    )
    op.drop_constraint("ck_users_role", "users", type_="check")
