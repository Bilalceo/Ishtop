"""The weekly ingest, start to finish, with a report sent to the owner.

Listings expire 30 days after import, so without this the catalogue empties on
its own: 255 today, zero in a month. Run once a week.

The report is the point as much as the ingest. Automation you cannot see is
automation you cannot trust — and two things here fail quietly: the Telethon
session expires, and the well runs dry (last batch, 116 of 424 harvested posts
were employers already on the site). Both show up as a number in the message.

    python3 weekly.py "$DSN" "$TG_API_HASH"           # dry run, prints the plan
    python3 weekly.py "$DSN" "$TG_API_HASH" --commit  # insert + report
"""
from __future__ import annotations

import os
import re
import sys
import json
import subprocess
import tempfile
import urllib.parse as u
from datetime import datetime, timezone

import pg8000.native

HERE = os.path.dirname(os.path.abspath(__file__))
WANT = int(os.environ.get("WEEKLY_WANT", "50"))
DEPTH = os.environ.get("WEEKLY_DEPTH", "400")
SINCE = os.environ.get("WEEKLY_SINCE_DAYS", "21")
# Where the report goes. "me" is Saved Messages, which needs no setup.
REPORT_TO = os.environ.get("WEEKLY_REPORT_TO", "me")

VISIBLE = ("status='active' and is_deleted=false "
           "and (expires_at is null or expires_at + interval '1 day' > now())")


def run(*args, **kw):
    """Run a pipeline stage; raise with its own output so failures are legible."""
    p = subprocess.run([sys.executable, *args], cwd=HERE, capture_output=True,
                       text=True, **kw)
    if p.returncode != 0:
        raise RuntimeError(f"{args[0]} yiqildi:\n{(p.stdout + p.stderr)[-900:]}")
    return p.stdout


def counts(dsn: str) -> dict:
    d = u.urlparse(dsn)
    db = pg8000.native.Connection(user=d.username, password=d.password,
                                  host=d.hostname, port=d.port, database=d.path[1:])
    one = lambda s: db.run(s)[0][0]
    out = {
        "visible": one(f"select count(*) from jobs where {VISIBLE}"),
        "no_contact": one(f"select count(*) from jobs where {VISIBLE} "
                          f"and coalesce(contact_info,'') = ''"),
        "expiring_7d": one("select count(*) from jobs where status='active' "
                           "and is_deleted=false and expires_at < now() + interval '7 days' "
                           "and expires_at + interval '1 day' > now()"),
        "students": one("select count(*) from users where role='student' and is_deleted=false"),
        # The number this whole project actually turns on.
        "real_employers": one("""select count(*) from users u
            where u.role='company' and u.is_deleted=false
              and u.email not like '%ishtop-demo%'
              and u.email not like 'telegram-import@%'
              and exists (select 1 from jobs j
                          where j.company_id = u.id and j.is_deleted=false)"""),
        "unanswered": one("select count(*) from applications "
                          "where status in ('pending','reviewing')"),
    }
    db.close()
    return out


def send(api_hash: str, text: str) -> None:
    import asyncio
    from telethon import TelegramClient

    async def go():
        c = TelegramClient(os.path.join(os.path.dirname(HERE), "..", "..", "ishtop"),
                           int(os.environ.get("TG_API_ID", "29997465")), api_hash)
        # The session lives at the repo root; resolve it however this is invoked.
        await c.start()
        await c.send_message(REPORT_TO, text, parse_mode="html", link_preview=False)
        await c.disconnect()

    asyncio.run(go())


def main() -> int:
    dsn, api_hash = sys.argv[1], sys.argv[2]
    commit = "--commit" in sys.argv
    work = tempfile.mkdtemp(prefix="ishtop_weekly_")
    before = counts(dsn)
    lines: list[str] = []
    added = 0

    try:
        env = dict(os.environ, HARVEST_DEPTH=DEPTH, HARVEST_SINCE_DAYS=SINCE)
        harvest = run("harvest.py", api_hash, f"{work}/raw.json", env=env)
        found = int(re.search(r"kontaktli nomzod postlar:\s*(\d+)", harvest).group(1))

        run("structure.py", f"{work}/raw.json", f"{work}/structured.json")
        rows = json.load(open(f"{work}/structured.json", encoding="utf-8"))
        json.dump(sorted({h for r in rows for h in r["handles"]}),
                  open(f"{work}/handles.json", "w"))

        run("classify_handles.py", api_hash, f"{work}/handles.json")
        kinds = json.load(open(f"{work}/handles_kind.json", encoding="utf-8"))
        channels = sum(1 for v in kinds.values() if v["kind"] not in ("odam", "bot"))

        args = ["insert_jobs.py", dsn, f"{work}/structured.json",
                f"{work}/handles_kind.json", str(WANT)]
        if commit:
            args.append("--commit")
        out = run(*args)
        added = int(re.search(r"tanlandi:\s*(\d+)", out).group(1))
        skipped = re.search(r"o'tkazib yuborildi:\s*(\{.*\})", out)

        after = counts(dsn) if commit else before
        lines = [
            "📥 <b>Haftalik yig'im</b> — " + datetime.now(timezone.utc).strftime("%d.%m.%Y"),
            "",
            f"qo'shildi: <b>{added}</b> ta" + ("" if commit else "  (sinov, yozilmadi)"),
            f"ko'rinadigan e'lon: {before['visible']} → <b>{after['visible']}</b>",
            f"topilgan post: {found} ta",
            f"o'tkazib yuborildi: {skipped.group(1) if skipped else '—'}",
            f"kanal/o'lik @user: {channels} ta",
            "",
            f"⏳ 7 kunda tugaydi: <b>{after['expiring_7d']}</b> ta",
        ]
        if after["no_contact"]:
            lines.append(f"⚠️ kontaktsiz e'lon: <b>{after['no_contact']}</b> ta")
        if found < 150:
            lines.append("⚠️ yangi post kamaydi — manba kanallarni ko'rib chiqing")
    except Exception as exc:  # noqa: BLE001 — the report must go out either way
        after = before
        lines = [
            "🔴 <b>Haftalik yig'im YIQILDI</b> — "
            + datetime.now(timezone.utc).strftime("%d.%m.%Y"),
            "",
            f"<code>{str(exc)[:600]}</code>",
            "",
            f"ko'rinadigan e'lon: <b>{before['visible']}</b> (o'zgarmadi)",
        ]

    lines += [
        "",
        f"👤 talaba: {after['students']}",
        f"🏢 <b>haqiqiy ish beruvchi: {after['real_employers']}</b>",
    ]
    if after["unanswered"]:
        lines.append(f"📋 javobsiz ariza: {after['unanswered']}")

    text = "\n".join(lines)
    print(re.sub(r"</?b>|</?code>", "", text))
    if commit:
        try:
            send(api_hash, text)
            print("\nhisobot yuborildi")
        except Exception as exc:  # noqa: BLE001
            print(f"\n⚠️ hisobot yuborilmadi: {type(exc).__name__}: {exc}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
