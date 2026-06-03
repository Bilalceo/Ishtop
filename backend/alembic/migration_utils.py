"""
Dialect-aware helpers for Alembic migrations.

Production uses PostgreSQL (UUID, JSONB, ENUM). Local dev often uses SQLite,
which cannot compile those PostgreSQL-specific types in raw migration scripts.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


def is_sqlite() -> bool:
    return op.get_bind().dialect.name == "sqlite"


def is_postgresql() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def uuid_type():
    """Native UUID on PostgreSQL; CHAR(36) string storage on SQLite."""
    if is_postgresql():
        return postgresql.UUID(as_uuid=True)
    return sa.String(36)


def json_type():
    """JSONB on PostgreSQL; generic JSON on SQLite."""
    if is_postgresql():
        return postgresql.JSONB()
    return sa.JSON()


def datetime_type(*, timezone: bool = True):
    """Timezone-aware DateTime on PostgreSQL; plain DateTime on SQLite."""
    if is_sqlite():
        return sa.DateTime()
    return sa.DateTime(timezone=timezone)


def user_role_type():
    """PostgreSQL ENUM; string column on SQLite."""
    if is_postgresql():
        return postgresql.ENUM(
            "student",
            "company",
            "admin",
            name="user_role_enum",
            create_type=False,
        )
    return sa.String(20)


def create_user_role_enum() -> None:
    if not is_postgresql():
        return
    user_role_enum = postgresql.ENUM(
        "student",
        "company",
        "admin",
        name="user_role_enum",
        create_type=False,
    )
    user_role_enum.create(op.get_bind(), checkfirst=True)


def drop_user_role_enum() -> None:
    if is_postgresql():
        op.execute("DROP TYPE IF EXISTS user_role_enum")
