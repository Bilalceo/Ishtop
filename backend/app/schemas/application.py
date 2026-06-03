"""
=============================================================================
APPLICATION SCHEMAS
=============================================================================

Pydantic models for job application endpoints.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class ApplicationStatusEnum(str, Enum):
    """Application status options."""
    PENDING = "pending"
    REVIEWING = "reviewing"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    ACCEPTED = "accepted"
    HIRED = "hired"
    WITHDRAWN = "withdrawn"


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class ApplicationCreate(BaseModel):
    """Schema for submitting a job application."""
    
    job_id: str = Field(
        ...,
        description="ID of the job to apply for"
    )
    
    resume_id: Optional[str] = Field(
        None,
        description="ID of the resume to use"
    )
    
    cover_letter: Optional[str] = Field(
        None,
        max_length=10000,
        description="Cover letter text"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "resume_id": "550e8400-e29b-41d4-a716-446655440001",
                "cover_letter": "I am excited to apply for this position..."
            }
        }
    )


class ApplicationUpdate(BaseModel):
    """Schema for updating an application (by applicant)."""
    
    cover_letter: Optional[str] = Field(
        None,
        max_length=10000,
        description="Updated cover letter"
    )
    
    resume_id: Optional[str] = Field(
        None,
        description="Change resume used"
    )


class ApplicationStatusUpdate(BaseModel):
    """Schema for updating application status (by company)."""
    
    status: ApplicationStatusEnum = Field(
        ...,
        description="New application status"
    )
    
    notes: Optional[str] = Field(
        None,
        max_length=5000,
        description="Internal notes (not visible to applicant)"
    )
    
    interview_at: Optional[datetime] = Field(
        None,
        description="Interview date/time (for interview status)"
    )

    interview_type: Optional[str] = Field(
        None,
        max_length=50,
        description="Interview format (video, phone, in-person)"
    )

    meeting_link: Optional[str] = Field(
        None,
        max_length=2048,
        description="Meeting link for the interview (if applicable)"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "interview",
                "notes": "Strong candidate, schedule for technical interview",
                "interview_at": "2024-01-15T10:00:00Z",
                "interview_type": "video",
                "meeting_link": "https://meet.google.com/abc-defg-hij"
            }
        }
    )


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class JobSummary(BaseModel):
    """Brief job info in application response."""
    
    id: str
    title: str
    location: Optional[str] = None
    company_name: Optional[str] = None
    company_logo: Optional[str] = None


class ResumeSummary(BaseModel):
    """Brief resume info in application response."""
    
    id: str
    title: str
    ats_score: Optional[int] = None


class ApplicantSummary(BaseModel):
    """Brief applicant info (for company view)."""
    
    id: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    location: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Application in API responses."""
    
    id: str
    job_id: str
    user_id: str
    resume_id: Optional[str] = None
    status: str
    cover_letter: Optional[str] = None
    match_score: Optional[str] = None
    match_breakdown: Optional[Dict[str, Any]] = None
    
    # Timestamps
    applied_at: datetime
    reviewed_at: Optional[datetime] = None
    interview_at: Optional[datetime] = None
    interview_type: Optional[str] = None
    meeting_link: Optional[str] = None
    decided_at: Optional[datetime] = None
    
    # Computed
    days_since_applied: int = 0
    is_in_progress: bool = True
    
    # Related objects (optional)
    job: Optional[JobSummary] = None
    resume: Optional[ResumeSummary] = None
    applicant: Optional[ApplicantSummary] = None  # For company view
    
    # Internal notes (only for company)
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    message_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


class ApplicationListResponse(BaseModel):
    """Paginated list of applications."""
    
    applications: List[ApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    # Statistics
    pending_count: int = 0
    reviewing_count: int = 0
    interview_count: int = 0
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "applications": [],
                "total": 25,
                "page": 1,
                "page_size": 20,
                "total_pages": 2,
                "pending_count": 10,
                "reviewing_count": 8,
                "interview_count": 5
            }
        }
    )
