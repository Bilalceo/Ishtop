"""Company weekly digest sender (Monday 09:00 Asia/Tashkent)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models import Application, Job, User, UserRole
from app.services.email_service import email_service
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class WeeklyDigestMetrics:
    company_id: str
    company_name: str
    new_applications_per_vacancy: List[Dict[str, Any]]
    awaiting_response_count: int
    inactive_vacancies: List[Dict[str, Any]]
    top_unreviewed_candidates: List[Dict[str, Any]]


def _parse_match_score(raw: Optional[str]) -> float:
    if not raw:
        return 0.0
    digits = "".join(ch for ch in str(raw) if ch.isdigit() or ch == ".")
    try:
        return float(digits)
    except ValueError:
        return 0.0


def _week_anchor_local(now_local: datetime, send_hour: int) -> datetime:
    monday = now_local.date() - timedelta(days=now_local.weekday())
    return datetime(
        year=monday.year,
        month=monday.month,
        day=monday.day,
        hour=send_hour,
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=now_local.tzinfo,
    )


def _digest_due_for_company(
    *,
    now_utc: datetime,
    prefs: Dict[str, Any],
) -> tuple[bool, str]:
    tz = ZoneInfo(settings.COMPANY_WEEKLY_DIGEST_TIMEZONE)
    now_local = now_utc.astimezone(tz)
    send_hour = int(settings.COMPANY_WEEKLY_DIGEST_SEND_HOUR_LOCAL)
    week_anchor = _week_anchor_local(now_local, send_hour=send_hour)
    week_key = week_anchor.date().isoformat()

    if now_local < week_anchor:
        return False, week_key

    last_week_key = str(prefs.get("company_weekly_digest_last_week") or "").strip()
    if last_week_key == week_key:
        return False, week_key
    return True, week_key


def _build_company_metrics(
    *,
    db: Session,
    company: User,
    now_utc: datetime,
) -> WeeklyDigestMetrics:
    week_start = now_utc - timedelta(days=7)
    stale_cutoff = now_utc - timedelta(days=7)

    jobs = db.query(Job).filter(
        Job.company_id == company.id,
        Job.is_deleted == False,
    ).all()
    job_ids = [job.id for job in jobs]

    # New applications in the last 7 days, grouped by vacancy.
    applications_week = db.query(Application).filter(
        Application.job_id.in_(job_ids) if job_ids else False,
        Application.is_deleted == False,
        Application.applied_at >= week_start,
    ).all()
    by_job: Dict[Any, int] = {}
    for app in applications_week:
        by_job[app.job_id] = by_job.get(app.job_id, 0) + 1
    new_applications_per_vacancy = []
    for job in jobs:
        count = by_job.get(job.id, 0)
        if count <= 0:
            continue
        new_applications_per_vacancy.append(
            {
                "job_id": str(job.id),
                "job_title": job.title,
                "count": count,
            }
        )
    new_applications_per_vacancy.sort(key=lambda item: item["count"], reverse=True)

    # Pending responses
    awaiting_response_count = db.query(Application).filter(
        Application.job_id.in_(job_ids) if job_ids else False,
        Application.is_deleted == False,
        Application.status == "pending",
    ).count()

    # Jobs with no activity in 7+ days (based on application activity).
    inactive_vacancies: List[Dict[str, Any]] = []
    for job in jobs:
        last_application = db.query(Application).filter(
            Application.job_id == job.id,
            Application.is_deleted == False,
        ).order_by(Application.applied_at.desc()).first()
        if not last_application or (last_application.applied_at and last_application.applied_at < stale_cutoff):
            inactive_vacancies.append(
                {
                    "job_id": str(job.id),
                    "job_title": job.title,
                    "last_application_at": last_application.applied_at.isoformat() if last_application and last_application.applied_at else None,
                }
            )

    # Top AI-matched but unreviewed candidates.
    top_unreviewed_candidates: List[Dict[str, Any]] = []
    pending_apps = db.query(Application).filter(
        Application.job_id.in_(job_ids) if job_ids else False,
        Application.is_deleted == False,
        Application.status == "pending",
        Application.match_score.isnot(None),
    ).all()
    pending_apps.sort(key=lambda app: _parse_match_score(app.match_score), reverse=True)
    for app in pending_apps[:5]:
        candidate_name = app.user.full_name if app.user else "Nomzod"
        job_title = app.job.title if app.job else "Vakansiya"
        top_unreviewed_candidates.append(
            {
                "application_id": str(app.id),
                "candidate_name": candidate_name,
                "job_title": job_title,
                "match_score": app.match_score,
            }
        )

    return WeeklyDigestMetrics(
        company_id=str(company.id),
        company_name=company.company_name or company.full_name or "Company",
        new_applications_per_vacancy=new_applications_per_vacancy,
        awaiting_response_count=awaiting_response_count,
        inactive_vacancies=inactive_vacancies[:10],
        top_unreviewed_candidates=top_unreviewed_candidates,
    )


def _render_digest_text(metrics: WeeklyDigestMetrics, *, now_utc: datetime) -> str:
    lines: List[str] = []
    lines.append(f"Assalomu alaykum, {metrics.company_name} jamoasi.")
    lines.append("")
    lines.append("Bu IshTop haftalik hisobotidir.")
    lines.append(f"Sana: {now_utc.astimezone(ZoneInfo(settings.COMPANY_WEEKLY_DIGEST_TIMEZONE)).strftime('%Y-%m-%d %H:%M')}")
    lines.append("")
    lines.append("1) Oxirgi 7 kunda yangi arizalar (vakansiya bo'yicha):")
    if metrics.new_applications_per_vacancy:
        for item in metrics.new_applications_per_vacancy:
            lines.append(f"- {item['job_title']}: {item['count']} ta")
    else:
        lines.append("- Yangi ariza yo'q")
    lines.append("")
    lines.append(f"2) Javob kutayotgan nomzodlar: {metrics.awaiting_response_count} ta")
    lines.append("")
    lines.append("3) 7+ kundan beri faollik bo'lmagan vakansiyalar:")
    if metrics.inactive_vacancies:
        for item in metrics.inactive_vacancies:
            last_seen = item["last_application_at"] or "hech qachon"
            lines.append(f"- {item['job_title']} (oxirgi ariza: {last_seen})")
    else:
        lines.append("- Barcha vakansiyalarda so'nggi 7 kunda faollik bor")
    lines.append("")
    lines.append("4) Ko'rib chiqilmagan top AI mos nomzodlar:")
    if metrics.top_unreviewed_candidates:
        for item in metrics.top_unreviewed_candidates:
            lines.append(
                f"- {item['candidate_name']} | {item['job_title']} | moslik: {item['match_score']}"
            )
    else:
        lines.append("- Ko'rib chiqilmagan AI top nomzodlar topilmadi")
    lines.append("")
    lines.append("Dashboard: /company/analytics")
    return "\n".join(lines)


async def send_due_company_weekly_digests(db: Session, now_utc: Optional[datetime] = None) -> Dict[str, int]:
    """Send weekly digest emails to due companies with email_tips enabled."""
    now_utc = now_utc or datetime.now(timezone.utc)
    sent = 0
    skipped = 0
    failed = 0

    companies = db.query(User).filter(
        User.role == UserRole.COMPANY,
        User.is_deleted == False,
        User.is_active_account == True,
    ).all()

    for company in companies:
        prefs = dict(company.notification_preferences or {})
        if not prefs.get("email_tips", False):
            skipped += 1
            continue
        if not company.email:
            skipped += 1
            continue

        due, week_key = _digest_due_for_company(now_utc=now_utc, prefs=prefs)
        if not due:
            skipped += 1
            continue

        try:
            metrics = _build_company_metrics(db=db, company=company, now_utc=now_utc)
            body = _render_digest_text(metrics, now_utc=now_utc)
            ok = await email_service.send_raw_email(
                to_email=company.email,
                to_name=company.full_name or company.company_name or "Company",
                subject="IshTop haftalik hisobot",
                body=body,
                html=False,
            )
            if ok:
                sent += 1
                prefs["company_weekly_digest_last_week"] = week_key
                prefs["company_weekly_digest_last_sent_at"] = now_utc.isoformat()
                company.notification_preferences = prefs
                db.commit()
            else:
                failed += 1
        except Exception as exc:
            failed += 1
            logger.exception(
                "Weekly digest failed for company %s: %s",
                company.id,
                exc,
            )
            db.rollback()

    return {"sent": sent, "skipped": skipped, "failed": failed}
