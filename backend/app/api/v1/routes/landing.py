from __future__ import annotations

from typing import Any, Dict, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_admin_permission
from app.models import LandingContent, User

router = APIRouter()

Locale = Literal["uz", "ru"]


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
            "stats": [
                {"value": "10K+", "label": "Студентов и выпускников"},
                {"value": "500+", "label": "Junior-вакансий и стажировок"},
                {"value": "95%", "label": "Первый отклик за неделю"},
                {"value": "60s", "label": "От AI-резюме до отклика"},
            ],
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
        "stats": [
            {"value": "10K+", "label": "Talaba va bitiruvchi"},
            {"value": "500+", "label": "Junior vakansiya va internship"},
            {"value": "95%", "label": "Bir hafta ichida birinchi javob"},
            {"value": "60s", "label": "AI rezyumedan arizagacha"},
        ],
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
async def get_public_landing_content(
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
        return {"success": True, "data": {"locale": locale, "payload": payload, "is_published": True}}

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


@router.get("/admin/content")
async def get_admin_landing_content(
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
async def upsert_admin_landing_content(
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
async def delete_admin_landing_content(
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
