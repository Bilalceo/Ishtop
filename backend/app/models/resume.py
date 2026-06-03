"""
=============================================================================
RESUME MODEL
=============================================================================

PURPOSE:
    Stores user resumes with flexible JSONB content structure.
    Supports AI-generated resumes, PDF storage, and status workflow.

=============================================================================
WHY JSONB FOR RESUME CONTENT?
=============================================================================

JSONB (Binary JSON) is PostgreSQL's powerful JSON storage format.
We use it for resume content instead of multiple normalized tables because:

1. SCHEMA FLEXIBILITY:
   - Resume formats vary wildly between industries
   - Users might have projects, certifications, awards, publications, etc.
   - No need to create tables for every possible section
   - Structure can evolve without database migrations
   
   Example: A developer's resume might have:
   {"skills": {"languages": ["Python"], "frameworks": ["FastAPI"]}}
   
   A designer's resume might have:
   {"skills": {"tools": ["Figma", "Sketch"], "techniques": ["UI/UX"]}}

2. QUERYABLE:
   - PostgreSQL can index JSONB with GIN indexes
   - Can query inside JSON: WHERE content->>'skill' = 'Python'
   - Can search arrays: WHERE content->'skills' ? 'Python'
   - Much faster than document databases for this use case

3. PERFORMANCE:
   - JSONB is stored in binary format (not text)
   - Compressed automatically
   - Faster to parse than JSON text
   - Native PostgreSQL type (no serialization overhead)

4. ATOMIC OPERATIONS:
   - Can update specific JSON paths without replacing entire document
   - jsonb_set(content, '{skills,0}', '"JavaScript"')

TRADE-OFFS:
   - Less strict schema validation (done at application level)
   - Can't use foreign keys inside JSON
   - Size limits (~255 MB, but effectively ~10 MB for performance)

=============================================================================
JSONB CONTENT SCHEMA
=============================================================================

Expected structure (validated at application level):

{
    "personal_info": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1-555-123-4567",
        "linkedin": "linkedin.com/in/johndoe",
        "github": "github.com/johndoe",
        "portfolio": "johndoe.dev"
    },
    "professional_summary": {
        "text": "Experienced software engineer with 5+ years...",
        "keywords": ["Python", "FastAPI", "PostgreSQL"]
    },
    "work_experience": [
        {
            "job_title": "Senior Developer",
            "company_name": "Tech Corp",
            "location": "San Francisco, CA",
            "start_date": "2020-01",
            "end_date": "present",
            "is_current": true,
            "responsibilities": ["Led team of 5...", "Built microservices..."],
            "achievements": [
                {"description": "Reduced latency", "metric": "by 40%"}
            ],
            "technologies_used": ["Python", "AWS"]
        }
    ],
    "education": [
        {
            "degree_type": "Bachelor of Science",
            "field_of_study": "Computer Science",
            "institution_name": "MIT",
            "graduation_date": "2018-05",
            "gpa": "3.8"
        }
    ],
    "skills": {
        "technical_skills": [
            {"category": "Languages", "skills": ["Python", "JavaScript"]}
        ],
        "soft_skills": ["Leadership", "Communication"]
    },
    "projects": [...],
    "certifications": [...]
}

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

from enum import Enum
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, TYPE_CHECKING

# SQLAlchemy imports
from sqlalchemy import (
    Column, String, Boolean, Integer, Text, ForeignKey, Index
)
from app.models.types import GUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship, validates

# Local imports
from app.models.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin, utc_now

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.application import Application


# =============================================================================
# RESUME STATUS ENUM
# =============================================================================

class ResumeStatus(str, Enum):
    """
    Resume workflow states.
    
    WORKFLOW:
        DRAFT → PUBLISHED → ARCHIVED
        
    WHY THESE STATES?
        - DRAFT: User is still editing, not ready to use
        - PUBLISHED: Complete and ready for job applications
        - ARCHIVED: Old version, kept for history
        
    RULES:
        - Only PUBLISHED resumes can be used in applications
        - Users can have multiple resumes in different states
        - ARCHIVED resumes can be restored to DRAFT
    """
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# =============================================================================
# RESUME MODEL
# =============================================================================

class Resume(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    Resume model with JSONB content storage.
    
    ==========================================================================
    INDEX STRATEGY
    ==========================================================================
    
    1. idx_resumes_user_id:
       - For: "Get all resumes for a user"
       - Query: SELECT * FROM resumes WHERE user_id = ?
       - Type: B-tree (default)
    
    2. idx_resumes_status:
       - For: "Get all published resumes"
       - Query: SELECT * FROM resumes WHERE status = 'published'
       - Type: B-tree
    
    3. idx_resumes_user_status:
       - For: "Get published resumes for a user"
       - Query: SELECT * FROM resumes WHERE user_id = ? AND status = ?
       - Type: Composite B-tree
       - WHY? Common query pattern, composite is faster than two separate
    
    4. idx_resumes_content:
       - For: "Find resumes with specific skills"
       - Query: SELECT * FROM resumes WHERE content @> '{"skills": ["Python"]}'
       - Type: GIN (Generalized Inverted Index)
       - WHY GIN? Optimized for "contains" queries on JSONB
    
    5. idx_resumes_not_deleted:
       - For: Filtering active (non-deleted) resumes
       - Query: SELECT * FROM resumes WHERE is_deleted = false
       - Type: B-tree
    """
    
    __tablename__ = "resumes"
    
    # =========================================================================
    # TABLE CONFIGURATION
    # =========================================================================
    
    __table_args__ = (
        # Standard B-tree indexes
        Index('idx_resumes_user_id', 'user_id'),
        Index('idx_resumes_status', 'status'),
        Index('idx_resumes_user_status', 'user_id', 'status'),
        Index('idx_resumes_not_deleted', 'is_deleted'),
        
        # NOTE: GIN index for JSON content searching is PostgreSQL-specific
        # For SQLite, we rely on raw_text column for full-text search
        
        {'comment': 'User resumes with JSON content (flexible schema)'}
    )
    
    # =========================================================================
    # COLUMNS
    # =========================================================================
    
    # Foreign key to user
    user_id = Column(
        GUID(),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="User who owns this resume (CASCADE: delete user → delete resumes)"
    )
    
    # Resume title for identification
    title = Column(
        String(255),
        nullable=False,
        default="My Resume",
        comment="Display title (e.g., 'Software Engineer Resume 2024')"
    )
    
    # =========================================================================
    # JSONB CONTENT
    # =========================================================================
    
    # The actual resume content stored as JSONB
    # See docstring above for expected schema
    content = Column(
        JSON,
        nullable=False,
        default=dict,
        comment="Resume content as JSON (see schema in docstring)"
    )
    
    # Raw text version for full-text search
    # WHY separate from content?
    #   - JSONB isn't great for full-text search
    #   - This is a denormalized field for search performance
    #   - Updated whenever content changes
    raw_text = Column(
        Text,
        nullable=True,
        comment="Plain text version for full-text search (denormalized)"
    )
    
    # =========================================================================
    # AI TRACKING
    # =========================================================================
    
    ai_generated = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="True if AI generated this resume"
    )
    
    ai_model_used = Column(
        String(100),
        nullable=True,
        comment="Which AI model was used (e.g., 'gpt-4-turbo-preview')"
    )
    
    # =========================================================================
    # FILE STORAGE
    # =========================================================================
    
    pdf_url = Column(
        String(500),
        nullable=True,
        comment="URL to generated PDF (e.g., S3 presigned URL)"
    )
    
    # =========================================================================
    # STATUS AND ANALYTICS
    # =========================================================================
    
    status = Column(
        String(20),
        nullable=False,
        default=ResumeStatus.DRAFT.value,
        index=True,
        comment="Resume status: draft, published, archived"
    )
    
    view_count = Column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of times resume was viewed"
    )
    
    # ATS (Applicant Tracking System) compatibility score
    ats_score = Column(
        Integer,
        nullable=True,
        comment="ATS compatibility score (0-100, from AI analysis)"
    )
    
    # =========================================================================
    # RELATIONSHIPS
    # =========================================================================
    
    # Many-to-one: Resume belongs to User
    user: "User" = relationship(
        "User",
        back_populates="resumes",
        lazy="joined"  # Always load user with resume
    )
    
    # One-to-many: Resume can be used in many applications
    # WHY no cascade delete?
    #   - Don't delete applications if resume is deleted
    #   - Application history is important for both parties
    applications = relationship(
        "Application",
        back_populates="resume",
        lazy="dynamic"
    )
    
    # =========================================================================
    # VALIDATORS
    # =========================================================================
    
    @validates('status')
    def validate_status(self, key: str, status: str) -> str:
        """Ensure status is a valid enum value."""
        valid_statuses = [s.value for s in ResumeStatus]
        if status not in valid_statuses:
            raise ValueError(
                f"Invalid status '{status}'. "
                f"Valid options: {', '.join(valid_statuses)}"
            )
        return status
    
    @validates('content')
    def validate_content(self, key: str, content: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure content is a dictionary."""
        if content is None:
            return {}
        if not isinstance(content, dict):
            raise ValueError("Content must be a dictionary/JSON object")
        return content
    
    @validates('ats_score')
    def validate_ats_score(self, key: str, score: Optional[int]) -> Optional[int]:
        """Ensure ATS score is between 0 and 100."""
        if score is not None and not (0 <= score <= 100):
            raise ValueError("ATS score must be between 0 and 100")
        return score
    
    # =========================================================================
    # STATUS METHODS
    # =========================================================================
    
    def publish(self) -> None:
        """Mark resume as published (ready for applications)."""
        self.status = ResumeStatus.PUBLISHED.value
    
    def archive(self) -> None:
        """Archive this resume."""
        self.status = ResumeStatus.ARCHIVED.value
    
    def set_as_draft(self) -> None:
        """Return to draft status for editing."""
        self.status = ResumeStatus.DRAFT.value
    
    @property
    def is_published(self) -> bool:
        """Check if resume is published."""
        return self.status == ResumeStatus.PUBLISHED.value
    
    @property
    def is_draft(self) -> bool:
        """Check if resume is a draft."""
        return self.status == ResumeStatus.DRAFT.value
    
    @property
    def is_archived(self) -> bool:
        """Check if resume is archived."""
        return self.status == ResumeStatus.ARCHIVED.value
    
    @property
    def can_be_used_for_application(self) -> bool:
        """Can this resume be used for job applications?"""
        return self.is_published and not self.is_deleted
    
    # =========================================================================
    # ANALYTICS METHODS
    # =========================================================================
    
    def increment_view_count(self) -> None:
        """Increment the view counter."""
        self.view_count = (self.view_count or 0) + 1
    
    # =========================================================================
    # CONTENT ACCESSORS
    # =========================================================================
    
    def get_skills(self) -> List[str]:
        """Extract all skills from content."""
        skills_data = self.content.get("skills", {})
        
        if isinstance(skills_data, list):
            return skills_data
        
        if isinstance(skills_data, dict):
            all_skills = []
            # Collect from technical_skills
            for category in skills_data.get("technical_skills", []):
                if isinstance(category, dict):
                    all_skills.extend(category.get("skills", []))
            # Collect soft skills
            all_skills.extend(skills_data.get("soft_skills", []))
            return all_skills
        
        return []
    
    def get_summary(self) -> Optional[str]:
        """Get professional summary text."""
        summary = self.content.get("professional_summary", {})
        if isinstance(summary, dict):
            return summary.get("text")
        return summary if isinstance(summary, str) else None
    
    def get_experience_years(self) -> int:
        """Estimate years of experience from work history."""
        work = self.content.get("work_experience", [])
        if not work:
            return 0
        # Rough estimate: count number of positions
        return len(work)
    
    # =========================================================================
    # SERIALIZATION
    # =========================================================================
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<Resume("
            f"id={self.id}, "
            f"title='{self.title}', "
            f"status='{self.status}', "
            f"ai_generated={self.ai_generated}"
            f")>"
        )
    
    def to_dict(self, include_content: bool = True) -> Dict[str, Any]:
        """
        Convert to dictionary for JSON serialization.
        
        Args:
            include_content: Include full JSONB content (can be large)
        """
        data = {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "title": self.title,
            "status": self.status,
            "ai_generated": self.ai_generated,
            "ai_model_used": self.ai_model_used,
            "pdf_url": self.pdf_url,
            "view_count": self.view_count,
            "ats_score": self.ats_score,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_content:
            data["content"] = self.content
        
        return data
