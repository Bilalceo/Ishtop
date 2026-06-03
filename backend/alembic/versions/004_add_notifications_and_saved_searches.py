"""add_notifications_and_saved_searches

Revision ID: 004_notifications_and_saved_searches
Revises: 003_universities_and_scholarships
Create Date: 2026-01-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_notifications_and_saved_searches'
down_revision = '003_universities_and_scholarships'
branch_labels = None
depends_on = None


def _uuid_type():
    """Use native UUID on PostgreSQL, string UUID elsewhere (e.g. SQLite)."""
    if op.get_bind().dialect.name == "postgresql":
        from sqlalchemy.dialects import postgresql
        return postgresql.UUID(as_uuid=True)
    return sa.String(36)


def upgrade():
    uuid_type = _uuid_type()

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('user_id', uuid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('link', sa.String(500), nullable=True),
        sa.Column('is_read', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for notifications
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    
    # Create saved_searches table
    op.create_table(
        'saved_searches',
        sa.Column('id', uuid_type, primary_key=True),
        sa.Column('user_id', uuid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('search_type', sa.String(50), nullable=False),
        sa.Column('filters', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=False),
    )
    
    # Create indexes for saved_searches
    op.create_index('ix_saved_searches_user_id', 'saved_searches', ['user_id'])


def downgrade():
    # Drop indexes first
    op.drop_index('ix_saved_searches_user_id', 'saved_searches')
    op.drop_index('ix_notifications_is_read', 'notifications')
    op.drop_index('ix_notifications_user_id', 'notifications')
    
    # Drop tables
    op.drop_table('saved_searches')
    op.drop_table('notifications')
