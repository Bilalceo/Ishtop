"""Collect vacancy posts that carry a reachable employer contact.

Only posts with a phone, an email, or an @handle that is NOT one of the channels
we read are kept — a listing we cannot route on our own page is one we should
not import (see tg_pipeline's contact gate). Handles are resolved against
Telegram afterwards, because a username that no longer exists is not a contact
either.

Writes the raw candidates to JSON; nothing is inserted here.
"""
import os
import sys, re, json, asyncio
from datetime import datetime, timedelta, timezone

from telethon import TelegramClient, functions

API_ID = int(os.environ.get("TG_API_ID", "29997465"))
api_hash, out_path = sys.argv[1], sys.argv[2]
# How far back to read each channel. The first pass took the top 120;
# a later batch has to go deeper to find posts it has not already used.
DEPTH = int(os.environ.get("HARVEST_DEPTH", "120"))
# Only recent posts. A vacancy from two months ago has almost certainly been
# filled, and importing it wastes a slot and disappoints whoever calls.
SINCE_DAYS = int(os.environ.get("HARVEST_SINCE_DAYS", "21"))

# The owner keeps a Telegram folder named "Jobs" holding exactly the channels
# worth reading. Take the list from there rather than from a constant: a
# hardcoded list drifts the moment they add or drop a source, and silently keeps
# harvesting a channel they stopped trusting. FALLBACK is only used when the
# folder cannot be read.
FOLDER = os.environ.get("TG_FOLDER", "jobs")

FALLBACK = [
    "rabota_uz", "ishmi_ish", "itcloz", "ishtopuz_rasmiy", "UstozShogird",
    "jobfortm", "forpython", "mohirdev", "p_rabota", "django_jobs_board",
    "pythonpythonjobs", "proglib_jobs", "doglobal", "mirqobilov_dev",
    "uzcombinator", "foundershub_uz", "runello_rus_backend", "runello_rus_python",
    "remocatedevs", "ishtopuz_official", "keyllect", "adept_tech",
]
# These are the sources, never the employer.
_AGG_EXTRA = {
    "ishtopuz_official", "ishtop_ariza_bot", "cloz_uz", "clozuz", "ishtop_uz",
    "rabota_uz_bot", "hh_uz", "olx_uz",
}


async def folder_channels(client):
    """Peers inside the user's "Jobs" folder, or FALLBACK when it is missing."""
    try:
        res = await client(functions.messages.GetDialogFiltersRequest())
        for f in getattr(res, "filters", res):
            title = getattr(f, "title", None)
            text = getattr(title, "text", title)
            if text and str(text).strip().lower().startswith(FOLDER):
                peers = list(f.include_peers or [])
                print(f"  '{text}' papkasidan {len(peers)} ta kanal")
                return peers
    except Exception as exc:
        print(f"  ⚠️  papka o'qilmadi ({type(exc).__name__}) — zaxira ro'yxat")
    return FALLBACK

PHONE = re.compile(r"\+?998[\s\-()]?\d{2}[\s\-()]?\d{3}[\s\-()]?\d{2}[\s\-()]?\d{2}")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
HANDLE = re.compile(r"(?:^|[\s:;,.·|(])@([A-Za-z0-9_]{4,32})(?![\w.])")

# A post that is an ad for a course, a channel or a giveaway is not a vacancy.
NOT_A_VACANCY = re.compile(
    r"(obuna bo'l|подпис|розыгрыш|giveaway|reklama|реклама|kurs boshlan|"
    r"курс start|скидк|chegirma|@everyone|kanalga qo'shil)", re.I)
LOOKS_LIKE_VACANCY = re.compile(
    r"(vakansiya|вакансия|ish o'rni|ishga|talab qilinadi|требуется|ищем|qidirmoqda|"
    r"izlamoqda|kerak|開|hiring|we are looking|ish haqi|зарплата|oylik|maosh|"
    r"мы ищем|position|lavozim)", re.I)


async def main():
    c = TelegramClient("/Users/levi/IshTop/ishtop", API_ID, api_hash)
    await c.start()

    channels = await folder_channels(c)
    # Aggregator handles are the channels we read, whatever they turn out to be,
    # so build that set from the resolved list rather than a constant.
    names = []
    for peer in channels:
        try:
            ent = peer if isinstance(peer, str) else await c.get_entity(peer)
            names.append((getattr(ent, "username", None) or
                          getattr(ent, "title", "?"), ent))
        except Exception as exc:
            print(f"  ⚠️  peer o'qilmadi: {type(exc).__name__}")
    aggregators = _AGG_EXTRA | {n.lower() for n, _ in names}

    cutoff = datetime.now(timezone.utc) - timedelta(days=SINCE_DAYS)
    print(f"  {SINCE_DAYS} kundan yangi postlar olinadi\n")

    out = []
    seen = set()
    for chan, ent in names:
        got = 0
        try:
            async for m in c.iter_messages(ent, limit=DEPTH):
                if m.date and m.date < cutoff:
                    break  # messages come newest-first, so nothing older follows
                text = (m.text or "").strip()
                if len(text) < 180 or NOT_A_VACANCY.search(text):
                    continue
                if not LOOKS_LIKE_VACANCY.search(text):
                    continue
                phones = [p.strip() for p in PHONE.findall(text)]
                emails = EMAIL.findall(text)
                handles = [h for h in HANDLE.findall(EMAIL.sub(" ", text))
                           if h.lower() not in aggregators]
                if not (phones or emails or handles):
                    continue
                key = re.sub(r"\W+", "", text[:90]).lower()
                if key in seen:
                    continue
                seen.add(key)
                out.append({
                    "channel": chan, "msg_id": m.id,
                    "date": str(m.date)[:10], "text": text,
                    "phones": phones[:2], "emails": emails[:1], "handles": handles[:2],
                })
                got += 1
        except Exception as e:
            print(f"  ⚠️  @{chan}: {type(e).__name__}")
            continue
        print(f"  @{chan:<22} {got}")
        await asyncio.sleep(0.8)

    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\nkontaktli nomzod postlar: {len(out)}")
    await c.disconnect()

asyncio.run(main())
