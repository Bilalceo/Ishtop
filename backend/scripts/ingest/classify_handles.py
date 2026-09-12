"""Ask Telegram what each stored @handle actually is.

A handle in `contact_info` is only a contact if it belongs to a person or a bot
the candidate can write to. A broadcast channel or a group is the SOURCE we read
the listing from — writing there reaches nobody, and it sends our traffic to
someone else's channel. The two are indistinguishable from the string alone, so
resolve each one.
"""
import os
import sys, json, asyncio
from telethon import TelegramClient
from telethon.tl.types import User, Channel, Chat

API_ID = int(os.environ.get("TG_API_ID", "29997465"))
api_hash, path = sys.argv[1], sys.argv[2]
handles = json.load(open(path, encoding="utf-8"))


async def main():
    c = TelegramClient("/Users/levi/IshTop/ishtop", API_ID, api_hash)
    await c.start()
    out = {}
    for h in handles:
        try:
            e = await c.get_entity(h)
            if isinstance(e, User):
                kind = "bot" if e.bot else "odam"
                label = (f"{e.first_name or ''} {e.last_name or ''}").strip()
            elif isinstance(e, Channel):
                kind = "KANAL" if e.broadcast else "GURUH"
                label = e.title or ""
            elif isinstance(e, Chat):
                kind = "GURUH"
                label = e.title or ""
            else:
                kind, label = "?", type(e).__name__
        except Exception as exc:
            kind, label = "TOPILMADI", type(exc).__name__
        out[h] = {"kind": kind, "label": label}
        mark = {"odam": "OK", "bot": "OK"}.get(kind, "!!")
        print(f"  [{mark}] @{h:<26} {kind:<10} {label[:34]}")
        await asyncio.sleep(0.6)
    json.dump(out, open(path.replace("handles", "handles_kind"), "w",
                        encoding="utf-8"), ensure_ascii=False, indent=1)
    bad = [h for h, v in out.items() if v["kind"] not in ("odam", "bot")]
    print(f"\n  odam/bot: {len(out) - len(bad)}   muammoli: {len(bad)} -> {bad}")
    await c.disconnect()

asyncio.run(main())
