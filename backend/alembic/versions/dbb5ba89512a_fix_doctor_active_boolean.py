"""fix_doctor_active_boolean

Revision ID: dbb5ba89512a
Revises: fe2935f998fc
Create Date: 2026-05-03 20:21:51.858416

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dbb5ba89512a'
down_revision: Union[str, None] = 'fe2935f998fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE doctors ALTER COLUMN active TYPE BOOLEAN USING active::boolean")


def downgrade() -> None:
    op.alter_column('doctors', 'active',
               existing_type=sa.Boolean(),
               type_=sa.VARCHAR(length=10),
               existing_nullable=False)