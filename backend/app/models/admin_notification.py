"""AdminNotification model — broadcast or targeted alerts for admin users."""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.models.base import Base
from app.models.types import GUID


class AdminNotification(Base):
    __tablename__ = "admin_notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    admin_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )  # null = broadcast to all admins
    type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(
        DateTime(), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    admin = relationship("User", foreign_keys=[admin_id])
