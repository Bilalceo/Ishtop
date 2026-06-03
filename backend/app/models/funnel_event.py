"""Persistent funnel analytics events."""

from __future__ import annotations

from typing import Any, Dict

from sqlalchemy import Column, Index, String, JSON

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.types import GUID


class FunnelEvent(Base, UUIDMixin, TimestampMixin):
    """Append-only-ish candidate funnel analytics event."""

    __tablename__ = "funnel_events"

    event_name = Column(String(100), nullable=False, index=True)
    actor_user_id = Column(GUID(), nullable=True, index=True)
    actor_role = Column(String(30), nullable=True, index=True)
    job_id = Column(GUID(), nullable=True, index=True)
    source = Column(String(100), nullable=True, index=True)
    event_metadata = Column("metadata", JSON, nullable=True, default=dict)

    __table_args__ = (
        Index("idx_funnel_events_name_created", "event_name", "created_at"),
        Index("idx_funnel_events_job_created", "job_id", "created_at"),
        Index("idx_funnel_events_actor_created", "actor_user_id", "created_at"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "event_name": self.event_name,
            "actor_user_id": str(self.actor_user_id) if self.actor_user_id else None,
            "actor_role": self.actor_role,
            "job_id": str(self.job_id) if self.job_id else None,
            "source": self.source,
            "metadata": self.event_metadata or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
