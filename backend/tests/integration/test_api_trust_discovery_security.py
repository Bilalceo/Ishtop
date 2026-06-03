from __future__ import annotations

import pytest
from fastapi import status
from httpx import AsyncClient

from tests.fixtures.sample_data import get_valid_job_data


@pytest.mark.asyncio
async def test_admin_cannot_submit_company_verification(
    async_client: AsyncClient,
    admin_headers: dict,
):
    response = await async_client.post(
        "/api/v1/jobs/company/verification/submit",
        headers=admin_headers,
        json={"notes": "Admin should not submit as a company"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_company_discovery_out_of_range_page_returns_empty_jobs(
    async_client: AsyncClient,
    company_auth_headers: dict,
):
    job_data = get_valid_job_data()
    job_data["title"] = "Discovery Pagination Engineer"
    job_data["location"] = "Tashkent, Uzbekistan"

    create = await async_client.post(
        "/api/v1/jobs",
        headers=company_auth_headers,
        json=job_data,
    )
    assert create.status_code == status.HTTP_201_CREATED

    response = await async_client.get(
        "/api/v1/jobs/discovery/companies/test-company",
        params={"page": 2, "limit": 1},
    )

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["jobs"] == []
    assert payload["total"] == 1
    assert payload["page"] == 2
    assert payload["page_size"] == 1
    assert payload["total_pages"] == 1
    assert payload["company"]["slug"] == "test-company"


@pytest.mark.asyncio
async def test_company_discovery_unknown_company_still_returns_404(
    async_client: AsyncClient,
):
    response = await async_client.get(
        "/api/v1/jobs/discovery/companies/not-a-real-company",
        params={"page": 99, "limit": 1},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
