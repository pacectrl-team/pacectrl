"""Rename eco anchor to slow

Revision ID: cc515cb59181
Revises: 745f2f610203
Create Date: 2026-01-16 10:24:43.813913

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cc515cb59181"
down_revision: Union[str, None] = "745f2f610203"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_speed_estimates_profile",
        "speed_to_emissions_estimates",
        type_="check",
    )
    op.execute(
        sa.text(
            "UPDATE speed_to_emissions_estimates SET profile = 'slow' WHERE profile = 'eco'"
        )
    )
    op.create_check_constraint(
        "ck_speed_estimates_profile",
        "speed_to_emissions_estimates",
        "profile IN ('slow','standard','fast')",
    )

def downgrade() -> None:
    op.drop_constraint(
        "ck_speed_estimates_profile",
        "speed_to_emissions_estimates",
        type_="check",
    )
    op.execute(
        sa.text(
            "UPDATE speed_to_emissions_estimates SET profile = 'eco' WHERE profile = 'slow'"
        )
    )
    op.create_check_constraint(
        "ck_speed_estimates_profile",
        "speed_to_emissions_estimates",
        "profile IN ('eco','standard','fast')",
    )
