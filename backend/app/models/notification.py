"""
=============================================================================
NOTIFICATION MODEL
=============================================================================

User notifications for important events.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.models.base import Base
from app.models.types import GUID


class Notification(Base):
    """User notification model."""
    
    __tablename__ = "notifications"
    
    # Primary key - GUID maps to PostgreSQL UUID, SQLite CHAR(36)
    id = Column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )
    
    # Foreign keys
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Notification data
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # info, success, warning, error
    link = Column(String(500), nullable=True)  # Optional link to related resource
    
    # Status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(
        DateTime(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    read_at = Column(
        DateTime(),
        nullable=True
    )
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification {self.id} - {self.title}>"
