"""Relay applications for aggregated (Telegram-import) jobs to an admin group.

Jobs imported from Telegram channels have no real company account to notify,
so applicants would otherwise be invisible. This sends a compact alert to an
internal Telegram group (bot + admins) so the team can forward the candidate
to the source employer. Best-effort: never raises into the request path.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def is_external_job(job) -> bool:
    """A job is 'external' when it was aggregated from a Telegram post."""
    return bool(getattr(job, "external_apply_url", None) or getattr(job, "contact_info", None))


async def send_external_application_alert(
    *,
    job,
    student,
    resume,
    match_score: Optional[str] = None,
) -> None:
    token = (settings.TELEGRAM_APPS_BOT_TOKEN or "").strip()
    chat_id = (settings.TELEGRAM_APPS_CHAT_ID or "").strip()
    if not token or not chat_id:
        return  # not configured — silently skip

    title = (getattr(job, "title", None) or "Vakansiya").strip()
    loc = (getattr(job, "location", None) or "").strip()
    student_name = (getattr(student, "full_name", None) or "Nomzod").strip()
    student_email = (getattr(student, "email", None) or "").strip()
    student_phone = (getattr(student, "phone", None) or "").strip()
    resume_title = (getattr(resume, "title", None) or "").strip()
    source = (getattr(job, "external_apply_url", None) or "").strip()
    employer = (getattr(job, "contact_info", None) or "").strip()

    lines = [
        "📥 <b>Yangi ariza</b> (tashqi ish)",
        f"💼 {title}" + (f" · {loc}" if loc else ""),
        "",
        f"👤 <b>{student_name}</b>",
    ]
    contact = " · ".join(x for x in [student_phone, student_email] if x)
    if contact:
        lines.append(f"📞 {contact}")
    if resume_title:
        lines.append(f"📄 {resume_title}" + (f" · moslik {match_score}" if match_score else ""))
    if employer:
        lines.append(f"🏢 Ish beruvchi: {employer}")
    if source:
        lines.append(f"🔗 Manba: {source}")

    text = "\n".join(lines)
    url = f"{settings.TELEGRAM_API_BASE_URL}/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
        if resp.status_code != 200:
            logger.warning("external apply alert failed: %s %s", resp.status_code, resp.text[:200])
    except Exception as exc:  # noqa: BLE001 — never break the apply flow
        logger.warning("external apply alert error: %s", exc)
