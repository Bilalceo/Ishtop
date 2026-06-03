"""Add interview_scorecards table.

Stores per-application interview evaluation: 5 criteria scored 1-5 each plus
notes + decision. Used by HR to standardise evaluation and reduce bias.

Revision ID: 013_add_interview_scorecards
Revises: 012_add_application_match_breakdown
Create Date: 2026-05-12
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "013_add_interview_scorecards"
down_revision = "012_add_application_match_breakdown"
branch_labels = None
depends_on = None


def _default_uuid_type():
    # SQLite cannot compile PostgreSQL UUID type.
    return sa.String(36) if op.get_bind().dialect.name == "sqlite" else postgresql.UUID(as_uuid=True)


def _aligned_fk_type(inspector, table_name: str, column_name: str):
    """
    Align FK column type with referenced table column type.
    This prevents PostgreSQL FK creation errors when legacy DBs store ids as VARCHAR(36).
    """
    if table_name not in inspector.get_table_names():
        return _default_uuid_type()

    columns = inspector.get_columns(table_name)
    ref_col = next((col for col in columns if col["name"] == column_name), None)
    if not ref_col:
        return _default_uuid_type()

    ref_type = ref_col.get("type")
    type_name = ref_type.__class__.__name__.lower() if ref_type is not None else ""

    # Native UUID column in PostgreSQL.
    if "uuid" in type_name:
        return postgresql.UUID(as_uuid=True)

    # Legacy char/varchar UUID storage.
    length = getattr(ref_type, "length", None) or 36
    return sa.String(length)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "interview_scorecards" in inspector.get_table_names():
        return

    application_id_type = _aligned_fk_type(inspector, "applications", "id")
    user_id_type = _aligned_fk_type(inspector, "users", "id")
    scorecard_id_type = application_id_type

    op.create_table(
        "interview_scorecards",
        sa.Column("id", scorecard_id_type, primary_key=True),
        sa.Column("application_id", application_id_type, sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evaluator_id", user_id_type, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),

        # 5 criteria, each scored 1-5
        sa.Column("technical_score", sa.Integer, nullable=True),
        sa.Column("communication_score", sa.Integer, nullable=True),
        sa.Column("cultural_fit_score", sa.Integer, nullable=True),
        sa.Column("motivation_score", sa.Integer, nullable=True),
        sa.Column("problem_solving_score", sa.Integer, nullable=True),

        # Aggregate + decision
        sa.Column("overall_score", sa.Float, nullable=True),
        sa.Column("recommendation", sa.String(length=20), nullable=True),  # hire | maybe | pass
        sa.Column("notes", sa.Text, nullable=True),

        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    existing_indexes = {index["name"] for index in inspector.get_indexes("interview_scorecards")}
    if "ix_interview_scorecards_application_id" not in existing_indexes:
        op.create_index(
            "ix_interview_scorecards_application_id",
            "interview_scorecards",
            ["application_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "interview_scorecards" not in inspector.get_table_names():
        return
    try:
        op.drop_index("ix_interview_scorecards_application_id", table_name="interview_scorecards")
    except Exception:
        pass
    op.drop_table("interview_scorecards")
