"""Short-lived signed tokens that link a Telegram chat to an IshTop account.

Flow: the app hands the logged-in user a deep link
`https://t.me/<bot>?start=<token>`. When they open it, Telegram sends the bot
`/start <token>`; the webhook verifies the token and stores the chat id on the
user. No DB state is needed for the token itself — it is a signed JWT.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt

from app.config import settings

_TYPE = "telegram_link"


def create_link_token(user_id: str, expires_minutes: int = 30) -> str:
    payload = {
        "sub": str(user_id),
        "type": _TYPE,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_link_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception:
        return None
    if payload.get("type") != _TYPE:
        return None
    user_id = payload.get("sub")
    return str(user_id) if user_id else None
