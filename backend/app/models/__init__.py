"""
=============================================================================
DATABASE MODELS PACKAGE - IshTop
=============================================================================

This package contains all SQLAlchemy ORM models for the application.
All models are exported here for easy importing throughout the codebase.

=============================================================================
ARCHITECTURE OVERVIEW
=============================================================================

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    USER     │       │   RESUME    │       │     JOB     │
│  (student/  │──1:N──│  (JSONB     │       │  (posted by │
│   company)  │       │   content)  │       │   company)  │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       │                     │                     │
       └──────────1:N────────┴─────────N:1─────────┘
                             │
                    ┌─────────────────┐
                    │   APPLICATION   │
                    │  (unique per    │
                    │   user+job)     │
                    └─────────────────┘

=============================================================================
DESIGN DECISIONS (WHY?)
=============================================================================

1. WHY UUIDs INSTEAD OF INTEGERS?
   - Security: UUIDs are not sequential, so attackers can't enumerate
     resources by incrementing IDs (e.g., /api/users/1, /api/users/2)
   - Distributed Systems: UUIDs can be generated anywhere without
     coordination, making horizontal scaling easier
   - Privacy: Doesn't reveal how many records exist in the database
   - Trade-off: UUIDs are larger (16 bytes vs 4 bytes) but modern
     databases handle this efficiently

2. WHY JSONB FOR CONTENT FIELDS?
   - Flexibility: Resume structure can evolve without migrations
   - Queryable: PostgreSQL JSONB supports indexing and queries
   - Performance: Binary format is faster than JSON text
   - Schema Freedom: Different resumes can have different structures
   - Trade-off: Less strict validation (handled at application level)

3. WHY SOFT DELETE (is_deleted)?
   - Data Recovery: Accidentally deleted data can be restored
   - Audit Trail: Keep history for compliance and debugging
   - Referential Integrity: Foreign keys don't break
   - Analytics: Can analyze historical data
   - Trade-off: Need to filter deleted records in all queries

4. INDEX STRATEGY:
   - Primary Keys: UUID with B-tree index (automatic)
   - Foreign Keys: Indexed for JOIN performance
   - Search Fields: title, location, status for filtering
   - Composite Indexes: Common query patterns (status + job_type)
   - GIN Index: For JSONB content searching
   - Partial Indexes: Could add for is_deleted = false

5. CASCADE DELETE RULES:
   - User → Resumes: CASCADE (delete user = delete their resumes)
   - User → Jobs: CASCADE (delete company = delete their jobs)
   - User → Applications: CASCADE (delete user = delete their apps)
   - Job → Applications: CASCADE (delete job = delete applications)
   - Resume → Applications: SET NULL (keep app history if resume deleted)

=============================================================================
USAGE EXAMPLES
=============================================================================

# Import all models at once
from app.models import User, Resume, Job, Application

# Import specific items
from app.models import UserRole, JobType, ApplicationStatus

# Create a user with password hashing
user = User(email="john@example.com", full_name="John Doe")
user.set_password("SecurePass123!")

# Access relationships
for resume in user.resumes:
    print(resume.title)

# Convert to dictionary for API response
user_dict = user.to_dict(include_sensitive=False)

# Soft delete
user.soft_delete()

# Restore
user.restore()

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# BASE CLASSES AND MIXINS
# =============================================================================

from app.models.base import (
    Base,                    # SQLAlchemy declarative base
    UUIDMixin,              # Adds UUID primary key
    TimestampMixin,         # Adds created_at, updated_at
    SoftDeleteMixin,        # Adds is_deleted, deleted_at
)

# =============================================================================
# CORE MODELS
# =============================================================================

from app.models.user import (
    User,                   # User accounts (students, companies, admins)
    UserRole,               # Enum: student, company, admin
    AdminSubRole,           # Enum: admin sub-roles
    ADMIN_PERMISSION_MATRIX,
)

from app.models.resume import (
    Resume,                 # User resumes with JSONB content
    ResumeStatus,           # Enum: draft, published, archived
)

from app.models.job import (
    Job,                    # Job postings from companies
    JobType,                # Enum: full_time, part_time, remote, etc.
    ExperienceLevel,        # Enum: junior, mid, senior, lead
    JobStatus,              # Enum: draft, active, closed, filled
    SavedJob,               # Bookmarked jobs by students
)

from app.models.application import (
    Application,            # Job applications from users
    ApplicationStatus,      # Enum: pending, reviewing, interview, etc.
)

from app.models.interview_scorecard import (
    InterviewScorecard,     # 5-criteria structured interview evaluation
)

from app.models.payment import (
    Payment,               # Payment audit trail
    PaymentProvider,        # STRIPE
    PaymentStatus,          # PENDING, COMPLETED, FAILED, ...
    SubscriptionTier,       # FREE, PREMIUM, ENTERPRISE
)

from app.models.notification import (
    Notification,          # User notifications
)

from app.models.saved_search import (
    SavedSearch,          # Saved search filters
)

from app.models.landing_content import (
    LandingContent,
)

from app.models.audit_log import AuditLog
from app.models.admin_notification import AdminNotification
from app.models.verification_audit_log import VerificationAuditLog
from app.models.funnel_event import FunnelEvent

# =============================================================================
# EXPORT ALL (for `from app.models import *`)
# =============================================================================

__all__ = [
    # -------------------------------------------------------------------------
    # Base Classes
    # -------------------------------------------------------------------------
    "Base",                 # Use this when creating new models
    "UUIDMixin",           # Inherit for UUID primary key
    "TimestampMixin",      # Inherit for timestamps
    "SoftDeleteMixin",     # Inherit for soft delete
    
    # -------------------------------------------------------------------------
    # User Model & Enums
    # -------------------------------------------------------------------------
    "User",                # Main user model
    "UserRole",            # STUDENT, COMPANY, ADMIN
    "AdminSubRole",        # SUPER_ADMIN, OPERATIONS_ADMIN, etc.
    "ADMIN_PERMISSION_MATRIX",
    
    # -------------------------------------------------------------------------
    # Resume Model & Enums
    # -------------------------------------------------------------------------
    "Resume",              # Resume model with JSONB content
    "ResumeStatus",        # DRAFT, PUBLISHED, ARCHIVED
    
    # -------------------------------------------------------------------------
    # Job Model & Enums
    # -------------------------------------------------------------------------
    "Job",                 # Job posting model
    "JobType",             # FULL_TIME, PART_TIME, REMOTE, HYBRID, etc.
    "ExperienceLevel",     # INTERN, JUNIOR, MID, SENIOR, LEAD, EXECUTIVE
    "JobStatus",           # DRAFT, ACTIVE, PAUSED, CLOSED, FILLED
    "SavedJob",            # Student bookmarked jobs
    
    # -------------------------------------------------------------------------
    # Application Model & Enums
    # -------------------------------------------------------------------------
    "Application",         # Job application model
    "ApplicationStatus",   # PENDING, REVIEWING, INTERVIEW, etc.

    # -------------------------------------------------------------------------
    # Payments
    # -------------------------------------------------------------------------
    "Payment",
    "PaymentProvider",
    "PaymentStatus",
    "SubscriptionTier",
    
    # -------------------------------------------------------------------------
    # User Experience Models
    # -------------------------------------------------------------------------
    "Notification",           # User notifications
    "SavedSearch",           # Saved search filters
    "LandingContent",
    "AuditLog",
    "AdminNotification",
    "VerificationAuditLog",
    "FunnelEvent",
]

# =============================================================================
# VERSION INFO
# =============================================================================

__version__ = "1.0.0"
__author__ = "IshTop Team"
