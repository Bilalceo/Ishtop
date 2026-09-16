from __future__ import annotations

from typing import Any, Dict, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin_permission
from app.models import LandingContent, User
from app.models.job import visible_job_filters

router = APIRouter()

Locale = Literal["uz", "ru"]


# The landing page advertised "10K+ talaba" and "500+ vakansiya" against a
# database holding 188 students and 268 listings, plus a "95% get a reply in a
# week" that nothing measures — on a platform where most applications have
# never been answered. A number nobody can source is worth less than a smaller
# number that is true, so these are counted at request time and cannot go
# stale or drift back into fiction.
def live_stats(db: Session, locale: Locale) -> list[Dict[str, Any]]:
    from app.models.job import Job, JobStatus
    from app.models.resume import Resume
    from sqlalchemy import func as sa_func

    students = (
        db.query(sa_func.count(User.id))
        .filter(User.is_deleted == False, User.role == "student")  # noqa: E712
        .scalar()
        or 0
    )
    jobs = (
        db.query(sa_func.count(Job.id))
        .filter(*visible_job_filters())
        .scalar()
        or 0
    )
    resumes = (
        db.query(sa_func.count(Resume.id))
        .filter(Resume.is_deleted == False)  # noqa: E712
        .scalar()
        or 0
    )

    def rounded(n: int) -> str:
        """Round down, never up: the claim must stay true between requests."""
        if n >= 1000:
            return f"{(n // 100) * 100:,}".replace(",", " ") + "+"
        if n >= 100:
            return f"{(n // 10) * 10}+"
        return str(n)

    if locale == "ru":
        return [
            {
                "value": rounded(jobs),
                "label": "Открытых вакансий с контактом",
                "note": "Активные объявления, у которых в тексте есть телефон или Telegram работодателя. Считается в базе при каждом запросе.",
            },
            {
                "value": rounded(students),
                "label": "Зарегистрированных студентов",
                "note": "Аккаунты с ролью «студент». Не показатель активности и не проверенные профили.",
            },
            {
                "value": rounded(resumes),
                "label": "Созданных резюме",
                "note": "Резюме, созданные пользователями, включая черновики.",
            },
            {
                "value": "60 сек",
                "label": "От AI-резюме до отклика",
                "note": "Время работы AI-генератора, а не срок поиска работы.",
            },
        ]
    return [
        {
            "value": rounded(jobs),
            "label": "Kontakti bor ochiq vakansiya",
            "note": "Matnida ish beruvchining telefoni yoki Telegram useri bor faol e'lonlar. Har so'rovda bazadan sanaladi.",
        },
        {
            "value": rounded(students),
            "label": "Ro'yxatdan o'tgan talaba",
            "note": "Roli «talaba» bo'lgan hisoblar. Bu faollik ko'rsatkichi emas va profillar tekshirilgan degani emas.",
        },
        {
            "value": rounded(resumes),
            "label": "Yaratilgan rezyume",
            "note": "Foydalanuvchilar yaratgan rezyumelar, qoralamalar ham kiradi.",
        },
        {
            "value": "60 soniya",
            "label": "AI rezyumedan arizagacha",
            "note": "AI generatorining ishlash vaqti, ish topish muddati emas.",
        },
    ]


def default_payload(locale: Locale) -> Dict[str, Any]:
    """Default CMS payload. IshTop is an AI-career platform for Uzbekistan
    students, graduates, interns, and junior specialists — not a generic
    senior job board. Admins can override via the /admin/landing CMS editor.
    """
    if locale == "ru":
        return {
            "hero": {
                "title": "AI-карьера для студентов и junior-специалистов Узбекистана",
                "subtitle": "Создавайте AI-резюме, находите стажировки и junior-вакансии, откликайтесь за минуты.",
                "primaryCta": "Начать бесплатно",
                "secondaryCta": "Посмотреть AI демо",
            },
            # Filled by live_stats() at request time; see the note there.
            "stats": [],
            "features": [],
            "howItWorks": [],
            "pricing": [],
            "testimonials": [],
            "cta": {
                "title": "Готовы найти первую работу или стажировку?",
                "subtitle": "Присоединяйтесь к студентам и junior-специалистам на IshTop.",
                "button": "Начать бесплатно",
            },
            "footer": {"description": "AI-карьерная платформа для студентов и junior-специалистов Узбекистана."},
        }

    return {
        "hero": {
            "title": "O'zbekiston talabalari uchun AI-karyera platformasi",
            "subtitle": "Talabalar, bitiruvchilar va junior mutaxassislar uchun. AI rezyume yarating, mos internship va junior vakansiyalarni toping, arizani daqiqalar ichida yuboring.",
            "primaryCta": "Bepul boshlash",
            "secondaryCta": "AI demo ko'rish",
        },
        # Filled by live_stats() at request time; see the note there.
        "stats": [],
        "features": [],
        "howItWorks": [],
        "pricing": [],
        "testimonials": [],
        "cta": {
            "title": "Birinchi ishingiz yoki internshipingiz tayyormi?",
            "subtitle": "IshTop'da talabalar va junior mutaxassislar bilan birga karyerangizni boshlang.",
            "button": "Bepul boshlash",
        },
        "footer": {"description": "O'zbekiston talabalari va junior mutaxassislari uchun AI-karyera platformasi."},
    }


