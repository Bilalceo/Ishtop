"""The platform's own posts for the channel — one feature per post, illustrated.

The channel already carries vacancies. These say why the platform is worth
opening at all, and each one is a claim we can stand behind: the numbers come
from prod at render time, and every feature named here was checked to work
before it went in the series.

Posts go out ONE at a time on purpose. Five posts in five minutes reads as spam
to a channel this size; one a day reads as a series.

    python3 channel_promo.py "$DSN" "$HASH" --list          # what exists
    python3 channel_promo.py "$DSN" "$HASH" contact         # render + print
    python3 channel_promo.py "$DSN" "$HASH" contact --send  # post it
"""
from __future__ import annotations

import os
import re
import sys
import asyncio
import tempfile
import urllib.parse as u

import pg8000.native
from telethon import TelegramClient

from promo_card import draw_promo

API_ID = int(os.environ.get("TG_API_ID", "29997465"))
CHANNEL = os.environ.get("TG_CHANNEL", "ishtopuz_official")
SESSION = "/Users/levi/IshTop/ishtop"

SITE = "ishtopuz.uz"


def stats(dsn: str) -> dict:
    """Live numbers, so a post never claims a count that has drifted."""
    d = u.urlparse(dsn)
    db = pg8000.native.Connection(user=d.username, password=d.password, host=d.hostname,
                                  port=d.port, database=d.path[1:])
    visible = ("status='active' and is_deleted=false "
               "and (expires_at is null or expires_at > now())")
    one = lambda s: db.run(s)[0][0]
    out = {
        "jobs": one(f"select count(*) from jobs where {visible}"),
        "with_contact": one(f"select count(*) from jobs where {visible} "
                            f"and coalesce(contact_info,'') <> ''"),
        "with_salary": one(f"select count(*) from jobs where {visible} "
                           f"and salary_min is not null"),
        "resumes": one("select count(*) from resumes where is_deleted=false"),
        "cities": one(f"select count(distinct split_part(location, ',', 1)) "
                      f"from jobs where {visible}"),
    }
    db.close()
    return out


