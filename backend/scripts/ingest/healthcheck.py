"""Daily health check: is the platform actually working right now?

Silence was the problem this solves — if the API, the bot, or the data went bad
overnight, nothing said so. This checks the things that have actually broken
before, and messages the owner ONLY when something is wrong (a green run is
quiet on purpose; a daily "all fine" trains you to ignore it).

    python3 healthcheck.py "$DSN" "$TG_API_HASH"            # print
    python3 healthcheck.py "$DSN" "$TG_API_HASH" --notify    # message if broken
    python3 healthcheck.py "$DSN" "$TG_API_HASH" --notify --always
"""
from __future__ import annotations

import os
import sys
import json
import subprocess
import urllib.parse as u

import pg8000.native

API = os.environ.get("ISHTOP_API", "https://api.ishtopuz.uz")
SITE = os.environ.get("ISHTOP_SITE", "https://ishtopuz.uz")
REPORT_TO = os.environ.get("WEEKLY_REPORT_TO", "me")
HERE = os.path.dirname(os.path.abspath(__file__))
VISIBLE = ("status='active' and is_deleted=false "
           "and (expires_at is null or expires_at + interval '1 day' > now())")

problems: list[str] = []
notes: list[str] = []


def http(path: str, base: str = API) -> tuple[int, float, str]:
    out = subprocess.run(
        ["curl", "-s", "-o", "/dev/stdout", "-w", "\n%{http_code} %{time_total}",
         "--max-time", "25", f"{base}{path}"],
        capture_output=True, text=True).stdout
    body, _, tail = out.rpartition("\n")
    code, _, secs = tail.partition(" ")
    return int(code or 0), float(secs or 0), body


def check_api() -> None:
    code, secs, body = http("/health")
    if code != 200:
        problems.append(f"API /health → {code}")
        return
    notes.append(f"API {secs:.2f}s")
    if secs > 3:
        problems.append(f"API sekin: {secs:.1f}s")

    code, _, body = http("/api/v1/jobs?limit=1")
    if code != 200:
        problems.append(f"GET /jobs → {code}")
        return
    try:
        total = json.loads(body).get("total", 0)
    except Exception:
        problems.append("GET /jobs javobi o'qilmadi")
        return
    notes.append(f"e'lon {total}")
    if total == 0:
        problems.append("KATALOG BO'SH — bitta ham e'lon ko'rinmayapti")
    elif total < 40:
        problems.append(f"katalog kamayib ketdi: {total} ta")


def check_site() -> None:
    for path in ("/", "/login"):
        code, secs, _ = http(path, SITE)
        if code != 200:
            problems.append(f"sayt {path} → {code}")


def check_data(dsn: str) -> None:
    d = u.urlparse(dsn)
    try:
        db = pg8000.native.Connection(user=d.username, password=d.password,
                                      host=d.hostname, port=d.port,
                                      database=d.path[1:])
    except Exception as exc:  # noqa: BLE001
        problems.append(f"BAZAGA ULANMADI: {type(exc).__name__}")
        return
    one = lambda s: db.run(s)[0][0]

    no_contact = one(f"select count(*) from jobs where {VISIBLE} "
                     f"and coalesce(contact_info,'') = ''")
    if no_contact:
        problems.append(f"kontaktsiz e'lon: {no_contact} ta")

    # The count drifted once before and nobody noticed for weeks.
    drift = one("""select count(*) from jobs j where j.is_deleted=false
                   and j.applications_count <>
                       (select count(*) from applications a where a.job_id = j.id)""")
    if drift:
        problems.append(f"applications_count nomutanosib: {drift} ta")

    expiring = one("select count(*) from jobs where status='active' and is_deleted=false "
                   "and expires_at < now() + interval '7 days' "
                   "and expires_at + interval '1 day' > now()")
    visible = one(f"select count(*) from jobs where {VISIBLE}")
    if visible and expiring > visible * 0.5:
        problems.append(f"7 kunda {expiring}/{visible} e'lon tugaydi — yig'im kerak")
    notes.append(f"7 kunda tugaydi {expiring}")

    stale = one("""select count(*) from applications
                   where status in ('pending','reviewing')
                     and created_at < now() - interval '21 days'""")
    if stale:
        problems.append(f"21 kundan ortiq javobsiz ariza: {stale} ta")
    db.close()


def check_bot(api_hash: str) -> None:
    """The bot answering is the only proof its webhook is still wired up."""
    import asyncio
    from telethon import TelegramClient

    async def go():
        c = TelegramClient(os.path.join(HERE, "..", "..", "..", "ishtop"),
                           int(os.environ.get("TG_API_ID", "29997465")), api_hash)
        await c.start()
        before = (await c.get_messages("ishtop_ariza_bot", limit=1))
        before_id = before[0].id if before else 0
        await c.send_message("ishtop_ariza_bot", "/start")
        for _ in range(12):
            await asyncio.sleep(1.5)
            msgs = await c.get_messages("ishtop_ariza_bot", limit=1)
            if msgs and msgs[0].id > before_id:
                await c.disconnect()
                return True
        await c.disconnect()
        return False

    try:
        if asyncio.run(go()):
            notes.append("bot javob berdi")
        else:
            problems.append("BOT JAVOB BERMAYAPTI")
    except Exception as exc:  # noqa: BLE001
        problems.append(f"bot tekshirilmadi: {type(exc).__name__} "
                        f"(Telegram sessiyasi tugagan bo'lishi mumkin)")


def main() -> int:
    dsn, api_hash = sys.argv[1], sys.argv[2]
    check_api()
    check_site()
    check_data(dsn)
    check_bot(api_hash)

    if problems:
        text = "🔴 <b>IshTop — muammo</b>\n\n" + "\n".join(f"• {p}" for p in problems)
        text += "\n\n<i>" + " · ".join(notes) + "</i>"
    else:
        text = "🟢 <b>IshTop — hammasi joyida</b>\n\n" + " · ".join(notes)

    print(text.replace("<b>", "").replace("</b>", "")
              .replace("<i>", "").replace("</i>", ""))

    if "--notify" in sys.argv and (problems or "--always" in sys.argv):
        import asyncio
        from telethon import TelegramClient

        async def go():
            c = TelegramClient(os.path.join(HERE, "..", "..", "..", "ishtop"),
                               int(os.environ.get("TG_API_ID", "29997465")), api_hash)
            await c.start()
            await c.send_message(REPORT_TO, text, parse_mode="html")
            await c.disconnect()

        try:
            asyncio.run(go())
            print("\nxabar yuborildi")
        except Exception as exc:  # noqa: BLE001
            print(f"\n⚠️ xabar yuborilmadi: {type(exc).__name__}")

    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
