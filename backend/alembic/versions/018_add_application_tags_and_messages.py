"""add application tags and message history

Revision ID: 018_add_application_tags_and_messages
Revises: 017_add_company_profile_and_job_close_reason
Create Date: 2026-05-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

import migration_utils as dh


revision = "018_add_application_tags_and_messages"
down_revision = "017_add_company_profile_and_job_close_reason"
branch_labels = None
depends_on = None


def _columns(inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    app_columns = _columns(inspector, "applications")
    if "tags" not in app_columns:
        op.add_column("applications", sa.Column("tags", dh.json_type(), nullable=True))
    if "message_history" not in app_columns:
        op.add_column("applications", sa.Column("message_history", dh.json_type(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    app_columns = _columns(inspector, "applications")

    if "message_history" in app_columns:
        op.drop_column("applications", "message_history")
    if "tags" in app_columns:
        op.drop_column("applications", "tags")
