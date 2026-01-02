"""add widget_configs and link to voyages

Revision ID: 7f8b86dc3d8b
Revises: 2cfb55c0d184
Create Date: 2024-05-29 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f8b86dc3d8b"
down_revision: Union[str, None] = "2cfb55c0d184"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "widget_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("operator_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint([
            "operator_id",
        ], ["operators.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "operator_id", "name", name="uq_operator_widget_config_name"
        ),
    )

    op.add_column(
        "voyages",
        sa.Column(
            "widget_config_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "voyages_widget_config_id_fkey",
        "voyages",
        "widget_configs",
        ["widget_config_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("voyages_widget_config_id_fkey", "voyages", type_="foreignkey")
    op.drop_column("voyages", "widget_config_id")
    op.drop_table("widget_configs")