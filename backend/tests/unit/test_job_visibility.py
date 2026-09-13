"""When a listing is visible to the public.

This rule broke twice in one day, in opposite directions:

  * `expires_at` was written on every listing and checked nowhere, so 48 active
    listings whose date had passed a week earlier were still being served;
  * the fix compared `> now()`, but the company form posts midnight UTC of the
    deadline DAY — so a job whose deadline is today became invisible the moment
    it was published, and every other one lost its final day.

Both are cheap to assert and expensive to miss, so they are asserted here
against the real SQLAlchemy expression rather than a paraphrase of it.
"""
from __future__ import annotations

from datetime import timedelta

import pytest

sqlalchemy = pytest.importorskip("sqlalchemy")


def _sql(expr) -> str:
    from sqlalchemy.dialects import postgresql

    return str(expr.compile(dialect=postgresql.dialect(),
                            compile_kwargs={"literal_binds": False}))


class TestVisibleJobFilters:
    @pytest.fixture(scope="class")
    def filters(self):
        from app.models.job import visible_job_filters

        return visible_job_filters()

    def test_requires_active_and_not_deleted(self, filters):
        sql = " ".join(_sql(f) for f in filters)
        assert "is_deleted" in sql
        assert "status" in sql

    def test_carries_the_deadline_to_the_end_of_its_day(self, filters):
        # Not `expires_at > now()`: the form stores midnight UTC of the deadline
        # day, so a strict comparison hides the day the employer meant to offer.
        sql = " ".join(_sql(f) for f in filters)
        assert "interval" in sql.lower()
        assert "expires_at" in sql

    def test_a_listing_without_a_deadline_stays_visible(self, filters):
        sql = " ".join(_sql(f) for f in filters).lower()
        assert "is null" in sql


class TestJobExpiry:
    """`publish()` must not hand back an active-but-invisible listing."""

    @pytest.fixture
    def job(self):
        from app.models.base import utc_now
        from app.models.job import Job

        j = Job()
        j.expires_at = utc_now() - timedelta(days=5)
        j.status = "closed"
        return j

    def test_an_elapsed_deadline_is_expired(self, job):
        assert job.is_expired

    def test_publishing_carries_an_elapsed_deadline_forward(self, job):
        job.publish()
        assert job.status == "active"
        # Otherwise reopening returns 200 with status=active and the listing
        # appears in no list at all, with nothing telling the employer why.
        assert not job.is_expired

    def test_publishing_leaves_a_future_deadline_alone(self):
        from app.models.base import utc_now
        from app.models.job import Job

        j = Job()
        when = utc_now() + timedelta(days=3)
        j.expires_at = when
        j.publish()
        assert j.expires_at == when

    def test_no_deadline_is_never_expired(self):
        from app.models.job import Job

        j = Job()
        j.expires_at = None
        assert not j.is_expired
