"""
Telegram notification helper for company-side alerts.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)


def _resolve_company_telegram_target(company: User) -> Optional[str]:
    prefs = company.notification_preferences or {}
    chat_id = (prefs.get("telegram_chat_id") or "").strip()
    channel = (prefs.get("telegram_channel") or "").strip()
    return chat_id or channel or None


async def send_company_telegram_notification(
    *,
    company: User,
    title: str,
    message: str,
) -> bool:
    """Send Telegram notification if company channel is configured."""

    token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    if not token:
        logger.debug("Telegram bot token is not configured; skipping notification.")
        return False

    target = _resolve_company_telegram_target(company)
    if not target:
        logger.debug("Company %s has no telegram target configured.", company.id)
        return False

    text = f"{title}\n\n{message}".strip()
    url = f"{settings.TELEGRAM_API_BASE_URL.rstrip('/')}/bot{token}/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={
                    "chat_id": target,
                    "text": text,
                    "disable_web_page_preview": True,
                },
            )
            response.raise_for_status()
        return True
    except Exception as exc:  # pragma: no cover - non-blocking notification path
        logger.warning(
            "Failed to send Telegram notification to company %s: %s",
            company.id,
            exc,
        )
        return False
