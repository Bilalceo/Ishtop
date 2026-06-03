"""
AI HR — recruiter-facing AI helpers.

Provides:
- Job description drafting from a short brief.
- Candidate summary that combines resume + job + match breakdown.
- Interview question generation tailored to one candidate.
- Email template drafting (interview invite, rejection, offer, follow-up).

Uses Gemini when configured (free tier, generous quota), falls back to a
deterministic template-based response so the UI always has *something* to show
even without an API key. That way the platform stays usable in local/demo
environments while behaving like a real AI helper in production.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


# =============================================================================
# Public API
# =============================================================================


async def generate_job_description(
    title: str,
    seniority: str,
    tone: str = "professional",
    industry: Optional[str] = None,
    location: Optional[str] = None,
    must_have: Optional[List[str]] = None,
    locale: str = "uz",
) -> Dict[str, Any]:
    """Draft a complete job description from a short brief."""
    must_have = must_have or []
    normalized_locale = _normalize_locale(locale)
    prompt = _job_description_prompt(
        title, seniority, tone, industry, location, must_have, normalized_locale
    )

    parsed = await _generate_json(prompt)
    if parsed is None:
        return _fallback_job_description(title, seniority, must_have, normalized_locale)

    # Normalize keys + types
    return {
        "title": title,
        "summary": str(parsed.get("summary", "")),
        "description": str(parsed.get("description", "")),
        "requirements": _ensure_list(parsed.get("requirements")),
        "responsibilities": _ensure_list(parsed.get("responsibilities")),
        "nice_to_have": _ensure_list(parsed.get("nice_to_have")),
        "benefits": _ensure_list(parsed.get("benefits")),
        "ai_generated": gemini_service.is_available,
    }


async def generate_candidate_summary(
    *,
    job: Dict[str, Any],
    resume: Dict[str, Any],
    match_breakdown: Optional[Dict[str, Any]] = None,
    locale: str = "uz",
) -> Dict[str, Any]:
    """One-page AI synopsis: strengths, gaps, fit, recommendation."""
    prompt = _candidate_summary_prompt(job, resume, match_breakdown, locale)
    parsed = await _generate_json(prompt)
    if parsed is None:
        return _fallback_candidate_summary(job, resume, match_breakdown, locale)

    rec_raw = str(parsed.get("recommendation", "review")).lower().strip()
    if rec_raw not in {"shortlist", "review", "pass"}:
        rec_raw = "review"

    return {
        "summary": str(parsed.get("summary", "")),
        "strengths": _ensure_list(parsed.get("strengths")),
        "gaps": _ensure_list(parsed.get("gaps")),
        "recommendation": rec_raw,
        "fit_score": _coerce_int(parsed.get("fit_score"), default=None, lo=0, hi=100),
        "ai_generated": gemini_service.is_available,
    }


async def generate_interview_questions(
    *,
    job: Dict[str, Any],
    resume: Dict[str, Any],
    count: int = 8,
    locale: str = "uz",
) -> Dict[str, Any]:
    """Tailored interview questions for one applicant + role."""
    prompt = _interview_questions_prompt(job, resume, count, locale)
    parsed = await _generate_json(prompt)
    if parsed is None:
        return _fallback_interview_questions(job, resume, count, locale)

    raw_questions = parsed.get("questions")
    questions: List[Dict[str, str]] = []
    if isinstance(raw_questions, list):
        for item in raw_questions:
            if isinstance(item, dict):
                q = str(item.get("question", "")).strip()
                if not q:
                    continue
                questions.append({
                    "question": q,
                    "category": str(item.get("category", "general")),
                    "rationale": str(item.get("rationale", "")),
                })
            elif isinstance(item, str):
                cleaned = item.strip()
                if cleaned:
                    questions.append({"question": cleaned, "category": "general", "rationale": ""})

    if not questions:
        return _fallback_interview_questions(job, resume, count, locale)

    return {"questions": questions[:count], "ai_generated": gemini_service.is_available}


async def generate_email_template(
    *,
    action: str,
    applicant_name: str,
    job_title: str,
    company_name: str,
    interview_at: Optional[str] = None,
    meeting_link: Optional[str] = None,
    locale: str = "uz",
) -> Dict[str, Any]:
    """Draft an outbound recruiter email for a given action."""
    action_key = action.lower().strip()
    if action_key not in {"interview", "reject", "offer", "shortlist", "follow_up"}:
        action_key = "follow_up"

    prompt = _email_template_prompt(
        action_key, applicant_name, job_title, company_name, interview_at, meeting_link, locale
    )

    parsed = await _generate_json(prompt)
    if parsed is None:
        return _fallback_email(action_key, applicant_name, job_title, company_name, interview_at, meeting_link, locale)

    return {
        "subject": str(parsed.get("subject", "")).strip(),
        "body": str(parsed.get("body", "")).strip(),
        "ai_generated": gemini_service.is_available,
    }


# =============================================================================
# Internal helpers
# =============================================================================


async def _generate_json(prompt: str) -> Optional[Dict[str, Any]]:
    if not gemini_service.is_available:
        return None
    try:
        raw = await gemini_service.generate(prompt, response_format="json")
        return json.loads(raw) if raw else None
    except json.JSONDecodeError as e:
        logger.warning(f"AI HR JSON parse failed: {e}; falling back to template")
        return None
    except Exception as e:
        logger.warning(f"AI HR generation failed: {e}; falling back to template")
        return None


def _ensure_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v) for v in value if str(v).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _coerce_int(value: Any, default: Optional[int], lo: int, hi: int) -> Optional[int]:
    try:
        n = int(float(value))
        return max(lo, min(hi, n))
    except (TypeError, ValueError):
        return default


# =============================================================================
# Prompts
# =============================================================================


def _lang_directive(locale: str) -> str:
    if locale == "ru":
        return "Respond in Russian."
    if locale == "en":
        return "Respond in English."
    return "Respond in Uzbek (latin script)."


def _normalize_locale(locale: str) -> str:
    value = (locale or "uz").strip().lower()
    if value in {"ru", "en"}:
        return value
    return "uz"


def _job_description_prompt(
    title: str,
    seniority: str,
    tone: str,
    industry: Optional[str],
    location: Optional[str],
    must_have: List[str],
    locale: str,
) -> str:
    must = ", ".join(must_have) if must_have else "—"
    return f"""You are a senior recruiter at a hiring agency. Write a complete job posting.

