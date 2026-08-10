"""
=============================================================================
REFRESH TOKEN SERVICE
=============================================================================

Database-backed, rotating refresh tokens with reuse detection.

  issue_refresh_token  -> mint a new opaque token (returns raw + DB row)
  rotate               -> validate a presented token and swap it for a successor
  revoke_one           -> logout this device
  revoke_family        -> theft response (kills a rotation lineage)
  revoke_all_for_user  -> logout everywhere / password change

Only the SHA-256 hash of a token is ever stored, so the raw value cannot be
recovered from the database.
=============================================================================
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import TokenError
from app.models.refresh_token import RefreshToken


# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------

def _hash(raw: str) -> str:
    """SHA-256 hex digest — what we store instead of the raw token."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _device_label(request) -> str:
    """Coarse device label from the User-Agent for the sessions screen."""
    ua = ""
    try:
        ua = (request.headers.get("user-agent", "") if request else "").lower()
    except Exception:
        ua = ""
    if "iphone" in ua or "ipad" in ua:
        return "iPhone / iPad"
    if "android" in ua:
        return "Android"
    if "mac" in ua:
        return "Mac"
    if "windows" in ua:
        return "Windows"
    if "linux" in ua:
        return "Linux"
    return "Browser"


def _client_ip(request) -> str | None:
    try:
        if not request:
            return None
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
        return request.client.host if request.client else None
    except Exception:
        return None


def _is_expired(row: RefreshToken) -> bool:
    expires = row.expires_at
    if expires is None:
        return True
    if expires.tzinfo is None:  # SQLite hands back naive datetimes
        expires = expires.replace(tzinfo=timezone.utc)
    return expires <= datetime.now(timezone.utc)


# -----------------------------------------------------------------------------
# issue / rotate
# -----------------------------------------------------------------------------

def issue_refresh_token(
    db: Session,
    user_id,
    *,
    remember_me: bool,
    family_id: uuid.UUID | None = None,
    request=None,
) -> tuple[str, RefreshToken]:
    """
    Create a new refresh token row. Returns (raw_token, row).
    The caller sets the cookie with `raw_token`; the DB only sees its hash.
    """
    raw = secrets.token_urlsafe(48)  # ~64 chars, 384 bits of entropy
    days = (
        settings.REFRESH_TOKEN_EXPIRE_DAYS
        if remember_me
        else settings.SESSION_REFRESH_EXPIRE_DAYS
    )
    row = RefreshToken(
        user_id=user_id,
        token_hash=_hash(raw),
        family_id=family_id or uuid.uuid4(),
        remember_me=remember_me,
        expires_at=datetime.now(timezone.utc) + timedelta(days=days),
        device_label=_device_label(request),
        user_agent=(request.headers.get("user-agent")[:400] if request else None),
        ip_address=_client_ip(request),
    )
    db.add(row)
    db.flush()  # assign row.id without committing (caller controls the tx)
    return raw, row


def rotate(db: Session, raw_token: str, request=None) -> tuple[str, RefreshToken]:
    """
    Validate the presented refresh token and rotate it.

    Raises TokenError on: unknown, expired, or reuse (already-rotated) tokens.
    On reuse -> the entire family is revoked (theft response).
    """
    row = db.query(RefreshToken).filter_by(token_hash=_hash(raw_token)).first()

    if row is None:
        raise TokenError("Unknown refresh token")

    # Reuse detection: a token that was already rotated is being replayed.
    if row.revoked_at is not None:
        revoke_family(db, row.family_id)
        raise TokenError("Refresh token reuse detected — family revoked")

    if _is_expired(row):
        raise TokenError("Refresh token expired")

    # Mint the successor in the SAME family, then revoke the presented token.
    new_raw, new_row = issue_refresh_token(
        db,
        row.user_id,
        remember_me=bool(row.remember_me),
        family_id=row.family_id,
        request=request,
    )
    row.revoked_at = datetime.now(timezone.utc)
    row.replaced_by = new_row.id
    db.commit()
    return new_raw, new_row


# -----------------------------------------------------------------------------
# revocation
# -----------------------------------------------------------------------------

def revoke_one(db: Session, raw_token: str) -> None:
    """Logout this device: revoke the single presented token."""
    db.query(RefreshToken).filter_by(token_hash=_hash(raw_token)).update(
        {"revoked_at": datetime.now(timezone.utc)}
    )
    db.commit()


def revoke_family(db: Session, family_id) -> None:
    """Revoke every still-active token in a rotation lineage (theft response)."""
    db.query(RefreshToken).filter(
        RefreshToken.family_id == family_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()


def revoke_all_for_user(db: Session, user_id) -> int:
    """Logout everywhere (e.g. on password change). Returns count revoked."""
    n = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .update({"revoked_at": datetime.now(timezone.utc)})
    )
    db.commit()
    return n


def list_active_sessions(db: Session, user_id) -> list[RefreshToken]:
    """Active (unrevoked, unexpired) sessions for the sessions screen."""
    rows = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .order_by(RefreshToken.created_at.desc())
        .all()
    )
    return [r for r in rows if not _is_expired(r)]
