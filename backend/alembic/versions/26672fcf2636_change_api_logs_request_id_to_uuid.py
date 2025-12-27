"""Change api_logs request_id to UUID

Revision ID: 26672fcf2636
Revises: 81dae069bc8b
Create Date: 2025-12-27 10:53:08.876478

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "26672fcf2636"
down_revision: Union[str, None] = "81dae069bc8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Cast existing string UUIDs to proper UUID type
    op.execute("ALTER TABLE api_logs ALTER COLUMN request_id TYPE uuid USING request_id::uuid")


def downgrade() -> None:
    # Revert UUID back to string if ever needed
    op.alter_column(
        "api_logs",
        "request_id",
        existing_type=sa.UUID(),
        type_=sa.VARCHAR(),
        existing_nullable=False,
    )
