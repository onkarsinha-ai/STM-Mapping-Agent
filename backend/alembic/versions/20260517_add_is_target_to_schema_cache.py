"""add is_target to schema_cache

Revision ID: 20260517_is_target
Revises: 20260517_database
Create Date: 2026-05-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '20260517_is_target'
down_revision = '20260517_database'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('schema_cache', sa.Column('is_target', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('schema_cache', 'is_target')
