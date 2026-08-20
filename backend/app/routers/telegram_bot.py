"""Public Telegram bot webhook — an AI assistant for ishtopuz.uz.

Students DM the bot (@ishtop_ariza_bot) with any question about the platform;
we answer with Gemini/OpenAI using an IshTop-specific system prompt. Runs on
the existing backend (24/7 on Railway), so no separate worker is needed.

The same bot also forwards external-job applications to an admin group
(that path uses sendMessage elsewhere and is unaffected by this webhook).
"""
from __future__ import annotations

import logging
import re

import httpx
from fastapi import APIRouter, Depends, Request
from starlette.concurrency import run_in_threadpool

from app.config import settings
# get_db MUST come from app.core.dependencies (the same one get_current_active_user
# uses) so the endpoint and the authenticated user share one DB session; otherwise
# writes to current_user are committed on a different session and silently lost.
from app.core.dependencies import get_current_active_user, get_db
from app.core.telegram_link import consume_link_token, issue_link_token
from app.core.job_categories import (
    classify_job, CATEGORIES, category_meta,
    classify_city, CITIES, city_meta,
)
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# Public webhook — mounted at the app root (Telegram calls it, no auth).
webhook_router = APIRouter(prefix="/telegram", tags=["telegram-bot"])
# Authenticated link/unlink — mounted under /api/v1.
router = APIRouter(prefix="/telegram", tags=["telegram-bot"])

BOT_USERNAME = "ishtop_ariza_bot"
CHANNEL_USERNAME = "ishtopuz_official"
PRO_DAYS = 30  # free PRO granted per channel-subscription claim

SITE_URL = "https://ishtopuz.uz"
CATALOG_PAGE_SIZE = 5           # jobs shown per catalog page
_IMPORT_COMPANY_PLACEHOLDER = "Ish beruvchi"  # aggregated jobs carry the real name in the title

_CYRILLIC = re.compile(r"[а-яА-ЯёЁ]")


def _detect_locale(text: str) -> str:
    return "ru" if _CYRILLIC.search(text or "") else "uz"


def _system_prompt(locale: str) -> str:
    """IshTop knowledge base for the assistant. Kept factual and current."""
    facts = (
        "IshTop (ishtopuz.uz) is an AI career platform for students and junior "
        "professionals in Uzbekistan. Facts you MUST rely on:\n"
        "- Register free at ishtopuz.uz (no card). Languages: Uzbek and Russian.\n"
        "- AI Resume builder: creates an ATS-friendly resume in ~2 minutes, even "
        "with no experience; 4 templates (modern/classic/minimal/creative); "
        "tone options; PDF download.\n"
        "- Job search: AI matches jobs to your resume with a match % and a "
        "'why matched' explanation; filters by location, type, level, salary.\n"
        "- Apply on the platform in one click; track applications; save jobs.\n"
        "- Some jobs are aggregated from Telegram channels; you still apply on "
        "IshTop, and the employer's public contact is shown on the job.\n"
        "- Trust Score: every company is scored 0-100; suspicious posts filtered.\n"
        "- Pricing: Free plan is genuinely free. Pro is 25 000 so'm/oy (unlimited "
        "AI resume, auto-apply, interview coach). Team plan is custom.\n"
        "- For employers: post jobs, AI screens & ranks candidates.\n"
        "- Official Telegram channel: @ishtopuz_official (daily new jobs).\n"
        "Never invent features, prices, passwords, or admin actions. If unsure, "
        "say you are not sure and point to ishtopuz.uz or support."
    )
    if locale == "ru":
        rule = (
            "Отвечай ТОЛЬКО на русском. Коротко и по делу (2-6 строк), дружелюбно. "
            "Если вопрос не про IshTop/карьеру, мягко верни к теме платформы."
        )
    else:
        rule = (
            "Javobni FAQAT o'zbek tilida (lotin) ber. Qisqa va aniq (2-6 qator), "
            "do'stona. Savol IshTop/karyeraga aloqador bo'lmasa, muloyim ravishda "
            "platforma mavzusiga qaytaring."
        )
    return f"{facts}\n\n{rule}"


