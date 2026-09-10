"""Publish platform jobs to the public Telegram channel.

Almost every listing on the site came *from* Telegram; jobs posted directly on
the platform never went the other way, so they were invisible to the channel
audience and only discoverable by someone already browsing the site.

Posting them to @ishtopuz_official closes that loop. The returned message link
is stored on the job so the site can point people at the post, and so a repost
can be detected instead of duplicated.

Best-effort by design: publishing a job must never fail because Telegram is
down or misconfigured.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_JOB_TYPE_UZ = {
    "full_time": "To'liq stavka",
    "part_time": "Yarim stavka",
    "remote": "Masofaviy",
    "hybrid": "Gibrid",
    "contract": "Shartnoma",
    "internship": "Amaliyot",
}
_LEVEL_UZ = {
    "intern": "Amaliyotchi",
    "junior": "Boshlovchi (0-2 yil)",
    "mid": "O'rta (2-5 yil)",
    "senior": "Katta (5+ yil)",
    "lead": "Rahbar (7+ yil)",
    "executive": "Direktor",
}


def _esc(text: str) -> str:
    """Escape for Telegram HTML parse mode."""
    return (
        str(text or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _money(job) -> str:
    lo, hi = getattr(job, "salary_min", None), getattr(job, "salary_max", None)
    cur = (getattr(job, "salary_currency", None) or "UZS").upper()
    unit = "so'm" if cur == "UZS" else cur
    fmt = lambda v: f"{int(v):,}".replace(",", " ")
    if lo and hi:
        return f"{fmt(lo)} – {fmt(hi)} {unit}"
    if lo:
        return f"{fmt(lo)} {unit}dan"
    if hi:
        return f"{fmt(hi)} {unit}gacha"
    return "Kelishilgan holda"


def build_job_post(job, company_name: str) -> str:
    """Compose the channel post. Kept plain and scannable — it is read on a phone."""
    site = settings.FRONTEND_URL.rstrip("/")
    lines = [
        f"💼 <b>{_esc(job.title)}</b>",
        "",
        f"🏢 {_esc(company_name)}",
    ]
    if getattr(job, "location", None):
        lines.append(f"📍 {_esc(job.location)}")
    lines.append(f"💰 {_esc(_money(job))}")

    meta = [
        _JOB_TYPE_UZ.get(getattr(job, "job_type", ""), ""),
        _LEVEL_UZ.get(getattr(job, "experience_level", ""), ""),
    ]
    meta = [m for m in meta if m]
    if meta:
        lines.append(f"🕐 {_esc(' · '.join(meta))}")

    reqs = [r for r in (getattr(job, "requirements", None) or []) if str(r).strip()][:4]
    if reqs:
        lines.append("")
        lines.append("<b>Talablar:</b>")
        lines.extend(f"• {_esc(r)}" for r in reqs)

    lines.append("")
    lines.append(f'👉 <a href="{site}/jobs/{job.id}">Batafsil va ariza berish</a>')
    lines.append("")
    lines.append("#ishtop #vakansiya")
    return "\n".join(lines)


def publish_job_to_channel(job, company_name: str) -> Optional[str]:
    """Post the job to the public channel. Returns the message link, or None.

    Synchronous on purpose: the job routes run in FastAPI's threadpool, where a
    blocking HTTP call is fine and an event loop is not available to await on.
    """
    token = (settings.TELEGRAM_APPS_BOT_TOKEN or "").strip()
    channel = (settings.TELEGRAM_CHANNEL_ID or "").strip()
    if not token or not channel:
        return None  # not configured — silently skip

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                f"{settings.TELEGRAM_API_BASE_URL.rstrip('/')}/bot{token}/sendMessage",
                json={
                    "chat_id": channel,
                    "text": build_job_post(job, company_name),
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
        data = resp.json()
        if not data.get("ok"):
            logger.warning("Channel publish refused for job %s: %s", job.id, data.get("description"))
            return None
        msg_id = data["result"]["message_id"]
        handle = channel.lstrip("@")
        return f"https://t.me/{handle}/{msg_id}" if not channel.startswith("-") else None
    except Exception:  # noqa: BLE001 — publishing a job must not fail on this
        logger.warning("Could not publish job %s to the channel", getattr(job, "id", "?"), exc_info=True)
        return None
