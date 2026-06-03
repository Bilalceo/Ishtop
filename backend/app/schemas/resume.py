"""
=============================================================================
RESUME SCHEMAS
=============================================================================

Pydantic models for resume endpoints and AI generation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class ResumeStatusEnum(str, Enum):
    """Resume status options."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ResumeToneEnum(str, Enum):
    """AI generation tone options."""
    PROFESSIONAL = "professional"
    CONFIDENT = "confident"
    ENTHUSIASTIC = "enthusiastic"
    CREATIVE = "creative"
    TECHNICAL = "technical"
    EXECUTIVE = "executive"
    ENTRY_LEVEL = "entry_level"


# =============================================================================
# CONTENT SCHEMAS (for JSONB structure)
# =============================================================================

class PersonalInfoSchema(BaseModel):
    """Personal information section."""
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    location: Optional[str] = None


class WorkExperienceSchema(BaseModel):
    """Single work experience entry."""
    job_title: str
    company_name: str
    location: Optional[str] = None
    start_date: str = Field(..., description="e.g., 'January 2020'")
    end_date: str = Field(..., description="e.g., 'Present' or 'December 2023'")
    is_current: bool = False
    responsibilities: List[str] = Field(default_factory=list)
    achievements: List[Dict[str, str]] = Field(default_factory=list)
    technologies_used: List[str] = Field(default_factory=list)


class EducationSchema(BaseModel):
    """Single education entry."""
    degree_type: str = Field(..., description="e.g., 'Bachelor of Science'")
    field_of_study: str
    institution_name: str
    location: Optional[str] = None
    graduation_date: str
    gpa: Optional[str] = None
    honors: List[str] = Field(default_factory=list)
    relevant_coursework: List[str] = Field(default_factory=list)


class SkillCategorySchema(BaseModel):
    """Skills category."""
    category: str = Field(..., description="e.g., 'Programming Languages'")
    skills: List[str]


class SkillsSchema(BaseModel):
    """Skills section."""
    technical_skills: List[SkillCategorySchema] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    tools_technologies: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)


class ProjectSchema(BaseModel):
    """Project entry."""
    project_name: str
    role: Optional[str] = None
    description: str
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None


class CertificationSchema(BaseModel):
    """Certification entry."""
    name: str
    issuing_organization: str
    issue_date: str
    expiration_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None


class ProfessionalSummarySchema(BaseModel):
    """Professional summary section."""
    text: str = Field(..., description="3-4 sentence summary")
    keywords: List[str] = Field(default_factory=list)


class ResumeContentSchema(BaseModel):
    """Complete resume content structure."""
    personal_info: Optional[PersonalInfoSchema] = None
    professional_summary: Optional[ProfessionalSummarySchema] = None
    work_experience: List[WorkExperienceSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)
    skills: Optional[SkillsSchema] = None
    projects: List[ProjectSchema] = Field(default_factory=list)
    certifications: List[CertificationSchema] = Field(default_factory=list)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "personal_info": {
                    "name": "John Doe",
                    "email": "john@example.com",
                    "phone": "+1-555-123-4567"
                },
                "professional_summary": {
                    "text": "Experienced software engineer with 5+ years...",
                    "keywords": ["Python", "AWS", "Leadership"]
                },
                "work_experience": [{
                    "job_title": "Senior Developer",
                    "company_name": "Tech Corp",
                    "start_date": "January 2020",
                    "end_date": "Present",
                    "is_current": True,
                    "responsibilities": ["Led team of 5 developers"]
                }],
                "skills": {
                    "technical_skills": [
                        {"category": "Languages", "skills": ["Python", "JavaScript"]}
                    ],
                    "soft_skills": ["Leadership", "Communication"]
                }
            }
        }
    )


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class ResumeCreate(BaseModel):
    """Schema for creating a resume."""
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Resume title",
        examples=["Software Engineer Resume 2024"]
    )
    
    content: Dict[str, Any] = Field(
        default_factory=dict,
        description="Resume content as structured JSON"
    )
    
    status: ResumeStatusEnum = Field(
        default=ResumeStatusEnum.DRAFT,
        description="Resume status"
    )


class ResumeUpdate(BaseModel):
    """Schema for updating a resume."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[Dict[str, Any]] = None
    status: Optional[ResumeStatusEnum] = None


class ResumeGenerateRequest(BaseModel):
    """Schema for AI resume generation."""
    
    job_title: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Target job title",
        examples=["Senior Software Engineer"]
    )
    
    years_experience: int = Field(
        ...,
        ge=0,
        le=50,
        description="Years of professional experience",
        examples=[5]
    )
    
    skills: List[str] = Field(
        ...,
        min_length=1,
        description="Key skills to highlight",
        examples=[["Python", "FastAPI", "PostgreSQL", "AWS"]]
    )
    
    education_level: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Highest education level",
        examples=["Master's Degree"]
    )
    
    field_of_study: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Field of study",
        examples=["Computer Science"]
    )
    
    industry: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Target industry",
        examples=["Technology"]
    )
    
    target_company: Optional[str] = Field(
        None,
        max_length=100,
        description="Specific company to tailor for",
        examples=["Google"]
    )
    
    job_description: Optional[str] = Field(
        None,
        description="Job description to optimize against"
    )
    
    tone: ResumeToneEnum = Field(
        default=ResumeToneEnum.PROFESSIONAL,
        description="Resume tone/style"
    )
    
    include_projects: bool = Field(
        default=False,
        description="Include projects section"
    )
    
    include_certifications: bool = Field(
        default=False,
        description="Include certifications section"
    )
    
    # User's existing data to incorporate
    user_data: Optional[Dict[str, Any]] = Field(
        None,
        description="User's existing data to incorporate"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_title": "Senior Software Engineer",
                "years_experience": 5,
                "skills": ["Python", "FastAPI", "PostgreSQL", "AWS"],
                "education_level": "Master's Degree",
                "field_of_study": "Computer Science",
                "industry": "Technology",
                "tone": "professional",
                "include_projects": True
            }
        }
    )


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class ResumeResponse(BaseModel):
    """Resume in API responses."""
    
    id: str
    user_id: str
    title: str
    content: Dict[str, Any]
    status: str
    ai_generated: bool
    ai_model_used: Optional[str] = None
    pdf_url: Optional[str] = None
    view_count: int
    ats_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ResumeListResponse(BaseModel):
    """Paginated list of resumes."""
    
    resumes: List[ResumeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ResumeGenerateResponse(BaseModel):
    """Response from AI resume generation."""
    
    success: bool
    resume: Optional[ResumeResponse] = None
    content: Optional[Dict[str, Any]] = None
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    message: Optional[str] = None
