"""Add admin_role column to users.

Revision ID: 011_add_admin_role_to_users
Revises: 010_reconcile_nullable_drift
Create Date: 2026-04-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "011_add_admin_role_to_users"
down_revision = "010_reconcile_nullable_drift"
branch_labels = None
depends_on = None


ADMIN_ROLE_VALUES = (
    "super_admin",
    "operations_admin",
    "finance_admin",
    "security_admin",
    "support_agent",
)


def _is_sqlite() -> bool:
    return op.get_bind().dialect.name == "sqlite"


def _create_check_constraint(name: str, condition: str) -> None:
    if _is_sqlite():
        with op.batch_alter_table("users") as batch_op:
            batch_op.create_check_constraint(name, condition)
        return
    op.create_check_constraint(name, "users", condition)


def _drop_check_constraint(name: str) -> None:
    if _is_sqlite():
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_constraint(name, type_="check")
        return
    op.drop_constraint(name, "users", type_="check")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "admin_role" not in columns:
        op.add_column("users", sa.Column("admin_role", sa.String(length=32), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE users
            SET admin_role = 'super_admin'
            WHERE LOWER(CAST(role AS TEXT)) = 'admin' AND (admin_role IS NULL OR admin_role = '')
            """
        )
    )

    inspector = inspect(bind)
    check_names = {check["name"] for check in inspector.get_check_constraints("users")}

    if "ck_users_admin_role_valid" not in check_names:
        _create_check_constraint(
            "ck_users_admin_role_valid",
            "admin_role IS NULL OR admin_role IN ('super_admin','operations_admin','finance_admin','security_admin','support_agent')",
        )

    index_names = {index["name"] for index in inspector.get_indexes("users")}
    if "ix_users_admin_role" not in index_names:
        op.create_index("ix_users_admin_role", "users", ["admin_role"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    index_names = {index["name"] for index in inspector.get_indexes("users")}
    if "ix_users_admin_role" in index_names:
        op.drop_index("ix_users_admin_role", table_name="users")

    check_names = {check["name"] for check in inspector.get_check_constraints("users")}
    if "ck_users_admin_role_required" in check_names:
        _drop_check_constraint("ck_users_admin_role_required")

    # Inspector can become stale after DDL, reload before next check drop.
    inspector = inspect(bind)
    check_names = {check["name"] for check in inspector.get_check_constraints("users")}
    if "ck_users_admin_role_valid" in check_names:
        _drop_check_constraint("ck_users_admin_role_valid")

    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "admin_role" in columns:
        op.drop_column("users", "admin_role")
