"""Drop university/grant tables removed from the product.

Revision ID: 009_drop_university_grant_tables
Revises: 008_add_interview_metadata_to_applications
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "009_drop_university_grant_tables"
down_revision = "008_add_interview_metadata_to_applications"
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _columns_exist(inspector, table_name: str, columns: list[str]) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    return all(column in existing_columns for column in columns)


def _drop_index_if_exists(table_name: str, index_name: str) -> None:
    inspector = inspect(op.get_bind())
    if not _index_exists(inspector, table_name, index_name):
        return
    op.drop_index(index_name, table_name=table_name)


def _drop_table_if_exists(table_name: str) -> None:
    inspector = inspect(op.get_bind())
    if not _table_exists(inspector, table_name):
        return
    op.drop_table(table_name)


def _uuid_type():
    return sa.String(36) if op.get_bind().dialect.name == "sqlite" else postgresql.UUID(as_uuid=True)


def _datetime_type():
    return sa.DateTime() if op.get_bind().dialect.name == "sqlite" else sa.DateTime(timezone=True)


def _json_type():
    return sa.JSON() if op.get_bind().dialect.name == "sqlite" else postgresql.JSONB


def upgrade() -> None:
    # Drop child tables first, then their parents.
    _drop_index_if_exists("motivation_letters", "idx_motivation_letters_application")
    _drop_table_if_exists("motivation_letters")

    _drop_index_if_exists("university_applications", "idx_uni_apps_deadline")
    _drop_index_if_exists("university_applications", "idx_uni_apps_university_status")
    _drop_index_if_exists("university_applications", "idx_uni_apps_user_status")
    _drop_index_if_exists("university_applications", "idx_uni_apps_status")
    _drop_index_if_exists("university_applications", "idx_uni_apps_university")
    _drop_index_if_exists("university_applications", "idx_uni_apps_user")
    _drop_table_if_exists("university_applications")

    _drop_index_if_exists("scholarships", "idx_scholarships_country_deadline")
    _drop_index_if_exists("scholarships", "idx_scholarships_university")
    _drop_index_if_exists("scholarships", "idx_scholarships_deadline")
    _drop_index_if_exists("scholarships", "idx_scholarships_country")
    _drop_index_if_exists("scholarships", "idx_scholarships_name")
    _drop_table_if_exists("scholarships")

    _drop_index_if_exists("universities", "idx_universities_search")
    _drop_index_if_exists("universities", "idx_universities_country_ranking")
    _drop_index_if_exists("universities", "idx_universities_world_ranking")
    _drop_index_if_exists("universities", "idx_universities_city")
    _drop_index_if_exists("universities", "idx_universities_country")
    _drop_index_if_exists("universities", "idx_universities_name")
    _drop_table_if_exists("universities")


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str]) -> None:
    inspector = inspect(op.get_bind())
    if not _columns_exist(inspector, table_name, columns):
        return
    if _index_exists(inspector, table_name, index_name):
        return
    op.create_index(index_name, table_name, columns)


def _create_universities_table() -> None:
    inspector = inspect(op.get_bind())
    if _table_exists(inspector, "universities"):
        return

    op.create_table(
        "universities",
        sa.Column("id", _uuid_type(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("short_name", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("world_ranking", sa.Integer(), nullable=True),
        sa.Column("country_ranking", sa.Integer(), nullable=True),
        sa.Column("programs", _json_type(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("requirements", _json_type(), nullable=True),
        sa.Column("acceptance_rate", sa.String(length=20), nullable=True),
        sa.Column("tuition_min", sa.Numeric(12, 2), nullable=True),
        sa.Column("tuition_max", sa.Numeric(12, 2), nullable=True),
        sa.Column("tuition_currency", sa.String(length=10), nullable=True, server_default="USD"),
        sa.Column("tuition_note", sa.String(length=255), nullable=True),
        sa.Column("application_deadline_fall", _datetime_type(), nullable=True),
        sa.Column("application_deadline_spring", _datetime_type(), nullable=True),
        sa.Column("application_deadline_summer", _datetime_type(), nullable=True),
        sa.Column("created_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", _datetime_type(), nullable=True),
    )

    _create_index_if_missing("universities", "idx_universities_name", ["name"])
    _create_index_if_missing("universities", "idx_universities_country", ["country"])
    _create_index_if_missing("universities", "idx_universities_city", ["city"])
    _create_index_if_missing("universities", "idx_universities_world_ranking", ["world_ranking"])
    _create_index_if_missing("universities", "idx_universities_country_ranking", ["country", "world_ranking"])
    _create_index_if_missing("universities", "idx_universities_search", ["name", "country", "city"])


def _create_scholarships_table() -> None:
    inspector = inspect(op.get_bind())
    if _table_exists(inspector, "scholarships"):
        return

    op.create_table(
        "scholarships",
        sa.Column("id", _uuid_type(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("amount_info", _json_type(), nullable=True),
        sa.Column("coverage", _json_type(), nullable=True),
        sa.Column("requirements", _json_type(), nullable=True),
        sa.Column("eligibility_criteria", sa.Text(), nullable=True),
        sa.Column("application_deadline", _datetime_type(), nullable=False),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("application_url", sa.String(length=500), nullable=True),
        sa.Column(
            "university_id",
            _uuid_type(),
            sa.ForeignKey("universities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", _datetime_type(), nullable=True),
    )

    _create_index_if_missing("scholarships", "idx_scholarships_name", ["name"])
    _create_index_if_missing("scholarships", "idx_scholarships_country", ["country"])
    _create_index_if_missing("scholarships", "idx_scholarships_deadline", ["application_deadline"])
    _create_index_if_missing("scholarships", "idx_scholarships_university", ["university_id"])
    _create_index_if_missing("scholarships", "idx_scholarships_country_deadline", ["country", "application_deadline"])


def _create_university_applications_table() -> None:
    inspector = inspect(op.get_bind())
    if _table_exists(inspector, "university_applications"):
        return

    op.create_table(
        "university_applications",
        sa.Column("id", _uuid_type(), primary_key=True, nullable=False),
        sa.Column("user_id", _uuid_type(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("university_id", _uuid_type(), sa.ForeignKey("universities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("program", sa.String(length=255), nullable=False),
        sa.Column("intake_semester", sa.String(length=50), nullable=True),
        sa.Column("intake_year", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
        sa.Column("documents", _json_type(), nullable=True),
        sa.Column("documents_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("documents_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", _datetime_type(), nullable=True),
        sa.Column("deadline", _datetime_type(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", _datetime_type(), nullable=True),
    )

    _create_index_if_missing("university_applications", "idx_uni_apps_user", ["user_id"])
    _create_index_if_missing("university_applications", "idx_uni_apps_university", ["university_id"])
    _create_index_if_missing("university_applications", "idx_uni_apps_status", ["status"])
    _create_index_if_missing("university_applications", "idx_uni_apps_user_status", ["user_id", "status"])
    _create_index_if_missing("university_applications", "idx_uni_apps_university_status", ["university_id", "status"])
    _create_index_if_missing("university_applications", "idx_uni_apps_deadline", ["deadline"])


def _create_motivation_letters_table() -> None:
    inspector = inspect(op.get_bind())
    if _table_exists(inspector, "motivation_letters"):
        return

    op.create_table(
        "motivation_letters",
        sa.Column("id", _uuid_type(), primary_key=True, nullable=False),
        sa.Column("application_id", _uuid_type(), sa.ForeignKey("university_applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column("created_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", _datetime_type(), nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", _datetime_type(), nullable=True),
    )

    _create_index_if_missing("motivation_letters", "idx_motivation_letters_application", ["application_id"])


def downgrade() -> None:
    _create_universities_table()
    _create_scholarships_table()
    _create_university_applications_table()
    _create_motivation_letters_table()
