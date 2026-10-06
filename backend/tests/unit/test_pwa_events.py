"""The install banner's telemetry: anonymous in, admin out, nothing else."""

import pytest

from app.models import FunnelEvent

EV = "/api/v1/pwa/event"


def test_anonymous_visitor_can_report_the_banner(client, test_db):
    """Almost everyone who meets the banner is logged out, so this must work
    without a token — the authenticated events endpoint would record none."""
    r = client.post(EV, json={"event": "pwa_prompt_shown", "platform": "ios", "browser": "safari"})
    assert r.status_code == 202, r.text

    row = test_db.query(FunnelEvent).one()
    assert row.event_name == "pwa_prompt_shown"
    assert row.actor_user_id is None
    assert row.source == "pwa"
    assert row.event_metadata == {"platform": "ios", "browser": "safari"}


def test_an_unknown_event_name_is_refused(client, test_db):
    r = client.post(EV, json={"event": "drop_table", "platform": "ios", "browser": "safari"})
    assert r.status_code == 422
    assert test_db.query(FunnelEvent).count() == 0


def test_platform_and_browser_are_closed_sets(client, test_db):
    """An open endpoint must not let a caller choose what lands in the row."""
    r = client.post(EV, json={"event": "pwa_dismissed",
                              "platform": "<script>", "browser": "'; drop"})
    assert r.status_code == 202
    assert test_db.query(FunnelEvent).one().event_metadata == {
        "platform": "other", "browser": "other"}


def test_events_are_rate_limited_per_ip(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)

    body = {"event": "pwa_prompt_shown", "platform": "android", "browser": "chrome"}
    for _ in range(40):
        assert client.post(EV, json=body).status_code == 202
    assert client.post(EV, json=body).status_code == 429


def test_stats_are_admin_only_and_split_by_platform(client, test_db, student_headers,
                                                    super_admin_token):
    for plat, ev in (("ios", "pwa_prompt_shown"), ("ios", "pwa_dismissed"),
                     ("android", "pwa_prompt_shown"), ("android", "pwa_installed")):
        client.post(EV, json={"event": ev, "platform": plat, "browser": "other"})

    assert client.get("/api/v1/pwa/stats").status_code in (401, 403)
    assert client.get("/api/v1/pwa/stats", headers=student_headers).status_code == 403

    d = client.get("/api/v1/pwa/stats",
                   headers={"Authorization": f"Bearer {super_admin_token}"}).json()["data"]
    by_plat = {p["platform"]: p for p in d["platforms"]}
    assert by_plat["ios"]["shown"] == 1 and by_plat["ios"]["dismissed"] == 1
    # iOS can never install through the page, so its rate stays zero by design
    assert by_plat["ios"]["install_rate"] == 0.0
    assert by_plat["android"]["installed"] == 1
    assert by_plat["android"]["install_rate"] == 100.0
