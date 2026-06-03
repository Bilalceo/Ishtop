"""
Backward-compatible settings import.

Legacy tests import `app.core.config.settings`; actual settings live in
`app.config`.
"""

from app.config import settings

__all__ = ["settings"]
