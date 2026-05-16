"""add review chat messages and review_chat_completed flag

Revision ID: 20260517
Revises: 774374b3a14e
Create Date: 2026-05-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260517'
down_revision = '774374b3a14e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('review_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.Enum('user', 'assistant', name='chatrole'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('mapping_changes', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.add_column('projects', sa.Column('review_chat_completed', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'review_chat_completed')
    op.drop_table('review_chat_messages')
    op.execute("DROP TYPE IF EXISTS chatrole")
