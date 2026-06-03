"""add admin_notifications table

Revision ID: 016_add_admin_notifications
Revises: 015_add_audit_log
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "016_add_admin_notifications"
down_revision = "015_add_audit_log"
branch_labels = None
depends_on = None


def _uuid_type():
    """UUID column type matching users.id (GUID): native UUID on Postgres, CHAR(36) on SQLite.

    admin_notifications.admin_id is a foreign key to users.id, which is a native
    UUID column on Postgres. Declaring it as String makes the FK unimplementable
    (DatatypeMismatch). SQLite has no native UUID, so fall back to String(36).
    """
    return sa.String(36) if op.get_bind().dialect.name == "sqlite" else postgresql.UUID(as_uuid=True)


def upgrade():
    uuid_type = _uuid_type()
    op.create_table(
        "admin_notifications",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "admin_id",
            uuid_type,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link", sa.String(500), nullable=True),
        sa.Column("is_read", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_admin_notifications_admin_id", "admin_notifications", ["admin_id"])
    op.create_index("ix_admin_notifications_is_read", "admin_notifications", ["is_read"])


def downgrade():
    op.drop_index("ix_admin_notifications_is_read", "admin_notifications")
    op.drop_index("ix_admin_notifications_admin_id", "admin_notifications")
    op.drop_table("admin_notifications")
