"""refactor voyage schedule columns

Revision ID: 4ad4e1a3905f
Revises: cc515cb59181
Create Date: 2026-01-16 12:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4ad4e1a3905f"
down_revision: Union[str, None] = "cc515cb59181"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    op.add_column("voyages", sa.Column("departure_date", sa.Date(), nullable=True))
    op.add_column("voyages", sa.Column("arrival_date", sa.Date(), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE voyages
            SET departure_date = DATE(departure_datetime),
                arrival_date = DATE(arrival_datetime)
            """
        )
    )

    route_null = bind.execute(sa.text("SELECT id FROM voyages WHERE route_id IS NULL LIMIT 1")).fetchone()
    if route_null:
        raise RuntimeError("All voyages must be associated with a route before applying this migration.")

    op.alter_column("voyages", "departure_date", nullable=False)
    op.alter_column("voyages", "arrival_date", nullable=False)

    op.drop_constraint("voyages_route_id_fkey", "voyages", type_="foreignkey")
    op.alter_column("voyages", "route_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        "voyages_route_id_fkey",
        "voyages",
        "routes",
        ["route_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_unique_constraint(
        "uq_operator_route_departure_date",
        "voyages",
        ["operator_id", "route_id", "departure_date"],
    )

    op.drop_column("voyages", "arrival_datetime")
    op.drop_column("voyages", "departure_datetime")
    op.drop_column("voyages", "route_geometry")
    op.drop_column("voyages", "arrival_port")
    op.drop_column("voyages", "departure_port")


def downgrade() -> None:
    op.add_column("voyages", sa.Column("departure_port", sa.VARCHAR(), nullable=True))
    op.add_column("voyages", sa.Column("arrival_port", sa.VARCHAR(), nullable=True))
    op.add_column("voyages", sa.Column("route_geometry", sa.JSON(), nullable=True))
    op.add_column("voyages", sa.Column("departure_datetime", sa.TIMESTAMP(), nullable=True))
    op.add_column("voyages", sa.Column("arrival_datetime", sa.TIMESTAMP(), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE voyages v
            SET departure_datetime = v.departure_date::timestamp + r.departure_time,
                arrival_datetime = v.arrival_date::timestamp + r.arrival_time
            FROM routes r
            WHERE v.route_id = r.id
            """
        )
    )

    op.alter_column("voyages", "route_id", existing_type=sa.Integer(), nullable=True)
    op.drop_constraint("voyages_route_id_fkey", "voyages", type_="foreignkey")
    op.create_foreign_key(
        "voyages_route_id_fkey",
        "voyages",
        "routes",
        ["route_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.alter_column("voyages", "arrival_datetime", nullable=False)
    op.alter_column("voyages", "departure_datetime", nullable=False)

    op.drop_constraint("uq_operator_route_departure_date", "voyages", type_="unique")

    op.drop_column("voyages", "arrival_date")
    op.drop_column("voyages", "departure_date")
