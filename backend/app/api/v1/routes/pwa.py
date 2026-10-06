"""
=============================================================================
PWA INSTALL TELEMETRY
=============================================================================

POST /pwa/event   anonymous — the install banner reports what happened
GET  /pwa/stats   admin — how many reach the banner, and on which platform

Anonymous on purpose: almost everyone who meets the install banner is logged
out, so the authenticated /jobs/events endpoint would record none of them.

The event name must be one of a fixed set and the payload carries no free
text, so an open endpoint cannot be used to write arbitrary rows.

What this is for: iOS cannot offer a one-tap install — Apple exposes no API
for it — so the iPhone path is a set of instructions the person follows by
hand. Whether that is worth more work, or worth $99/yr for a native wrapper,
depends on how many iPhone visitors there actually are. That is the number
this endpoint exists to produce.
=============================================================================
"""

import collections
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_db, get_optional_current_user, require_admin_permission
from app.core.rate_limiter import rate_limiter
from app.models import FunnelEvent, User

router = APIRouter()

EVENTS = {
    "pwa_prompt_shown",      # the banner rendered
    "pwa_install_clicked",   # Android: the person tapped Install
    "pwa_installed",         # the browser confirmed the install
    "pwa_dismissed",         # closed, or "Tushunarli" on iOS
}
PLATFORMS = {"ios", "android", "desktop", "other"}
BROWSERS = {"safari", "chrome", "firefox", "edge", "samsung", "other"}
EVENTS_PER_IP_PER_HOUR = 40


class PwaEvent(BaseModel):
    event: str
    platform: str
    browser: str


def _client_ip(request: Request) -> str:
    fwd = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    return fwd or (request.client.host if request.client else "unknown")


@router.post("/event", status_code=status.HTTP_202_ACCEPTED)
def record_event(
    body: PwaEvent,
    request: Request,
    user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if body.event not in EVENTS:
        raise HTTPException(status_code=422, detail="unknown event")

    if settings.RATE_LIMIT_ENABLED:
        allowed, retry_after = rate_limiter.check_rate_limit(
            identifier=f"pwa:{_client_ip(request)}",
            max_requests=EVENTS_PER_IP_PER_HOUR,
            window_seconds=3600,
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many events",
                headers={"Retry-After": str(retry_after)},
            )

    db.add(FunnelEvent(
        event_name=body.event,
        actor_user_id=user.id if user else None,
        source="pwa",
        event_metadata={
            # both are closed sets, so nothing a caller sends lands in the row
            "platform": body.platform if body.platform in PLATFORMS else "other",
            "browser": body.browser if body.browser in BROWSERS else "other",
        },
    ))
    db.commit()
    return {"success": True}


@router.get("/stats")
def stats(
    days: int = Query(30, ge=1, le=365),
    admin: User = Depends(require_admin_permission("admin.dashboard.read")),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(FunnelEvent)
        .filter(FunnelEvent.event_name.in_(EVENTS), FunnelEvent.created_at >= since)
        .order_by(FunnelEvent.created_at.desc())
        .limit(20000)
        .all()
    )

    by_event: Dict[str, int] = collections.Counter()
    by_platform: Dict[str, Dict[str, int]] = collections.defaultdict(collections.Counter)
    for r in rows:
        meta = r.event_metadata or {}
        plat = meta.get("platform", "other")
        by_event[r.event_name] += 1
        by_platform[plat][r.event_name] += 1

    def rate(part: int, whole: int) -> float:
        return round(100 * part / whole, 1) if whole else 0.0

    platforms = []
    for plat, counts in sorted(by_platform.items(), key=lambda kv: -sum(kv[1].values())):
        shown = counts.get("pwa_prompt_shown", 0)
        platforms.append({
            "platform": plat,
            "shown": shown,
            "install_clicked": counts.get("pwa_install_clicked", 0),
            "installed": counts.get("pwa_installed", 0),
            "dismissed": counts.get("pwa_dismissed", 0),
            # iOS can only ever be "shown" and "dismissed": Apple gives the page
            # no way to install, so a conversion rate there is not comparable
            "install_rate": rate(counts.get("pwa_installed", 0), shown),
        })

    return {
        "success": True,
        "data": {
            "days": days,
            "total_events": len(rows),
            "by_event": dict(by_event),
            "platforms": platforms,
            "note": "iOS has no install API; its banner only shows instructions.",
        },
    }
