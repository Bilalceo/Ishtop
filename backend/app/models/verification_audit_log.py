"""Audit log model for company verification lifecycle actions."""

from __future__ import annotations

from typing import Any, Dict, Optional, TYPE_CHECKING

from sqlalchemy import Column, String, Text, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.types import GUID

if TYPE_CHECKING:
    from app.models.user import User


class VerificationAuditLog(Base, UUIDMixin, TimestampMixin):
    """Immutable-ish audit events for employer verification decisions."""

    __tablename__ = "verification_audit_logs"

    __table_args__ = (
        Index("idx_verification_audit_company_created", "company_id", "created_at"),
        Index("idx_verification_audit_actor_created", "actor_id", "created_at"),
        {"comment": "Audit trail for company verification submit/review events"},
    )

    company_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Company account affected by this action",
    )

    actor_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User/admin who performed the action",
    )

    action = Column(
        String(64),
        nullable=False,
        index=True,
        comment="submit, approve, reject, badge_update",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optional reason/context for the action",
    )

    payload = Column(
        JSON,
        nullable=True,
        default=dict,
        comment="Structured metadata snapshot for audit/debugging",
    )

    company: "User" = relationship(
        "User",
        foreign_keys=[company_id],
        lazy="joined",
    )

    actor: Optional["User"] = relationship(
        "User",
        foreign_keys=[actor_id],
        lazy="joined",
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "company_id": str(self.company_id),
            "actor_id": str(self.actor_id) if self.actor_id else None,
            "action": self.action,
            "notes": self.notes,
            "payload": self.payload or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
