"""The landing fallback must not be able to reintroduce what we removed.

Three invented reviews signed by named people at EPAM, Uzum and TBC Bank, a
"Kompaniyalar IshTop orqali yollaydi" marquee of real companies, and headline
figures of 10K+ students and 500+ verified companies were all live. They are
gone from the components, but they could return two other ways: through the
CMS defaults that are served when no record is published, or through a stored
admin payload. These tests close the first, and pin that stats can never come
from a payload at all.
"""

import re

from app.api.v1.routes.landing import default_payload, live_stats

REAL_COMPANIES = [
    "EPAM", "Uzum", "TBC Bank", "Click", "Payme", "Beeline",
    "Humans", "Korzinka", "MyTaxi", "Anorbank", "Kapital",
]


def _all_text(value) -> str:
    """Every string anywhere in the payload."""
    if isinstance(value, str):
        return value + " "
    if isinstance(value, dict):
        return "".join(_all_text(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return "".join(_all_text(v) for v in value)
    return ""


class TestDefaults:
    def test_no_testimonials_ship_in_the_fallback(self):
        for locale in ("uz", "ru"):
            assert default_payload(locale)["testimonials"] == []

    def test_no_pricing_ships_in_the_fallback(self):
        # Plans are served from src/lib/plans.ts, checked against the one
        # quota the backend enforces. A second copy here could contradict it.
        for locale in ("uz", "ru"):
            assert default_payload(locale)["pricing"] == []

    def test_no_real_company_is_named(self):
        for locale in ("uz", "ru"):
            text = _all_text(default_payload(locale))
            named = [c for c in REAL_COMPANIES if c in text]
            assert not named, f"{locale} names {named}"

    def test_the_fallback_carries_no_headline_number(self):
        """Stats come from live_stats(); the fallback must not seed any."""
        for locale in ("uz", "ru"):
            assert default_payload(locale)["stats"] == []

    def test_no_unevidenced_figure_anywhere_in_the_fallback(self):
        # 10K+, 500+, 50K+, 95%, 98%, and seconds promises all lived here.
        banned = re.compile(r"\d+\s*[KK]\+|\d{3,}\+|\d+\s*%|\d+\s*(сек|soniya)", re.I)
        for locale in ("uz", "ru"):
            hit = banned.search(_all_text(default_payload(locale)))
            assert hit is None, f"{locale} still claims {hit.group(0)!r}"


class TestLiveStats:
    def test_every_figure_carries_a_definition(self, monkeypatch):
        class FakeQuery:
            def filter(self, *a, **k):
                return self
            def scalar(self):
                return 7

        class FakeDB:
            def query(self, *a, **k):
                return FakeQuery()

        for locale in ("uz", "ru"):
            stats = live_stats(FakeDB(), locale)
            assert stats, locale
            for item in stats:
                assert item["value"], item
                assert item["label"], item
                # A number without a stated source is the thing we removed.
                assert item.get("note"), f"{item['label']} has no definition"

    def test_counts_are_rounded_down_never_up(self, monkeypatch):
        class FakeQuery:
            def __init__(self, n):
                self.n = n
            def filter(self, *a, **k):
                return self
            def scalar(self):
                return self.n

        class FakeDB:
            def __init__(self, n):
                self.n = n
            def query(self, *a, **k):
                return FakeQuery(self.n)

        # 268 must never be advertised as 300.
        values = [s["value"] for s in live_stats(FakeDB(268), "uz")]
        assert "260+" in values
        assert not any("300" in v for v in values)

    def test_no_seconds_promise_remains(self):
        class FakeQuery:
            def filter(self, *a, **k):
                return self
            def scalar(self):
                return 100

        class FakeDB:
            def query(self, *a, **k):
                return FakeQuery()

        # Nothing persists generation time — processing_time_seconds is logged
        # per request and never stored — so no sample can back a figure.
        for locale in ("uz", "ru"):
            text = _all_text(live_stats(FakeDB(), locale))
            assert not re.search(r"\d+\s*(сек|soniya|s\b)", text, re.I), text