async def _ai_answer(question: str, locale: str) -> str:
    """Generate an answer using the platform's AI service (Gemini/OpenAI)."""
    from app.routers.ai import get_ai_service  # local import: heavy module

    service = get_ai_service()
    system = _system_prompt(locale)
    prompt = f"{system}\n\nFoydalanuvchi savoli / Вопрос:\n{question.strip()}"

    text = None
    try:
        if hasattr(service, "generate_text"):
            text = await service.generate_text(
                system_message=system,
                prompt=question.strip(),
                operation="telegram_assistant",
                temperature=0.35,
                max_tokens=600,
            )
        elif hasattr(service, "generate"):
            text = await service.generate(prompt, response_format="text")
        elif hasattr(service, "_call_openai_api"):
            text = await service._call_openai_api(  # type: ignore[attr-defined]
                system_message=system,
                prompt=question.strip(),
                operation="telegram_assistant",
                response_format_json=False,
                temperature=0.35,
                max_tokens=600,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram AI answer failed: %s", exc)

    text = (text or "").strip()
    if text:
        return text
    return (
        "AI-помощник временно занят. Попробуйте ещё раз или откройте ishtopuz.uz"
        if locale == "ru"
        else "AI yordamchi hozir band. Birozdan so'ng qayta urining yoki ishtopuz.uz'ni oching."
    )


async def _send(token: str, chat_id: int, text: str, reply_markup: dict | None = None) -> None:
    url = f"{settings.TELEGRAM_API_BASE_URL}/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "disable_web_page_preview": True}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram send failed: %s", exc)


