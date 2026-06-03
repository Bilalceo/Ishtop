"""add trust engine + discovery taxonomy fields

Revision ID: 015_add_trust_and_discovery
Revises: 014_add_landing_contents
Create Date: 2026-05-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

import migration_utils as dh


revision = "015_add_trust_and_discovery"
down_revision = "014_add_landing_contents"
branch_labels = None
depends_on = None


def _columns(inspector, table_name: str) -> set[str]:
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    user_columns = _columns(inspector, "users")
    if "verification_state" not in user_columns:
        op.add_column("users", sa.Column("verification_state", sa.String(length=20), nullable=False, server_default="unverified"))
    if "verification_submitted_at" not in user_columns:
        op.add_column("users", sa.Column("verification_submitted_at", dh.datetime_type(), nullable=True))
    if "verification_reviewed_at" not in user_columns:
        op.add_column("users", sa.Column("verification_reviewed_at", dh.datetime_type(), nullable=True))
    if "verification_reviewed_by" not in user_columns:
        op.add_column("users", sa.Column("verification_reviewed_by", sa.String(length=36), nullable=True))
    if "verification_notes" not in user_columns:
        op.add_column("users", sa.Column("verification_notes", sa.String(length=1000), nullable=True))
    if "trust_badges" not in user_columns:
        op.add_column("users", sa.Column("trust_badges", dh.json_type(), nullable=True))
    if "employer_response_rate" not in user_columns:
        op.add_column("users", sa.Column("employer_response_rate", sa.Float(), nullable=True))
    if "employer_avg_response_hours" not in user_columns:
        op.add_column("users", sa.Column("employer_avg_response_hours", sa.Float(), nullable=True))

    indexes = {idx["name"] for idx in inspector.get_indexes("users")}
    if "idx_users_verification_state" not in indexes:
        op.create_index("idx_users_verification_state", "users", ["verification_state"], unique=False)

    job_columns = _columns(inspector, "jobs")
    if "city_slug" not in job_columns:
        op.add_column("jobs", sa.Column("city_slug", sa.String(length=255), nullable=True))
    if "profession_slug" not in job_columns:
        op.add_column("jobs", sa.Column("profession_slug", sa.String(length=255), nullable=True))
    if "company_slug" not in job_columns:
        op.add_column("jobs", sa.Column("company_slug", sa.String(length=255), nullable=True))
    if "trust_score" not in job_columns:
        op.add_column("jobs", sa.Column("trust_score", sa.Float(), nullable=False, server_default="0"))
    if "trust_factors" not in job_columns:
        op.add_column("jobs", sa.Column("trust_factors", dh.json_type(), nullable=True))
    if "trust_badges" not in job_columns:
        op.add_column("jobs", sa.Column("trust_badges", dh.json_type(), nullable=True))

    job_indexes = {idx["name"] for idx in inspector.get_indexes("jobs")}
    if "idx_jobs_city_slug" not in job_indexes:
        op.create_index("idx_jobs_city_slug", "jobs", ["city_slug"], unique=False)
    if "idx_jobs_profession_slug" not in job_indexes:
        op.create_index("idx_jobs_profession_slug", "jobs", ["profession_slug"], unique=False)
    if "idx_jobs_company_slug" not in job_indexes:
        op.create_index("idx_jobs_company_slug", "jobs", ["company_slug"], unique=False)

    existing_tables = set(inspector.get_table_names())
    if "verification_audit_logs" not in existing_tables:
        datetime_type = dh.datetime_type()
        op.create_table(
            "verification_audit_logs",
            sa.Column("company_id", dh.uuid_type(), nullable=False),
            sa.Column("actor_id", dh.uuid_type(), nullable=True),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("payload", dh.json_type(), nullable=True),
            sa.Column("id", dh.uuid_type(), nullable=False),
            sa.Column("created_at", datetime_type, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", datetime_type, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["company_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    audit_indexes = {idx["name"] for idx in inspector.get_indexes("verification_audit_logs")} if "verification_audit_logs" in set(inspector.get_table_names()) else set()
    if "idx_verification_audit_company_created" not in audit_indexes:
        op.create_index("idx_verification_audit_company_created", "verification_audit_logs", ["company_id", "created_at"], unique=False)
    if "idx_verification_audit_actor_created" not in audit_indexes:
        op.create_index("idx_verification_audit_actor_created", "verification_audit_logs", ["actor_id", "created_at"], unique=False)



def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "verification_audit_logs" in set(inspector.get_table_names()):
        indexes = {idx["name"] for idx in inspector.get_indexes("verification_audit_logs")}
        if "idx_verification_audit_company_created" in indexes:
            op.drop_index("idx_verification_audit_company_created", table_name="verification_audit_logs")
        if "idx_verification_audit_actor_created" in indexes:
            op.drop_index("idx_verification_audit_actor_created", table_name="verification_audit_logs")
        op.drop_table("verification_audit_logs")

    job_columns = _columns(inspector, "jobs")
    job_indexes = {idx["name"] for idx in inspector.get_indexes("jobs")}
    if "idx_jobs_company_slug" in job_indexes:
        op.drop_index("idx_jobs_company_slug", table_name="jobs")
    if "idx_jobs_profession_slug" in job_indexes:
        op.drop_index("idx_jobs_profession_slug", table_name="jobs")
    if "idx_jobs_city_slug" in job_indexes:
        op.drop_index("idx_jobs_city_slug", table_name="jobs")
    if "trust_badges" in job_columns:
        op.drop_column("jobs", "trust_badges")
    if "trust_factors" in job_columns:
        op.drop_column("jobs", "trust_factors")
    if "trust_score" in job_columns:
        op.drop_column("jobs", "trust_score")
    if "company_slug" in job_columns:
        op.drop_column("jobs", "company_slug")
    if "profession_slug" in job_columns:
        op.drop_column("jobs", "profession_slug")
    if "city_slug" in job_columns:
        op.drop_column("jobs", "city_slug")

    user_columns = _columns(inspector, "users")
    user_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
    if "idx_users_verification_state" in user_indexes:
        op.drop_index("idx_users_verification_state", table_name="users")
    if "employer_avg_response_hours" in user_columns:
        op.drop_column("users", "employer_avg_response_hours")
    if "employer_response_rate" in user_columns:
        op.drop_column("users", "employer_response_rate")
    if "trust_badges" in user_columns:
        op.drop_column("users", "trust_badges")
    if "verification_notes" in user_columns:
        op.drop_column("users", "verification_notes")
    if "verification_reviewed_by" in user_columns:
        op.drop_column("users", "verification_reviewed_by")
    if "verification_reviewed_at" in user_columns:
        op.drop_column("users", "verification_reviewed_at")
    if "verification_submitted_at" in user_columns:
        op.drop_column("users", "verification_submitted_at")
    if "verification_state" in user_columns:
        op.drop_column("users", "verification_state")
