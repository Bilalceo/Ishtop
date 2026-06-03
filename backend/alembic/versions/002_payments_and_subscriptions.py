"""Add payments table + user subscription fields

Revision ID: 002_payments_and_subscriptions
Revises: 001_initial_models
Create Date: 2025-12-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_payments_and_subscriptions"
down_revision = "001_initial_models"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Detect database type
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'
    is_postgres = bind.dialect.name == "postgresql"
    
    # UUID type: PostgreSQL uses native UUID, SQLite uses String(36)
    uuid_type = sa.String(36) if is_sqlite else postgresql.UUID(as_uuid=True)
    
    # DateTime type: SQLite doesn't support timezone=True
    datetime_type = sa.DateTime() if is_sqlite else sa.DateTime(timezone=True)
    
    # -------------------------------------------------------------------------
    # Users: add subscription columns
    # -------------------------------------------------------------------------
    op.add_column("users", sa.Column("subscription_tier", sa.String(length=20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("subscription_expires_at", datetime_type, nullable=True))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.create_index("idx_users_subscription_tier", "users", ["subscription_tier"])

    # -------------------------------------------------------------------------
    # Payments table (audit trail)
    # -------------------------------------------------------------------------
    op.create_table(
        "payments",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_payment_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("subscription_tier", sa.String(length=20), nullable=False, server_default="free"),
        sa.Column("subscription_months", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False, unique=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("error_message", sa.String(length=1000), nullable=True),
        sa.Column("error_code", sa.String(length=255), nullable=True),
        sa.Column("created_at", datetime_type, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", datetime_type, server_default=sa.func.now(), nullable=False),
    )

    op.create_index("idx_payments_user_created", "payments", ["user_id", "created_at"])
    op.create_index("idx_payments_status", "payments", ["status"])
    op.create_index("idx_payments_provider_payment_id", "payments", ["provider_payment_id"])

    # -------------------------------------------------------------------------
    # Alembic version table: widen version_num for descriptive revision IDs.
    #
    # SQLite doesn't enforce VARCHAR length, but Postgres does (default is 32).
    # Our revision IDs are human-readable and can exceed 32 chars.
    # -------------------------------------------------------------------------
    if is_postgres:
        op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)")


def downgrade() -> None:
    op.drop_index("idx_payments_provider_payment_id", table_name="payments")
    op.drop_index("idx_payments_status", table_name="payments")
    op.drop_index("idx_payments_user_created", table_name="payments")
    op.drop_table("payments")

    op.drop_index("idx_users_subscription_tier", table_name="users")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "subscription_expires_at")
    op.drop_column("users", "subscription_tier")