async def _edit(token: str, chat_id: int, message_id: int, text: str,
                reply_markup: dict | None = None) -> None:
    """Edit a message in place — used for catalog navigation (no chat spam)."""
    url = f"{settings.TELEGRAM_API_BASE_URL}/bot{token}/editMessageText"
    payload = {
        "chat_id": chat_id, "message_id": message_id, "text": text,
        "disable_web_page_preview": True,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram edit failed: %s", exc)


async def _answer_cb(token: str, callback_id: str, text: str | None = None) -> None:
    """Acknowledge a button tap so Telegram stops the loading spinner."""
    url = f"{settings.TELEGRAM_API_BASE_URL}/bot{token}/answerCallbackQuery"
    payload: dict = {"callback_query_id": callback_id}
    if text:
        payload["text"] = text
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram answerCallback failed: %s", exc)


def _welcome(locale: str) -> str:
    if locale == "ru":
        return (
            "Привет! Я AI-помощник IshTop 🤖\n\n"
            "Задайте любой вопрос о ishtopuz.uz: поиск работы, AI-резюме, отклики, "
            "процент совпадения и т.д.\n\n"
            "🎁 Подпишитесь на этот канал — 1 месяц PRO бесплатно: ishtopuz.uz/plans\n\n"
            "Начать: ishtopuz.uz"
        )
    return (
        "Salom! Men IshTop AI yordamchisiman 🤖\n\n"
        "ishtopuz.uz haqida istalgan savolni bering: ish topish, AI rezyume, "
        "ariza berish, moslik foizi va boshqalar.\n\n"
        "🎁 Shu kanalga obuna bo'lsangiz — 1 oy PRO bepul: ishtopuz.uz/plans\n\n"
        "Boshlash: ishtopuz.uz"
    )


# =============================================================================
# JOB CATALOG — browse active vacancies by category (soha) with inline buttons.
# The bot runs inside the API process, so it reads the DB directly. Jobs are
# grouped by classify_job() (title-based) because the table has no category
# column and profession_slug is mostly empty. A short in-process cache keeps
# button taps snappy without hammering the DB.
# =============================================================================

import time  # noqa: E402

_CATALOG_TTL = 30.0  # seconds
_catalog_cache: dict = {"ts": 0.0, "by_cat": {}, "by_city": {}, "jobs": {}}

_EXP_LABELS = {
    "intern": "Tajriba shart emas",
    "junior": "Junior (0–2 yil)",
    "mid": "Middle (2–5 yil)",
    "senior": "Senior (5+ yil)",
    "lead": "Lead / boshliq",
    "executive": "Rahbar",
}
# A Telegram @handle: at a boundary (not an email local part), 5+ chars, and
# NOT followed by a dot (which would make it an email domain like "@gmail.com").
_HANDLE_RE = re.compile(r"(?:^|[\s:;,.·|(])@([A-Za-z0-9_]{4,})(?![\w.])")


def _load_catalog(force: bool = False) -> dict:
    """Return {'by_cat': {cid: [job,...]}, 'jobs': {id: job}} for active jobs."""
    now = time.time()
    # ts is set only after a successful load, so a positive ts means we hold a
    # valid snapshot — even a legitimately empty one — worth serving for the TTL.
    if not force and _catalog_cache["ts"] and now - _catalog_cache["ts"] < _CATALOG_TTL:
        return _catalog_cache

    by_cat: dict = {}
    by_city: dict = {}
    jobs: dict = {}
    ok = False
    db = SessionLocal()
    try:
        from app.models.job import Job
        from app.models.user import User

        rows = (
            db.query(
                Job.id, Job.title, Job.description, Job.profession_slug,
                Job.salary_min, Job.salary_max, Job.salary_currency,
                Job.location, Job.experience_level, Job.external_apply_url,
                Job.contact_info, User.company_name, User.full_name,
            )
            .join(User, User.id == Job.company_id)
            .filter(Job.status == "active", Job.is_deleted.is_(False))
            .order_by(Job.created_at.desc())
            .all()
        )
        for r in rows:
            extra = f"{(r.description or '')[:200]} {(r.profession_slug or '').replace('-', ' ')}"
            cid = classify_job(r.title or "", extra)
            city_id = classify_city(r.location or "")
            name = (r.company_name or r.full_name or "").strip()
            company = name if name and name != _IMPORT_COMPANY_PLACEHOLDER else None
            rec = {
                "id": str(r.id), "title": (r.title or "Vakansiya").strip(),
                "company": company, "salary_min": r.salary_min,
                "salary_max": r.salary_max, "salary_currency": r.salary_currency or "UZS",
                "location": (r.location or "").strip(),
                "experience": r.experience_level or "",
                "apply_url": (r.external_apply_url or "").strip(),
                "contact": (r.contact_info or "").strip(), "cid": cid, "city_id": city_id,
            }
            by_cat.setdefault(cid, []).append(rec)
            by_city.setdefault(city_id, []).append(rec)
            jobs[rec["id"]] = rec
        ok = True
    except Exception as exc:  # noqa: BLE001
        logger.warning("catalog load failed: %s", exc)
    finally:
        db.close()

    # Only refresh the cache on a successful query (even if it's a genuine 0-job
    # result). A transient failure must NOT poison the cache with empties for the
    # whole TTL — we return whatever we had (possibly stale) and retry next tap.
    if ok:
        _catalog_cache.update({"ts": now, "by_cat": by_cat, "by_city": by_city, "jobs": jobs})
    return _catalog_cache


def _kb(rows: list) -> dict:
    return {"inline_keyboard": rows}


def _btn(text: str, cb: str) -> dict:
    return {"text": text, "callback_data": cb}


def _url_btn(text: str, url: str) -> dict:
    return {"text": text, "url": url}


def _fmt_salary(j: dict) -> str:
    lo, hi = j.get("salary_min"), j.get("salary_max")
    unit = "so'm" if (j.get("salary_currency") or "UZS") == "UZS" else j["salary_currency"]

    def f(n: float) -> str:
        return f"{int(n):,}".replace(",", " ")

    has_lo, has_hi = lo is not None, hi is not None
    if has_lo and has_hi:
        return f"{f(lo)} {unit}" if lo == hi else f"{f(lo)}–{f(hi)} {unit}"
    if has_lo:
        return f"{f(lo)}+ {unit}"
    if has_hi:
        return f"{f(hi)} {unit}gacha"
    return "Kelishiladi"


def _contact_url(contact: str) -> str | None:
    """Best-effort clickable link from a contact string (t.me / @handle)."""
    m = re.search(r"t\.me/([A-Za-z0-9_]+)", contact or "")
    if m:
        return f"https://t.me/{m.group(1)}"
    m = _HANDLE_RE.search(contact or "")
    if m:
        return f"https://t.me/{m.group(1)}"
    return None


def _menu_text(locale: str) -> str:
    if locale == "ru":
        return (
            "🏠 Главное меню IshTop\n\n"
            "Выберите действие ниже. «🔍 Поиск работы» — каталог вакансий по сферам."
        )
    return (
        "🏠 IshTop bosh menyu\n\n"
        "Quyidan tanlang. «🔍 Ish qidirish» — sohalar bo'yicha vakansiyalar katalogi."
    )


def _cats_text(locale: str = "uz") -> str:
    cat = _load_catalog()
    total = len(cat["jobs"])
    if locale == "ru":
        return f"🔍 Каталог вакансий — {total} активных\n\nВыберите сферу:"
    return f"🔍 Vakansiyalar katalogi — {total} ta faol\n\nSohani tanlang:"


def _main_menu_kb() -> dict:
    return _kb([
        [_btn("🔍 Soha bo'yicha", "cats"), _btn("🏙 Shahar bo'yicha", "cities")],
        [_btn("🔎 Kalit so'z bilan qidirish", "search")],
        [_url_btn("📄 AI Rezyume", f"{SITE_URL}/student/resume"),
         _url_btn("🌐 Sayt", SITE_URL)],
        [_url_btn("📢 Kanal", f"https://t.me/{CHANNEL_USERNAME}")],
    ])


def _categories_kb() -> dict:
    cat = _load_catalog()
    rows: list = []
    line: list = []
    ordered = [(c[0], c[1], c[2]) for c in CATEGORIES] + [("other", "📁", "Boshqa")]
    for cid, emoji, label in ordered:
        n = len(cat["by_cat"].get(cid, []))
        if n == 0:
            continue
        line.append(_btn(f"{emoji} {label} ({n})", f"c:{cid}:0"))
        if len(line) == 2:
            rows.append(line)
            line = []
    if line:
        rows.append(line)
    rows.append([_btn("🏠 Bosh menyu", "home")])
    return _kb(rows)


def _category_view(cid: str, page: int) -> tuple[str, dict]:
    cat = _load_catalog()
    jobs = cat["by_cat"].get(cid, [])
    meta = category_meta(cid)
    if not jobs:
        return (
            f"{meta['emoji']} {meta['label']}\n\nHozircha bu sohada faol vakansiya yo'q.",
            _kb([[_btn("🔙 Sohalar", "cats")]]),
        )
    pages = (len(jobs) + CATALOG_PAGE_SIZE - 1) // CATALOG_PAGE_SIZE
    page = max(0, min(page, pages - 1))
    chunk = jobs[page * CATALOG_PAGE_SIZE:(page + 1) * CATALOG_PAGE_SIZE]

    lines = [f"{meta['emoji']} {meta['label']} — {len(jobs)} ta vakansiya",
             f"Sahifa {page + 1}/{pages}", ""]
    for idx, j in enumerate(chunk, 1):
        lines.append(f"{idx}. {j['title']}")
        sub = " · ".join(x for x in [j["company"], _fmt_salary(j), j["location"]] if x)
        if sub:
            lines.append(f"    {sub}")
        lines.append("")
    lines.append("👇 Batafsil ko'rish uchun raqamni bosing:")

    back = f"c:{cid}:{page}"
    num_row = [_btn(str(i + 1), f"j:{chunk[i]['id']}:{back}") for i in range(len(chunk))]
    nav: list = []
    if page > 0:
        nav.append(_btn("⬅️ Oldingi", f"c:{cid}:{page - 1}"))
    if page < pages - 1:
        nav.append(_btn("Keyingi ➡️", f"c:{cid}:{page + 1}"))
    rows = [num_row]
    if nav:
        rows.append(nav)
    rows.append([_btn("🔙 Sohalar", "cats"), _btn("🏠 Menyu", "home")])
    return "\n".join(lines), _kb(rows)


def _cities_text(locale: str = "uz") -> str:
    cat = _load_catalog()
    total = len(cat["jobs"])
    if locale == "ru":
        return f"🏙 Вакансии по городам — {total} активных\n\nВыберите город:"
    return f"🏙 Shahar bo'yicha vakansiyalar — {total} ta faol\n\nShaharni tanlang:"


def _cities_kb() -> dict:
    cat = _load_catalog()
    by_city = cat.get("by_city", {})
    rows: list = []
    line: list = []
    ordered = [(c[0], c[1], c[2]) for c in CITIES] + [("other", "📍", "Boshqa hudud")]
    for cid, emoji, label in ordered:
        n = len(by_city.get(cid, []))
        if n == 0:
            continue
        line.append(_btn(f"{emoji} {label} ({n})", f"t:{cid}:0"))
        if len(line) == 2:
            rows.append(line)
            line = []
    if line:
        rows.append(line)
    rows.append([_btn("🏠 Bosh menyu", "home")])
    return _kb(rows)


def _city_view(cid: str, page: int) -> tuple[str, dict]:
    cat = _load_catalog()
    jobs = cat.get("by_city", {}).get(cid, [])
    meta = city_meta(cid)
    if not jobs:
        return (
            f"{meta['emoji']} {meta['label']}\n\nHozircha bu hududda faol vakansiya yo'q.",
            _kb([[_btn("🔙 Shaharlar", "cities")]]),
        )
    pages = (len(jobs) + CATALOG_PAGE_SIZE - 1) // CATALOG_PAGE_SIZE
    page = max(0, min(page, pages - 1))
    chunk = jobs[page * CATALOG_PAGE_SIZE:(page + 1) * CATALOG_PAGE_SIZE]

    lines = [f"{meta['emoji']} {meta['label']} — {len(jobs)} ta vakansiya",
             f"Sahifa {page + 1}/{pages}", ""]
    for idx, j in enumerate(chunk, 1):
        cat_meta = category_meta(j["cid"])
        lines.append(f"{idx}. {j['title']}")
        sub = " · ".join(x for x in [cat_meta["label"], j["company"], _fmt_salary(j)] if x)
        if sub:
            lines.append(f"    {sub}")
        lines.append("")
    lines.append("👇 Batafsil ko'rish uchun raqamni bosing:")

    back = f"t:{cid}:{page}"
    num_row = [_btn(str(i + 1), f"j:{chunk[i]['id']}:{back}") for i in range(len(chunk))]
    nav: list = []
    if page > 0:
        nav.append(_btn("⬅️ Oldingi", f"t:{cid}:{page - 1}"))
    if page < pages - 1:
        nav.append(_btn("Keyingi ➡️", f"t:{cid}:{page + 1}"))
    rows = [num_row]
    if nav:
        rows.append(nav)
    rows.append([_btn("🔙 Shaharlar", "cities"), _btn("🏠 Menyu", "home")])
    return "\n".join(lines), _kb(rows)


def _job_detail(job_id: str, back_cb: str) -> tuple[str, dict]:
    cat = _load_catalog()
    j = cat["jobs"].get(job_id)
    if not j:
        return (
            "Bu vakansiya endi mavjud emas yoki yopilgan.",
            _kb([[_btn("🔙 Orqaga", back_cb or "cats"), _btn("🏠 Menyu", "home")]]),
        )
    meta = category_meta(j["cid"])
    lines = [f"{meta['emoji']} {meta['label']}", "", f"📣 {j['title']}"]
    if j["company"]:
        lines.append(f"🏢 {j['company']}")
    lines.append(f"💵 {_fmt_salary(j)}")
    if j["location"]:
        lines.append(f"📌 {j['location']}")
    exp = _EXP_LABELS.get(j["experience"])
    if exp:
        lines.append(f"🕒 {exp}")
    lines.append("")

    apply_btns: list = []
    if j["apply_url"]:
        lines.append(f"☎️ Ariza: {j['apply_url']}")
        apply_btns.append(_url_btn("🌐 Ariza berish", j["apply_url"]))
    if j["contact"]:
        lines.append(f"☎️ Aloqa: {j['contact']}")
        curl = _contact_url(j["contact"])
        if curl:
            apply_btns.append(_url_btn("📞 Bog'lanish", curl))
    if not j["apply_url"] and not j["contact"]:
        lines.append("☎️ Ariza uchun ishtopuz.uz saytiga o'ting.")

    rows: list = []
    if apply_btns:
        rows.append(apply_btns)
    rows.append([_btn("🔙 Orqaga", back_cb or "cats"), _btn("🏠 Menyu", "home")])
    return "\n".join(lines), _kb(rows)


SEARCH_LIMIT = 6  # results shown per keyword search (no pagination — refine instead)


def _looks_like_search(q: str) -> bool:
    """A short, keyword-ish message we should try as a job search before AI."""
    q = q.strip()
    if q.startswith("/"):
        return False
    return 1 <= len(q.split()) <= 4 and 2 <= len(q) <= 40


def _search_jobs(query: str) -> list:
    """Jobs whose title/company/location/soha contains ALL query tokens."""
    cat = _load_catalog()
    toks = [t for t in query.lower().replace("’", "'").split() if len(t) >= 2]
    if not toks:
        return []
    out = []
    for j in cat["jobs"].values():  # dict preserves created_at-desc insertion order
        hay = (
            f"{j['title']} {j['company'] or ''} {j['location']} "
            f"{category_meta(j['cid'])['label']}"
        ).lower()
        if all(t in hay for t in toks):
            out.append(j)
    return out


def _search_prompt(locale: str = "uz") -> str:
    if locale == "ru":
        return ("🔎 Напишите ключевое слово — должность, компанию или город.\n"
                "Например: frontend, бухгалтер, Самарканд, Flutter")
    return ("🔎 Kalit so'z yozing — lavozim, kompaniya yoki shahar.\n"
            "Masalan: frontend, buxgalter, Samarqand, Flutter")


def _search_view(query: str, results: list) -> tuple[str, dict]:
    # Kept short & colon-free for the 64-byte callback limit. Trim at a word
    # boundary so a truncated multi-word query re-runs on whole tokens (a
    # superset) instead of a broken half-token that could yield "not found".
    raw = query.replace(":", " ").strip()
    qs = raw[:20]
    if len(raw) > 20 and " " in qs:
        qs = qs.rsplit(" ", 1)[0]
    shown = results[:SEARCH_LIMIT]
    lines = [f"🔎 «{query.strip()}» — {len(results)} ta topildi", ""]
    for idx, j in enumerate(shown, 1):
        meta = category_meta(j["cid"])
        lines.append(f"{idx}. {j['title']}")
        sub = " · ".join(x for x in [meta["label"], _fmt_salary(j), j["location"]] if x)
        if sub:
            lines.append(f"    {sub}")
        lines.append("")
    if len(results) > SEARCH_LIMIT:
        lines.append(f"… yana {len(results) - SEARCH_LIMIT} ta. Aniqroq yozing (masalan shahar qo'shing).")
    lines.append("👇 Batafsil ko'rish uchun raqamni bosing:")

    num_row = [_btn(str(i + 1), f"j:{shown[i]['id']}:s:{qs}") for i in range(len(shown))]
    rows = [num_row,
            [_btn("🔍 Sohalar", "cats"), _btn("🏙 Shaharlar", "cities"), _btn("🏠 Menyu", "home")]]
    return "\n".join(lines), _kb(rows)


async def _handle_callback(token: str, callback: dict) -> None:
    """Route an inline-button tap to the right catalog view (edits in place)."""
    cb_id = callback.get("id")
    data = (callback.get("data") or "").strip()
    msg = callback.get("message") or {}
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    message_id = msg.get("message_id")
    if not chat_id or not message_id:
        await _answer_cb(token, cb_id)
        return
    frm = callback.get("from") or {}
    locale = "ru" if (frm.get("language_code") or "").startswith("ru") else "uz"
    try:
        # Prime the catalog off the event loop — the sync render helpers below
        # then hit the warm cache instead of blocking on a DB query.
        await run_in_threadpool(_load_catalog)
        if data == "home":
            await _edit(token, chat_id, message_id, _menu_text(locale), _main_menu_kb())
        elif data == "cats":
            await _edit(token, chat_id, message_id, _cats_text(locale), _categories_kb())
        elif data == "cities":
            await _edit(token, chat_id, message_id, _cities_text(locale), _cities_kb())
        elif data == "search":
            await _edit(token, chat_id, message_id, _search_prompt(locale),
                        _kb([[_btn("🏠 Bosh menyu", "home")]]))
        elif data.startswith("s:"):
            query = data.split(":", 1)[1]
            results = _search_jobs(query)
            if results:
                text, kb = _search_view(query, results)
                await _edit(token, chat_id, message_id, text, kb)
            else:
                await _edit(token, chat_id, message_id,
                            f"🔎 «{query}» — hech narsa topilmadi.",
                            _kb([[_btn("🔍 Sohalar", "cats"), _btn("🏠 Menyu", "home")]]))
        elif data.startswith("c:") or data.startswith("t:"):
            parts = data.split(":")
            if len(parts) == 3 and parts[2].isdigit():
                kind, cid, page = parts
                view = _category_view if kind == "c" else _city_view
                text, kb = view(cid, int(page))
                await _edit(token, chat_id, message_id, text, kb)
            else:  # malformed / stale button — fall back to the top menu
                await _edit(token, chat_id, message_id, _menu_text(locale), _main_menu_kb())
        elif data.startswith("j:"):
            # j:<uuid>:<back_cb>  where back_cb is itself a callback like "c:it:0"
            parts = data.split(":", 2)
            if len(parts) == 3:
                text, kb = _job_detail(parts[1], parts[2])
                await _edit(token, chat_id, message_id, text, kb)
            else:
                await _edit(token, chat_id, message_id, _menu_text(locale), _main_menu_kb())
        # "noop" and anything else: just acknowledge below.
    except Exception as exc:  # noqa: BLE001
        logger.warning("callback handling failed (data=%s): %s", data, exc)
    await _answer_cb(token, cb_id)


@webhook_router.post("/webhook/{secret}")
async def telegram_webhook(secret: str, request: Request):
    """Telegram calls this on every update. Always returns 200 quickly."""
    expected = (settings.TELEGRAM_WEBHOOK_SECRET or "").strip()
    if not expected or secret != expected:
        return {"ok": False}

    token = (settings.TELEGRAM_APPS_BOT_TOKEN or "").strip()
    if not token:
        return {"ok": True}

    try:
        update = await request.json()
    except Exception:  # noqa: BLE001
        return {"ok": True}

    # Inline-button taps (catalog navigation) arrive as callback_query updates.
    callback = update.get("callback_query")
    if isinstance(callback, dict):
        await _handle_callback(token, callback)
        return {"ok": True}

    message = update.get("message") or update.get("edited_message")
    if not isinstance(message, dict):
        return {"ok": True}

    chat = message.get("chat") or {}
    # Only respond to private DMs — ignore the admin/log group chatter.
    if chat.get("type") != "private":
        return {"ok": True}

    chat_id = chat.get("id")
    text = (message.get("text") or "").strip()
    if not chat_id or not text:
        return {"ok": True}

    locale = _detect_locale(text)

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        payload = parts[1].strip() if len(parts) > 1 else ""
        if payload:
            linked = _link_chat_to_user(payload, str(chat_id))
            if linked:
                await _send(token, chat_id, _link_ok(locale))
            else:
                await _send(token, chat_id, _link_fail(locale))
            return {"ok": True}
        await _send(token, chat_id, _welcome(locale), _main_menu_kb())
        return {"ok": True}

    if text.startswith("/help"):
        await _send(token, chat_id, _help(locale), _main_menu_kb())
        return {"ok": True}

    if text.startswith("/jobs") or text.startswith("/katalog") or text.startswith("/vakansiya"):
        await run_in_threadpool(_load_catalog)  # keep the sync DB read off the event loop
        await _send(token, chat_id, _cats_text(locale), _categories_kb())
        return {"ok": True}

    if text.startswith("/search") or text.startswith("/qidiruv") or text.startswith("/qidir"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1:
            await run_in_threadpool(_load_catalog)
            results = _search_jobs(parts[1])
            if results:
                body, kb = _search_view(parts[1], results)
                await _send(token, chat_id, body, kb)
            else:
                await _send(token, chat_id, f"🔎 «{parts[1].strip()}» — hech narsa topilmadi.",
                            _main_menu_kb())
        else:
            await _send(token, chat_id, _search_prompt(locale))
        return {"ok": True}

    # Plain text: try a keyword job search first; fall back to the AI assistant.
    if _looks_like_search(text):
        await run_in_threadpool(_load_catalog)
        results = _search_jobs(text)
        if results:
            body, kb = _search_view(text, results)
            await _send(token, chat_id, body, kb)
            return {"ok": True}

    answer = await _ai_answer(text, locale)
    await _send(token, chat_id, answer)
    return {"ok": True}


def _link_chat_to_user(link_token: str, chat_id: str) -> bool:
    """Consume a one-time deep-link token and store the chat id on that user."""
    db = SessionLocal()
    try:
        from app.models.user import User

        user_id = consume_link_token(db, link_token)
        if not user_id:
            return False
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        # Detach this chat from any other account it was previously linked to,
        # otherwise both accounts would receive daily alerts on the same chat.
        db.query(User).filter(
            User.telegram_chat_id == chat_id, User.id != user.id
        ).update({User.telegram_chat_id: None}, synchronize_session=False)
        user.telegram_chat_id = chat_id
        db.commit()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram link failed: %s", exc)
        db.rollback()
        return False
    finally:
        db.close()


def _help(locale: str) -> str:
    if locale == "ru":
        return (
            "🤖 Я AI-помощник IshTop. Чем могу помочь:\n\n"
            "• Задайте любой вопрос о ishtopuz.uz — отвечу с помощью AI\n"
            "• Ежедневные подходящие вакансии — подключите Telegram в "
            "Настройках на ishtopuz.uz\n"
            "• AI-резюме, отклики, процент совпадения — всё на сайте\n\n"
            "🎁 Подпишитесь на канал — 1 месяц PRO бесплатно: ishtopuz.uz/plans\n\n"
            "Открыть: ishtopuz.uz  ·  Канал: @ishtopuz_official"
        )
    return (
        "🤖 Men IshTop AI yordamchisiman. Nima qila olaman:\n\n"
        "• ishtopuz.uz haqida istalgan savol bering — AI javob beradi\n"
        "• Har kuni mos ish o'rinlari — ishtopuz.uz Sozlamalar'da "
        "Telegram'ni ulang\n"
        "• AI rezyume, ariza, moslik foizi — hammasi saytda\n\n"
        "🎁 Kanalga obuna bo'lsangiz — 1 oy PRO bepul: ishtopuz.uz/plans\n\n"
        "Ochish: ishtopuz.uz  ·  Kanal: @ishtopuz_official"
    )


def _link_ok(locale: str) -> str:
    if locale == "ru":
        return (
            "✅ Готово! Ваш аккаунт IshTop подключён.\n\n"
            "Теперь вы будете получать здесь новые подходящие вакансии каждый день."
        )
    return (
        "✅ Tayyor! IshTop akkauntingiz ulandi.\n\n"
        "Endi har kuni sizga mos yangi ish o'rinlarini shu yerda olasiz."
    )


def _link_fail(locale: str) -> str:
    if locale == "ru":
        return "Ссылка устарела. Откройте страницу настроек в IshTop и попробуйте снова."
    return "Havola eskirgan. IshTop sozlamalar sahifasidan qayta urinib ko'ring."


@router.get("/link")
async def telegram_link(current_user=Depends(get_current_active_user), db=Depends(get_db)):
    """Return a deep link the user opens to connect their Telegram for alerts."""
    token = issue_link_token(db, current_user)
    return {
        "success": True,
        "data": {
            "deep_link": f"https://t.me/{BOT_USERNAME}?start={token}",
            "connected": bool(getattr(current_user, "telegram_chat_id", None)),
        },
    }


@router.post("/unlink")
async def telegram_unlink(current_user=Depends(get_current_active_user), db=Depends(get_db)):
    """Disconnect Telegram alerts for the current user."""
    current_user.telegram_chat_id = None
    db.commit()
    return {"success": True, "data": {"connected": False}}


async def _is_channel_member(chat_id: str) -> bool:
    """True if the given Telegram user is subscribed to our channel.

    Requires the bot to be an administrator of @ishtopuz_official.
    """
    token = (settings.TELEGRAM_APPS_BOT_TOKEN or "").strip()
    if not token or not chat_id:
        return False
    url = f"{settings.TELEGRAM_API_BASE_URL}/bot{token}/getChatMember"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                url, params={"chat_id": f"@{CHANNEL_USERNAME}", "user_id": chat_id}
            )
        data = resp.json()
        if not data.get("ok"):
            logger.warning("getChatMember failed: %s", data.get("description"))
            return False
        status = (data.get("result") or {}).get("status")
        return status in {"member", "administrator", "creator"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("channel membership check error: %s", exc)
        return False


@router.post("/claim-pro")
async def claim_pro(current_user=Depends(get_current_active_user), db=Depends(get_db)):
    """Grant free PRO if the user is subscribed to the official Telegram channel.

    Requires the user to have connected their Telegram first (telegram_chat_id).
    Returns granted=False with a reason otherwise.
    """
    from datetime import datetime, timedelta, timezone

    from app.core.premium import SubscriptionTier

    chat_id = getattr(current_user, "telegram_chat_id", None)
    if not chat_id:
        return {"success": True, "data": {"granted": False, "reason": "not_linked"}}

    if not await _is_channel_member(str(chat_id)):
        return {"success": True, "data": {"granted": False, "reason": "not_subscribed"}}

    now = datetime.now(timezone.utc)
    base = current_user.subscription_expires_at
    if base is not None and base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)

    # Anti-abuse: if PRO is already active, do NOT extend — otherwise a user
    # could spam this endpoint and stack unlimited free months. They can
    # re-claim only once the current period has lapsed (and they're still
    # subscribed), which is exactly the retention loop we want.
    already_active = (
        current_user.subscription_tier
        in (SubscriptionTier.PREMIUM, SubscriptionTier.ENTERPRISE)
        and base is not None
        and base > now
    )
    if already_active:
        return {
            "success": True,
            "data": {
                "granted": False,
                "reason": "already_pro",
                "expires_at": base.isoformat(),
            },
        }

    current_user.subscription_tier = SubscriptionTier.PREMIUM
    current_user.subscription_expires_at = now + timedelta(days=PRO_DAYS)
    db.commit()
    return {
        "success": True,
        "data": {
            "granted": True,
            "tier": "premium",
            "expires_at": current_user.subscription_expires_at.isoformat(),
            "days": PRO_DAYS,
        },
    }
