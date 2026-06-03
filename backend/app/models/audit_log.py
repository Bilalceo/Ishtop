"""AuditLog model — append-only record of admin actions."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.models.base import Base
from app.models.types import GUID


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    admin_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=False)  # user | job | company | error
    target_id = Column(String(36), nullable=True)
    target_label = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    admin = relationship("User", foreign_keys=[admin_id])
