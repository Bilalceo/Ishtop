"""Add universities, scholarships, and applications tables

Revision ID: 003_universities_and_scholarships
Revises: 002_payments_and_subscriptions
Create Date: 2025-01-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003_universities_and_scholarships"
down_revision = "002_payments_and_subscriptions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Detect database type
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'
    
    # UUID type: PostgreSQL uses native UUID, SQLite uses String(36)
    uuid_type = sa.String(36) if is_sqlite else postgresql.UUID(as_uuid=True)
    
    # DateTime type: SQLite doesn't support timezone=True
    datetime_type = sa.DateTime() if is_sqlite else sa.DateTime(timezone=True)
    
    # JSONB type: PostgreSQL uses JSONB, SQLite uses JSON
    jsonb_type = sa.JSON() if is_sqlite else postgresql.JSONB
    
    # Numeric type
    numeric_type = sa.Numeric(12, 2)
    
    # -------------------------------------------------------------------------
    # Universities table
    # -------------------------------------------------------------------------
    op.create_table(
        "universities",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("short_name", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("world_ranking", sa.Integer(), nullable=True),
        sa.Column("country_ranking", sa.Integer(), nullable=True),
        sa.Column("programs", jsonb_type, nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("requirements", jsonb_type, nullable=True),
        sa.Column("acceptance_rate", sa.String(length=20), nullable=True),
        sa.Column("tuition_min", numeric_type, nullable=True),
        sa.Column("tuition_max", numeric_type, nullable=True),
        sa.Column("tuition_currency", sa.String(length=10), nullable=True, server_default="USD"),
        sa.Column("tuition_note", sa.String(length=255), nullable=True),
        sa.Column("application_deadline_fall", datetime_type, nullable=True),
        sa.Column("application_deadline_spring", datetime_type, nullable=True),
        sa.Column("application_deadline_summer", datetime_type, nullable=True),
        sa.Column("created_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", datetime_type, nullable=True),
    )
    
    op.create_index("idx_universities_name", "universities", ["name"])
    op.create_index("idx_universities_country", "universities", ["country"])
    op.create_index("idx_universities_city", "universities", ["city"])
    op.create_index("idx_universities_world_ranking", "universities", ["world_ranking"])
    op.create_index("idx_universities_country_ranking", "universities", ["country", "world_ranking"])
    op.create_index("idx_universities_search", "universities", ["name", "country", "city"])
    
    # -------------------------------------------------------------------------
    # Scholarships table
    # -------------------------------------------------------------------------
    op.create_table(
        "scholarships",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("amount_info", jsonb_type, nullable=True),
        sa.Column("coverage", jsonb_type, nullable=True),
        sa.Column("requirements", jsonb_type, nullable=True),
        sa.Column("eligibility_criteria", sa.Text(), nullable=True),
        sa.Column("application_deadline", datetime_type, nullable=False),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("application_url", sa.String(length=500), nullable=True),
        sa.Column("university_id", uuid_type, sa.ForeignKey("universities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", datetime_type, nullable=True),
    )
    
    op.create_index("idx_scholarships_name", "scholarships", ["name"])
    op.create_index("idx_scholarships_country", "scholarships", ["country"])
    op.create_index("idx_scholarships_deadline", "scholarships", ["application_deadline"])
    op.create_index("idx_scholarships_university", "scholarships", ["university_id"])
    op.create_index("idx_scholarships_country_deadline", "scholarships", ["country", "application_deadline"])
    
    # -------------------------------------------------------------------------
    # University Applications table
    # -------------------------------------------------------------------------
    op.create_table(
        "university_applications",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("university_id", uuid_type, sa.ForeignKey("universities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("program", sa.String(length=255), nullable=False),
        sa.Column("intake_semester", sa.String(length=50), nullable=True),
        sa.Column("intake_year", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
        sa.Column("documents", jsonb_type, nullable=True),
        sa.Column("documents_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("documents_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", datetime_type, nullable=True),
        sa.Column("deadline", datetime_type, nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", datetime_type, nullable=True),
    )
    
    op.create_index("idx_uni_apps_user", "university_applications", ["user_id"])
    op.create_index("idx_uni_apps_university", "university_applications", ["university_id"])
    op.create_index("idx_uni_apps_status", "university_applications", ["status"])
    op.create_index("idx_uni_apps_user_status", "university_applications", ["user_id", "status"])
    op.create_index("idx_uni_apps_university_status", "university_applications", ["university_id", "status"])
    op.create_index("idx_uni_apps_deadline", "university_applications", ["deadline"])
    
    # -------------------------------------------------------------------------
    # Motivation Letters table
    # -------------------------------------------------------------------------
    op.create_table(
        "motivation_letters",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("application_id", uuid_type, sa.ForeignKey("university_applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("ai_generated", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column("created_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", datetime_type, nullable=False, server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", datetime_type, nullable=True),
    )
    
    op.create_index("idx_motivation_letters_application", "motivation_letters", ["application_id"])


def downgrade() -> None:
    op.drop_index("idx_motivation_letters_application", table_name="motivation_letters")
    op.drop_table("motivation_letters")
    
    op.drop_index("idx_uni_apps_deadline", table_name="university_applications")
    op.drop_index("idx_uni_apps_university_status", table_name="university_applications")
    op.drop_index("idx_uni_apps_user_status", table_name="university_applications")
    op.drop_index("idx_uni_apps_status", table_name="university_applications")
    op.drop_index("idx_uni_apps_university", table_name="university_applications")
    op.drop_index("idx_uni_apps_user", table_name="university_applications")
    op.drop_table("university_applications")
    
    op.drop_index("idx_scholarships_country_deadline", table_name="scholarships")
    op.drop_index("idx_scholarships_university", table_name="scholarships")
    op.drop_index("idx_scholarships_deadline", table_name="scholarships")
    op.drop_index("idx_scholarships_country", table_name="scholarships")
    op.drop_index("idx_scholarships_name", table_name="scholarships")
    op.drop_table("scholarships")
    
    op.drop_index("idx_universities_search", table_name="universities")
    op.drop_index("idx_universities_country_ranking", table_name="universities")
    op.drop_index("idx_universities_world_ranking", table_name="universities")
    op.drop_index("idx_universities_city", table_name="universities")
    op.drop_index("idx_universities_country", table_name="universities")
    op.drop_index("idx_universities_name", table_name="universities")
    op.drop_table("universities")



