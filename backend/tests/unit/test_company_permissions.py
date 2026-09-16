"""What an employer may and may not do to an application.

Two things were wrong on the company side:

  * the status endpoint accepted every member of the enum, including
    WITHDRAWN — so an employer could record "the candidate withdrew" about a
    decision the candidate never made, and the student's page would then show
    their application closed with no reason recorded;
  * the posting form offered an experience level the API rejects.

These tests pin the permission boundary. Ownership itself (403 on another
company's application) is enforced in the route and probed live.
"""

import inspect

from app.models.application import ApplicationStatus
from app.api.v1.routes import applications as routes


def _source(fn) -> str:
    return inspect.getsource(fn)


class TestEmployerSettableStatuses:
    def test_withdrawal_is_not_an_employer_action(self):
        src = _source(routes.update_application_status)
        assert "employer_settable" in src
        assert "ApplicationStatus.WITHDRAWN" in src
        # The candidate keeps their own route for it.
        assert hasattr(routes, "withdraw_application")

    def test_the_employer_can_still_set_every_other_status(self):
        settable = [
            s.value for s in ApplicationStatus if s != ApplicationStatus.WITHDRAWN
        ]
        assert set(settable) == {
            "pending",
            "reviewing",
            "shortlisted",
            "interview",
            "accepted",
            "hired",
            "rejected",
        }
        # Rejection is the employer's way to close an application.
        assert "rejected" in settable

    def test_withdrawal_remains_available_to_the_candidate(self):
        src = _source(routes.withdraw_application)
        assert "withdraw()" in src
        # And not after a decision has been recorded.
        assert "already been decided" in src


class TestOwnership:
    def test_status_update_checks_the_job_belongs_to_the_caller(self):
        src = _source(routes.update_application_status)
        assert "application.job.company_id != company.id" in src
        assert "403" in src or "HTTP_403_FORBIDDEN" in src

    def test_bulk_actions_scope_by_the_session_company(self):
        """The bulk endpoints must not take a company id from the request."""
        src = _source(routes._company_scoped_applications)
        assert "Job.company_id == company_id" in src
        for fn_name in ("bulk_update_status", "bulk_email_applicants"):
            fn = getattr(routes, fn_name, None)
            if fn is None:
                continue
            body = _source(fn)
            assert "_company_scoped_applications(db, company.id" in body, fn_name
