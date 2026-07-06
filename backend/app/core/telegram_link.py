"""Short, Telegram-safe tokens that link a Telegram chat to an IshTop account.

Telegram's deep-link `start` parameter allows only [A-Za-z0-9_-] and at most
64 characters, so a JWT (long, contains dots) cannot be used there. Instead we
mint a short random `secrets.token_urlsafe` token, store it (with expiry) on the
user row, and consume it when the bot receives `/start <token>`.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional


def _now() -> datetime:
    return datetime.now(timezone.utc)


def issue_link_token(db, user, expires_minutes: int = 30) -> str:
    """Generate and persist a fresh connect token for `user`. Returns the token.

    token_urlsafe(18) -> 24 chars from [A-Za-z0-9_-]: well within Telegram's
    64-char, dot-free start-parameter limit.
    """
    token = secrets.token_urlsafe(18)
    user.telegram_link_token = token
    user.telegram_link_expires = _now() + timedelta(minutes=expires_minutes)
    db.commit()
    return token


def consume_link_token(db, token: str) -> Optional[str]:
    """Look up a valid, unexpired token, clear it, and return the user id.

    One-time use: the token is cleared whether or not it had expired so a leaked
    link cannot be replayed.
    """
    if not token:
        return None
    from app.models.user import User

    user = db.query(User).filter(User.telegram_link_token == token).first()
    if not user:
        return None

    expires = user.telegram_link_expires
    # Normalise to aware UTC for comparison.
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    user.telegram_link_token = None
    user.telegram_link_expires = None

    if expires is None or expires < _now():
        db.commit()  # clear the stale token
        return None

    db.commit()
    return str(user.id)
