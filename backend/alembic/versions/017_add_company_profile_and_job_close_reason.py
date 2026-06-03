"""add enriched company profile fields and job close reason

Revision ID: 017_add_company_profile_and_job_close_reason
Revises: 016_add_funnel_events
Create Date: 2026-05-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

import migration_utils as dh


revision = "017_add_company_profile_and_job_close_reason"
down_revision = "016_add_funnel_events"
branch_labels = None
depends_on = None


def _columns(inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    user_columns = _columns(inspector, "users")
    if "company_cover_photo_url" not in user_columns:
        op.add_column("users", sa.Column("company_cover_photo_url", sa.String(length=500), nullable=True))
    if "company_gallery_images" not in user_columns:
        op.add_column("users", sa.Column("company_gallery_images", dh.json_type(), nullable=True))
    if "company_culture" not in user_columns:
        op.add_column("users", sa.Column("company_culture", sa.Text(), nullable=True))
    if "company_linkedin_url" not in user_columns:
        op.add_column("users", sa.Column("company_linkedin_url", sa.String(length=500), nullable=True))
    if "company_telegram_url" not in user_columns:
        op.add_column("users", sa.Column("company_telegram_url", sa.String(length=500), nullable=True))
    if "company_instagram_url" not in user_columns:
        op.add_column("users", sa.Column("company_instagram_url", sa.String(length=500), nullable=True))
    if "company_facebook_url" not in user_columns:
        op.add_column("users", sa.Column("company_facebook_url", sa.String(length=500), nullable=True))
    if "company_founded_year" not in user_columns:
        op.add_column("users", sa.Column("company_founded_year", sa.Integer(), nullable=True))
    if "company_video_url" not in user_columns:
        op.add_column("users", sa.Column("company_video_url", sa.String(length=500), nullable=True))

    job_columns = _columns(inspector, "jobs")
    if "close_reason_code" not in job_columns:
        op.add_column("jobs", sa.Column("close_reason_code", sa.String(length=20), nullable=True))
    if "close_reason_note" not in job_columns:
        op.add_column("jobs", sa.Column("close_reason_note", sa.String(length=500), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    job_columns = _columns(inspector, "jobs")
    if "close_reason_note" in job_columns:
        op.drop_column("jobs", "close_reason_note")
    if "close_reason_code" in job_columns:
        op.drop_column("jobs", "close_reason_code")

    user_columns = _columns(inspector, "users")
    if "company_video_url" in user_columns:
        op.drop_column("users", "company_video_url")
    if "company_founded_year" in user_columns:
        op.drop_column("users", "company_founded_year")
    if "company_facebook_url" in user_columns:
        op.drop_column("users", "company_facebook_url")
    if "company_instagram_url" in user_columns:
        op.drop_column("users", "company_instagram_url")
    if "company_telegram_url" in user_columns:
        op.drop_column("users", "company_telegram_url")
    if "company_linkedin_url" in user_columns:
        op.drop_column("users", "company_linkedin_url")
    if "company_culture" in user_columns:
        op.drop_column("users", "company_culture")
    if "company_gallery_images" in user_columns:
        op.drop_column("users", "company_gallery_images")
    if "company_cover_photo_url" in user_columns:
        op.drop_column("users", "company_cover_photo_url")
