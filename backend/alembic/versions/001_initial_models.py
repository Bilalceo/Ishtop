"""Initial database schema for IshTop

Revision ID: 001_initial_models
Revises: 
Create Date: 2024-12-01 10:00:00.000000

=============================================================================
MIGRATION OVERVIEW
=============================================================================

This migration creates the complete database schema for IshTop:

TABLES:
    1. users      - User accounts (students, companies, admins)
    2. resumes    - User resumes with JSONB content
    3. jobs       - Job postings from companies
    4. applications - Job applications linking users to jobs

FEATURES:
    - UUID primary keys (security, distributed systems)
    - JSONB fields for flexible data (resumes, requirements)
    - Soft delete support (is_deleted, deleted_at)
    - Comprehensive indexes for query performance
    - Proper foreign key constraints with CASCADE rules

=============================================================================
HOW TO RUN
=============================================================================

    # Apply this migration
    alembic upgrade head
    
    # Rollback this migration
    alembic downgrade -1
    
    # View current version
    alembic current

=============================================================================
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

import migration_utils as dh

# Revision identifiers
revision = '001_initial_models'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create all tables with complete schema.
    
    Order matters due to foreign key dependencies:
    1. users (no dependencies)
    2. resumes (depends on users)
    3. jobs (depends on users)
    4. applications (depends on users, jobs, resumes)
    """
    is_postgres = dh.is_postgresql()
    uuid_type = dh.uuid_type()
    json_type = dh.json_type()
    datetime_type = dh.datetime_type()

    # =========================================================================
    # CREATE ENUM TYPE (PostgreSQL only)
    # =========================================================================
    dh.create_user_role_enum()
    user_role_enum = dh.user_role_type()
    
    # =========================================================================
    # USERS TABLE
    # =========================================================================
    
    op.create_table(
        'users',
        
        # Primary Key - UUID for security
        sa.Column('id', uuid_type, primary_key=True, nullable=False,
                  comment='Unique identifier (UUID v4)'),
        
        # Authentication
        sa.Column('email', sa.String(255), unique=True, nullable=False,
                  comment='Email address (used for login)'),
        sa.Column('password_hash', sa.String(255), nullable=False,
                  comment='Bcrypt hashed password'),
        
        # Profile
        sa.Column('full_name', sa.String(255), nullable=False,
                  comment='User display name'),
        sa.Column('phone', sa.String(20), nullable=True,
                  comment='Phone in international format'),
        sa.Column('avatar_url', sa.String(500), nullable=True,
                  comment='Profile picture URL'),
        sa.Column('bio', sa.String(1000), nullable=True,
                  comment='Bio or company description'),
        sa.Column('location', sa.String(255), nullable=True,
                  comment='City/country'),
        
        # Company-specific (only for role=company)
        sa.Column('company_name', sa.String(255), nullable=True,
                  comment='Company name'),
        sa.Column('company_website', sa.String(500), nullable=True,
                  comment='Company website URL'),
        
        # Role and status
        sa.Column('role', user_role_enum, nullable=False, server_default='student',
                  comment='User role: student, company, admin'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true',
                  comment='Can user log in?'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false',
                  comment='Email verified?'),
        
        # Tracking
        sa.Column('last_login', datetime_type, nullable=True,
                  comment='Last login timestamp'),
        
        # Timestamps (from TimestampMixin)
        sa.Column('created_at', datetime_type,
                  server_default=sa.func.now(), nullable=False,
                  comment='When record was created'),
        sa.Column('updated_at', datetime_type,
                  server_default=sa.func.now(), nullable=False,
                  comment='When record was last modified'),
        
        # Soft delete (from SoftDeleteMixin)
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false',
                  comment='Soft delete flag'),
        sa.Column('deleted_at', datetime_type, nullable=True,
                  comment='When record was soft-deleted'),
        
        comment='User accounts for IshTop'
    )
    
    # Indexes for users
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_email_active', 'users', ['email', 'is_active'])
    op.create_index('idx_users_role_active', 'users', ['role', 'is_active'])
    op.create_index('idx_users_not_deleted', 'users', ['is_deleted'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    
    # Check constraint for email format (PostgreSQL regex; skipped on SQLite)
    if is_postgres:
        op.create_check_constraint(
            'check_email_format', 'users',
            "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
        )
    
    # =========================================================================
    # RESUMES TABLE
    # =========================================================================
    
    op.create_table(
        'resumes',
        
        # Primary Key
        sa.Column('id', uuid_type, primary_key=True, nullable=False,
                  comment='Unique identifier (UUID v4)'),
        
        # Foreign Key
        sa.Column('user_id', uuid_type,
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False,
                  comment='Owner (CASCADE: delete user → delete resumes)'),
        
        # Content
        sa.Column('title', sa.String(255), nullable=False, server_default='My Resume',
                  comment='Display title'),
        sa.Column('content', json_type, nullable=False, server_default='{}',
                  comment='Resume content as JSONB'),
        sa.Column('raw_text', sa.Text(), nullable=True,
                  comment='Plain text for full-text search'),
        
        # AI tracking
        sa.Column('ai_generated', sa.Boolean(), nullable=False, server_default='false',
                  comment='Generated by AI?'),
        sa.Column('ai_model_used', sa.String(100), nullable=True,
                  comment='AI model used'),
        
        # File storage
        sa.Column('pdf_url', sa.String(500), nullable=True,
                  comment='URL to PDF file'),
        
        # Status and analytics
        sa.Column('status', sa.String(20), nullable=False, server_default='draft',
                  comment='Status: draft, published, archived'),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0',
                  comment='View count'),
        sa.Column('ats_score', sa.Integer(), nullable=True,
                  comment='ATS compatibility score (0-100)'),
        
        # Timestamps
        sa.Column('created_at', datetime_type,
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', datetime_type,
                  server_default=sa.func.now(), nullable=False),
        
        # Soft delete
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', datetime_type, nullable=True),
        
        comment='User resumes with JSONB content'
    )
    
    # Indexes for resumes
    op.create_index('idx_resumes_user_id', 'resumes', ['user_id'])
    op.create_index('idx_resumes_status', 'resumes', ['status'])
    op.create_index('idx_resumes_user_status', 'resumes', ['user_id', 'status'])
    op.create_index('idx_resumes_not_deleted', 'resumes', ['is_deleted'])
    op.create_index('idx_resumes_created_at', 'resumes', ['created_at'])
    
    # GIN index for JSONB content searching (PostgreSQL only)
    if is_postgres:
        op.create_index(
            'idx_resumes_content', 'resumes', ['content'],
            postgresql_using='gin'
        )
    
    # =========================================================================
    # JOBS TABLE
    # =========================================================================
    
    op.create_table(
        'jobs',
        
        # Primary Key
        sa.Column('id', uuid_type, primary_key=True, nullable=False,
                  comment='Unique identifier'),
        
        # Foreign Key
        sa.Column('company_id', uuid_type,
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False,
                  comment='Company that posted this job'),
        
        # Job details
        sa.Column('title', sa.String(255), nullable=False,
                  comment='Job title'),
        sa.Column('description', sa.Text(), nullable=False,
                  comment='Full job description'),
        sa.Column('requirements', json_type, nullable=True, server_default='[]',
                  comment='Requirements as JSON array'),
        sa.Column('responsibilities', json_type, nullable=True, server_default='[]',
                  comment='Responsibilities as JSON array'),
        sa.Column('benefits', json_type, nullable=True, server_default='[]',
                  comment='Benefits as JSON array'),
        
        # Salary (stored in cents)
        sa.Column('salary_min', sa.Integer(), nullable=True,
                  comment='Min salary in cents'),
        sa.Column('salary_max', sa.Integer(), nullable=True,
                  comment='Max salary in cents'),
        sa.Column('salary_currency', sa.String(3), nullable=False, server_default='USD',
                  comment='Currency code'),
        sa.Column('is_salary_visible', sa.Boolean(), nullable=False, server_default='true',
                  comment='Show salary?'),
        
        # Location
        sa.Column('location', sa.String(255), nullable=True,
                  comment='Job location'),
        sa.Column('is_remote_allowed', sa.Boolean(), nullable=False, server_default='false',
                  comment='Remote allowed?'),
        
        # Categorization
        sa.Column('job_type', sa.String(20), nullable=False, server_default='full_time',
                  comment='Employment type'),
        sa.Column('experience_level', sa.String(20), nullable=False, server_default='mid',
                  comment='Required experience'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft',
                  comment='Posting status'),
        
        # Analytics
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0',
                  comment='View count'),
        sa.Column('applications_count', sa.Integer(), nullable=False, server_default='0',
                  comment='Application count'),
        
        # Settings
        sa.Column('external_apply_url', sa.String(500), nullable=True,
                  comment='External apply URL'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false',
                  comment='Featured?'),
        sa.Column('expires_at', datetime_type, nullable=True,
                  comment='Expiration date'),
        
        # Timestamps
        sa.Column('created_at', datetime_type,
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', datetime_type,
                  server_default=sa.func.now(), nullable=False),
        
        # Soft delete
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', datetime_type, nullable=True),
        
        comment='Job postings from companies'
    )
    
    # Indexes for jobs
    op.create_index('idx_jobs_company', 'jobs', ['company_id'])
    op.create_index('idx_jobs_title', 'jobs', ['title'])
    op.create_index('idx_jobs_location', 'jobs', ['location'])
    op.create_index('idx_jobs_type', 'jobs', ['job_type'])
    op.create_index('idx_jobs_status', 'jobs', ['status'])
    op.create_index('idx_jobs_experience', 'jobs', ['experience_level'])
    op.create_index('idx_jobs_expires', 'jobs', ['expires_at'])
    op.create_index('idx_jobs_not_deleted', 'jobs', ['is_deleted'])
    op.create_index('idx_jobs_created_at', 'jobs', ['created_at'])
    
    # Composite index for common search
    op.create_index('idx_jobs_search', 'jobs', ['status', 'job_type', 'location'])
    
    # Check constraint for salary range (PostgreSQL only; SQLite lacks ALTER CONSTRAINT)
    if is_postgres:
        op.create_check_constraint(
            'check_salary_range', 'jobs',
            'salary_max >= salary_min OR salary_min IS NULL OR salary_max IS NULL'
        )
    
    # =========================================================================
    # APPLICATIONS TABLE
    # =========================================================================
    
    op.create_table(
        'applications',
        
        # Primary Key
        sa.Column('id', uuid_type, primary_key=True, nullable=False,
                  comment='Unique identifier'),
        
        # Foreign Keys
        sa.Column('job_id', uuid_type,
                  sa.ForeignKey('jobs.id', ondelete='CASCADE'),
                  nullable=False,
                  comment='Job applied to (CASCADE)'),
        sa.Column('user_id', uuid_type,
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False,
                  comment='Applicant (CASCADE)'),
        sa.Column('resume_id', uuid_type,
                  sa.ForeignKey('resumes.id', ondelete='SET NULL'),
                  nullable=True,
                  comment='Resume used (SET NULL)'),
        
        # Content
        sa.Column('cover_letter', sa.Text(), nullable=True,
                  comment='Cover letter'),
        sa.Column('notes', sa.Text(), nullable=True,
                  comment='Internal recruiter notes'),
        sa.Column('match_score', sa.String(10), nullable=True,
                  comment='AI match score'),
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='pending',
                  comment='Application status'),
        
        # Timestamps
        sa.Column('applied_at', datetime_type,
                  server_default=sa.func.now(), nullable=False,
                  comment='When applied'),
        sa.Column('reviewed_at', datetime_type, nullable=True,
                  comment='When first reviewed'),
        sa.Column('interview_at', datetime_type, nullable=True,
                  comment='Interview date'),
        sa.Column('decided_at', datetime_type, nullable=True,
                  comment='When decided'),
        sa.Column('created_at', datetime_type,
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', datetime_type,
                  server_default=sa.func.now(), nullable=False),
        
        # Soft delete
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', datetime_type, nullable=True),
        sa.UniqueConstraint(
            'user_id',
            'job_id',
            name='unique_user_job_application',
        ),
        comment='Job applications linking users to jobs'
    )
    
    # Indexes for applications
    op.create_index('idx_applications_user', 'applications', ['user_id'])
    op.create_index('idx_applications_job', 'applications', ['job_id'])
    op.create_index('idx_applications_resume', 'applications', ['resume_id'])
    op.create_index('idx_applications_status', 'applications', ['status'])
    op.create_index('idx_applications_job_status', 'applications', ['job_id', 'status'])
    op.create_index('idx_applications_applied_at', 'applications', ['applied_at'])
    op.create_index('idx_applications_not_deleted', 'applications', ['is_deleted'])


def downgrade() -> None:
    """
    Drop all tables in reverse order.
    
    Order matters due to foreign key dependencies:
    Drop children first, then parents.
    """
    
    # Drop tables (reverse order of creation)
    op.drop_table('applications')
    op.drop_table('jobs')
    op.drop_table('resumes')
    op.drop_table('users')
    
    dh.drop_user_role_enum()
