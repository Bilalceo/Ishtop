"""add_interview_metadata_to_applications

Revision ID: 008_add_interview_metadata_to_applications
Revises: 007_add_user_preferences
Create Date: 2026-04-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "008_add_interview_metadata_to_applications"
down_revision = "007_add_user_preferences"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("applications")]

    if "interview_type" not in existing_columns:
        op.add_column(
            "applications",
            sa.Column("interview_type", sa.String(length=50), nullable=True),
        )

    if "meeting_link" not in existing_columns:
        op.add_column(
            "applications",
            sa.Column("meeting_link", sa.Text(), nullable=True),
        )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("applications")]

    if "meeting_link" in existing_columns:
        op.drop_column("applications", "meeting_link")

    if "interview_type" in existing_columns:
        op.drop_column("applications", "interview_type")
