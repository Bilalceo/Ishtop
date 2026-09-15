"""Every application status must be countable on the student's list page.

The counters are built by passing `<status>_count=` kwargs into a Pydantic
model. A kwarg with no matching field is dropped without a word, so adding a
status to the enum and to the route is not enough — the model has to grow too.
That is how three statuses went missing: the page said "Jami 1" above six
zeroes while the card beside them read "Yopildi".

These tests fail on the whole class of mistake, not just the three that got us.
"""

from app.api.v1.routes.applications import ApplicationListData
from app.schemas.application import (
    ApplicationListResponse,
    ApplicationStatusEnum,
)

MODELS = [ApplicationListData, ApplicationListResponse]


def _fields(model):
    return set(model.model_fields)


def test_every_status_has_a_counter_field():
    for model in MODELS:
        missing = [
            f"{s.value}_count"
            for s in ApplicationStatusEnum
            if f"{s.value}_count" not in _fields(model)
        ]
        assert not missing, f"{model.__name__} cannot count: {missing}"


def test_counts_survive_the_round_trip():
    """The route's kwargs must come back out of model_dump()."""
    counts = {f"{s.value}_count": i + 1 for i, s in enumerate(ApplicationStatusEnum)}
    payload = ApplicationListData(
        applications=[], total=0, page=1, page_size=20, total_pages=0, **counts
    ).model_dump()
    for key, value in counts.items():
        assert payload.get(key) == value, f"{key} was dropped from the payload"


def test_the_counters_account_for_the_total():
    """No status may be uncounted: the tiles have to sum to "Jami"."""
    counts = {f"{s.value}_count": 1 for s in ApplicationStatusEnum}
    payload = ApplicationListData(
        applications=[],
        total=len(counts),
        page=1,
        page_size=20,
        total_pages=1,
        **counts,
    ).model_dump()
    summed = sum(v for k, v in payload.items() if k.endswith("_count"))
    assert summed == payload["total"]
