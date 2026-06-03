"""
=============================================================================
USER SCHEMAS
=============================================================================

Pydantic models for user profile endpoints.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    """Schema for creating a user (admin only)."""
    
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    role: str = "student"
    is_active: bool = True
    is_verified: bool = False


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=500)
    
    # Company-specific
    company_name: Optional[str] = Field(None, max_length=255)
    company_website: Optional[str] = Field(None, max_length=500)
    company_cover_photo_url: Optional[str] = Field(None, max_length=500)
    company_gallery_images: Optional[List[str]] = None
    company_culture: Optional[str] = Field(None, max_length=4000)
    company_linkedin_url: Optional[str] = Field(None, max_length=500)
    company_telegram_url: Optional[str] = Field(None, max_length=500)
    company_instagram_url: Optional[str] = Field(None, max_length=500)
    company_facebook_url: Optional[str] = Field(None, max_length=500)
    company_founded_year: Optional[int] = Field(None, ge=1700, le=2200)
    company_video_url: Optional[str] = Field(None, max_length=500)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "John Doe",
                "bio": "Software engineer passionate about AI",
                "location": "San Francisco, CA"
            }
        }
    )


class UserProfileResponse(BaseModel):
    """Detailed user profile response."""
    
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    admin_role: Optional[str] = None
    is_verified: bool
    is_active: bool
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
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    # Statistics
    resume_count: int = 0
    application_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated list of users."""
    
    users: List[UserProfileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "users": [],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "total_pages": 5
            }
        }
    )
