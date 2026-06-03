"""
=============================================================================
AUTHENTICATION SCHEMAS
=============================================================================

Pydantic models for authentication endpoints.

VALIDATION:
    - Email format validation
    - Password strength requirements
    - Phone number format
"""

import re
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict, AliasChoices
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class UserRoleEnum(str, Enum):
    """User roles for registration."""
    STUDENT = "student"
    COMPANY = "company"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class UserRegister(BaseModel):
    """
    Schema for user registration.
    
    Validates all required fields for creating a new account.
    """
    email: EmailStr = Field(
        ...,
        description="Valid email address",
        examples=["user@example.com"]
    )
    
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password (min 8, max 72 chars, must include uppercase, lowercase, digit)",
        examples=["StrongPass123!"]
    )
    
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="User's full name",
        examples=["John Doe"]
    )
    
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Phone number in international format",
        examples=["+998901234567"]
    )
    
    role: UserRoleEnum = Field(
        UserRoleEnum.STUDENT,
        description="Account type: student or company"
    )
    
    # Company-specific fields (required if role=company)
    company_name: Optional[str] = Field(
        None,
        max_length=255,
        description="Company name (required for company accounts)",
        examples=["Tech Corp Inc."]
    )
    
    company_website: Optional[str] = Field(
        None,
        max_length=500,
        description="Company website URL",
        examples=["https://techcorp.com"]
    )
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Validate password meets security requirements.
        
        Requirements:
        - At least 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        """
        errors = []
        
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r'[A-Z]', v):
            errors.append("at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("at least one digit")
        
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        if v is None:
            return v
        
        # Remove common separators
        cleaned = re.sub(r'[\s\-\(\)\.]', '', v)
        
        # Must be digits with optional + prefix
        if not re.match(r'^\+?[0-9]{7,15}$', cleaned):
            raise ValueError(
                "Invalid phone format. Use international format: +998901234567"
            )
        
        # Normalize: add + if missing
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        
        return cleaned
    
    @field_validator('company_name')
    @classmethod
    def validate_company_name(cls, v: Optional[str], info) -> Optional[str]:
        """Require company_name for company accounts."""
        role = info.data.get('role')
        if role == UserRoleEnum.COMPANY and not v:
            raise ValueError("Company name is required for company accounts")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john@example.com",
                "password": "StrongPass123!",
                "full_name": "John Doe",
                "phone": "+998901234567",
                "role": "student"
            }
        }
    )


class UserLogin(BaseModel):
    """Schema for user login."""
    
    email: EmailStr = Field(
        ...,
        description="Email address",
        examples=["user@example.com"]
    )
    
    password: str = Field(
        ...,
        description="Password",
        examples=["StrongPass123!"]
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john@example.com",
                "password": "StrongPass123!"
            }
        }
    )


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh."""
    
    refresh_token: Optional[str] = Field(
        default=None,
        description="Refresh token from login response"
    )


class LogoutRequest(BaseModel):
    """
    Optional logout payload.

    If refresh_token is provided, backend will blacklist it too.
    """
    refresh_token: Optional[str] = Field(
        default=None,
        description="Optional refresh token to revoke on logout"
    )


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password."""
    
    email: EmailStr = Field(
        ...,
        description="Email address to send reset link",
        examples=["user@example.com"]
    )


class ForgotPasswordResponse(BaseModel):
    """
    Response for forgot password requests.

    `debug_reset_url` is returned only in debug-like environments when
    outbound email delivery is disabled, so local/staging can complete
    the reset flow without SMTP/SendGrid.
    """

    message: str = Field(
        ...,
        description="Response message"
    )

    success: bool = Field(
        default=True,
        description="Operation success status"
    )

    debug_reset_url: Optional[str] = Field(
        default=None,
        description="Password reset URL for debug/testing only"
    )


class ResetPasswordRequest(BaseModel):
    """Schema for password reset."""
    
    token: str = Field(
        ...,
        description="Reset token from email"
    )
    
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="New password (min 8, max 72 chars)"
    )
    
    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate new password strength."""
        errors = []
        
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r'[A-Z]', v):
            errors.append("at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("at least one digit")
        
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        
        return v


class ChangePasswordRequest(BaseModel):
    """Schema for changing password (when logged in)."""
    
    current_password: str = Field(
        ...,
        validation_alias=AliasChoices("current_password", "old_password"),
        description="Current password"
    )
    
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="New password (min 8, max 72 chars)"
    )
    
    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate new password strength."""
        errors = []
        
        if not re.search(r'[A-Z]', v):
            errors.append("at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("at least one digit")
        
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        
        return v


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class UserResponse(BaseModel):
    """User data in API responses."""
    
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    admin_role: Optional[str] = None
    is_verified: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    company_cover_photo_url: Optional[str] = None
    company_gallery_images: List[str] = Field(default_factory=list)
    company_culture: Optional[str] = None
    company_linkedin_url: Optional[str] = None
    company_telegram_url: Optional[str] = None
    company_instagram_url: Optional[str] = None
    company_facebook_url: Optional[str] = None
    company_founded_year: Optional[int] = None
    company_video_url: Optional[str] = None
    verification_state: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Response with authentication tokens."""
    
    access_token: str = Field(
        ...,
        description="JWT access token for API requests"
    )
    
    refresh_token: str = Field(
        ...,
        description="JWT refresh token for getting new access tokens"
    )
    
    token_type: str = Field(
        default="bearer",
        description="Token type (always 'bearer')"
    )
    
    expires_in: int = Field(
        ...,
        description="Access token expiration time in seconds"
    )
    
    user: UserResponse = Field(
        ...,
        description="Authenticated user data"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800,
                "user": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "email": "john@example.com",
                    "full_name": "John Doe",
                    "role": "student",
                    "is_verified": True,
                    "created_at": "2024-01-01T00:00:00Z"
                }
            }
        }
    )


class MessageResponse(BaseModel):
    """Simple message response."""
    
    message: str = Field(
        ...,
        description="Response message"
    )
    
    success: bool = Field(
        default=True,
        description="Operation success status"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Operation completed successfully",
                "success": True
            }
        }
    )
