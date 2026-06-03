"""
=============================================================================
PYDANTIC SCHEMAS PACKAGE
=============================================================================

Contains all Pydantic models for request/response validation.

NAMING CONVENTIONS:
    - *Create: For POST requests (creating new resources)
    - *Update: For PUT/PATCH requests (updating resources)
    - *Response: For API responses
    - *InDB: For internal database representation

WHY PYDANTIC?
    - Automatic validation
    - Type checking
    - JSON serialization
    - OpenAPI documentation
"""

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UserResponse,
    MessageResponse,
)

from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserProfileResponse,
    UserListResponse,
)

from app.schemas.resume import (
    ResumeCreate,
    ResumeUpdate,
    ResumeResponse,
    ResumeListResponse,
    ResumeGenerateRequest,
    ResumeContentSchema,
)

from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
    JobSearchParams,
)

from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse,
    ApplicationListResponse,
    ApplicationStatusUpdate,
)

__all__ = [
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "TokenRefreshRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "ChangePasswordRequest",
    "UserResponse",
    "MessageResponse",
    # User
    "UserCreate",
    "UserUpdate",
    "UserProfileResponse",
    "UserListResponse",
    # Resume
    "ResumeCreate",
    "ResumeUpdate",
    "ResumeResponse",
    "ResumeListResponse",
    "ResumeGenerateRequest",
    "ResumeContentSchema",
    # Job
    "JobCreate",
    "JobUpdate",
    "JobResponse",
    "JobListResponse",
    "JobSearchParams",
    # Application
    "ApplicationCreate",
    "ApplicationUpdate",
    "ApplicationResponse",
    "ApplicationListResponse",
    "ApplicationStatusUpdate",
]