def posts(s: dict) -> dict:
    """Each entry: the card, and the caption that goes under it."""
    return {
        "contact": {
            "art": "contact",
            "eyebrow": "Vositachisiz",
            "title": "Ish beruvchining o'ziga murojaat qilasiz",
            "sub": f"{s['with_contact']} ta e'londa telefon raqami yoki Telegram "
                   f"useri ochiq turibdi.",
            "caption": (
                "<b>Arizangiz qayerga ketishini bilasizmi?</b>\n\n"
                "Ko'p saytlarda «Ariza berish» tugmasini bosasiz — va ariza "
                "qayoqqadir ketadi. Kim ko'radi, qachon javob keladi, umuman "
                "keladimi — bilib bo'lmaydi.\n\n"
                f"IshTop'da bunday emas. Hozir saytda <b>{s['jobs']} ta faol "
                f"vakansiya</b> bor va <b>har birida</b> ish beruvchining o'z "
                "telefon raqami yoki Telegram useri ko'rsatilgan.\n\n"
                "• Raqamni bosasiz — qo'ng'iroq ketadi\n"
                "• Telegram userini bosasiz — chat ochiladi\n"
                "• Rezyumengizni PDF qilib yuklab olasiz va o'zingiz yuborasiz\n\n"
                "Hech qanday ortakash yo'q. Javobni ish beruvchining o'zidan "
                f"olasiz.\n\n👉 {SITE}"
            ),
        },
        "resume": {
            "art": "resume",
            "eyebrow": "Sun'iy intellekt",
            "title": "Rezyume yozishni bilmaysizmi?",
            "sub": "Bir necha savolga javob bering — AI qolganini o'zi yozadi.",
            "caption": (
                "<b>Ko'pchilik ish topolmaydi, chunki rezyumesi yo'q.</b>\n\n"
                "Yozishga o'tirasiz — nimadan boshlashni bilmaysiz. Tajribam kam, "
                "nima yozaman? Qanday qilib chiroyli qilaman?\n\n"
                "IshTop'da rezyumeni <b>sun'iy intellekt</b> yozib beradi. Siz "
                "faqat o'zingiz haqingizda gapirib berasiz — qayerda o'qigansiz, "
                "nima qila olasiz, qanday ish qidiryapsiz. Qolganini AI qiladi.\n\n"
                f"Platformada allaqachon <b>{s['resumes']} ta rezyume</b> "
                "yaratilgan.\n\n"
                "Tayyor rezyumeni PDF qilib yuklab olasiz va istalgan ish "
                f"beruvchiga yuborasiz — bepul.\n\n👉 {SITE}"
            ),
        },
        "match": {
            "art": "match",
            "eyebrow": "Moslik",
            "title": "Bu ish senga mos keladimi?",
            "sub": "Rezyumengizni e'lon talablariga solishtirib, foizda aytamiz.",
            "caption": (
                "<b>100 ta e'lonni o'qib chiqishga vaqtingiz bormi?</b>\n\n"
                "Yo'q. Va shart ham emas.\n\n"
                "Rezyumengizni yuklaganingizdan keyin IshTop har bir vakansiyani "
                "sizning rezyumengizga solishtiradi va <b>necha foiz mos "
                "kelishini</b> ko'rsatadi.\n\n"
                "Eng muhimi — <b>nega</b> shunday ekanini ham aytadi:\n"
                "✅ Sotuv tajribasi — bor\n"
                "✅ Rus tili — bor\n"
                "➖ Haydovchilik guvohnomasi — yo'q\n\n"
                "Shunda qaysi ishga arizа berish kerakligini, va nimani "
                f"o'rganish kerakligini aniq bilasiz.\n\n👉 {SITE}"
            ),
        },
        "interview": {
            "art": "interview",
            "eyebrow": "Mashq",
            "title": "Suhbatdan qo'rqasizmi?",
            "sub": "Haqiqiy suhbatdan oldin AI bilan mashq qiling.",
            "caption": (
                "<b>Suhbatga borasiz — va kalima qurib qoladi.</b>\n\n"
                "Tanish holat. Savolni kutmagan edingiz, javobni o'ylab "
                "topolmadingiz, chiqib ketganingizdan keyin esa «mana shunday "
                "aytishim kerak edi» deb afsuslanasiz.\n\n"
                "IshTop'da <b>suhbatni oldindan mashq qilish</b> mumkin. Tanlagan "
                "vakansiyangizning talablariga qarab AI savol beradi, siz javob "
                "yozasiz — va har bir javobingizga izoh hamda baho oladi.\n\n"
                "Necha marta xohlasangiz, shuncha marta. Bepul.\n\n"
                "Haqiqiy suhbatga tayyor holda borasiz.\n\n"
                f"👉 {SITE}"
            ),
        },
        "trust": {
            "art": "trust",
            "eyebrow": "Ogohlantirish",
            "title": "Ishga joylashish uchun pul so'rashsa — bu firibgarlik",
            "sub": "Hech qanday halol ish beruvchi nomzoddan pul olmaydi.",
            "caption": (
                "<b>Buni hamma bilishi kerak.</b>\n\n"
                "«Ishga olamiz, lekin avval ro'yxatdan o'tish uchun 200 ming "
                "to'laysiz». «Forma va kartaning puli». «Kafolat puli, keyin "
                "qaytaramiz».\n\n"
                "Bularning hammasi — <b>firibgarlik</b>. Halol ish beruvchi "
                "nomzoddan hech qachon pul olmaydi. Ishga joylashish sizga "
                "hech narsa turmasligi kerak.\n\n"
                "IshTop'da har bir e'lon <b>ishonch bahosi</b> bilan chiqadi, "
                "va ish beruvchining aloqasi ochiq ko'rsatiladi — kim bilan "
                "gaplashayotganingizni bilasiz.\n\n"
                "Agar sizdan pul so'rashsa — to'lamang va bizga xabar bering.\n\n"
                f"👉 {SITE}"
            ),
        },
    }


async def main():
    dsn, api_hash = sys.argv[1], sys.argv[2]
    args = [a for a in sys.argv[3:] if not a.startswith("--")]
    send = "--send" in sys.argv

    s = stats(dsn)
    all_posts = posts(s)

    if "--list" in sys.argv or not args:
        print(f"jonli raqamlar: {s}\n")
        for k, p in all_posts.items():
            print(f"  {k:<10} {p['title']}")
        print("\nbittasini tanlang:  channel_promo.py DSN HASH <nom> [--send]")
        return

    key = args[0]
    if key not in all_posts:
        print(f"'{key}' yo'q. Mavjud: {', '.join(all_posts)}")
        return

    spec = all_posts[key]
    out_dir = os.environ.get("CARD_DIR") or tempfile.mkdtemp(prefix="ishtop_promo_")
    os.makedirs(out_dir, exist_ok=True)
    path = draw_promo(spec, os.path.join(out_dir, f"{key}.png"))
    print(f"rasm: {path}\n")
    print(re.sub(r"</?b>", "", spec["caption"]))

    if not send:
        print("\n(yuborilmadi — --send bilan)")
        return

    c = TelegramClient(SESSION, API_ID, api_hash)
    await c.start()
    m = await c.send_file(CHANNEL, path, caption=spec["caption"], parse_mode="html")
    print(f"\nyuborildi: https://t.me/{CHANNEL}/{m.id}")
    await c.disconnect()


asyncio.run(main())
