from __future__ import annotations

from types import SimpleNamespace

from app.services.discovery import (
    slugify_text,
    city_slug_from_location,
    profession_slug_from_title,
    company_slug_from_name,
    normalize_discovery_slug,
)
from app.services.job_matching import score_resume_against_job


def test_slug_normalization_handles_uz_ru_en_shapes() -> None:
    assert slugify_text("Senior Python Developer") == "senior-python-developer"
    assert city_slug_from_location("Tashkent, Uzbekistan") == "tashkent"
    assert city_slug_from_location("Toshkent, O'zbekiston") == "tashkent"
    assert normalize_discovery_slug("Тошкент", kind="city") == "tashkent"
    assert profession_slug_from_title("QA / Automation Engineer") == "qa-automation-engineer"
    assert profession_slug_from_title("Python dasturchi") == "python-developer"
    assert normalize_discovery_slug("Бэкенд разработчик", kind="profession") == "backend-developer"
    assert company_slug_from_name("ООО Test Company") == "ooo-test-company"


def test_score_resume_against_job_includes_explainability() -> None:
    resume = {
        "skills": ["Python", "FastAPI"],
        "summary": "Backend engineer with API experience",
        "experience": [{"position": "Python Developer"}],
    }
    job = SimpleNamespace(
        title="Backend Python Engineer",
        requirements={"skills": ["Python", "FastAPI", "PostgreSQL"]},
        experience_level="mid",
        is_remote_allowed=True,
        job_type="remote",
    )

    breakdown = score_resume_against_job(resume, job)

    assert "explainability" in breakdown
    assert isinstance(breakdown["explainability"]["fit_reasons"], list)
    assert isinstance(breakdown["explainability"]["missing_items"], list)
    assert "improvement_plan" in breakdown["explainability"]
    assert set(breakdown["explainability"]["improvement_plan"].keys()) == {"d7", "d14", "d30"}
