"""
=============================================================================
APPLICATION MODEL
=============================================================================

PURPOSE:
    Represents job applications submitted by users.
    Tracks the entire application lifecycle from submission to decision.

=============================================================================
UNIQUE CONSTRAINT EXPLAINED
=============================================================================

CONSTRAINT: unique_user_job_application(user_id, job_id)

WHY?
    A user should only be able to apply to a job ONCE.
    
    Without this constraint:
    - Users could spam applications
    - Confusion about which application to review
    - Analytics would be skewed
    - Bad user experience ("Did I already apply?")

HOW IT WORKS:
    PostgreSQL will reject any INSERT that violates:
    INSERT INTO applications (user_id, job_id, ...) VALUES (uuid1, uuid2, ...)
    -- ERROR: duplicate key value violates unique constraint
    
    This is enforced at the DATABASE level, so it's impossible to bypass
    even with raw SQL.

APPLICATION-LEVEL HANDLING:
    try:
        db.add(application)
        db.commit()
    except IntegrityError:
        raise HTTPException(400, "You have already applied to this job")

=============================================================================
APPLICATION WORKFLOW
=============================================================================

STATES:
    PENDING → REVIEWING → SHORTLISTED → INTERVIEW → ACCEPTED
                ↓           ↓              ↓
              REJECTED   REJECTED      REJECTED
                                                   
                        ↑ (Can withdraw at any point before decision)
                    WITHDRAWN

TRANSITIONS:
    - PENDING: Just submitted, awaiting initial review
    - REVIEWING: Recruiter is looking at application
    - SHORTLISTED: Candidate passed initial screen
    - INTERVIEW: Scheduled for interview(s)
    - REJECTED: Not moving forward (final)
    - ACCEPTED: Offer extended (final)
    - WITHDRAWN: Candidate withdrew (final)

WHY TRACK ALL THESE STATES?
    1. Analytics: Measure funnel conversion rates
    2. Communication: Send appropriate emails at each stage
    3. UX: Show candidates their progress
    4. Compliance: Track decisions for equal opportunity reporting

=============================================================================
CASCADE DELETE STRATEGY
=============================================================================

Job deleted → Applications CASCADE deleted
    WHY? Job no longer exists, applications are meaningless
    
User deleted → Applications CASCADE deleted
    WHY? User no longer exists, clean up their data
    
Resume deleted → Applications SET NULL (keep resume_id = NULL)
    WHY? Keep application history, even if resume was deleted
    Resume content might be archived separately

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
from typing import Optional, Dict, Any, TYPE_CHECKING

# SQLAlchemy imports
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey,
    Index, JSON, UniqueConstraint
)
from app.models.types import GUID
from sqlalchemy.orm import relationship, validates

# Local imports
from app.models.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin, utc_now

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.job import Job
    from app.models.resume import Resume


# =============================================================================
# APPLICATION STATUS ENUM
# =============================================================================

class ApplicationStatus(str, Enum):
    """
    Application workflow states.
    
    See docstring above for full workflow diagram.
    """
    PENDING = "pending"           # Just submitted
    REVIEWING = "reviewing"       # Under review
    SHORTLISTED = "shortlisted"   # Passed initial screen
    INTERVIEW = "interview"       # Interview scheduled
    REJECTED = "rejected"         # Not moving forward
    ACCEPTED = "accepted"         # Offer extended
    HIRED = "hired"               # Candidate joined / final hire
    WITHDRAWN = "withdrawn"       # Candidate withdrew


# =============================================================================
# APPLICATION MODEL
# =============================================================================

class Application(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    Job application model.
    
    Links a User (applicant) to a Job with a specific Resume.
    Tracks the application through various stages.
    
    ==========================================================================
    UNIQUE CONSTRAINT
    ==========================================================================
    
    UniqueConstraint('user_id', 'job_id')
    
    This ensures a user can only apply to a job once.
    Attempting to apply again will raise IntegrityError.
    
    ==========================================================================
    TIMESTAMPS EXPLAINED
    ==========================================================================
    
    applied_at: When user submitted the application
        - Set automatically on INSERT
        - Never changes
        - Used for: "Applied 3 days ago"
    
    reviewed_at: When recruiter first looked at it
        - Set when status changes from PENDING
        - Measures: Time to first review
    
    interview_at: Scheduled interview date/time
        - Set when interview is scheduled
        - Can be in the future
    
    decided_at: When final decision was made
        - Set on REJECTED or ACCEPTED
        - Measures: Total decision time
    
    created_at: Same as applied_at (from TimestampMixin)
    updated_at: Any modification (from TimestampMixin)
    """
    
    __tablename__ = "applications"
    
    # =========================================================================
    # TABLE CONFIGURATION
    # =========================================================================
    
    __table_args__ = (
        # =====================================================================
        # UNIQUE CONSTRAINT
        # =====================================================================
        
        # User can only apply to a job ONCE
        # Database-level enforcement - impossible to bypass
        UniqueConstraint(
            'user_id', 'job_id',
            name='unique_user_job_application'
        ),
        
        # =====================================================================
        # INDEXES
        # =====================================================================
        
        # Find all applications by a user
        # Query: SELECT * FROM applications WHERE user_id = ?
        Index('idx_applications_user', 'user_id'),
        
        # Find all applications for a job
        # Query: SELECT * FROM applications WHERE job_id = ?
        Index('idx_applications_job', 'job_id'),
        
        # Filter by status (common for both users and recruiters)
        Index('idx_applications_status', 'status'),
        
        # Composite: Applications for a job filtered by status
        # Query: SELECT * FROM applications WHERE job_id = ? AND status = ?
        Index('idx_applications_job_status', 'job_id', 'status'),
        
        # Sort by application date
        Index('idx_applications_applied_at', 'applied_at'),
        
        # Soft delete filtering
        Index('idx_applications_not_deleted', 'is_deleted'),
        
        {'comment': 'Job applications linking users to jobs'}
    )
    
    # =========================================================================
    # COLUMNS - FOREIGN KEYS
    # =========================================================================
    
    job_id = Column(
        GUID(),
        ForeignKey('jobs.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Job being applied to (CASCADE: delete job → delete applications)"
    )
    
    user_id = Column(
        GUID(),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Applicant (CASCADE: delete user → delete their applications)"
    )
    
    resume_id = Column(
        GUID(),
        ForeignKey('resumes.id', ondelete='SET NULL'),
        nullable=True,  # NULL if resume was deleted
        comment="Resume used (SET NULL: keep app if resume deleted)"
    )
    
    # =========================================================================
    # COLUMNS - APPLICATION CONTENT
    # =========================================================================
    
    cover_letter = Column(
        Text,
        nullable=True,
        comment="Cover letter text (optional)"
    )
    
    # Internal notes from recruiter (not visible to applicant)
    notes = Column(
        Text,
        nullable=True,
        comment="Internal recruiter notes (not shown to applicant)"
    )

    tags = Column(
        JSON,
        nullable=True,
        default=list,
        comment="Internal recruiter tags for quick filtering/scanning",
    )

    message_history = Column(
        JSON,
        nullable=True,
        default=list,
        comment="Outbound recruiter-to-candidate message history",
    )
    
    # AI-calculated match score between resume and job
    match_score = Column(
        String(10),
        nullable=True,
        comment="AI match score (e.g., '85%', 'Good Match')"
    )

    # Snapshot of the matching breakdown computed at application time
    # Shape: {"score": 87.5, "matched_skills": [...], "missing_skills": [...], "reasons": [...]}
    match_breakdown = Column(
        JSON,
        nullable=True,
        comment="Snapshot of skill/experience match analysis at application time",
    )
    
    # =========================================================================
    # COLUMNS - STATUS
    # =========================================================================
    
    status = Column(
        String(20),
        nullable=False,
        default=ApplicationStatus.PENDING.value,
        index=True,
        comment="Application status: pending, reviewing, interview, rejected, accepted"
    )
    
    # =========================================================================
    # COLUMNS - TIMESTAMPS
    # =========================================================================
    
    applied_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
        comment="When application was submitted"
    )
    
    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When application was first reviewed"
    )
    
    interview_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Scheduled interview date/time"
    )

    interview_type = Column(
        String(50),
        nullable=True,
        comment="Interview format (video, phone, in-person)"
    )

    meeting_link = Column(
        Text,
        nullable=True,
        comment="Meeting link for the interview (if applicable)"
    )

    decided_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When final decision was made (accepted/rejected)"
    )
    
    # =========================================================================
    # RELATIONSHIPS
    # =========================================================================
    
    # Many-to-one: Application belongs to Job
    job: "Job" = relationship(
        "Job",
        back_populates="applications",
        lazy="joined"  # Always load job with application
    )
    
    # Many-to-one: Application belongs to User (applicant)
    user: "User" = relationship(
        "User",
        back_populates="applications",
        lazy="joined",
        foreign_keys=[user_id]
    )
    
    # Many-to-one: Application uses Resume
    resume: "Resume" = relationship(
        "Resume",
        back_populates="applications",
        lazy="joined"
    )

    # One-to-many: An application can have many interview scorecards
    # (different interviewers can each submit one).
    scorecards = relationship(
        "InterviewScorecard",
        back_populates="application",
        cascade="all, delete-orphan",
        lazy="select",
    )
    
    # =========================================================================
    # VALIDATORS
    # =========================================================================
    
    @validates('status')
    def validate_status(self, key: str, value: str) -> str:
        """Ensure status is valid."""
        valid_statuses = [s.value for s in ApplicationStatus]
        if value not in valid_statuses:
            raise ValueError(f"Invalid status: {value}")
        return value
    
    @validates('cover_letter')
    def validate_cover_letter(self, key: str, value: Optional[str]) -> Optional[str]:
        """Limit cover letter length."""
        max_length = 10000  # ~2000 words
        if value and len(value) > max_length:
            raise ValueError(f"Cover letter exceeds {max_length} characters")
        return value
    
    # =========================================================================
    # STATUS TRANSITION METHODS
    # =========================================================================
    
    def mark_as_reviewing(self, notes: Optional[str] = None) -> None:
        """
        Move to reviewing status.
        Sets reviewed_at timestamp.
        """
        self.status = ApplicationStatus.REVIEWING.value
        self.reviewed_at = utc_now()
        if notes:
            self.notes = notes
    
    def shortlist(self, notes: Optional[str] = None) -> None:
        """Add to shortlist."""
        self.status = ApplicationStatus.SHORTLISTED.value
        if not self.reviewed_at:
            self.reviewed_at = utc_now()
        if notes:
            self.notes = notes
    
    def schedule_interview(
        self,
        interview_date: datetime,
        interview_type: Optional[str] = None,
        meeting_link: Optional[str] = None,
        notes: Optional[str] = None
    ) -> None:
        """
        Schedule an interview.
        
        Args:
            interview_date: When the interview is scheduled
            interview_type: Interview format (video, phone, in-person)
            meeting_link: Meeting URL for the interview
            notes: Optional internal notes
        """
        self.status = ApplicationStatus.INTERVIEW.value
        self.interview_at = interview_date
        self.interview_type = interview_type.strip().lower() if interview_type else None
        self.meeting_link = meeting_link.strip() if meeting_link else None
        if not self.reviewed_at:
            self.reviewed_at = utc_now()
        if notes:
            self.notes = notes
    
    def reject(self, notes: Optional[str] = None) -> None:
        """
        Reject the application.
        This is a final state.
        """
        self.status = ApplicationStatus.REJECTED.value
        self.decided_at = utc_now()
        if not self.reviewed_at:
            self.reviewed_at = utc_now()
        if notes:
            self.notes = notes
    
    def accept(self, notes: Optional[str] = None) -> None:
        """
        Accept the application (extend offer).
        This is a final state.
        """
        self.status = ApplicationStatus.ACCEPTED.value
        self.decided_at = utc_now()
        if not self.reviewed_at:
            self.reviewed_at = utc_now()
        if notes:
            self.notes = notes

    def mark_hired(self, notes: Optional[str] = None) -> None:
        """
        Mark candidate as hired.
        This is a final state.
        """
        self.status = ApplicationStatus.HIRED.value
        self.decided_at = utc_now()
        if not self.reviewed_at:
            self.reviewed_at = utc_now()
        if notes:
            self.notes = notes
    
    def withdraw(self) -> None:
        """
        Withdraw the application (by candidate).
        This is a final state.
        """
        self.status = ApplicationStatus.WITHDRAWN.value
        self.decided_at = utc_now()
    
    # =========================================================================
    # HELPER PROPERTIES
    # =========================================================================
    
    @property
    def is_pending(self) -> bool:
        """Is application pending review?"""
        return self.status == ApplicationStatus.PENDING.value
    
    @property
    def is_in_progress(self) -> bool:
        """Is application still in progress (not decided)?"""
        return self.status in [
            ApplicationStatus.PENDING.value,
            ApplicationStatus.REVIEWING.value,
            ApplicationStatus.SHORTLISTED.value,
            ApplicationStatus.INTERVIEW.value,
        ]
    
    @property
    def is_decided(self) -> bool:
        """Has a final decision been made?"""
        return self.status in [
            ApplicationStatus.REJECTED.value,
            ApplicationStatus.ACCEPTED.value,
            ApplicationStatus.HIRED.value,
            ApplicationStatus.WITHDRAWN.value,
        ]
    
    @property
    def is_successful(self) -> bool:
        """Was the application successful?"""
        return self.status in [ApplicationStatus.ACCEPTED.value, ApplicationStatus.HIRED.value]
    
    @property
    def days_since_applied(self) -> int:
        """Number of days since application was submitted."""
        if not self.applied_at:
            return 0
        # Handle timezone-aware and naive datetimes
        now = utc_now()
        applied = self.applied_at
        if applied.tzinfo is None:
            applied = applied.replace(tzinfo=timezone.utc)
        delta = now - applied
        return delta.days
    
    @property
    def days_to_decision(self) -> Optional[int]:
        """Number of days from application to decision (if decided)."""
        if not self.is_decided or not self.applied_at or not self.decided_at:
            return None
        delta = self.decided_at - self.applied_at
        return delta.days
    
    # =========================================================================
    # SERIALIZATION
    # =========================================================================
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return (
            f"<Application("
            f"id={self.id}, "
            f"user_id={self.user_id}, "
            f"job_id={self.job_id}, "
            f"status='{self.status}'"
            f")>"
        )
    
    def to_dict(
        self,
        include_job: bool = False,
        include_user: bool = False,
        include_resume: bool = False,
        include_notes: bool = False
    ) -> Dict[str, Any]:
        """
        Convert to dictionary for JSON serialization.
        
        Args:
            include_job: Include job details
            include_user: Include applicant details
            include_resume: Include resume details
            include_notes: Include internal notes (recruiter only)
        """
        data = {
            "id": str(self.id),
            "job_id": str(self.job_id),
            "user_id": str(self.user_id),
            "resume_id": str(self.resume_id) if self.resume_id else None,
            "status": self.status,
            "cover_letter": self.cover_letter,
            "match_score": self.match_score,
            "tags": self.tags or [],
            "message_history": self.message_history or [],
            "is_in_progress": self.is_in_progress,
            "days_since_applied": self.days_since_applied,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "interview_at": self.interview_at.isoformat() if self.interview_at else None,
            "interview_type": self.interview_type,
            "meeting_link": self.meeting_link,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
            "is_deleted": self.is_deleted,
        }
        
        # Include internal notes only for recruiters
        if include_notes:
            data["notes"] = self.notes
        
        # Include related objects
        if include_job and self.job:
            data["job"] = {
                "id": str(self.job.id),
                "title": self.job.title,
                "location": self.job.location,
                "company_name": (
                    self.job.company.company_name
                    if self.job.company
                    else None
                ),
            }
        
        if include_user and self.user:
            data["user"] = {
                "id": str(self.user.id),
                "full_name": self.user.full_name,
                "email": self.user.email,
                "avatar_url": self.user.avatar_url,
            }
        
        if include_resume and self.resume:
            data["resume"] = {
                "id": str(self.resume.id),
                "title": self.resume.title,
                "ats_score": self.resume.ats_score,
            }
        
        return data
