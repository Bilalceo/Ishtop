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

from app.config import settings
# get_db MUST come from app.core.dependencies (the same one get_current_active_user
# uses) so the endpoint and the authenticated user share one DB session; otherwise
# writes to current_user are committed on a different session and silently lost.
from app.core.dependencies import get_current_active_user, get_db
from app.core.telegram_link import consume_link_token, issue_link_token
from app.database import SessionLocal

logger = logging.getLogger(__name__)

# Public webhook — mounted at the app root (Telegram calls it, no auth).
webhook_router = APIRouter(prefix="/telegram", tags=["telegram-bot"])
# Authenticated link/unlink — mounted under /api/v1.
router = APIRouter(prefix="/telegram", tags=["telegram-bot"])

BOT_USERNAME = "ishtop_ariza_bot"
CHANNEL_USERNAME = "ishtopuz_official"
PRO_DAYS = 30  # free PRO granted per channel-subscription claim

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


async def _send(token: str, chat_id: int, text: str) -> None:
    url = f"{settings.TELEGRAM_API_BASE_URL}/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                url,
                json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("telegram send failed: %s", exc)


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
        await _send(token, chat_id, _welcome(locale))
        return {"ok": True}

    if text.startswith("/help"):
        await _send(token, chat_id, _help(locale))
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
    # Extend from an existing future expiry so re-claims don't shorten access.
    base = current_user.subscription_expires_at
    if base is not None and base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    start = base if (base and base > now) else now
    current_user.subscription_tier = SubscriptionTier.PREMIUM
    current_user.subscription_expires_at = start + timedelta(days=PRO_DAYS)
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
