"""
=============================================================================
CORE MODULE
=============================================================================

Contains core application components:
- security.py: JWT tokens, password hashing
- config.py: Application settings
- dependencies.py: FastAPI dependency injection
"""

from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_password_hash,
    verify_password,
    TokenType,
)
from app.core.dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_current_admin,
    get_current_super_admin,
    require_admin_permission,
    get_current_company,
)

__all__ = [
    # Security
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "get_password_hash",
    "verify_password",
    "TokenType",
    # Dependencies
    "get_db",
    "get_current_user",
    "get_current_active_user",
    "get_current_admin",
    "get_current_super_admin",
    "require_admin_permission",
    "get_current_company",
]
























