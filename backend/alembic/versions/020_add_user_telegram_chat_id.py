"""Add users.telegram_chat_id for Telegram job-alert notifications.

Revision ID: 020_add_user_telegram_chat_id
Revises: 019_add_job_contact_info
"""
from alembic import op
import sqlalchemy as sa

revision = "020_add_user_telegram_chat_id"
down_revision = "019_add_job_contact_info"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_chat_id", sa.String(length=40), nullable=True))
    op.create_index("ix_users_telegram_chat_id", "users", ["telegram_chat_id"])


def downgrade() -> None:
    op.drop_index("ix_users_telegram_chat_id", table_name="users")
    op.drop_column("users", "telegram_chat_id")
