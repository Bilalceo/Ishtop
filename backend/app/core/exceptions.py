"""
=============================================================================
CUSTOM EXCEPTIONS
=============================================================================

Custom exception classes for the IshTop application.
"""

from typing import Any, Dict, Optional


class BaseAppException(Exception):
    """Base exception for application errors."""
    
    def __init__(
        self,
        message: str = "An error occurred",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(BaseAppException):
    """Raised when data validation fails."""
    
    def __init__(
        self,
        message: str = "Validation error",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=422,
            details=details
        )


class NotFoundError(BaseAppException):
    """Raised when a resource is not found."""
    
    def __init__(
        self,
        resource: str = "Resource",
        resource_id: Optional[str] = None
    ):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with ID '{resource_id}' not found"
        
        super().__init__(
            message=message,
            status_code=404,
            details={"resource": resource, "id": resource_id}
        )


class AuthenticationError(BaseAppException):
    """Raised when authentication fails."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=401,
            details=details
        )


class AuthorizationError(BaseAppException):
    """Raised when user lacks permission."""
    
    def __init__(
        self,
        message: str = "You don't have permission to perform this action",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=403,
            details=details
        )


class ConflictError(BaseAppException):
    """Raised when there's a conflict (e.g., duplicate resource)."""
    
    def __init__(
        self,
        message: str = "Resource already exists",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=409,
            details=details
        )


class ExternalAPIError(BaseAppException):
    """Raised when an external API call fails."""
    
    def __init__(
        self,
        service: str = "External service",
        message: str = "External API call failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"{service}: {message}",
            status_code=502,
            details={"service": service, **(details or {})}
        )


class RateLimitError(BaseAppException):
    """Raised when rate limit is exceeded."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded. Please try again later.",
        retry_after: Optional[int] = None
    ):
        super().__init__(
            message=message,
            status_code=429,
            details={"retry_after": retry_after} if retry_after else {}
        )


class FileProcessingError(BaseAppException):
    """Raised when file processing fails."""
    
    def __init__(
        self,
        message: str = "Failed to process file",
        filename: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=400,
            details={"filename": filename, **(details or {})}
        )


class DatabaseError(BaseAppException):
    """Raised when a database operation fails."""
    
    def __init__(
        self,
        message: str = "Database operation failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=500,
            details=details
        )
















