"""Add jobs.contact_info for aggregated (Telegram) listings.

Revision ID: 019_add_job_contact_info
Revises: 016_add_admin_notifications
"""
from alembic import op
import sqlalchemy as sa

revision = "019_add_job_contact_info"
down_revision = "016_add_admin_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column(
            "contact_info",
            sa.String(length=500),
            nullable=True,
            comment="Public contact from the source post (phone/telegram/email) for aggregated jobs",
        ),
    )


def downgrade() -> None:
    op.drop_column("jobs", "contact_info")
