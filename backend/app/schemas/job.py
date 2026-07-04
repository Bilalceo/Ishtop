"""
=============================================================================
JOB SCHEMAS
=============================================================================

Pydantic models for job listing endpoints.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class JobTypeEnum(str, Enum):
    """Job type options."""
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    REMOTE = "remote"
    HYBRID = "hybrid"
    CONTRACT = "contract"
    INTERNSHIP = "internship"


class ExperienceLevelEnum(str, Enum):
    """Experience level options."""
    INTERN = "intern"
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    EXECUTIVE = "executive"


class JobStatusEnum(str, Enum):
    """Job status options."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    FILLED = "filled"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class JobCreate(BaseModel):
    """Schema for creating a job posting."""
    
    title: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Job title",
        examples=["Senior Software Engineer"]
    )
    
    description: str = Field(
        ...,
        min_length=50,
        description="Full job description",
        examples=["We are looking for an experienced software engineer..."]
    )
    
    requirements: List[str] = Field(
        default_factory=list,
        description="Job requirements",
        examples=[["5+ years Python experience", "AWS knowledge"]]
    )
    
    responsibilities: List[str] = Field(
        default_factory=list,
        description="Job responsibilities"
    )
    
    benefits: List[str] = Field(
        default_factory=list,
        description="Benefits and perks"
    )
    
    salary_min: Optional[int] = Field(
        None,
        ge=0,
        description="Minimum salary (whole units in selected currency)",
        examples=[8000]
    )
    
    salary_max: Optional[int] = Field(
        None,
        ge=0,
        description="Maximum salary (whole units in selected currency)",
        examples=[12000]
    )
    
    salary_currency: str = Field(
        default="UZS",
        max_length=3,
        description="Currency code"
    )
    
    is_salary_visible: bool = Field(
        default=True,
        description="Show salary to applicants"
    )
    
    location: Optional[str] = Field(
        None,
        max_length=255,
        description="Job location",
        examples=["San Francisco, CA"]
    )
    
    is_remote_allowed: bool = Field(
        default=False,
        description="Remote work allowed"
    )
    
    job_type: JobTypeEnum = Field(
        default=JobTypeEnum.FULL_TIME,
        description="Employment type"
    )
    
    experience_level: ExperienceLevelEnum = Field(
        default=ExperienceLevelEnum.MID,
        description="Required experience level"
    )
    
    external_apply_url: Optional[str] = Field(
        None,
        max_length=500,
        description="External application URL"
    )
    
    expires_at: Optional[datetime] = Field(
        None,
        description="Job posting expiration date"
    )
    
    @field_validator('salary_max')
    @classmethod
    def validate_salary_range(cls, v, info):
        """Ensure salary_max >= salary_min."""
        salary_min = info.data.get('salary_min')
        if v is not None and salary_min is not None and v < salary_min:
            raise ValueError("Maximum salary must be >= minimum salary")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Senior Software Engineer",
                "description": "We are looking for an experienced software engineer to join our team...",
                "requirements": ["5+ years Python", "AWS experience", "Leadership skills"],
                "responsibilities": ["Design and implement features", "Code reviews"],
                "benefits": ["Health insurance", "401k matching", "Remote work"],
                "salary_min": 8000000,
                "salary_max": 12000000,
                "salary_currency": "USD",
                "location": "San Francisco, CA",
                "is_remote_allowed": True,
                "job_type": "full_time",
                "experience_level": "senior"
            }
        }
    )


class JobUpdate(BaseModel):
    """Schema for updating a job posting."""
    
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, min_length=50)
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    salary_currency: Optional[str] = Field(None, max_length=3)
    is_salary_visible: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=255)
    is_remote_allowed: Optional[bool] = None
    job_type: Optional[JobTypeEnum] = None
    experience_level: Optional[ExperienceLevelEnum] = None
    status: Optional[JobStatusEnum] = None
    external_apply_url: Optional[str] = Field(None, max_length=500)
    expires_at: Optional[datetime] = None


class JobSearchParams(BaseModel):
    """Query parameters for job search."""
    
    query: Optional[str] = Field(
        None,
        description="Search query for title/description"
    )
    
    location: Optional[str] = Field(
        None,
        description="Filter by location"
    )
    
    job_type: Optional[JobTypeEnum] = Field(
        None,
        description="Filter by job type"
    )
    
    experience_level: Optional[ExperienceLevelEnum] = Field(
        None,
        description="Filter by experience level"
    )
    
    is_remote: Optional[bool] = Field(
        None,
        description="Filter for remote jobs only"
    )
    
    salary_min: Optional[int] = Field(
        None,
        description="Minimum salary filter"
    )
    
    company_id: Optional[str] = Field(
        None,
        description="Filter by company"
    )

    city_slug: Optional[str] = Field(
        None,
        description="Filter by normalized city slug"
    )

    profession_slug: Optional[str] = Field(
        None,
        description="Filter by normalized profession slug"
    )

    company_slug: Optional[str] = Field(
        None,
        description="Filter by normalized company slug"
    )
    
    sort_by: str = Field(
        default="created_at",
        description="Sort field"
    )
    
    sort_order: str = Field(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort order"
    )


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class CompanyInfo(BaseModel):
    """Company info in job response."""
    
    id: str
    name: str
    logo: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    cover_photo_url: Optional[str] = None
    gallery_images: List[str] = Field(default_factory=list)
    culture: Optional[str] = None
    linkedin_url: Optional[str] = None
    telegram_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    founded_year: Optional[int] = None
    video_url: Optional[str] = None
    verification_state: Optional[str] = None
    is_verified: bool = False


class JobResponse(BaseModel):
    """Job in API responses."""
    
    id: str
    company_id: str
    company: Optional[CompanyInfo] = None
    title: str
    description: str
    requirements: List[str]
    responsibilities: List[str]
    benefits: List[str]
    salary_range: Optional[str] = None  # Formatted display
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str
    is_salary_visible: bool
    location: Optional[str] = None
    city_slug: Optional[str] = None
    is_remote_allowed: bool
    job_type: str
    experience_level: str
    profession_slug: Optional[str] = None
    company_slug: Optional[str] = None
    status: str
    close_reason_code: Optional[str] = None
    close_reason_note: Optional[str] = None
    views_count: int
    applications_count: int
    trust_score: float = 0.0
    trust_badges: List[str] = Field(default_factory=list)
    trust_factors: List[Dict[str, Any]] = Field(default_factory=list)
    verification_state: Optional[str] = None
    is_featured: bool
    external_apply_url: Optional[str] = None
    contact_info: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Computed fields
    is_active: bool = True
    is_expired: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class JobListResponse(BaseModel):
    """Paginated list of jobs."""
    
    jobs: List[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "jobs": [],
                "total": 50,
                "page": 1,
                "page_size": 20,
                "total_pages": 3
            }
        }
    )
