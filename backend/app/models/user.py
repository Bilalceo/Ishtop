"""
=============================================================================
USER MODEL
=============================================================================

PURPOSE:
    Represents user accounts in IshTop.
    Supports three user types: students (job seekers), companies, and admins.

=============================================================================
WHY THIS DESIGN?
=============================================================================

SINGLE USER TABLE FOR ALL ROLES:
    Instead of separate Student, Company, Admin tables, we use one User table
    with a role field. This is because:
    
    1. Shared Authentication: All users log in the same way
    2. Simpler Relationships: One foreign key type for all users
    3. Role Flexibility: Users can have roles changed without data migration
    4. Common Fields: 80% of fields are shared between roles
    
    Company-specific fields (company_name, company_website) are nullable
    and only used when role='company'.

=============================================================================
SECURITY FEATURES
=============================================================================

1. PASSWORD HASHING:
   - Passwords are NEVER stored in plain text
   - Using bcrypt with 12 rounds (configurable)
   - Bcrypt is resistant to GPU-based attacks
   - Automatic salt generation

2. EMAIL VALIDATION:
   - Regex validation in Python
   - Database CHECK constraint as backup
   - Normalized to lowercase

3. PHONE VALIDATION:
   - International format support
   - Regex validation

4. PASSWORD STRENGTH:
   - Minimum 8 characters
   - Requires uppercase, lowercase, digit
   - Validated before hashing

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import re
from enum import Enum
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, TYPE_CHECKING

# SQLAlchemy imports
from sqlalchemy import (
    Column, String, Boolean, DateTime, Enum as SQLEnum, Float, Integer, Text,
    Index, CheckConstraint, JSON
)
from sqlalchemy.orm import relationship, validates

# Local imports
from app.models.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin, utc_now
from app.models.types import UTCDateTime

# Type checking imports (avoid circular imports at runtime)
if TYPE_CHECKING:
    from app.models.resume import Resume
    from app.models.job import Job
    from app.models.application import Application
    from app.models.payment import Payment


# =============================================================================
# USER ROLE ENUM
# =============================================================================

class UserRole(str, Enum):
    """
    User roles in the system.
    
    WHY str, Enum?
        Inheriting from str makes:
        - JSON serialization automatic
        - String comparisons work
        - Values stored as readable strings in DB
    
    ROLES:
        STUDENT: Job seekers who create resumes and apply to jobs
        COMPANY: Employers who post jobs and review applications  
        ADMIN: System administrators with full access
    """
    STUDENT = "student"
    COMPANY = "company"
    ADMIN = "admin"


class AdminSubRole(str, Enum):
    """
    Fine-grained admin sub-roles.

    These roles apply only when User.role == ADMIN.
    """

    SUPER_ADMIN = "super_admin"
    OPERATIONS_ADMIN = "operations_admin"
    FINANCE_ADMIN = "finance_admin"
    SECURITY_ADMIN = "security_admin"
    SUPPORT_AGENT = "support_agent"


ADMIN_PERMISSION_MATRIX = {
    AdminSubRole.SUPER_ADMIN: {
        "*",
        "admin.access.read",
        "admin.access.write",
        "admin.errors.read",
        "admin.errors.resolve",
        "admin.system.read",
        "admin.users.read",
        "admin.users.write",
        "admin.jobs.write",
        "admin.companies.write",
        "admin.dashboard.read",
    },
    AdminSubRole.OPERATIONS_ADMIN: {
        "admin.access.read",
        "admin.errors.read",
        "admin.errors.resolve",
        "admin.system.read",
        "admin.users.read",
        "admin.users.write",
        "admin.jobs.write",
        "admin.companies.write",
        "admin.dashboard.read",
    },
    AdminSubRole.FINANCE_ADMIN: {
        "admin.access.read",
        "admin.users.read",
        "admin.dashboard.read",
    },
    AdminSubRole.SECURITY_ADMIN: {
        "admin.access.read",
        "admin.errors.read",
        "admin.errors.resolve",
        "admin.system.read",
        "admin.dashboard.read",
    },
    AdminSubRole.SUPPORT_AGENT: {
        "admin.errors.read",
        "admin.users.read",
        "admin.dashboard.read",
    },
}


# =============================================================================
# USER MODEL
# =============================================================================

class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    User account model.
    
    Represents all users in the system: students, companies, and admins.
    Each user type has different permissions and accessible features.
    
    ==========================================================================
    TABLE CONFIGURATION
    ==========================================================================
    
    __tablename__: The actual table name in PostgreSQL
    __table_args__: Additional table configuration
        - Indexes for common queries
        - Check constraints for data integrity
        - Table comments for documentation
    
    ==========================================================================
    RELATIONSHIPS
    ==========================================================================
    
    User ──1:N──> Resumes (one user has many resumes)
    User ──1:N──> Jobs (one company posts many jobs)
    User ──1:N──> Applications (one user submits many applications)
    
    CASCADE DELETE:
        When a user is deleted:
        - Their resumes are deleted
        - Their jobs are deleted (if company)
        - Their applications are deleted
    
    ==========================================================================
    USAGE EXAMPLES
    ==========================================================================
    
        # Create a new user
        user = User(
            email="john@example.com",
            full_name="John Doe",
            role=UserRole.STUDENT
        )
        user.set_password("SecurePass123!")
        session.add(user)
        session.commit()
        
        # Verify password on login
        if user.verify_password("SecurePass123!"):
            print("Login successful!")
        
        # Access relationships
        for resume in user.resumes:
            print(resume.title)
        
        # Soft delete
        user.soft_delete()
        session.commit()
    """
    
    __tablename__ = "users"
    
    # =========================================================================
    # TABLE-LEVEL CONSTRAINTS AND INDEXES
    # =========================================================================
    
    __table_args__ = (
        # Composite index for common query: finding active users by email
        # WHY? Login queries filter by email AND is_active
        Index('idx_users_email_active', 'email', 'is_active'),
        
        # Index for filtering by role (e.g., listing all companies)
        Index('idx_users_role_active', 'role', 'is_active'),
        
        # Index for soft delete queries
        Index('idx_users_not_deleted', 'is_deleted'),
        
        # NOTE: Email validation is done in Python (validate_email method)
        # Database-level regex constraints are PostgreSQL-specific
        
        # Table comment for documentation
        {'comment': 'User accounts for IshTop (students, companies, admins)'}
    )
    
    # =========================================================================
    # COLUMNS - AUTHENTICATION
    # =========================================================================
    
    # Email: Primary identifier for authentication
    # WHY unique + index? Fast lookups, prevent duplicates
    email = Column(
        String(255),
        unique=True,           # No duplicate emails allowed
        nullable=False,        # Required field
        index=True,            # Fast lookups by email
        comment="User's email address (used for login, must be unique)"
    )
    
    # Password hash: NEVER store plain text passwords!
    # WHY String(255)? Bcrypt hashes are 60 chars, but extra space for future
    password_hash = Column(
        String(255),
        nullable=False,
        comment="Bcrypt hashed password (NEVER store plain text!)"
    )
    
    # =========================================================================
    # COLUMNS - PROFILE
    # =========================================================================
    
    full_name = Column(
        String(255),
        nullable=False,
        comment="User's full name for display"
    )
    
    # Phone: Optional, with international format validation
    phone = Column(
        String(20),
        nullable=True,
        comment="Phone number in international format (e.g., +998901234567)"
    )
    
    # Avatar: URL to profile picture (stored in S3 or similar)
    avatar_url = Column(
        String(500),
        nullable=True,
        comment="URL to user's profile picture"
    )
    
    # Bio: Short description (for profiles)
    bio = Column(
        String(1000),
        nullable=True,
        comment="User's bio or company description"
    )
    
    # Location: City/country for job matching
    location = Column(
        String(255),
        nullable=True,
        comment="User's location (city, country)"
    )
    
    # =========================================================================
    # COLUMNS - COMPANY-SPECIFIC (only used when role='company')
    # =========================================================================
    
    company_name = Column(
        String(255),
        nullable=True,
        comment="Company name (only for company accounts)"
    )
    
    company_website = Column(
        String(500),
        nullable=True,
        comment="Company website URL (only for company accounts)"
    )

    company_cover_photo_url = Column(
        String(500),
        nullable=True,
        comment="Public cover photo URL for company profile",
    )

    company_gallery_images = Column(
        JSON,
        nullable=True,
        default=list,
        comment="Up to 6 public company gallery image URLs",
    )

    company_culture = Column(
        Text,
        nullable=True,
        comment="Free-text company culture section",
    )

    company_linkedin_url = Column(
        String(500),
        nullable=True,
        comment="Company LinkedIn URL",
    )

    company_telegram_url = Column(
        String(500),
        nullable=True,
        comment="Company Telegram URL",
    )

    company_instagram_url = Column(
        String(500),
        nullable=True,
        comment="Company Instagram URL",
    )

    company_facebook_url = Column(
        String(500),
        nullable=True,
        comment="Company Facebook URL",
    )

    company_founded_year = Column(
        Integer,
        nullable=True,
        comment="Company founded year",
    )

    company_video_url = Column(
        String(500),
        nullable=True,
        comment="Company video URL (YouTube/Vimeo)",
    )

    # Employer trust/verification lifecycle (used for public trust badges)
    verification_state = Column(
        String(20),
        nullable=False,
        default="unverified",
        index=True,
        comment="Company verification state: unverified, pending, approved, rejected",
    )

    verification_submitted_at = Column(
        UTCDateTime(),
        nullable=True,
        comment="When company submitted verification request",
    )

    verification_reviewed_at = Column(
        UTCDateTime(),
        nullable=True,
        comment="When admin reviewed verification",
    )

    verification_reviewed_by = Column(
        String(36),
        nullable=True,
        comment="Reviewer user id (UUID as string)",
    )

    verification_notes = Column(
        String(1000),
        nullable=True,
        comment="Verification decision notes",
    )

    trust_badges = Column(
        JSON,
        nullable=True,
        default=list,
        comment="Public trust badges attached to company profile",
    )

    employer_response_rate = Column(
        Float,
        nullable=True,
        comment="Historical response rate percentage (0..100)",
    )

    employer_avg_response_hours = Column(
        Float,
        nullable=True,
        comment="Average first-response time in hours",
    )
    
    # =========================================================================
    # COLUMNS - ROLE AND STATUS
    # =========================================================================
    
    # Role: Determines what the user can do
    role = Column(
        # Persist enum values ("student", "company", "admin") to match
        # existing PostgreSQL enum type created by Alembic migrations.
        SQLEnum(
            UserRole,
            name='user_role_enum',
            create_type=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=UserRole.STUDENT,
        index=True,            # Often filter by role
        comment="User role: student (job seeker), company (employer), admin"
    )

    admin_role = Column(
        String(32),
        nullable=True,
        index=True,
        comment=(
            "Admin sub-role for role='admin': super_admin, operations_admin, "
            "finance_admin, security_admin, support_agent"
        ),
    )
    
    # Is Active: Can the user log in?
    # WHY separate from is_deleted?
    #   - is_active: Admin disabled account (can be re-enabled)
    #   - is_deleted: User deleted account (soft delete)
    is_active_account = Column(
        'is_active',           # Database column name
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="Whether the account can log in (admin can disable)"
    )
    
    # Email verified: Has user confirmed their email?
    is_verified = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether email address has been verified"
    )

    # =========================================================================
    # COLUMNS - SUBSCRIPTION / BILLING
    # =========================================================================

    # Current subscription tier (free/premium/enterprise)
    subscription_tier = Column(
        String(20),
        nullable=False,
        default="free",
        index=True,
        comment="Subscription tier: free, premium, enterprise"
    )

    subscription_expires_at = Column(
        UTCDateTime(),
        nullable=True,
        comment="When premium access expires"
    )

    stripe_customer_id = Column(
        String(255),
        nullable=True,
        comment="Stripe customer id (if payments enabled)"
    )

    # =========================================================================
    # COLUMNS - USER PREFERENCES
    # =========================================================================

    notification_preferences = Column(
        JSON,
        nullable=True,
        default=None,
        comment="User's notification preferences (email/push toggles)"
    )

    privacy_settings = Column(
        JSON,
        nullable=True,
        default=None,
        comment="User's privacy settings (profile visibility, show email/phone)"
    )

    # =========================================================================
    # COLUMNS - TRACKING
    # =========================================================================
    
    last_login = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of last successful login"
    )
    
    # =========================================================================
    # RELATIONSHIPS
    # =========================================================================
    
    # One user can have many resumes
    # WHY cascade="all, delete-orphan"?
    #   - When user is deleted, their resumes are deleted too
    #   - "delete-orphan" means resumes can't exist without a user
    # WHY lazy="dynamic"?
    #   - Returns a query object instead of loading all resumes
    #   - Efficient for users with many resumes (can filter, paginate)
    resumes = relationship(
        "Resume",
        back_populates="user",           # Bidirectional relationship
        cascade="all, delete-orphan",    # Cascade delete
        lazy="dynamic",                   # Return query, not list
        order_by="Resume.created_at.desc()"  # Most recent first
    )
    
    # One company user can have many job postings
    jobs = relationship(
        "Job",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy="dynamic",
        foreign_keys="Job.company_id"
    )
    
    # One user can have many job applications
    applications = relationship(
        "Application",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
        foreign_keys="Application.user_id"
    )

    # Payments (audit trail)
    payments = relationship(
        "Payment",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    
    # Notifications (user alerts)
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    
    # Saved Searches (quick access to frequent searches)
    saved_searches = relationship(
        "SavedSearch",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    # Saved Jobs (bookmarked jobs)
    saved_jobs = relationship(
        "SavedJob",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    
    # =========================================================================
    # PASSWORD METHODS
    # =========================================================================
    
    def set_password(self, password: str) -> None:
        """
        Hash and set the user's password.
        
        WHY A METHOD INSTEAD OF SETTER?
            - Makes it explicit that password is being hashed
            - Allows validation before hashing
            - Clearer intent: user.set_password() vs user.password = 
        
        Args:
            password: Plain text password to hash
            
        Raises:
            ValueError: If password doesn't meet strength requirements
            
        EXAMPLE:
            user.set_password("SecurePass123!")
        """
        from app.core.security import get_password_hash, _truncate_password
        
        # Step 1: Validate password strength (before truncation)
        self._validate_password_strength(password)
        
        # Step 2: Hash using the shared helper (includes 72-byte truncation)
        self.password_hash = get_password_hash(password)
    
    def verify_password(self, password: str) -> bool:
        """
        Verify a password against the stored hash.
        
        Uses constant-time comparison to prevent timing attacks.
        
        Args:
            password: Plain text password to verify
            
        Returns:
            True if password matches, False otherwise
            
        EXAMPLE:
            if user.verify_password("SecurePass123!"):
                print("Login successful!")
        """
        from app.core.security import verify_password as _verify_password
        return _verify_password(password, self.password_hash)
    
    @staticmethod
    def _validate_password_strength(password: str) -> None:
        """
        Validate password meets security requirements.
        
        REQUIREMENTS:
            - At least 8 characters (NIST recommends 8+)
            - At least one uppercase letter
            - At least one lowercase letter  
            - At least one digit
        
        WHY THESE RULES?
            - Length is most important (NIST SP 800-63B)
            - Some complexity prevents simple dictionary attacks
            - Balance between security and user frustration
        
        Args:
            password: Password to validate
            
        Raises:
            ValueError: If password doesn't meet requirements
        """
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if errors:
            raise ValueError("; ".join(errors))
    
    # =========================================================================
    # VALIDATORS (called automatically by SQLAlchemy)
    # =========================================================================
    
    @validates('email')
    def validate_email(self, key: str, email: str) -> str:
        """
        Validate and normalize email before saving.
        
        WHY VALIDATE IN MODEL?
            - Last line of defense before database
            - Works even for raw SQLAlchemy operations
            - Consistent validation everywhere
        
        NORMALIZATION:
            - Convert to lowercase (john@EXAMPLE.com → john@example.com)
            - Strip whitespace
        """
        if not email:
            raise ValueError("Email is required")
        
        # Normalize: lowercase and strip whitespace
        email = email.lower().strip()
        
        # Validate format with regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError(f"Invalid email format: {email}")
        
        return email
    
    @validates('phone')
    def validate_phone(self, key: str, phone: Optional[str]) -> Optional[str]:
        """
        Validate phone number format.
        
        ACCEPTED FORMATS:
            - +998901234567 (with country code)
            - 998901234567 (without +)
            - 1-555-123-4567 (with dashes)
        
        NORMALIZED FORMAT:
            - +998901234567 (with + prefix)
        """
        if not phone:
            return None
        
        # Remove common separators for normalization
        phone = re.sub(r'[\s\-\(\)\.]', '', phone)
        
        # Validate: optional +, then 7-15 digits
        phone_pattern = r'^\+?[0-9]{7,15}$'
        if not re.match(phone_pattern, phone):
            raise ValueError(
                f"Invalid phone format: {phone}. "
                "Use international format: +998901234567"
            )
        
        # Add + prefix if missing
        if not phone.startswith('+'):
            phone = '+' + phone
        
        return phone

    @validates('admin_role')
    def validate_admin_role(self, key: str, admin_role: Optional[str]) -> Optional[str]:
        """Validate and normalize admin sub-role values."""
        if admin_role in (None, ""):
            return None

        if isinstance(admin_role, AdminSubRole):
            return admin_role.value

        normalized = str(admin_role).strip().lower()
        valid_values = {role.value for role in AdminSubRole}
        if normalized not in valid_values:
            raise ValueError(
                f"Invalid admin_role. Must be one of: {', '.join(sorted(valid_values))}"
            )
        return normalized

    @validates("verification_state")
    def validate_verification_state(self, key: str, value: str) -> str:
        """Constrain verification state to known values."""
        normalized = (value or "unverified").strip().lower()
        valid = {"unverified", "pending", "approved", "rejected"}
        if normalized not in valid:
            raise ValueError(f"Invalid verification_state. Must be one of: {', '.join(sorted(valid))}")
        return normalized
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def update_last_login(self) -> None:
        """Update the last_login timestamp to now."""
        self.last_login = utc_now()
    
    @property
    def is_company(self) -> bool:
        """Check if user is a company account."""
        return self.role == UserRole.COMPANY
    
    @property
    def is_admin(self) -> bool:
        """Check if user is an admin."""
        return self.role == UserRole.ADMIN
    
    @property
    def is_student(self) -> bool:
        """Check if user is a student/job seeker."""
        return self.role == UserRole.STUDENT

    @property
    def effective_admin_role(self) -> Optional[AdminSubRole]:
        """
        Resolve admin sub-role safely.

        Backward compatibility:
        - legacy admins without admin_role behave as super_admin.
        """
        if self.role != UserRole.ADMIN:
            return None

        if not self.admin_role:
            return AdminSubRole.SUPER_ADMIN

        try:
            return AdminSubRole(self.admin_role)
        except ValueError:
            return AdminSubRole.SUPER_ADMIN

    def has_admin_permission(self, permission: str) -> bool:
        """Check permission for admin sub-role matrix."""
        if self.role != UserRole.ADMIN:
            return False

        # Optional compatibility mode for teams that want every admin account
        # to have full control without enforcing sub-role RBAC.
        from app.config import settings

        if not settings.ADMIN_ENFORCE_SUBROLES:
            return True

        admin_role = self.effective_admin_role
        if admin_role is None:
            return False

        allowed = ADMIN_PERMISSION_MATRIX.get(admin_role, set())
        return "*" in allowed or permission in allowed
    
    @property
    def can_post_jobs(self) -> bool:
        """Check if user can post job listings."""
        return self.role in (UserRole.COMPANY, UserRole.ADMIN)
    
    @property
    def can_apply_to_jobs(self) -> bool:
        """Check if user can apply to jobs."""
        return self.role == UserRole.STUDENT
    
    @property
    def display_name(self) -> str:
        """Get display name (company name for companies, full name for others)."""
        if self.role == UserRole.COMPANY and self.company_name:
            return self.company_name
        return self.full_name
    
    # =========================================================================
    # SERIALIZATION METHODS
    # =========================================================================
    
    def __repr__(self) -> str:
        """
        String representation for debugging.
        
        Called by print(), debuggers, and logging.
        Shows key fields for quick identification.
        """
        return (
            f"<User("
            f"id={self.id}, "
            f"email='{self.email}', "
            f"role='{self.role.value}', "
            f"is_deleted={self.is_deleted}"
            f")>"
        )
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """
        Convert user to dictionary for JSON serialization.
        
        WHY NOT JUST USE __dict__?
            - __dict__ includes SQLAlchemy internals
            - We want to control what's exposed
            - Need to handle UUID/datetime conversion
            - Sensitive fields should be optional
        
        Args:
            include_sensitive: Include phone, last_login, etc.
            
        Returns:
            Dictionary safe for JSON serialization
            
        EXAMPLE:
            user_json = user.to_dict(include_sensitive=False)
            return JSONResponse(user_json)
        """
        data = {
            # Always include these
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.value,
            "admin_role": self.effective_admin_role.value if self.effective_admin_role else None,
            "is_verified": self.is_verified,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "location": self.location,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        
        # Add company fields for company accounts
        if self.role == UserRole.COMPANY:
            data["company_name"] = self.company_name
            data["company_website"] = self.company_website
            data["company_cover_photo_url"] = self.company_cover_photo_url
            data["company_gallery_images"] = self.company_gallery_images or []
            data["company_culture"] = self.company_culture
            data["company_linkedin_url"] = self.company_linkedin_url
            data["company_telegram_url"] = self.company_telegram_url
            data["company_instagram_url"] = self.company_instagram_url
            data["company_facebook_url"] = self.company_facebook_url
            data["company_founded_year"] = self.company_founded_year
            data["company_video_url"] = self.company_video_url
            data["verification_state"] = self.verification_state
            data["trust_badges"] = self.trust_badges or []
            data["employer_response_rate"] = self.employer_response_rate
            data["employer_avg_response_hours"] = self.employer_avg_response_hours

        # Add sensitive fields if requested
        if include_sensitive:
            data["phone"] = self.phone
            data["is_active"] = self.is_active_account
            data["is_deleted"] = self.is_deleted
            data["last_login"] = self.last_login.isoformat() if self.last_login else None
            data["updated_at"] = self.updated_at.isoformat() if self.updated_at else None
            data["verification_submitted_at"] = (
                self.verification_submitted_at.isoformat()
                if self.verification_submitted_at
                else None
            )
            data["verification_reviewed_at"] = (
                self.verification_reviewed_at.isoformat()
                if self.verification_reviewed_at
                else None
            )
            data["verification_reviewed_by"] = self.verification_reviewed_by
            data["verification_notes"] = self.verification_notes

        return data
