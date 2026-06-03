"""Add match_breakdown JSON column to applications.

Stores the snapshot of the skill-match analysis computed at application time
so HR sees the same numbers the candidate saw, even if the resume is edited later.

Revision ID: 012_add_application_match_breakdown
Revises: 011_add_admin_role_to_users
Create Date: 2026-05-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "012_add_application_match_breakdown"
down_revision = "011_add_admin_role_to_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("applications")}
    if "match_breakdown" not in columns:
        op.add_column(
            "applications",
            sa.Column("match_breakdown", sa.JSON, nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("applications")}
    if "match_breakdown" in columns:
        op.drop_column("applications", "match_breakdown")
