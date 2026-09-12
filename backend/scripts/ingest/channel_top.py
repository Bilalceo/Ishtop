"""Post the week's top vacancies to the channel, as an album of rendered cards.

The channel does not carry the employer's contact — a post with the pay, the
requirements and the phone number lets the reader skip the platform entirely,
which is the opposite of what the channel is for. Each card carries the job, the
pay and the city; the contact lives on the site.

Selection takes the best-paying job from each category rather than the top eight
by salary, which returns eight near-identical sales roles.

    python3 channel_top.py "$DSN" "$TG_API_HASH"            # render + print
    python3 channel_top.py "$DSN" "$TG_API_HASH" --send      # post to the channel
"""
from __future__ import annotations

import os
import re
import sys
import json
import asyncio
import tempfile
import urllib.parse as u

import pg8000.native
from telethon import TelegramClient

from job_card import draw_card, money

API_ID = int(os.environ.get("TG_API_ID", "29997465"))
CHANNEL = os.environ.get("TG_CHANNEL", "ishtopuz_official")
SESSION = "/Users/levi/IshTop/ishtop"
TOP_N = 8  # a Telegram album holds ten; eight leaves the caption readable

dsn, api_hash = sys.argv[1], sys.argv[2]
send = "--send" in sys.argv

# Rough category buckets, so the album is not eight sales jobs.
CATEGORIES = [
    ("IT", r"dasturchi|developer|разработчик|devops|qa\b|tester|frontend|backend|"
           r"full stack|mobil ilova|программист|analitik|analyst|product owner|"
           r"продакт|scrum|data engineer"),
    # Uzbek written in Cyrillic is its own spelling ("Сотув менежери"), not the
    # Russian one — without it that row fell through to "Boshqa" and took a slot.
    ("Sotuv", r"sotuv|savdo|сотув|савдо|продаж|менеджер|менежер|menejer|rop\b|"
              r"konsultant|консультант|sotuvchi|продавец|сотувчи|\bsales\b|supervisor|"
              r"супервайзер|supervayzer"),
    ("Call-markaz", r"call|операт|operator"),
    ("Moliya", r"buxgalter|бухгалтер|kassir|кассир|моли|iqtisod"),
    ("Marketing", r"smm|marketolog|маркетолог|targetolog|таргет|dizayner|дизайнер|"
                  r"kopirayter|копирайтер|mobilograf|montaj"),
    ("Ta'lim", r"o'qituvchi|преподавател|repetitor|репетитор|tarbiyachi"),
    ("Tibbiyot", r"shifokor|врач|hamshira|медсестр|farmatsevt|фармацевт|provizor"),
    ("Xizmat", r"oshpaz|повар|ofitsiant|официант|barmen|бармен|farrosh|уборщ|"
               r"administrator|админист|promouter|промоутер"),
    ("Logistika", r"kuryer|курьер|haydovchi|водител|omborchi|кладовщик|logist|логист"),
    ("Ishlab chiqarish", r"texnolog|технолог|brigadir|бригадир|qadoqlovchi|упаковщ|"
                         r"kesuvchi|резчик|muhandis|инженер"),
]


def tidy_location(loc: str) -> str:
    """Listings spell the capital four ways; the card should not."""
    l = (loc or "").strip()
    l = re.sub(r"\b(tashkent city|tashkent|ташкент)\b", "Toshkent", l, flags=re.I)
    l = re.sub(r",?\s*(uzbekistan|o['’`]?zbekiston)\s*$", "", l, flags=re.I)
    return l.strip(" ,") or "O'zbekiston"


def category_of(title: str) -> str:
    for name, pat in CATEGORIES:
        if re.search(pat, title, re.I):
            return name
    return "Boshqa"


def pick(db) -> list[dict]:
    rows = db.run("""select id, title, location, salary_min, salary_max, created_at
                     from jobs
                     where status='active' and is_deleted=false
                       and coalesce(contact_info,'') <> ''
                     order by coalesce(salary_max, salary_min, 0) desc,
                              created_at desc""")
    best: dict[str, dict] = {}
    for jid, title, loc, smin, smax, created in rows:
        cat = category_of(title or "")
        if cat in best:
            continue
        # "Product owner kerak (Ustoz AI)" is how the post said it. A card is a
        # title, so the employer bracket and the trailing verb both come off.
        card_title = re.sub(r"\s*\([^)]*\)\s*$", "", title or "").strip()
        card_title = re.sub(r"\s+kerak$", "", card_title, flags=re.I).strip()
        best[cat] = {
            "id": str(jid),
            "title": card_title or (title or "Vakansiya"),
            "location": tidy_location(loc),
            "salary_min": smin, "salary_max": smax,
            "category": cat,
        }
        if len(best) >= TOP_N:
            break
    return list(best.values())


def caption(jobs: list[dict], total: int) -> str:
    lines = [
        "🔝 <b>Haftaning eng yaxshi ish o'rinlari</b>",
        "",
    ]
    for i, j in enumerate(jobs, 1):
        pay = money(j["salary_min"], j["salary_max"])
        lines.append(f"<b>{i}.</b> {j['title']} — {pay}")
        lines.append(f"    📍 {j['location']}  ·  {j['category']}")
    lines += [
        "",
        f"Saytda hozir <b>{total} ta faol vakansiya</b> bor va har birida "
        "ish beruvchining o'z telefoni yoki Telegram useri ko'rsatilgan — "
        "hech qanday vositachisiz to'g'ridan-to'g'ri bog'lanasiz.",
        "",
        "👉 ishtopuz.uz",
    ]
    return "\n".join(lines)


async def main():
    d = u.urlparse(dsn)
    db = pg8000.native.Connection(user=d.username, password=d.password, host=d.hostname,
                                  port=d.port, database=d.path[1:])
    jobs = pick(db)
    total = db.run("""select count(*) from jobs
                      where status='active' and is_deleted=false""")[0][0]
    db.close()

    out_dir = os.environ.get("CARD_DIR") or tempfile.mkdtemp(prefix="ishtop_cards_")
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, j in enumerate(jobs, 1):
        p = os.path.join(out_dir, f"card_{i:02d}.png")
        draw_card(j, p, index=i)
        paths.append(p)
        print(f"  {i}. {j['title'][:46]:<48} {money(j['salary_min'], j['salary_max'])}")

    text = caption(jobs, total)
    print("\n--- post matni ---\n" + re.sub(r"</?b>", "", text))
    print(f"\nrasmlar: {out_dir}")

    if not send:
        print("\n(yuborilmadi — --send bilan ishga tushiring)")
        return

    c = TelegramClient(SESSION, API_ID, api_hash)
    await c.start()
    msgs = await c.send_file(CHANNEL, paths, caption=text, parse_mode="html")
    first = msgs[0] if isinstance(msgs, list) else msgs
    print(f"\nyuborildi: https://t.me/{CHANNEL}/{first.id}")
    await c.disconnect()


asyncio.run(main())
