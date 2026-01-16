"""make ship required on voyages

Revision ID: a1c90a6f873b
Revises: 4ad4e1a3905f
Create Date: 2026-01-16 14:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1c90a6f873b"
down_revision: Union[str, None] = "4ad4e1a3905f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM voyages WHERE ship_id IS NULL OR route_id IS NULL"))

    op.drop_constraint("voyages_ship_id_fkey", "voyages", type_="foreignkey")
    op.alter_column("voyages", "ship_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        "voyages_ship_id_fkey",
        "voyages",
        "ships",
        ["ship_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("voyages_ship_id_fkey", "voyages", type_="foreignkey")
    op.alter_column("voyages", "ship_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        "voyages_ship_id_fkey",
        "voyages",
        "ships",
        ["ship_id"],
        ["id"],
        ondelete="SET NULL",
    )