Job title: {title}
Seniority: {seniority}
Tone: {tone}
Industry: {industry or "general"}
Location: {location or "—"}
Must-have skills/qualifications: {must}

{_lang_directive(locale)}

Return ONLY this JSON shape:
{{
  "summary": "2-3 sentence headline",
  "description": "4-6 sentence company/role overview",
  "requirements": ["5-7 concrete bullet items"],
  "responsibilities": ["5-7 concrete bullet items"],
  "nice_to_have": ["3-5 optional skills"],
  "benefits": ["4-6 benefits"]
}}
"""


def _candidate_summary_prompt(
    job: Dict[str, Any],
    resume: Dict[str, Any],
    match_breakdown: Optional[Dict[str, Any]],
    locale: str,
) -> str:
    matched = (match_breakdown or {}).get("matched_skills") or []
    missing = (match_breakdown or {}).get("missing_skills") or []
    return f"""You are a senior recruiter reviewing a job application.

Job: {job.get("title")} · {job.get("location")} · {job.get("experience_level")}
Job requirements: {", ".join((job.get("requirements") or [])[:15]) or "(none specified)"}

Resume title: {resume.get("title")}
Resume skills (sample): {", ".join((resume.get("skills") or [])[:20]) or "(none extracted)"}

Skills matched by our scoring engine: {", ".join(matched[:10]) or "(none)"}
Skills missing per the job spec: {", ".join(missing[:10]) or "(none)"}

{_lang_directive(locale)}

Return ONLY this JSON:
{{
  "summary": "2-3 sentence executive summary for HR",
  "strengths": ["3-5 short bullets"],
  "gaps": ["1-3 short bullets — be specific"],
  "recommendation": "shortlist | review | pass",
  "fit_score": <integer 0-100>
}}
"""


def _interview_questions_prompt(
    job: Dict[str, Any],
    resume: Dict[str, Any],
    count: int,
    locale: str,
) -> str:
    return f"""You are an interviewer preparing questions tailored to this candidate and role.

Job: {job.get("title")} · {job.get("experience_level")} · {job.get("location")}
Top requirements: {", ".join((job.get("requirements") or [])[:10]) or "(none specified)"}

Candidate resume title: {resume.get("title")}
Candidate top skills: {", ".join((resume.get("skills") or [])[:15]) or "(none extracted)"}

Write exactly {count} interview questions. Mix:
- technical / role-specific
- behavioral
- 1-2 that probe gaps relative to the job

{_lang_directive(locale)}

Return ONLY this JSON:
{{
  "questions": [
    {{"question": "...", "category": "technical|behavioral|cultural|gap-probe", "rationale": "1 sentence why this question"}}
  ]
}}
"""


def _email_template_prompt(
    action: str,
    applicant_name: str,
    job_title: str,
    company_name: str,
    interview_at: Optional[str],
    meeting_link: Optional[str],
    locale: str,
) -> str:
    intent_map = {
        "interview": "Invite the candidate to an interview (be warm, professional, include the date if provided).",
        "reject": "Politely decline the candidate, encourage future applications, do NOT explain in detail.",
        "offer": "Make a verbal job offer pending paperwork, ask them to confirm interest.",
        "shortlist": "Tell the candidate they've been shortlisted and next steps are coming.",
        "follow_up": "Send a polite status check / progress note.",
    }
    return f"""You are a professional recruiter writing a short, warm outbound email.

