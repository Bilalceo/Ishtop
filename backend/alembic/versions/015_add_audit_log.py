"""add audit_logs table

Revision ID: 015_add_audit_log
Revises: 018_add_application_tags_and_messages
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "015_add_audit_log"
down_revision = "018_add_application_tags_and_messages"
branch_labels = None
depends_on = None


def _uuid_type():
    """UUID column type matching users.id (GUID): native UUID on Postgres, CHAR(36) on SQLite.

    audit_logs.admin_id is a foreign key to users.id, which is a native UUID
    column on Postgres. Declaring it as String here makes the FK unimplementable
    (DatatypeMismatch). SQLite has no native UUID, so fall back to String(36).
    """
    return sa.String(36) if op.get_bind().dialect.name == "sqlite" else postgresql.UUID(as_uuid=True)


def upgrade():
    uuid_type = _uuid_type()
    op.create_table(
        "audit_logs",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("admin_id", uuid_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(36), nullable=True),
        sa.Column("target_label", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_logs_admin_id", "audit_logs", ["admin_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade():
    op.drop_index("ix_audit_logs_created_at", "audit_logs")
    op.drop_index("ix_audit_logs_action", "audit_logs")
    op.drop_index("ix_audit_logs_admin_id", "audit_logs")
    op.drop_table("audit_logs")
