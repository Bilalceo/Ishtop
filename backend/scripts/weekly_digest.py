#!/usr/bin/env python3
"""Build (and optionally post) the weekly digest for the Telegram channel.

The channel deliberately does NOT carry full vacancies any more: a post with the
salary, requirements and employer contact lets the reader skip the platform
entirely, which is the opposite of what the channel is for. So it carries a
weekly round-up instead — enough to create interest, with the details and the
apply button behind the bot.

Selection favours variety over raw salary: sorting purely by pay returns five
near-identical "Sotuv menejeri" rows, so we take the best-paying job from each
job category and cap the list.

    python scripts/weekly_digest.py            # print the post
    python scripts/weekly_digest.py --send     # post it to the channel
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.config import settings  # noqa: E402
from app.core.job_categories import classify_job, category_meta  # noqa: E402
from app.database import SessionLocal  # noqa: E402

BOT_USERNAME = "ishtop_ariza_bot"
MAX_ITEMS = 6


def _money(lo, hi, cur) -> str:
    cur = (cur or "UZS").upper()
    if cur != "UZS":
        if lo and hi:
            return f"${lo:,}–${hi:,}".replace(",", " ")
        return f"${(lo or hi):,}".replace(",", " ")
    def m(v):
        # Format to one decimal first: rstrip("0") on a "20" would leave "2".
        return f"{v / 1_000_000:.1f}".rstrip("0").rstrip(".") if v else ""
    if lo and hi:
        return f"{m(lo)}–{m(hi)} mln so'm"
    if lo:
        return f"{m(lo)} mln so'mdan"
    if hi:
        return f"{m(hi)} mln so'mgacha"
    return "Kelishilgan"


def build_digest() -> str:
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT j.title, j.description, j.location, j.salary_min, j.salary_max,
                   j.salary_currency, u.company_name, u.full_name
            FROM jobs j JOIN users u ON u.id = j.company_id
            WHERE j.status = 'active' AND j.is_deleted = false
              AND j.salary_min IS NOT NULL
            ORDER BY
              -- An entry without a location reads as half-filled in the post,
              -- so prefer complete ones at the same pay level.
              (j.location IS NULL OR j.location = '') ASC,
              COALESCE(j.salary_max, j.salary_min) DESC
        """)).fetchall()

        stats = db.execute(text("""
            SELECT
              (SELECT count(*) FROM jobs WHERE created_at > now() - interval '7 days'
                 AND is_deleted = false)                                   AS yangi,
              (SELECT count(*) FROM jobs WHERE status='active' AND is_deleted=false) AS jami,
              (SELECT count(*) FROM jobs WHERE status='active' AND is_deleted=false
                 AND is_remote_allowed = true)                             AS masofaviy
        """)).fetchone()
    finally:
        db.close()

    # One job per category, best-paying first — variety beats a wall of the same role.
    picked: dict[str, tuple] = {}
    for r in rows:
        cid = classify_job(r.title or "", (r.description or "")[:200])
        if cid not in picked:
            picked[cid] = r
        if len(picked) >= MAX_ITEMS:
            break

    lines = ["🔥 <b>Haftaning eng sara ish o'rinlari</b>", ""]
    for cid, r in picked.items():
        meta = category_meta(cid)
        company = (r.company_name or r.full_name or "").strip()
        # The import account name carries no information — skip it rather than
        # printing "Ish beruvchi" under every second entry.
        if company.lower() in {"ish beruvchi", "kompaniya", "xususiy korxona"}:
            company = ""
        head = f"{meta['emoji']} <b>{r.title.strip()}</b>"
        if company:
            head += f" · {company}"
        lines.append(head)
        tail = f"   💰 {_money(r.salary_min, r.salary_max, r.salary_currency)}"
        if r.location:
            tail += f" · 📍 {r.location.strip()}"
        lines += [tail, ""]

    lines += [
        "━━━━━━━━━━━━━━━",
        f"📈 Bu hafta: <b>{stats.yangi}</b> ta yangi ish",
        f"💼 Jami: <b>{stats.jami}</b> ta faol vakansiya",
        f"🏠 Masofaviy: <b>{stats.masofaviy}</b> ta",
        "",
        f"👉 Barchasi va ariza berish: @{BOT_USERNAME}",
    ]
    return "\n".join(lines)


def send(text_body: str) -> None:
    token = (settings.TELEGRAM_APPS_BOT_TOKEN or "").strip()
    channel = os.getenv("DIGEST_CHANNEL", "@ishtopuz_official")
    if not token:
        print("TELEGRAM_APPS_BOT_TOKEN yo'q — yuborilmadi")
        return
    r = httpx.post(
        f"{settings.TELEGRAM_API_BASE_URL.rstrip('/')}/bot{token}/sendMessage",
        json={"chat_id": channel, "text": text_body, "parse_mode": "HTML",
              "disable_web_page_preview": True},
        timeout=20,
    )
    d = r.json()
    if d.get("ok"):
        print(f"✅ yuborildi — {channel}, message_id={d['result']['message_id']}")
    else:
        print(f"❌ {d.get('description')}")


if __name__ == "__main__":
    post = build_digest()
    print("─" * 46)
    print(post)
    print("─" * 46)
    if "--send" in sys.argv:
        send(post)
    else:
        print("(yuborilmadi — yuborish uchun --send qo'shing)")
