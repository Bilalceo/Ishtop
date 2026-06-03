"""
=============================================================================
Services Package
=============================================================================

Services contain the business logic of the application.
They are called by routers (API endpoints) to perform operations.

ARCHITECTURE:
    Router (API endpoint) → Service (Business Logic) → Database/External APIs

This separation makes code:
- Easier to test (test services independently)
- More maintainable (changes in one place)
- Reusable (same service can be used by multiple routes)
"""

from app.services.ai_service import AIService
from app.services.resume_service import ResumeService

__all__ = ["AIService", "ResumeService"]
