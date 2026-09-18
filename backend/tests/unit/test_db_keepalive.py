"""The API must keep the database from being slept by the platform.

Railway stops a service after roughly ten idle minutes. Setting
`sleepApplication: false` works for this API service — confirmed in its logs,
which show it alive across an idle window — but is not honoured for the
Postgres service: on 2026-09-18, with the flag false and after a full
redeploy, Postgres restarted at 13:46 and 13:57 UTC, and one of those
restarts came back running crash recovery ("database system was not properly
shut down"). A student arriving after a quiet spell got a 503.

So the API, which no longer sleeps, pings the database often enough that it
never idles. These tests pin the properties that make that safe.
"""

import inspect

from app.config import settings
from app import main as app_main


class TestInterval:
    def test_the_interval_is_well_inside_the_sleep_window(self):
        """Railway's window is about ten minutes; stay well under it."""
        assert 0 < settings.DB_KEEPALIVE_SECONDS <= 300

    def test_the_interval_can_be_turned_off(self):
        """Anywhere the database is not slept, this should be switchable off."""
        src = inspect.getsource(app_main.lifespan)
        assert "settings.DB_KEEPALIVE_SECONDS > 0" in src

    def test_a_floor_stops_a_misconfiguration_hammering_the_database(self):
        src = inspect.getsource(app_main.lifespan)
        assert "max(60, int(settings.DB_KEEPALIVE_SECONDS))" in src


class TestLoop:
    def test_the_ping_is_the_cheapest_possible_query(self):
        src = inspect.getsource(app_main.lifespan)
        block = src.split("_db_keepalive_loop")[1]
        assert 'text("SELECT 1")' in block

    def test_a_failed_ping_is_never_fatal(self):
        """A failed ping must leave the API running: the worst case is the
        next request paying the wake-up cost, which is today's behaviour."""
        src = inspect.getsource(app_main.lifespan)
        block = src.split("_db_keepalive_loop")[1].split("# Check database")[0]
        assert "logger.warning" in block
        assert "raise" in block  # CancelledError is still propagated
        assert "asyncio.CancelledError" in block

    def test_every_session_is_closed(self):
        src = inspect.getsource(app_main.lifespan)
        block = src.split("_db_keepalive_loop")[1].split("# Check database")[0]
        assert "finally:" in block
        assert "db.close()" in block

    def test_it_waits_before_the_first_ping(self):
        """Startup already checks the connection; pinging immediately would
        duplicate that on every boot."""
        src = inspect.getsource(app_main.lifespan)
        block = src.split("_db_keepalive_loop")[1]
        sleep_pos = block.index("await asyncio.sleep(interval)")
        select_pos = block.index('text("SELECT 1")')
        assert sleep_pos < select_pos


class TestShutdown:
    def test_the_task_is_cancelled_on_shutdown(self):
        src = inspect.getsource(app_main.lifespan)
        assert "for task in (digest_task, db_keepalive_task):" in src
