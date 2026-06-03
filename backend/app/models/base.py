"""
=============================================================================
BASE MODEL CLASSES AND MIXINS
=============================================================================

PURPOSE:
    Provides reusable base classes and mixins for all database models.
    Ensures consistency, reduces code duplication, and enforces best practices.

=============================================================================
WHY MIXINS?
=============================================================================

Mixins are a form of multiple inheritance that allow us to:

1. DRY (Don't Repeat Yourself):
   - Define common fields once, use everywhere
   - Change in one place affects all models

2. Consistency:
   - All models have the same timestamp format
   - All UUIDs are generated the same way

3. Separation of Concerns:
   - Each mixin handles one responsibility
   - Easy to test and maintain

4. Flexibility:
   - Models can pick which mixins they need
   - Easy to add new behavior to all models

EXAMPLE USAGE:
    # Combine mixins as needed
    class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
        __tablename__ = "users"
        email = Column(String(255), unique=True)
        # id, created_at, updated_at, is_deleted, deleted_at are automatic!

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

# SQLAlchemy imports
from sqlalchemy import Column, DateTime, Boolean, func, event
from sqlalchemy.orm import declarative_base, declared_attr
from sqlalchemy.ext.hybrid import hybrid_property

from app.models.types import GUID

# =============================================================================
# DECLARATIVE BASE
# =============================================================================

# Create the base class for all models
# WHY?
#   SQLAlchemy's declarative base is a factory that creates a base class
#   for all your models. It does several things:
#   1. Tracks all models that inherit from it
#   2. Creates the metadata object for table definitions
#   3. Enables the ORM to map Python classes to database tables
#
# All models MUST inherit from Base for SQLAlchemy to recognize them.

Base = declarative_base()

# Allow legacy-style annotations without Mapped[] wrapper
# This ensures compatibility with SQLAlchemy 2.0 when using old-style annotations
Base.__allow_unmapped__ = True


# =============================================================================
# UUID MIXIN
# =============================================================================

class UUIDMixin:
    """
    Mixin that adds a UUID primary key to models.
    
    ==========================================================================
    WHY UUID INSTEAD OF AUTO-INCREMENT INTEGER?
    ==========================================================================
    
    1. SECURITY:
       - Integers are sequential: /users/1, /users/2, /users/3
       - Attackers can enumerate all resources by incrementing
       - UUIDs are random: /users/550e8400-e29b-41d4-a716-446655440000
       - No way to guess other valid IDs
    
    2. DISTRIBUTED SYSTEMS:
       - Auto-increment requires a central database to assign IDs
       - If you have multiple databases (sharding), IDs can collide
       - UUIDs can be generated anywhere without coordination
       - Perfect for microservices and horizontal scaling
    
    3. PRIVACY:
       - Integer IDs reveal how many records exist
       - /users/50000 tells attackers you have ~50K users
       - UUIDs reveal nothing about database size
    
    4. DATA MIGRATION:
       - When merging databases, integer IDs often conflict
       - UUIDs are globally unique, no conflicts ever
    
    ==========================================================================
    TRADE-OFFS
    ==========================================================================
    
    - Size: UUID is 16 bytes vs 4 bytes for int
    - Indexing: Slightly slower B-tree operations
    - Readability: UUIDs are harder for humans to read
    
    For most applications, the security and scalability benefits
    far outweigh the small performance cost.
    
    ==========================================================================
    USAGE
    ==========================================================================
    
        class User(Base, UUIDMixin, TimestampMixin):
            __tablename__ = "users"
            # id is automatically added as UUID primary key!
    """
    
    @declared_attr
    def id(cls):
        """
        UUID primary key column.
        
        WHY declared_attr?
            declared_attr is a special SQLAlchemy decorator that makes
            the column work correctly with inheritance. Without it,
            all subclasses would share the same column instance.
        
        WHY as_uuid=True?
            This tells PostgreSQL to use native UUID type and returns
            Python uuid.UUID objects instead of strings. This is more
            efficient and type-safe.
        
        WHY default=uuid.uuid4?
            uuid4() generates a random UUID. We use the function reference
            (not uuid.uuid4()) so a NEW UUID is generated for each row.
        """
        return Column(
            GUID(),                      # PostgreSQL UUID, SQLite CHAR(36)
            primary_key=True,            # This is the primary key
            default=uuid.uuid4,          # Generate UUID in Python
            nullable=False,              # Cannot be NULL
            index=True,                  # Primary keys are indexed
            comment="Unique identifier (UUID v4)"
        )


# =============================================================================
# TIMESTAMP MIXIN
# =============================================================================

class TimestampMixin:
    """
    Mixin that adds created_at and updated_at timestamps.
    
    ==========================================================================
    WHY TIMESTAMPS ON EVERY TABLE?
    ==========================================================================
    
    1. AUDITING:
       - Know exactly when every record was created
       - Track modification history
       - Essential for debugging production issues
    
    2. BUSINESS LOGIC:
       - Sort by "most recent"
       - Filter by date ranges
       - Implement "new" badges (created in last 24h)
    
    3. COMPLIANCE:
       - Many regulations (GDPR, HIPAA) require audit trails
       - Timestamps provide evidence of data handling
    
    4. DEBUGGING:
       - "When did this user register?"
       - "When was this record last modified?"
       - Invaluable for tracking down issues
    
    ==========================================================================
    IMPLEMENTATION DETAILS
    ==========================================================================
    
    created_at:
        - Set ONCE when the record is first inserted
        - Uses server_default=func.now() so the DATABASE sets the time
        - This is more reliable than application time (consistent across servers)
    
    updated_at:
        - Set on creation AND updated on every modification
        - Uses onupdate=func.now() for automatic updates
        - No need to manually update in application code
    
    WHY timezone=True?
        - Stores timestamps WITH timezone information
        - Prevents timezone-related bugs
        - Allows correct display in any timezone
    """
    
    @declared_attr
    def created_at(cls):
        """
        Timestamp when the record was created.

        Belt-and-braces: server_default tells the DB to fill it in, but if a
        migration ever created the column without that default (e.g. saved_jobs
        in migration 006), the Python-side `default=` callable still provides
        a value at INSERT time. Additive — no effect when the DB default is
        present.
        """
        return Column(
            DateTime(timezone=True),                          # Store with timezone info
            default=lambda: datetime.now(timezone.utc),       # Python-side fallback
            server_default=func.now(),                        # DB sets the time when default exists
            nullable=False,                                   # Always required
            index=True,                                       # Index for sorting by date
            comment="Timestamp when record was created (UTC)"
        )

    @declared_attr
    def updated_at(cls):
        """Same belt-and-braces story as created_at."""
        return Column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
            comment="Timestamp when record was last modified (UTC)"
        )


# =============================================================================
# SOFT DELETE MIXIN
# =============================================================================

class SoftDeleteMixin:
    """
    Mixin for soft delete functionality.
    
    ==========================================================================
    WHAT IS SOFT DELETE?
    ==========================================================================
    
    Instead of permanently removing records with DELETE, we:
    1. Set is_deleted = True
    2. Set deleted_at = current timestamp
    3. Filter out "deleted" records in normal queries
    
    The data remains in the database but is hidden from normal operations.
    
    ==========================================================================
    WHY SOFT DELETE?
    ==========================================================================
    
    1. DATA RECOVERY:
       - "Oops, I deleted the wrong user!"
       - Easy to restore: SET is_deleted = false
       - No need for backups for simple mistakes
    
    2. AUDIT TRAIL:
       - Keep complete history of all records
       - Track what was deleted and when
       - Required for many compliance regulations
    
    3. REFERENTIAL INTEGRITY:
       - Hard delete can break foreign key relationships
       - Soft delete keeps references intact
       - Historical data remains queryable
    
    4. ANALYTICS:
       - Analyze churn (deleted accounts)
       - Track deletion patterns
       - Compare active vs all-time data
    
    5. UNDO FUNCTIONALITY:
       - Easy to implement "trash" or "recycle bin"
       - Users can restore their own deleted items
       - Time-based auto-restore (e.g., 30-day recovery window)
    
    ==========================================================================
    IMPLEMENTATION
    ==========================================================================
    
    is_deleted (Boolean):
        - True = record is "deleted"
        - False = record is active (default)
        - Indexed for filtering performance
    
    deleted_at (DateTime, nullable):
        - NULL = not deleted
        - Timestamp = when it was deleted
        - Useful for cleanup jobs (delete after 30 days)
    
    ==========================================================================
    USAGE
    ==========================================================================
    
        # Soft delete a record
        user.soft_delete()
        db.commit()
        
        # Restore a record
        user.restore()
        db.commit()
        
        # Query only active records (must filter manually!)
        active_users = db.query(User).filter(User.is_deleted == False).all()
        
        # Query including deleted records
        all_users = db.query(User).all()
    
    ==========================================================================
    IMPORTANT: QUERY FILTERING
    ==========================================================================
    
    Soft delete requires you to ALWAYS filter is_deleted in queries!
    
    WRONG (includes deleted records):
        users = db.query(User).all()
    
    RIGHT (excludes deleted records):
        users = db.query(User).filter(User.is_deleted == False).all()
    
    Consider using SQLAlchemy query events or a custom query class
    to automatically filter deleted records.
    """
    
    @declared_attr
    def is_deleted(cls):
        """
        Boolean flag indicating if record is soft-deleted.
        
        WHY a separate boolean instead of just checking deleted_at?
            - Faster queries: boolean comparison vs NULL check
            - More explicit: is_deleted == False is clearer
            - Index performance: boolean indexes are very efficient
        """
        return Column(
            Boolean,
            default=False,               # Not deleted by default
            nullable=False,              # Must always have a value
            index=True,                  # Index for filtering
            comment="True if record is soft-deleted"
        )
    
    @declared_attr
    def deleted_at(cls):
        """
        Timestamp when the record was soft-deleted.
        
        NULL = not deleted
        Timestamp = when it was deleted
        """
        return Column(
            DateTime(timezone=True),
            nullable=True,               # NULL when not deleted
            index=True,                  # Index for cleanup queries
            comment="Timestamp when record was soft-deleted (NULL if active)"
        )
    
    def soft_delete(self) -> None:
        """
        Mark this record as deleted.
        
        Sets is_deleted = True and deleted_at = now.
        Remember to commit the session after calling this!
        
        EXAMPLE:
            user.soft_delete()
            db.commit()
        """
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)
    
    def restore(self) -> None:
        """
        Restore a soft-deleted record.
        
        Sets is_deleted = False and deleted_at = NULL.
        Remember to commit the session after calling this!
        
        EXAMPLE:
            user.restore()
            db.commit()
        """
        self.is_deleted = False
        self.deleted_at = None
    
    @hybrid_property
    def is_active(self) -> bool:
        """
        Check if record is active (not deleted).
        
        This is a hybrid property that works both in Python and SQL:
        
        PYTHON:
            if user.is_active:
                print("User is active")
        
        SQL:
            db.query(User).filter(User.is_active == True)
        """
        return not self.is_deleted


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def utc_now() -> datetime:
    """
    Get current UTC timestamp.
    
    Use this instead of datetime.utcnow() which is deprecated.
    Always returns timezone-aware datetime in UTC.
    """
    return datetime.now(timezone.utc)
