"""Reconcile nullable drift for users and saved jobs.

Revision ID: 010_reconcile_nullable_drift
Revises: 009_drop_university_grant_tables
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "010_reconcile_nullable_drift"
down_revision = "009_drop_university_grant_tables"
branch_labels = None
depends_on = None


def _is_sqlite() -> bool:
    return op.get_bind().dialect.name == "sqlite"


def _run_sql(sqlite_sql: str, postgres_sql: str) -> None:
    op.execute(sa.text(sqlite_sql if _is_sqlite() else postgres_sql))


def _alter_nullable(table_name: str, column_name: str, nullable: bool) -> None:
    existing_type = sa.String(length=20) if column_name == "subscription_tier" else sa.DateTime(timezone=True)

    if _is_sqlite():
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column(
                column_name,
                existing_type=existing_type,
                nullable=nullable,
            )
        return

    op.alter_column(
        table_name,
        column_name,
        existing_type=existing_type,
        nullable=nullable,
    )


def upgrade() -> None:
    """Backfill nulls and enforce NOT NULL constraints."""
    _run_sql(
        "UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL",
        "UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL",
    )
    _run_sql(
        """
        UPDATE saved_jobs
        SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
        WHERE updated_at IS NULL
        """,
        """
        UPDATE saved_jobs
        SET updated_at = COALESCE(updated_at, created_at, NOW())
        WHERE updated_at IS NULL
        """,
    )

    _alter_nullable("users", "subscription_tier", False)
    _alter_nullable("saved_jobs", "updated_at", False)


def downgrade() -> None:
    """Relax NOT NULL constraints."""
    _alter_nullable("saved_jobs", "updated_at", True)
    _alter_nullable("users", "subscription_tier", True)