class LandingContentPayload(BaseModel):
    locale: Locale
    payload: Dict[str, Any] = Field(default_factory=dict)
    is_published: bool = True

    @field_validator("payload")
    @classmethod
    def validate_payload(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        required_sections = [
            "hero",
            "stats",
            "features",
            "howItWorks",
            "pricing",
            "testimonials",
            "cta",
            "footer",
        ]
        missing = [s for s in required_sections if s not in value]
        if missing:
            raise ValueError(f"Missing required sections: {', '.join(missing)}")

        hero = value.get("hero", {})
        if isinstance(hero, dict):
            title = hero.get("title", "")
            subtitle = hero.get("subtitle", "")
            if len(str(title)) > 180:
                raise ValueError("hero.title must be <= 180 characters")
            if len(str(subtitle)) > 500:
                raise ValueError("hero.subtitle must be <= 500 characters")

        testimonials = value.get("testimonials", [])
        if isinstance(testimonials, list) and len(testimonials) > 20:
            raise ValueError("testimonials max length is 20")

        return value


@router.get("/content")
def get_public_landing_content(
    locale: Locale = Query("uz"),
    db: Session = Depends(get_db),
):
    record = (
        db.query(LandingContent)
        .filter(LandingContent.locale == locale, LandingContent.is_published == True)
        .first()
    )

    if not record:
        payload = default_payload(locale)
        payload["stats"] = live_stats(db, locale)
        return {"success": True, "data": {"locale": locale, "payload": payload, "is_published": True}}

    # Counted now, whatever the CMS has stored: an admin must not be able to
    # publish a headline number the database cannot support.
    payload = dict(record.payload or {})
    payload["stats"] = live_stats(db, locale)

    return {
        "success": True,
        "data": {
            "id": str(record.id),
            "locale": record.locale,
            "payload": payload,
            "is_published": record.is_published,
            "updated_at": record.updated_at,
        },
    }


@router.get("/admin/content")
def get_admin_landing_content(
    locale: Locale = Query("uz"),
    admin: User = Depends(require_admin_permission("admin.dashboard.read")),
    db: Session = Depends(get_db),
):
    record = db.query(LandingContent).filter(LandingContent.locale == locale).first()
    if not record:
        return {
            "success": True,
            "data": {
                "locale": locale,
                "payload": default_payload(locale),
                "is_published": True,
            },
        }

    return {
        "success": True,
        "data": {
            "id": str(record.id),
            "locale": record.locale,
            "payload": record.payload,
            "is_published": record.is_published,
            "updated_at": record.updated_at,
        },
    }


@router.put("/admin/content")
def upsert_admin_landing_content(
    body: LandingContentPayload,
    admin: User = Depends(require_admin_permission("admin.dashboard.read")),
    db: Session = Depends(get_db),
):
    record = db.query(LandingContent).filter(LandingContent.locale == body.locale).first()

    if not record:
        record = LandingContent(locale=body.locale, payload=body.payload, is_published=body.is_published)
        db.add(record)
    else:
        record.payload = body.payload
        record.is_published = body.is_published

    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": "Landing content saved",
        "data": {
            "id": str(record.id),
            "locale": record.locale,
            "payload": record.payload,
            "is_published": record.is_published,
            "updated_at": record.updated_at,
        },
    }


@router.delete("/admin/content")
def delete_admin_landing_content(
    locale: Locale = Query("uz"),
    admin: User = Depends(require_admin_permission("admin.dashboard.read")),
    db: Session = Depends(get_db),
):
    record = db.query(LandingContent).filter(LandingContent.locale == locale).first()
    if not record:
        return {"success": True, "message": "Nothing to delete"}

    db.delete(record)
    db.commit()
    return {"success": True, "message": "Landing content deleted"}
