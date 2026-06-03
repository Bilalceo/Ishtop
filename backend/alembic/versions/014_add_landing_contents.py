"""add landing contents

Revision ID: 014_add_landing_contents
Revises: 013_add_interview_scorecards
Create Date: 2026-05-24
"""

from alembic import op
import sqlalchemy as sa

import migration_utils as dh


# revision identifiers, used by Alembic.
revision = "014_add_landing_contents"
down_revision = "013_add_interview_scorecards"
branch_labels = None
depends_on = None


def upgrade() -> None:
    datetime_type = dh.datetime_type()
    op.create_table(
        "landing_contents",
        sa.Column("locale", sa.String(length=8), nullable=False),
        sa.Column("payload", dh.json_type(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("id", dh.uuid_type(), nullable=False),
        sa.Column("created_at", datetime_type, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", datetime_type, server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("locale", name="uq_landing_contents_locale"),
    )
    op.create_index("idx_landing_contents_locale_published", "landing_contents", ["locale", "is_published"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_landing_contents_locale_published", table_name="landing_contents")
    op.drop_table("landing_contents")
