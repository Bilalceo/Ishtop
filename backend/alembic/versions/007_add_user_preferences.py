"""add_user_preferences

Revision ID: 007_add_user_preferences
Revises: 006_add_saved_jobs
Create Date: 2026-02-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '007_add_user_preferences'
down_revision = '006_add_saved_jobs'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = [c['name'] for c in inspector.get_columns('users')]

    if 'notification_preferences' not in existing_columns:
        op.add_column(
            'users',
            sa.Column('notification_preferences', sa.JSON(), nullable=True)
        )

    if 'privacy_settings' not in existing_columns:
        op.add_column(
            'users',
            sa.Column('privacy_settings', sa.JSON(), nullable=True)
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = [c['name'] for c in inspector.get_columns('users')]

    if 'notification_preferences' in existing_columns:
        op.drop_column('users', 'notification_preferences')

    if 'privacy_settings' in existing_columns:
        op.drop_column('users', 'privacy_settings')