Action: {intent_map[action]}
Candidate name: {applicant_name}
Job title: {job_title}
Company: {company_name}
Interview date/time: {interview_at or "—"}
Meeting link: {meeting_link or "—"}

Keep it under 120 words. Use natural language, no corporate jargon.
{_lang_directive(locale)}

Return ONLY this JSON:
{{"subject": "...", "body": "...with proper line breaks..."}}
"""


# =============================================================================
# Fallback templates (used when Gemini/OpenAI not configured)
# =============================================================================


def _fallback_job_description(title: str, seniority: str, must_have: List[str], locale: str) -> Dict[str, Any]:
    is_ru = locale == "ru"
    is_en = locale == "en"
    return {
        "title": title,
        "summary": (
            f"Мы ищем {seniority} {title}." if is_ru
            else f"We are hiring a {seniority} {title}." if is_en
            else f"Biz {seniority} {title} izlamoqdamiz."
        ),
        "description": (
            "Динамичная команда, профессиональный рост, конкурентная зарплата." if is_ru
            else "Dynamic team, growth opportunities, and a competitive compensation package." if is_en
            else "Dinamik jamoa, professional o'sish, raqobatbardosh maosh."
        ),
        "requirements": must_have or (
            ["Relevant role experience", "Team collaboration", "Accountability"] if is_en
            else
            ["Profilga mos tajriba", "Jamoa bilan ishlash", "Mas'uliyat hissi"] if not is_ru
            else ["Релевантный опыт", "Командная работа", "Ответственность"]
        ),
        "responsibilities": (
            ["Deliver core responsibilities", "Collaborate with cross-functional teammates", "Report progress regularly"] if is_en
            else
            ["Asosiy vazifalarni bajarish", "Hamkasblar bilan ish olib borish", "Hisobot berish"] if not is_ru
            else ["Выполнение основных задач", "Работа с коллегами", "Отчётность"]
        ),
        "nice_to_have": [],
        "benefits": (
            ["Health insurance", "Flexible schedule", "Career growth"] if is_en
            else
            ["Tibbiy sug'urta", "Moslashuvchan jadval", "Karyera rivoji"] if not is_ru
            else ["Медстраховка", "Гибкий график", "Развитие карьеры"]
        ),
        "ai_generated": False,
    }


def _fallback_candidate_summary(
    job: Dict[str, Any],
    resume: Dict[str, Any],
    match_breakdown: Optional[Dict[str, Any]],
    locale: str,
) -> Dict[str, Any]:
    matched = (match_breakdown or {}).get("matched_skills") or []
    missing = (match_breakdown or {}).get("missing_skills") or []
    score = (match_breakdown or {}).get("score")

    if score is not None and score >= 75:
        rec = "shortlist"
    elif score is not None and score < 40:
        rec = "pass"
    else:
        rec = "review"

    is_ru = locale == "ru"
    summary = (
        f"Кандидат — {resume.get('title', '')}. "
        f"Совпало {len(matched)} навыков, не хватает {len(missing)}."
    ) if is_ru else (
        f"Nomzod — {resume.get('title', '')}. "
        f"{len(matched)} ko'nikma mos, {len(missing)} yetishmaydi."
    )

    return {
        "summary": summary,
        "strengths": matched[:5] or [
            ("Опыт работы в профильной должности." if is_ru else "Profilga mos ish tajribasi.")
        ],
        "gaps": missing[:3],
        "recommendation": rec,
        "fit_score": int(score) if isinstance(score, (int, float)) else None,
        "ai_generated": False,
    }


def _fallback_interview_questions(
    job: Dict[str, Any], resume: Dict[str, Any], count: int, locale: str
) -> Dict[str, Any]:
    is_ru = locale == "ru"
    base = [
        ("Расскажите о вашем самом сложном проекте.", "behavioral") if is_ru
        else ("Eng murakkab loyihangiz haqida gapirib bering.", "behavioral"),
        ("Какие технологии вы используете каждый день?", "technical") if is_ru
        else ("Har kuni qaysi texnologiyalardan foydalanasiz?", "technical"),
        ("Как вы работаете в команде?", "cultural") if is_ru
        else ("Jamoada qanday ishlaysiz?", "cultural"),
        ("Опишите случай, когда вам пришлось быстро учиться.", "behavioral") if is_ru
        else ("Tez o'rganishingiz kerak bo'lgan vaziyatni tasvirlab bering.", "behavioral"),
        ("Чем вас привлекает наша компания?", "cultural") if is_ru
        else ("Bizning kompaniya sizni nimasi bilan jalb qildi?", "cultural"),
        ("Расскажите о своих карьерных целях.", "cultural") if is_ru
        else ("Karyera maqsadlaringiz haqida gapiring.", "cultural"),
        ("Как вы решаете конфликты с коллегами?", "behavioral") if is_ru
        else ("Hamkasblar bilan nizolarni qanday hal qilasiz?", "behavioral"),
        ("Опишите проект, где вы превзошли ожидания.", "behavioral") if is_ru
        else ("Kutilganidan ko'p natija bergan loyihangizni aytib bering.", "behavioral"),
    ]
    return {
        "questions": [
            {"question": q, "category": cat, "rationale": ""} for (q, cat) in base[:count]
        ],
        "ai_generated": False,
    }


def _fallback_email(
    action: str,
    applicant_name: str,
    job_title: str,
    company_name: str,
    interview_at: Optional[str],
    meeting_link: Optional[str],
    locale: str,
) -> Dict[str, Any]:
    is_ru = locale == "ru"
    if action == "interview":
        subject = (f"Приглашение на собеседование — {job_title}" if is_ru
                   else f"Intervyuga taklif — {job_title}")
        when = f"\nДата: {interview_at}" if (is_ru and interview_at) else (f"\nVaqt: {interview_at}" if interview_at else "")
        link = f"\nСсылка: {meeting_link}" if (is_ru and meeting_link) else (f"\nHavola: {meeting_link}" if meeting_link else "")
        body = (
            f"Здравствуйте, {applicant_name}!\n\nМы рады пригласить вас на собеседование на позицию {job_title} в {company_name}.{when}{link}\n\nС уважением,\nКоманда {company_name}"
            if is_ru else
            f"Salom, {applicant_name}!\n\n{job_title} lavozimi bo'yicha {company_name} jamoasi bilan intervyuga sizni taklif qilamiz.{when}{link}\n\nHurmat bilan,\n{company_name} jamoasi"
        )
    elif action == "reject":
        subject = ("Спасибо за интерес к нашей вакансии" if is_ru
                   else "Bizning vakansiyaga qiziqishingiz uchun rahmat")
        body = (
            f"Здравствуйте, {applicant_name}!\n\nБлагодарим за интерес к позиции {job_title} в {company_name}. К сожалению, на этот раз мы выбрали другого кандидата. Желаем удачи!\n\n— {company_name}"
            if is_ru else
            f"Salom, {applicant_name}!\n\n{company_name} dagi {job_title} lavozimiga qiziqqaningiz uchun rahmat. Afsuski, bu safar boshqa nomzodni tanladik. Sizga muvaffaqiyat tilaymiz!\n\n— {company_name}"
        )
    elif action == "offer":
        subject = (f"Предложение о работе — {job_title}" if is_ru
                   else f"Ish taklifi — {job_title}")
        body = (
            f"Здравствуйте, {applicant_name}!\n\nРады предложить вам позицию {job_title} в {company_name}. Подробности и условия отправим отдельным письмом.\n\nС уважением,\n{company_name}"
            if is_ru else
            f"Salom, {applicant_name}!\n\n{company_name} dagi {job_title} lavozimi uchun sizga ish taklifini bermoqchimiz. Tafsilotlar va shartlarni alohida xatda yuboramiz.\n\nHurmat bilan,\n{company_name}"
        )
    elif action == "shortlist":
        subject = ("Вы прошли в шорт-лист" if is_ru else "Siz shortlistga o'tdingiz")
        body = (
            f"Здравствуйте, {applicant_name}!\n\nВы прошли в следующий этап отбора на позицию {job_title}. Скоро свяжемся с деталями.\n\n— {company_name}"
            if is_ru else
            f"Salom, {applicant_name}!\n\n{job_title} lavozimiga keyingi bosqichga o'tdingiz. Tafsilotlar bilan tez orada bog'lanamiz.\n\n— {company_name}"
        )
    else:  # follow_up
        subject = ("Статус вашей заявки" if is_ru else "Arizangiz holati")
        body = (
            f"Здравствуйте, {applicant_name}!\n\nХотим сообщить, что мы продолжаем рассмотрение вашей заявки на позицию {job_title}.\n\n— {company_name}"
            if is_ru else
            f"Salom, {applicant_name}!\n\n{job_title} lavozimiga arizangizni ko'rib chiqishni davom ettiryapmiz.\n\n— {company_name}"
        )
    return {"subject": subject, "body": body, "ai_generated": False}
