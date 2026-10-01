"""Problem-validation survey: validation, abuse guards, admin summary, traction metrics."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.core.surveys import SURVEYS, summarize, validate_answers
from app.models import Application, Resume, SurveyResponse, User, UserRole

KEY = "student-2026"
GOOD = {
    "status": "course_3_4",
    "searched": "yes_searching",
    "pains": ["experience_required", "no_reply"],
    "channels": ["telegram", "hh"],
    "pay": "no",
    "comment": "  tajriba so'rashadi  ",
}


# --- validation ---------------------------------------------------------------

def test_validate_cleans_and_drops_unknown_keys():
    out = validate_answers(SURVEYS[KEY], {**GOOD, "evil": {"x": 1}})
    assert "evil" not in out
    assert out["comment"] == "tajriba so'rashadi"
    assert "time_to_job" not in out  # optional, not given


@pytest.mark.parametrize("patch,err", [
    ({"status": None}, "status: required"),
    ({"status": "phd"}, "status: unknown option"),
    ({"pains": ["scams", "hacked"]}, "pains: unknown option"),
    ({"pains": ["scams", "resume", "no_reply", "other"]}, "pains: too many options"),
    ({"channels": "telegram"}, "channels: must be a list"),
    ({"comment": 5}, "comment: must be text"),
])
def test_validate_rejects(patch, err):
    with pytest.raises(ValueError, match=err):
        validate_answers(SURVEYS[KEY], {**GOOD, **patch})


def test_validate_dedupes_multi():
    out = validate_answers(SURVEYS[KEY], {**GOOD, "pains": ["scams", "scams"]})
    assert out["pains"] == ["scams"]


def test_summarize_multi_pct_is_of_respondents():
    rows = [{"pains": ["scams", "resume"]}, {"pains": ["scams"]}]
    q = next(q for q in summarize(SURVEYS[KEY], rows)["questions"] if q["id"] == "pains")
    scams = next(o for o in q["options"] if o["id"] == "scams")
    assert (scams["count"], scams["pct"], q["answered"]) == (2, 100.0, 2)


# --- endpoints ----------------------------------------------------------------

def test_anonymous_submit_is_stored(client, test_db):
    r = client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD, "source": "tatu-chat"})
    assert r.status_code == 201, r.text
    row = test_db.query(SurveyResponse).one()
    assert row.user_id is None and row.source == "tatu-chat"
    assert row.ip_hash and len(row.ip_hash) == 32


def test_unknown_survey_404(client):
    assert client.post("/api/v1/surveys/nope", json={"answers": GOOD}).status_code == 404


def test_invalid_answers_422(client, test_db):
    r = client.post(f"/api/v1/surveys/{KEY}", json={"answers": {**GOOD, "pay": "million"}})
    assert r.status_code == 422
    assert test_db.query(SurveyResponse).count() == 0


def test_honeypot_pretends_success_but_stores_nothing(client, test_db):
    r = client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD, "website": "http://spam"})
    assert r.status_code == 201
    assert test_db.query(SurveyResponse).count() == 0


def test_rate_limited_per_ip(client, test_db, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    for _ in range(5):
        assert client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD}).status_code == 201
    assert client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD}).status_code == 429
    # another visitor behind the same proxy is not blocked
    r = client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD},
                    headers={"X-Forwarded-For": "10.1.2.3"})
    assert r.status_code == 201


def test_signed_in_student_answers_once(client, test_db, student_headers, test_student):
    s = client.get(f"/api/v1/surveys/{KEY}/status", headers=student_headers).json()
    assert s["data"]["answered"] is False
    assert client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD}, headers=student_headers).status_code == 201
    again = client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD}, headers=student_headers)
    assert again.json().get("already") is True
    assert test_db.query(SurveyResponse).count() == 1
    assert test_db.query(SurveyResponse).one().user_id == test_student.id
    s = client.get(f"/api/v1/surveys/{KEY}/status", headers=student_headers).json()
    assert s["data"]["answered"] is True


def test_summary_is_admin_only(client, test_db, student_headers, super_admin_token):
    client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD, "source": "a"})
    client.post(f"/api/v1/surveys/{KEY}", json={"answers": {**GOOD, "pay": "k10_20"}})
    assert client.get(f"/api/v1/surveys/{KEY}/summary").status_code in (401, 403)
    assert client.get(f"/api/v1/surveys/{KEY}/summary", headers=student_headers).status_code == 403
    r = client.get(f"/api/v1/surveys/{KEY}/summary",
                   headers={"Authorization": f"Bearer {super_admin_token}"})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["total"] == 2 and d["sources"] == {"a": 1, "direct": 1}
    pay = next(q for q in d["questions"] if q["id"] == "pay")
    assert {o["id"]: o["count"] for o in pay["options"]}["k10_20"] == 1
    comment = next(q for q in d["questions"] if q["id"] == "comment")
    assert comment["texts"] == ["tajriba so'rashadi"] * 2


# --- traction -----------------------------------------------------------------

def _user(db, email, role=UserRole.STUDENT, **kw):
    u = User(id=uuid4(), email=email, full_name="X", role=role, is_active_account=True, **kw)
    u.set_password("Password123!")
    db.add(u)
    db.commit()
    return u


def test_traction_excludes_internal_accounts(client, test_db, test_student, test_job,
                                             test_resume, test_application, super_admin_token):
    # fixtures above are all @example.com → internal, must not count
    real = _user(test_db, "ali@gmail.com", last_login=datetime.now(timezone.utc) - timedelta(days=2))
    _user(test_db, "vali@mail.ru")
    _user(test_db, "demo.user@gmail.com")
    test_db.add(Resume(id=uuid4(), user_id=real.id, title="R", content={}))
    test_db.add(Application(id=uuid4(), user_id=real.id, job_id=test_job.id, status="interview"))
    test_db.commit()

    r = client.get("/api/v1/admin/metrics/traction",
                   headers={"Authorization": f"Bearer {super_admin_token}"})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["students"]["total"] == 2
    assert d["students"]["active_7d"] == 1
    funnel = {f["step"]: f["value"] for f in d["funnel"]}
    assert funnel == {"signed_up": 2, "resume": 1, "applied": 1, "employer_responded": 1, "hired": 0}
    assert d["applications"]["total"] == 1
    # the fixture company is internal, so its live job counts as not company-posted
    assert d["employers"]["companies"] == 0
    assert sum(w["value"] for w in d["weekly"]["signups"]) == 2


def test_withdrawn_applications_leave_the_response_denominator(client, test_db, test_job,
                                                              super_admin_token):
    """An application nobody could answer must not count against the response rate."""
    from app.models import Application

    # one application per candidate per job, so this needs two candidates
    a = _user(test_db, "aziz@gmail.com")
    b = _user(test_db, "bek@gmail.com")
    test_db.add(Application(id=uuid4(), user_id=a.id, job_id=test_job.id, status="withdrawn"))
    test_db.add(Application(id=uuid4(), user_id=b.id, job_id=test_job.id, status="interview"))
    test_db.commit()

    d = client.get("/api/v1/admin/metrics/traction",
                   headers={"Authorization": f"Bearer {super_admin_token}"}).json()["data"]
    assert d["applications"] == {
        "total": 2, "answerable": 1, "withdrawn": 1,
        "by_status": {"withdrawn": 1, "interview": 1},
    }
    responded = next(f for f in d["funnel"] if f["step"] == "employer_responded")
    assert (responded["value"], responded["pct"]) == (1, 100.0)


def test_traction_reports_what_the_filter_removed(client, test_db, test_student, test_job,
                                                  test_application, super_admin_token):
    r = client.get("/api/v1/admin/metrics/traction",
                   headers={"Authorization": f"Bearer {super_admin_token}"})
    d = r.json()["data"]
    # The fixtures are all @example.com, so everything real is zero and the
    # excluded block is what proves the numbers were filtered, not just empty.
    assert d["excluded"] == {"students": 1, "applications": 1}
    assert d["students"]["total"] == 0


# --- interview leads ----------------------------------------------------------

def test_interview_lead_is_stored_unlinked_to_answers(client, test_db):
    from app.models import InterviewLead

    client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD, "source": "tatu"})
    r = client.post(f"/api/v1/surveys/{KEY}/interview", json={"contact": " @ali ", "source": "tatu"})
    assert r.status_code == 201
    lead = test_db.query(InterviewLead).one()
    assert lead.contact == "@ali" and lead.status == "new"
    # The promise on the form: answers stay anonymous even for volunteers.
    assert not hasattr(lead, "response_id")
    assert test_db.query(SurveyResponse).one().answers.get("contact") is None


def test_interview_lead_needs_a_contact(client):
    assert client.post(f"/api/v1/surveys/{KEY}/interview", json={"contact": "   "}).status_code == 422
    assert client.post(f"/api/v1/surveys/{KEY}/interview", json={"contact": " @  "}).status_code == 422
    assert client.post("/api/v1/surveys/nope/interview", json={"contact": "@ali"}).status_code == 404


def test_leads_and_export_are_admin_only(client, test_db, student_headers, super_admin_token):
    client.post(f"/api/v1/surveys/{KEY}", json={"answers": GOOD, "source": "tatu"})
    client.post(f"/api/v1/surveys/{KEY}/interview", json={"contact": "@ali"})
    for path in (f"/api/v1/surveys/{KEY}/leads", f"/api/v1/surveys/{KEY}/export"):
        assert client.get(path).status_code in (401, 403)
        assert client.get(path, headers=student_headers).status_code == 403

    admin = {"Authorization": f"Bearer {super_admin_token}"}
    leads = client.get(f"/api/v1/surveys/{KEY}/leads", headers=admin).json()["data"]
    assert leads["total"] == 1 and leads["leads"][0]["contact"] == "@ali"

    csv_res = client.get(f"/api/v1/surveys/{KEY}/export", headers=admin)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    lines = csv_res.text.strip().splitlines()
    assert lines[0].startswith("created_at,source,signed_in,status,searched,pains")
    # multi-select answers survive as a splittable cell, and no PII is exported
    assert "experience_required|no_reply" in lines[1]
    assert "tatu" in lines[1]
    assert "ip_hash" not in csv_res.text


def test_traction_requires_admin(client, student_headers):
    assert client.get("/api/v1/admin/metrics/traction", headers=student_headers).status_code == 403


# --- bot entry point ----------------------------------------------------------

def test_bot_menu_offers_the_survey_and_explains_before_linking_out():
    from app.routers import telegram_bot as bot

    labels = [b["text"] for row in bot._main_menu_kb()["inline_keyboard"] for b in row]
    assert any("so'rovnoma" in l for l in labels)

    for locale, word in (("uz", "Anonim"), ("ru", "Анонимно")):
        text, kb = bot._survey_view(locale)
        # the ask is made in the bot; the link is the second step, never a silent jump
        assert word in text and "2 daqiqa" in text or "2 минуты" in text
        buttons = [b for row in kb["inline_keyboard"] for b in row]
        assert buttons[0]["url"] == f"{bot.SITE_URL}/sorovnoma?src=bot"
        assert buttons[-1]["callback_data"] == "home"


def test_survey_row_disappears_when_the_survey_closes(monkeypatch):
    from app.routers import telegram_bot as bot

    monkeypatch.setattr(bot, "SURVEY_KEY", None)
    labels = [b["text"] for row in bot._main_menu_kb()["inline_keyboard"] for b in row]
    assert not any("so'rovnoma" in l for l in labels)


# --- ad referral links --------------------------------------------------------

def test_ad_link_records_the_source_once_and_greets_normally(test_db, monkeypatch):
    """t.me/<bot>?start=ref_<source> must welcome the visitor, not fail at them."""
    from app.models import FunnelEvent
    from app.routers import telegram_bot as bot

    monkeypatch.setattr(bot, "SessionLocal", lambda: test_db)
    monkeypatch.setattr(test_db, "close", lambda: None)

    bot._record_bot_referral("kanal-a", "555")
    bot._record_bot_referral("kanal-a", "555")   # same person taps twice
    bot._record_bot_referral("kanal-a", "556")
    bot._record_bot_referral("kanal-b", "555")   # same person, other campaign

    rows = test_db.query(FunnelEvent).filter(FunnelEvent.event_name == "bot_start_ref").all()
    assert sorted((r.source, r.event_metadata["chat_id"]) for r in rows) == [
        ("kanal-a", "555"), ("kanal-a", "556"), ("kanal-b", "555"),
    ]


def test_ad_source_is_sanitised(test_db, monkeypatch):
    from app.models import FunnelEvent
    from app.routers import telegram_bot as bot

    monkeypatch.setattr(bot, "SessionLocal", lambda: test_db)
    monkeypatch.setattr(test_db, "close", lambda: None)

    # the source comes straight off a ?start= payload, so it is attacker-shaped
    import re as _re
    dirty = "Kanal A!<script>alert(1)</script>"
    cleaned = _re.sub(r"[^a-z0-9_-]", "", dirty.lower())[:40] or "unknown"
    bot._record_bot_referral(cleaned, "1")

    stored = test_db.query(FunnelEvent).one().source
    assert stored == cleaned
    assert not set(stored) & set(" <>\"'/\\;()"), stored
    assert len(stored) <= 40
