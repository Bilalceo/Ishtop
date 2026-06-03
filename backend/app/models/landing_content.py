from __future__ import annotations

from sqlalchemy import Boolean, Column, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDMixin


class LandingContent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "landing_contents"

    locale = Column(String(8), nullable=False, comment="Locale code, e.g. uz, ru")
    payload = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, comment="Landing CMS payload")
    is_published = Column(Boolean, nullable=False, default=True, server_default="true")

    __table_args__ = (
        UniqueConstraint("locale", name="uq_landing_contents_locale"),
        Index("idx_landing_contents_locale_published", "locale", "is_published"),
    )
