"""
=============================================================================
REFRESH TOKEN MODEL
=============================================================================

One row per active refresh token (i.e. per logged-in device/session).

Security design:
  - The raw refresh token is NEVER stored. We keep only its SHA-256 hash, so a
    read-only database leak cannot be replayed.
  - Tokens are rotated on every use; `replaced_by` links a token to its
    successor and `family_id` groups a rotation lineage. Presenting an already
    revoked token (reuse) means theft -> the whole family is revoked.
  - `revoked_at IS NULL AND expires_at > now()` defines an active session.

Works on both SQLite (local/dev) and PostgreSQL (prod) via the GUID/UTCDateTime
custom types already used across the codebase.
=============================================================================
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, ForeignKey, Index

from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.types import GUID, UTCDateTime


class RefreshToken(Base, UUIDMixin, TimestampMixin):
    """A single rotating refresh token (one active session on one device)."""

    __tablename__ = "refresh_tokens"

    # Owner of the session.
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # SHA-256 hex digest of the raw token — the raw value never touches the DB.
    token_hash = Column(String(64), unique=True, nullable=False, index=True)

    # Rotation lineage. Every token minted from the same login shares a family.
    family_id = Column(GUID(), nullable=False, default=uuid.uuid4, index=True)

    # Human-friendly device info for the "your sessions" screen.
    device_label = Column(String(120), nullable=True)
    user_agent = Column(String(400), nullable=True)
    ip_address = Column(String(64), nullable=True)

    # "Remember Me": True -> 30-day persistent cookie; False -> short session.
    remember_me = Column(Boolean, nullable=False, default=True)

    # Lifetime + revocation.
    expires_at = Column(UTCDateTime(), nullable=False)
    revoked_at = Column(UTCDateTime(), nullable=True)  # NULL = still valid
    replaced_by = Column(GUID(), nullable=True)        # successor after rotation

    __table_args__ = (
        Index("ix_refresh_user_active", "user_id", "revoked_at"),
        Index("ix_refresh_expires", "expires_at"),
    )

    @property
    def is_active(self) -> bool:
        """Active = not revoked and not expired."""
        if self.revoked_at is not None:
            return False
        expires = self.expires_at
        if expires is None:
            return False
        # Normalize naive datetimes (SQLite) to UTC-aware for a safe compare.
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return expires > datetime.now(timezone.utc)

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        state = "active" if self.is_active else "inactive"
        return f"<RefreshToken user={self.user_id} {state} device={self.device_label}>"
