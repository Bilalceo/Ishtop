"""
=============================================================================
Alembic Migration Environment
=============================================================================

This file controls how Alembic runs database migrations.
It's called by Alembic commands like 'alembic upgrade head'.

KEY CONCEPTS:
- Migration: A version of the database schema
- Upgrade: Apply migrations to move forward
- Downgrade: Rollback migrations to move backward
- Autogenerate: Alembic can detect model changes and create migrations

USAGE:
    # Apply all pending migrations
    alembic upgrade head
    
    # Rollback one migration
    alembic downgrade -1
    
    # Create new migration from model changes
    alembic revision --autogenerate -m "Add new column"
"""

from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys
from typing import Any, Callable

# Add backend + alembic dirs for app models and migration_utils imports
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_alembic_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _backend_dir)
sys.path.insert(0, _alembic_dir)

# Import your models' Base for autogenerate
from app.models.base import Base
from app.config import settings

# This is the Alembic Config object
config = context.config

# Set database URL from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object for 'autogenerate' support
target_metadata = Base.metadata


def _make_include_object(is_sqlite: bool) -> Callable[[Any, str, str, bool, Any], bool]:
    """
    SQLite reflection is noisier than PostgreSQL.

    We keep PostgreSQL strict, but for SQLite dev databases we ignore known
    legacy/perf index churn and anonymous reflected unique constraints that
    otherwise dominate alembic check output.
    """

    def include_object(object_: Any, name: str, type_: str, reflected: bool, compare_to: Any) -> bool:
        if not is_sqlite:
            return True

        if type_ == "index" and name:
            noisy_prefixes = ("ix_perf_",)
            noisy_names = {
                "idx_users_subscription_tier",
                "ix_users_subscription",
                "ix_users_email_active",
                "ix_saved_jobs_created_at",
                "ix_saved_jobs_id",
                "ix_users_subscription_tier",
            }
            if name.startswith(noisy_prefixes) or name in noisy_names:
                return False

        if type_ == "unique_constraint" and not name:
            columns = [column.name for column in getattr(object_, "columns", [])]
            if columns == ["id"]:
                return False

        return True

    return include_object


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well. By skipping the Engine
    creation we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    is_sqlite = url.startswith("sqlite")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=not is_sqlite,
        compare_server_default=not is_sqlite,
        include_object=_make_include_object(is_sqlite),
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=not is_sqlite,
            compare_server_default=not is_sqlite,
            include_object=_make_include_object(is_sqlite),
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
