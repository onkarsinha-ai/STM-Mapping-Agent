"""add table selections to project

Revision ID: 20260517_table_selections
Revises: 20260517_is_target
Create Date: 2026-05-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '20260517_table_selections'
down_revision = '20260517_is_target'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('selected_source_tables', sa.JSON(), nullable=True))
    op.add_column('projects', sa.Column('selected_target_tables', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'selected_target_tables')
    op.drop_column('projects', 'selected_source_tables')
