"""Integration tests for funnel event persistence and admin KPI readout."""

import pytest
from fastapi import status
from httpx import AsyncClient

from app.models import FunnelEvent


@pytest.mark.asyncio
async def test_funnel_event_rejects_anonymous_requests(
    async_client: AsyncClient,
    test_db,
    test_job,
):
    response = await async_client.post(
        "/api/v1/jobs/events",
        json={
            "event_name": "view_job",
            "job_id": str(test_job.id),
            "source": "integration-test",
            "metadata": {"test_event": True},
        },
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert test_db.query(FunnelEvent).count() == 0


@pytest.mark.asyncio
async def test_funnel_event_write_and_admin_kpi_read(
    async_client: AsyncClient,
    test_db,
    test_job,
    student_headers: dict,
    admin_headers: dict,
):
    events = [
        "search",
        "view_job",
        "view_explainability",
        "apply_after_explainability",
        "interview_scheduled",
    ]

    for event_name in events:
        response = await async_client.post(
            "/api/v1/jobs/events",
            headers=student_headers,
            json={
                "event_name": event_name,
                "job_id": str(test_job.id),
                "source": "integration-test",
                "metadata": {"test_event": True},
            },
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"success": True, "message": "Event captured"}

    persisted = test_db.query(FunnelEvent).order_by(FunnelEvent.created_at.asc()).all()
    assert [event.event_name for event in persisted] == events
    assert persisted[0].job_id == test_job.id
    assert persisted[0].actor_role == "student"
    assert persisted[0].source == "integration-test"
    assert persisted[0].event_metadata == {"test_event": True}

    response = await async_client.get(
        "/api/v1/admin/kpi/funnel",
        headers=admin_headers,
        params={"days": 7},
    )
    assert response.status_code == status.HTTP_200_OK

    payload = response.json()
    assert payload["success"] is True
    assert payload["days"] == 7
    assert payload["totals"] == {event_name: 1 for event_name in events}
    assert payload["conversions"] == {
        "search_to_view_job": 1.0,
        "view_job_to_view_explainability": 1.0,
        "view_explainability_to_apply_after_explainability": 1.0,
        "apply_after_explainability_to_interview_scheduled": 1.0,
    }
    assert len(payload["daily"]) == 7
    assert any(
        day["counts"] == {event_name: 1 for event_name in events}
        for day in payload["daily"]
    )


@pytest.mark.asyncio
async def test_funnel_kpi_requires_admin_permission(
    async_client: AsyncClient,
    student_headers: dict,
):
    response = await async_client.get(
        "/api/v1/admin/kpi/funnel",
        headers=student_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
