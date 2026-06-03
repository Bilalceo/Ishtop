from __future__ import annotations

import pytest
from fastapi import status
from httpx import AsyncClient

from tests.fixtures.sample_data import get_valid_job_data


@pytest.mark.asyncio
async def test_company_can_submit_verification(async_client: AsyncClient, company_auth_headers: dict):
    response = await async_client.post(
        "/api/v1/jobs/company/verification/submit",
        headers=company_auth_headers,
        json={"notes": "Please verify our employer profile"},
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["success"] is True
    assert payload["verification_state"] == "pending"


@pytest.mark.asyncio
async def test_admin_can_review_company_verification(
    async_client: AsyncClient,
    company_auth_headers: dict,
    admin_headers: dict,
    test_company,
    test_db,
):
    submit_response = await async_client.post(
        "/api/v1/jobs/company/verification/submit",
        headers=company_auth_headers,
        json={"notes": "Review request"},
    )
    assert submit_response.status_code == status.HTTP_200_OK

    review_response = await async_client.post(
        f"/api/v1/admin/companies/{test_company.id}/verification/review",
        headers=admin_headers,
        json={"action": "approve", "notes": "Verified", "badges": ["verified_employer"]},
    )
    assert review_response.status_code == status.HTTP_200_OK
    reviewed = review_response.json()
    assert reviewed["verification_state"] == "approved"
    test_db.refresh(test_company)
    assert test_company.trust_badges == ["verified_employer"]

    reject_response = await async_client.post(
        f"/api/v1/admin/companies/{test_company.id}/verification/review",
        headers=admin_headers,
        json={"action": "reject", "notes": "Rejected"},
    )
    assert reject_response.status_code == status.HTTP_200_OK
    rejected = reject_response.json()
    assert rejected["verification_state"] == "rejected"
    test_db.refresh(test_company)
    assert test_company.trust_badges == []


@pytest.mark.asyncio
async def test_city_discovery_endpoint_returns_jobs(
    async_client: AsyncClient,
    company_auth_headers: dict,
):
    job_data = get_valid_job_data()
    job_data["title"] = "Backend Platform Engineer"
    job_data["location"] = "Tashkent, Uzbekistan"

    create = await async_client.post(
        "/api/v1/jobs",
        headers=company_auth_headers,
        json=job_data,
    )
    assert create.status_code == status.HTTP_201_CREATED
    created_payload = create.json()
    assert isinstance(created_payload["trust_score"], (int, float))
    assert isinstance(created_payload["trust_badges"], list)
    assert isinstance(created_payload["trust_factors"], list)
    assert created_payload["verification_state"] in {"unverified", "pending", "approved", "rejected"}

    discovery = await async_client.get("/api/v1/jobs/discovery/cities/Тошкент")
    assert discovery.status_code == status.HTTP_200_OK
    payload = discovery.json()
    assert isinstance(payload.get("jobs", []), list)
    assert any(job.get("city_slug") == "tashkent" for job in payload.get("jobs", []))


@pytest.mark.asyncio
async def test_discovery_filters_normalize_slugs_and_paginate_stably(
    async_client: AsyncClient,
    company_auth_headers: dict,
):
    job_data = get_valid_job_data()
    job_data["title"] = "Python dasturchi"
    job_data["location"] = "Toshkent, O'zbekiston"

    create = await async_client.post(
        "/api/v1/jobs",
        headers=company_auth_headers,
        json=job_data,
    )
    assert create.status_code == status.HTTP_201_CREATED

    filtered = await async_client.get(
        "/api/v1/jobs",
        params={
            "city_slug": "Тошкент",
            "profession_slug": "python-dasturchi",
            "page": 1,
            "page_size": 10,
        },
    )
    assert filtered.status_code == status.HTTP_200_OK
    filtered_payload = filtered.json()
    assert filtered_payload["total"] >= 1
    assert all(job["city_slug"] == "tashkent" for job in filtered_payload["jobs"])
    assert all(job["profession_slug"] == "python-developer" for job in filtered_payload["jobs"])

    company_discovery = await async_client.get("/api/v1/jobs/discovery/companies/test-company")
    assert company_discovery.status_code == status.HTTP_200_OK
    company_payload = company_discovery.json()
    assert company_payload["page"] == 1
    assert company_payload["page_size"] == 20
    assert company_payload["total_pages"] >= 1
