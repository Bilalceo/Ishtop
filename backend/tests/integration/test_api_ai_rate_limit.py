"""
=============================================================================
AI ENDPOINT AUTH + RATE-LIMIT REGRESSION TESTS (R1)
=============================================================================

Structural assertions on the FastAPI app's dependency tree. These tests do
not call the LLM and are not flaky — they verify that the rate-limit and
auth dependencies stay wired to every expensive AI endpoint, so a future
edit cannot silently re-open the cost-abuse surface.
"""

from typing import List

import pytest
from fastapi.routing import APIRoute

from app.main import app


# Every AI endpoint that is expensive enough to need rate-limiting.
# `/usage` is cheap but moved out of "public" — covered in the auth set below.
# `/health` is intentionally excluded — it is hit by infra health checks.
AI_RATE_LIMITED_PATHS = {
    "/api/v1/ai/help-assistant",
    "/api/v1/ai/generate-resume",
    "/api/v1/ai/analyze-resume",
    "/api/v1/ai/generate-cover-letter",
    "/api/v1/ai/match-job",
    "/api/v1/ai/hr/job-description",
    "/api/v1/ai/hr/applications/{application_id}/summary",
    "/api/v1/ai/hr/applications/{application_id}/questions",
    "/api/v1/ai/hr/applications/{application_id}/email",
    "/api/v1/ai/hr/applications/{application_id}/email/send",
}

# Endpoints that used to be anonymous and must now require an authenticated
# user (student or company). `/usage` is included because it leaked AI
# provider / model / key-presence metadata to any caller.
AI_AUTH_REQUIRED_PATHS = {
    "/api/v1/ai/generate-resume",
    "/api/v1/ai/analyze-resume",
    "/api/v1/ai/generate-cover-letter",
    "/api/v1/ai/match-job",
    "/api/v1/ai/usage",
    # /help-assistant already required auth; we re-assert to lock it in.
    "/api/v1/ai/help-assistant",
}

_AUTH_DEP_NAMES = {"get_current_active_user", "get_current_company"}


def _flat_dep_names(route: APIRoute) -> List[str]:
    """Return the qualname of every callable in the route's dependency tree."""
    names: List[str] = []
    stack = list(route.dependant.dependencies)
    while stack:
        dep = stack.pop()
        call = dep.call
        if call is not None:
            names.append(
                getattr(call, "__qualname__", "") or getattr(call, "__name__", "")
            )
        stack.extend(dep.dependencies)
    return names


def _route(path: str) -> APIRoute:
    for r in app.routes:
        if isinstance(r, APIRoute) and r.path == path:
            return r
    raise AssertionError(f"route not registered: {path}")


@pytest.mark.parametrize("path", sorted(AI_RATE_LIMITED_PATHS))
def test_ai_endpoint_has_rate_limit_dependency(path: str) -> None:
    """rate_limit(...) factory returns rate_limit_dependency — assert it's wired."""
    deps = _flat_dep_names(_route(path))
    assert any("rate_limit_dependency" in name for name in deps), (
        f"{path} is missing Depends(rate_limit(...)). Found deps: {deps}"
    )


@pytest.mark.parametrize("path", sorted(AI_AUTH_REQUIRED_PATHS))
def test_ai_endpoint_requires_authenticated_user(path: str) -> None:
    """Previously-public AI endpoints must now have an auth dependency."""
    deps = _flat_dep_names(_route(path))
    assert any(
        any(auth_name in name for auth_name in _AUTH_DEP_NAMES) for name in deps
    ), (
        f"{path} has no auth dependency (get_current_active_user / "
        f"get_current_company). Found deps: {deps}"
    )
