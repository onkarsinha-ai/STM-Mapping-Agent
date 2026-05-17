"""add database connection type

Revision ID: 20260517_database
Revises: 20260517
Create Date: 2026-05-17 00:00:00.000000

"""
from alembic import op

revision = '20260517_database'
down_revision = '20260517'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE connectiontype ADD VALUE 'database'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # Reversing this requires recreating the enum, which is destructive.
    pass
