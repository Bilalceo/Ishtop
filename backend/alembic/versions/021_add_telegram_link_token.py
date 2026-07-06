"""Add users.telegram_link_token + expiry for the Telegram deep-link connect flow.

Revision ID: 021_add_telegram_link_token
Revises: 020_add_user_telegram_chat_id
"""
from alembic import op
import sqlalchemy as sa

revision = "021_add_telegram_link_token"
down_revision = "020_add_user_telegram_chat_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_link_token", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("telegram_link_expires", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_telegram_link_token", "users", ["telegram_link_token"])


def downgrade() -> None:
    op.drop_index("ix_users_telegram_link_token", table_name="users")
    op.drop_column("users", "telegram_link_expires")
    op.drop_column("users", "telegram_link_token")
