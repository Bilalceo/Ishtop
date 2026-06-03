"""add funnel events

Revision ID: 016_add_funnel_events
Revises: 015_add_trust_and_discovery
Create Date: 2026-05-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

import migration_utils as dh


revision = "016_add_funnel_events"
down_revision = "015_add_trust_and_discovery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "funnel_events" not in existing_tables:
        datetime_type = dh.datetime_type()
        op.create_table(
            "funnel_events",
            sa.Column("id", dh.uuid_type(), nullable=False),
            sa.Column("event_name", sa.String(length=100), nullable=False),
            sa.Column("actor_user_id", dh.uuid_type(), nullable=True),
            sa.Column("actor_role", sa.String(length=30), nullable=True),
            sa.Column("job_id", dh.uuid_type(), nullable=True),
            sa.Column("source", sa.String(length=100), nullable=True),
            sa.Column("metadata", dh.json_type(), nullable=True),
            sa.Column(
                "created_at",
                datetime_type,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                datetime_type,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {idx["name"] for idx in inspector.get_indexes("funnel_events")}
    index_specs = {
        "ix_funnel_events_id": ["id"],
        "ix_funnel_events_event_name": ["event_name"],
        "ix_funnel_events_actor_user_id": ["actor_user_id"],
        "ix_funnel_events_actor_role": ["actor_role"],
        "ix_funnel_events_job_id": ["job_id"],
        "ix_funnel_events_source": ["source"],
        "ix_funnel_events_created_at": ["created_at"],
        "idx_funnel_events_name_created": ["event_name", "created_at"],
        "idx_funnel_events_job_created": ["job_id", "created_at"],
        "idx_funnel_events_actor_created": ["actor_user_id", "created_at"],
    }
    for name, columns in index_specs.items():
        if name not in indexes:
            op.create_index(name, "funnel_events", columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "funnel_events" in set(inspector.get_table_names()):
        op.drop_table("funnel_events")
