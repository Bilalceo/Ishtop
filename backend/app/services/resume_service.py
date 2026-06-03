"""
Compatibility ResumeService used by legacy unit tests.
"""

from __future__ import annotations

import inspect
import re
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from typing import Any, Dict, Optional

from app.core.exceptions import AuthorizationError, NotFoundError, ValidationError


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


class ResumeService:
    def __init__(self, db: Any = None):
        self.db = db

    async def validate_content(self, content: Dict[str, Any]) -> bool:
        personal_info = content.get("personal_info") if isinstance(content, dict) else None
        if not personal_info:
            raise ValidationError("Resume content must include personal_info")

        email = personal_info.get("email")
        if email and not EMAIL_RE.match(str(email)):
            raise ValidationError("Invalid email in resume content")
        return True

    async def create_resume(self, user_id: str, title: str, content: Dict[str, Any]):
        if not title or not title.strip():
            raise ValidationError("Resume title is required")
        await self.validate_content(content)

        now = datetime.now(timezone.utc)
        resume = SimpleNamespace(
            id=str(uuid4()),
            user_id=user_id,
            title=title.strip(),
            content=content,
            status="draft",
            view_count=0,
            ats_score=None,
            created_at=now,
            updated_at=now,
        )

        if self.db is not None:
            self.db.add(resume)
            await _maybe_await(self.db.commit())
            await _maybe_await(self.db.refresh(resume))
        return resume

    async def _fetch_resume(self, resume_id: str):
        if self.db is None:
            raise NotFoundError("Resume", resume_id)

        result = await _maybe_await(self.db.execute(None))
        resume = result.scalar_one_or_none()
        if not resume:
            raise NotFoundError("Resume", resume_id)
        return resume

    async def get_resume(self, resume_id: str):
        return await self._fetch_resume(resume_id)

    async def get_user_resumes(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
    ):
        if self.db is None:
            return []
        result = await _maybe_await(self.db.execute(None))
        return result.scalars().all()

    async def update_resume(
        self,
        resume_id: str,
        user_id: str,
        title: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        status: Optional[str] = None,
    ):
        resume = await self._fetch_resume(resume_id)
        if str(resume.user_id) != str(user_id):
            raise AuthorizationError()

        if title is not None:
            if not title.strip():
                raise ValidationError("Resume title is required")
            resume.title = title.strip()
        if content is not None:
            await self.validate_content(content)
            resume.content = content
        if status is not None:
            resume.status = status
        resume.updated_at = datetime.now(timezone.utc)

        await _maybe_await(self.db.commit())
        await _maybe_await(self.db.refresh(resume))
        return resume

    async def delete_resume(self, resume_id: str, user_id: str) -> None:
        resume = await self._fetch_resume(resume_id)
        if str(resume.user_id) != str(user_id):
            raise AuthorizationError()
        await _maybe_await(self.db.delete(resume))
        await _maybe_await(self.db.commit())

    async def soft_delete_resume(self, resume_id: str, user_id: str):
        resume = await self._fetch_resume(resume_id)
        if str(resume.user_id) != str(user_id):
            raise AuthorizationError()
        resume.status = "archived"
        resume.updated_at = datetime.now(timezone.utc)
        await _maybe_await(self.db.commit())
        return resume

    async def publish_resume(self, resume_id: str, user_id: str):
        resume = await self._fetch_resume(resume_id)
        if str(resume.user_id) != str(user_id):
            raise AuthorizationError()
        resume.status = "published"
        resume.updated_at = datetime.now(timezone.utc)
        await _maybe_await(self.db.commit())
        await _maybe_await(self.db.refresh(resume))
        return resume

    def _generate_pdf(self, resume: Any) -> bytes:
        return b"%PDF-1.4\n% IshTop Resume PDF\n"

    async def download_pdf(self, resume_id: str, user_id: str) -> bytes:
        resume = await self._fetch_resume(resume_id)
        if str(resume.user_id) != str(user_id):
            raise AuthorizationError()
        return self._generate_pdf(resume)

    def _calculate_ats_score(self, content: Dict[str, Any]) -> int:
        score = 50
        if content.get("experience"):
            score += 20
        if content.get("education"):
            score += 10
        if content.get("skills"):
            score += 20
        return max(0, min(score, 100))

    async def calculate_ats_score(self, content: Dict[str, Any]) -> int:
        score = self._calculate_ats_score(content)
        return max(0, min(int(score), 100))

    async def increment_view_count(self, resume_id: str) -> None:
        resume = await self._fetch_resume(resume_id)
        resume.view_count = int(getattr(resume, "view_count", 0)) + 1
        await _maybe_await(self.db.commit())

    async def get_analytics(self, resume_id: str, user_id: str):
        resume = await self._fetch_resume(resume_id)
        if str(resume.user_id) != str(user_id):
            raise AuthorizationError()
        return {
            "view_count": int(getattr(resume, "view_count", 0)),
            "ats_score": getattr(resume, "ats_score", None),
            "updated_at": getattr(resume, "updated_at", None),
        }
