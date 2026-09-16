"""The plan limits the UI sells must be the ones this code enforces.

The product was advertised in four places with three different sets of
numbers. The frontend now derives all of its copy from src/lib/plans.ts, whose
figures are mirrored from here; src/__tests__/lib/plans.test.ts pins the same
values on that side. These tests fail if the enforced numbers move, so the two
cannot drift apart in silence.

They also record what is NOT enforced. FEATURE_LIMITS declares limits for AI
resume generation and for monthly applications, but nothing calls
get_feature_limit() for either, so the UI must not advertise them as limits
until something does.
"""

import inspect

from app.core.premium import (
    FEATURE_LIMITS,
    SubscriptionTier,
    get_feature_limit,
)


def test_the_tier_names_are_the_three_the_database_stores():
    assert SubscriptionTier.FREE == "free"
    assert SubscriptionTier.PREMIUM == "premium"
    assert SubscriptionTier.ENTERPRISE == "enterprise"


def test_auto_apply_quota_matches_the_advertised_numbers():
    assert FEATURE_LIMITS["auto_apply"] == {
        "free": 0,
        "premium": 50,
        "enterprise": None,
    }
    assert get_feature_limit("auto_apply", "free") == 0
    assert get_feature_limit("auto_apply", "premium") == 50
    assert get_feature_limit("auto_apply", "enterprise") is None


def test_the_auto_apply_window_is_a_month():
    """The UI says "oyiga 50 ta". If this window became a day or a week, the
    copy would be wrong everywhere at once."""
    from app.api.v1.routes import applications

    source = inspect.getsource(applications.auto_apply)
    assert "_get_month_start()" in source, "auto-apply no longer counts by month"
    assert 'get_feature_limit("auto_apply"' in source

    month_start = inspect.getsource(applications._get_month_start)
    assert "day=1" in month_start


def test_an_unknown_tier_gets_nothing():
    assert get_feature_limit("auto_apply", "pro") == 0
    assert get_feature_limit("auto_apply", "team") == 0


def test_limits_that_nothing_enforces_are_not_advertised():
    """A guard against re-advertising "5 ta ariza/oy" and "1 ta AI rezyume".

    Both are declared in FEATURE_LIMITS but no caller reads them. If that
    changes, this test should be updated and the UI copy allowed to state them.
    """
    from pathlib import Path

    app_dir = Path(__file__).resolve().parents[2] / "app"
    callers = [
        path
        for path in app_dir.rglob("*.py")
        if path.name != "premium.py" and "get_feature_limit(" in path.read_text()
    ]
    enforced = set()
    for path in callers:
        text = path.read_text()
        for feature in FEATURE_LIMITS:
            if f'get_feature_limit("{feature}"' in text:
                enforced.add(feature)

    assert enforced == {"auto_apply"}, (
        f"enforcement changed: {enforced}. Update src/lib/plans.ts and its test "
        "so the pricing pages may state the newly enforced limits."
    )
