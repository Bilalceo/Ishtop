"""
=============================================================================
APPLICATION ENDPOINTS
=============================================================================

Handles job application operations including auto-apply feature.

ENDPOINTS:
    POST   /apply                 - Apply to a job
    GET    /my-applications       - Get user's applications
    GET    /{application_id}      - Get application details
    PUT    /{application_id}/status - Update status [Company only]
    POST   /{application_id}/withdraw - Withdraw application
    POST   /auto-apply            - 🔥 Auto-apply to matching jobs

ERROR CODES:
    400 - Bad Request (validation errors)
    401 - Unauthorized (no token)
    403 - Forbidden (wrong role)
    404 - Not Found
    409 - Conflict (duplicate application)
    422 - Unprocessable Entity
    429 - Too Many Requests (rate limit)
    500 - Internal Server Error

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import logging
import time
import uuid as uuid_module
import re
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.core.dependencies import (
    get_db,
    get_current_active_user,
    get_current_company,
    get_current_student,
    PaginationParams,
    rate_limit,
)
from app.core.premium import get_premium_user, get_feature_limit
from app.models import (
    User, Job, Resume, Application,
    ApplicationStatus, JobStatus, UserRole, ResumeStatus, FunnelEvent
)
from app.services import job_matching
from app.services.telegram_service import send_company_telegram_notification
from app.config import settings

try:
    from app.services.email_service import email_service
except ModuleNotFoundError as exc:
    if exc.name != "aiosmtplib":
        raise

    class _FallbackEmailService:
        """Fallback used when the optional email dependency is unavailable."""

        async def send_interview_scheduled_email(self, *args, **kwargs):
            logger.warning(
                "Email service dependency missing; interview notification skipped."
            )
            return False

    email_service = _FallbackEmailService()

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter()

VIEW_EVENT_NAMES = {"view_job", "view_explainability"}


def _safe_pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def _parse_analytics_window(
    *,
    days: int,
    start_date: Optional[str],
    end_date: Optional[str],
) -> tuple[datetime, datetime, int, str, str]:
    """Resolve analytics window in UTC [start_at, end_at_exclusive)."""
    now = datetime.now(timezone.utc)
    today = now.date()

    if start_date or end_date:
        if not start_date or not end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both start_date and end_date are required for custom range",
            )
        try:
            start_day = datetime.strptime(start_date, "%Y-%m-%d").date()
            end_day = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dates must be in YYYY-MM-DD format",
            )
        if end_day < start_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date must be greater than or equal to start_date",
            )
        window_days = (end_day - start_day).days + 1
        if window_days > 366:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom range cannot exceed 366 days",
            )
    else:
        window_days = max(1, min(days, 365))
        end_day = today
        start_day = today - timedelta(days=window_days - 1)

    start_at = datetime.combine(start_day, datetime.min.time(), tzinfo=timezone.utc)
    end_at = datetime.combine(end_day + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    return start_at, end_at, window_days, start_day.isoformat(), end_day.isoformat()


def _build_date_bucket_series(
    *,
    start_day: str,
    end_day: str,
    counts_map: Dict[str, int],
) -> List[Dict[str, Any]]:
    start = datetime.strptime(start_day, "%Y-%m-%d").date()
    end = datetime.strptime(end_day, "%Y-%m-%d").date()
    span = (end - start).days + 1
    output: List[Dict[str, Any]] = []
    for offset in range(span):
        day = (start + timedelta(days=offset)).isoformat()
        output.append({"date": day, "count": int(counts_map.get(day, 0))})
    return output


# =============================================================================
# STANDARDIZED RESPONSE MODELS
# =============================================================================

class ResponseMeta(BaseModel):
    """Metadata for API responses."""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    request_id: str = Field(default_factory=lambda: str(uuid_module.uuid4()))
    processing_time_ms: Optional[float] = None


class StandardResponse(BaseModel):
    """Standardized API response format."""
    success: bool
    message: str
    data: Optional[Any] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Operation completed successfully",
                "data": {},
                "meta": {
                    "timestamp": "2024-01-01T00:00:00Z",
                    "request_id": "550e8400-e29b-41d4-a716-446655440000",
                    "processing_time_ms": 45.2
                }
            }
        }
    )


class ErrorDetail(BaseModel):
    """Detailed error information."""
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standardized error response."""
    success: bool = False
    message: str
    errors: List[ErrorDetail] = Field(default_factory=list)
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


# =============================================================================
# REQUEST MODELS
# =============================================================================

class ApplyRequest(BaseModel):
    """Request to apply for a job."""
    
    job_id: str = Field(
        ...,
        description="UUID of the job to apply for",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    
    resume_id: str = Field(
        ...,
        description="UUID of the resume to use",
        examples=["550e8400-e29b-41d4-a716-446655440001"]
    )
    
    cover_letter: Optional[str] = Field(
        None,
        max_length=10000,
        description="Optional cover letter (max 10,000 characters)",
        examples=["I am excited to apply for this position..."]
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "550e8400-e29b-41d4-a716-446655440000",
                "resume_id": "550e8400-e29b-41d4-a716-446655440001",
                "cover_letter": "I am excited to apply for this position because..."
            }
        }
    )


class StatusUpdateRequest(BaseModel):
    """Request to update application status."""
    
    status: str = Field(
        ...,
        description="New status: pending, reviewing, shortlisted, interview, accepted, hired, rejected, withdrawn"
    )
    
    notes: Optional[str] = Field(
        None,
        max_length=5000,
        description="Internal notes (not visible to applicant)"
    )
    
    interview_at: Optional[datetime] = Field(
        None,
        description="Interview date/time (required for 'interview' status)"
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
                "notes": "Strong candidate, schedule for technical round",
                "interview_at": "2024-01-15T10:00:00Z",
                "interview_type": "video",
                "meeting_link": "https://meet.google.com/abc-defg-hij"
            }
        }
    )


class AutoApplyCriteria(BaseModel):
    """Criteria for auto-apply feature."""
    
    job_types: List[str] = Field(
        default_factory=lambda: ["full_time"],
        description="Preferred job types",
        examples=[["remote", "full_time"]]
    )
    
    locations: List[str] = Field(
        default_factory=list,
        description="Preferred locations (empty = any)",
        examples=[["Tashkent", "Remote"]]
    )
    
    experience_levels: List[str] = Field(
        default_factory=list,
        description="Preferred experience levels",
        examples=[["mid", "senior"]]
    )
    
    min_salary: Optional[int] = Field(
        None,
        description="Minimum salary requirement (whole units in selected currency)"
    )
    
    keywords: List[str] = Field(
        default_factory=list,
        description="Keywords to match in job title/description",
        examples=[["python", "backend", "api"]]
    )
    
    exclude_companies: List[str] = Field(
        default_factory=list,
        description="Company IDs to exclude"
    )
    
    max_applications: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of applications to submit"
    )
    
    include_cover_letter: bool = Field(
        default=True,
        description="Generate and include cover letters"
    )


class AutoApplyRequest(BaseModel):
    """Request for auto-apply feature."""
    
    resume_id: str = Field(
        ...,
        description="Resume to use for applications"
    )
    
    criteria: AutoApplyCriteria = Field(
        ...,
        description="Criteria for job matching"
    )
    
    dry_run: bool = Field(
        default=False,
        description="If true, only show matches without applying"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "resume_id": "550e8400-e29b-41d4-a716-446655440000",
                "criteria": {
                    "job_types": ["remote", "full_time"],
                    "locations": ["Tashkent"],
                    "keywords": ["python", "backend"],
                    "max_applications": 10
                },
                "dry_run": False
            }
        }
    )


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class ApplicationData(BaseModel):
    """Application data in responses."""
    
    id: str
    job_id: str
    user_id: str
    resume_id: Optional[str]
    status: str
    cover_letter: Optional[str]
    match_score: Optional[str]
    match_breakdown: Optional[Dict[str, Any]] = None

    applied_at: datetime
    reviewed_at: Optional[datetime]
    interview_at: Optional[datetime]
    interview_type: Optional[str] = None
    meeting_link: Optional[str] = None
    decided_at: Optional[datetime]
    
    days_since_applied: int
    is_in_progress: bool
    
    # Related objects
    job: Optional[Dict[str, Any]] = None
    resume: Optional[Dict[str, Any]] = None
    applicant: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None  # Only for company view
    tags: List[str] = Field(default_factory=list)
    message_history: List[Dict[str, Any]] = Field(default_factory=list)


class BulkStatusUpdateRequest(BaseModel):
    application_ids: List[str] = Field(default_factory=list)
    status: str
    notes: Optional[str] = Field(default=None, max_length=5000)


class BulkEmailRequest(BaseModel):
    application_ids: List[str] = Field(default_factory=list)
    subject: str = Field(..., min_length=2, max_length=300)
    body: str = Field(..., min_length=2, max_length=20000)
    template_key: Optional[str] = Field(default=None, max_length=64)


class NotesTagsUpdateRequest(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=5000)
    tags: List[str] = Field(default_factory=list)


class MessageSendRequest(BaseModel):
    subject: str = Field(..., min_length=2, max_length=300)
    body: str = Field(..., min_length=2, max_length=20000)
    template_key: Optional[str] = Field(default=None, max_length=64)


class ApplicationListData(BaseModel):
    """Paginated application list."""
    
    applications: List[ApplicationData]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    # Status counts
    pending_count: int = 0
    reviewing_count: int = 0
    interview_count: int = 0
    accepted_count: int = 0
    rejected_count: int = 0


class AutoApplyResult(BaseModel):
    """Result of a single auto-apply attempt."""
    
    job_id: str
    job_title: str
    company_name: str
    match_score: float
    applied: bool
    message: str
    application_id: Optional[str] = None


class AutoApplyData(BaseModel):
    """Auto-apply response data."""
    
    total_jobs_matched: int
    applications_submitted: int
    applications_skipped: int
    results: List[AutoApplyResult]
    resume_used: str
    dry_run: bool
    monthly_limit: Optional[int] = None
    monthly_used: int
    monthly_remaining: Optional[int] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def create_response(
    success: bool,
    message: str,
    data: Any = None,
    start_time: float = None
) -> StandardResponse:
    """Create standardized response."""
    meta = ResponseMeta()
    if start_time:
        meta.processing_time_ms = round((time.time() - start_time) * 1000, 2)
    
    return StandardResponse(
        success=success,
        message=message,
        data=data,
        meta=meta
    )


def application_to_data(
    app: Application,
    include_job: bool = False,
    include_resume: bool = False,
    include_applicant: bool = False,
    include_notes: bool = False,
    include_breakdown: bool = False,
) -> ApplicationData:
    """Convert Application model to ApplicationData."""
    
    job_data = None
    if include_job and app.job:
        company_name = None
        if app.job.company:
            company_name = app.job.company.company_name or app.job.company.full_name
        
        job_data = {
            "id": str(app.job.id),
            "title": app.job.title,
            "location": app.job.location,
            "job_type": app.job.job_type,
            "company_name": company_name,
            "company_logo": app.job.company.avatar_url if app.job.company else None,
            "salary_range": app.job.salary_range_display,
        }
    
    resume_data = None
    if include_resume and app.resume:
        resume_data = {
            "id": str(app.resume.id),
            "title": app.resume.title,
            "ats_score": app.resume.ats_score,
        }
    
    applicant_data = None
    if include_applicant and app.user:
        applicant_data = {
            "id": str(app.user.id),
            "full_name": app.user.full_name,
            "email": app.user.email,
            "avatar_url": app.user.avatar_url,
            "location": app.user.location,
        }
    
    return ApplicationData(
        id=str(app.id),
        job_id=str(app.job_id),
        user_id=str(app.user_id),
        resume_id=str(app.resume_id) if app.resume_id else None,
        status=app.status,
        cover_letter=app.cover_letter,
        match_score=app.match_score,
        applied_at=app.applied_at,
        reviewed_at=app.reviewed_at,
        interview_at=app.interview_at,
        interview_type=app.interview_type,
        meeting_link=app.meeting_link,
        decided_at=app.decided_at,
        days_since_applied=app.days_since_applied,
        is_in_progress=app.is_in_progress,
        job=job_data,
        resume=resume_data,
        applicant=applicant_data,
        notes=app.notes if include_notes else None,
        tags=list(app.tags or []) if include_notes else [],
        message_history=list(app.message_history or []) if include_notes else [],
        match_breakdown=app.match_breakdown if include_breakdown else None,
    )


def log_request(
    request_id: str,
    method: str,
    path: str,
    user_id: Optional[str],
    duration_ms: float,
    status_code: int
):
    """Log request details."""
    logger.info(
        f"REQUEST | {request_id} | {method} {path} | "
        f"user={user_id or 'anonymous'} | "
        f"status={status_code} | "
        f"duration={duration_ms:.2f}ms"
    )


def _get_month_start(now: Optional[datetime] = None) -> datetime:
    """Return the UTC start of the current month."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now = now.astimezone(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _get_monthly_auto_apply_usage(
    db: Session,
    user_id: UUID,
    month_start: datetime
) -> int:
    """Count auto-apply submissions for the current month."""
    return db.query(func.count(Application.id)).filter(
        Application.user_id == user_id,
        Application.is_deleted == False,
        Application.match_score.isnot(None),
        Application.applied_at >= month_start,
    ).scalar() or 0


def _format_interview_email_payload(
    application: Application,
    interview_at: datetime,
) -> Optional[Dict[str, Any]]:
    """Build interview notification email payload from an application."""
    applicant = application.user
    job = application.job

    if not applicant or not applicant.email or not job or not interview_at:
        return None

    company = job.company
    company_name = None
    if company:
        company_name = company.company_name or company.full_name

    interview_type = application.interview_type or (
        "video" if job.is_remote_allowed or job.job_type == "remote" else "in-person"
    )

    return {
        "to_email": applicant.email,
        "user_name": applicant.full_name or "Foydalanuvchi",
        "job_title": job.title,
        "company_name": company_name or "Unknown company",
        "interview_date": interview_at.strftime("%Y-%m-%d"),
        "interview_time": interview_at.strftime("%H:%M"),
        "interview_type": interview_type,
        "meeting_link": application.meeting_link,
    }


def _resolve_interview_type(
    requested_type: Optional[str],
    job: Job,
    meeting_link: Optional[str] = None,
) -> str:
    """Resolve a usable interview type for storage and notifications."""
    if requested_type and requested_type.strip():
        return requested_type.strip().lower()

    if meeting_link:
        return "video"

    if job.is_remote_allowed or job.job_type == "remote":
        return "video"

    return "in-person"


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post(
    "/apply",
    response_model=StandardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply to a job",
    description="""
    Submit a job application.
    
    **Access:** Students only
    
    **Validation:**
    - Job must be active and accepting applications
    - Resume must be published
    - User can only apply once per job
    
    **Request Body:**
    ```json
    {
        "job_id": "uuid",
        "resume_id": "uuid",
        "cover_letter": "Optional cover letter..."
    }
    ```
    
    **Error Codes:**
    - `400`: Invalid input
    - `404`: Job or resume not found
    - `409`: Already applied to this job
    """,
    responses={
        201: {"description": "Application submitted successfully"},
        400: {"description": "Bad request - validation error"},
        404: {"description": "Job or resume not found"},
        409: {"description": "Already applied to this job"},
    }
)
async def apply_to_job(
    request: ApplyRequest,
    student: User = Depends(get_current_student),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit(max_requests=20, window_seconds=60))
):
    """Apply to a job posting."""
    
    start_time = time.time()
    request_id = str(uuid_module.uuid4())
    
    logger.info(f"[{request_id}] Application request from user: {student.id}")
    logger.info(f"[{request_id}] Job ID: {request.job_id}, Resume ID: {request.resume_id}")
    
    try:
        # =====================================================================
        # VALIDATE JOB
        # =====================================================================
        
        try:
            job_uuid = UUID(request.job_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid job ID format"
            )
        
        job = db.query(Job).filter(
            Job.id == job_uuid,
            Job.is_deleted == False
        ).first()
        
        if not job:
            logger.warning(f"[{request_id}] Job not found: {request.job_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        if job.status != JobStatus.ACTIVE.value:
            logger.warning(f"[{request_id}] Job not accepting applications: {job.status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This job is not currently accepting applications"
            )
        
        # =====================================================================
        # VALIDATE RESUME
        # =====================================================================
        
        try:
            resume_uuid = UUID(request.resume_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid resume ID format"
            )
        
        resume = db.query(Resume).filter(
            Resume.id == resume_uuid,
            Resume.user_id == student.id,
            Resume.is_deleted == False
        ).first()
        
        if not resume:
            logger.warning(f"[{request_id}] Resume not found: {request.resume_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        if resume.status != ResumeStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume must be published before using in applications. Please publish your resume first."
            )
        
        # =====================================================================
        # CHECK FOR DUPLICATE
        # =====================================================================
        
        existing = db.query(Application).filter(
            Application.job_id == job_uuid,
            Application.user_id == student.id,
            Application.is_deleted == False
        ).first()
        
        if existing:
            logger.warning(f"[{request_id}] Duplicate application attempt")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already applied to this job"
            )
        
        # =====================================================================
        # COMPUTE MATCH SCORE — snapshot at application time so HR sees the
        # same numbers the candidate did, even if the resume is edited later.
        # =====================================================================
        try:
            breakdown = job_matching.score_resume_against_job(resume.content, job)
        except Exception as match_err:  # pragma: no cover — never block apply on scoring
            logger.warning(f"[{request_id}] Match scoring failed: {match_err}")
            breakdown = None

        # =====================================================================
        # CREATE APPLICATION
        # =====================================================================

        application = Application(
            job_id=job.id,
            user_id=student.id,
            resume_id=resume.id,
            cover_letter=request.cover_letter,
            status=ApplicationStatus.PENDING.value,
            match_score=f"{breakdown['score']:.0f}%" if breakdown else None,
            match_breakdown=breakdown,
        )

        db.add(application)

        # Increment job application count
        job.increment_application_count()

        try:
            db.commit()
            db.refresh(application)
        except IntegrityError:
            # Race: another request inserted (user_id, job_id) between our
            # pre-check above and this commit. The DB unique constraint
            # uq_user_job is the only realistic source on this commit path
            # (FKs were validated earlier in the request), so convert to the
            # same 409 the pre-check returns instead of a 500. Do not surface
            # raw DB error text to the client.
            db.rollback()
            logger.warning(
                f"[{request_id}] Apply race: IntegrityError on commit for "
                f"user={student.id} job={job.id} — returning 409"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already applied to this job",
            )

        logger.info(f"[{request_id}] Application created: {application.id}")

        company_prefs = (job.company.notification_preferences or {}) if job.company else {}
        should_send_telegram = (
            bool(job.company)
            and company_prefs.get("telegram_enabled", False)
            and company_prefs.get("telegram_new_applications", True)
        )
        if should_send_telegram:
            candidate_name = student.full_name or "Nomzod"
            job_title = job.title or "Vakansiya"
            company_name = job.company.company_name or job.company.full_name or "Kompaniya"
            dashboard_url = f"{settings.FRONTEND_URL.rstrip('/')}/company/applicants/{application.id}"
            telegram_body = (
                f"Yangi ariza qabul qilindi.\n"
                f"Kompaniya: {company_name}\n"
                f"Vakansiya: {job_title}\n"
                f"Nomzod: {candidate_name}\n"
                f"Ko'rish: {dashboard_url}"
            )
            await send_company_telegram_notification(
                company=job.company,
                title="📥 Yangi ariza",
                message=telegram_body,
            )
        
        # Build response
        app_data = application_to_data(
            application,
            include_job=True,
            include_resume=True
        )
        
        duration = (time.time() - start_time) * 1000
        log_request(request_id, "POST", "/applications/apply", str(student.id), duration, 201)
        
        return create_response(
            success=True,
            message="Application submitted successfully! Good luck!",
            data=app_data.model_dump(),
            start_time=start_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[{request_id}] Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )


@router.get(
    "/my-applications",
    response_model=StandardResponse,
    summary="Get my applications",
    description="""
    Get all applications submitted by the current user.
    
    **Access:** All authenticated users
    
    **Query Parameters:**
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 20)
    - `status`: Filter by status
    
    **Response includes:**
    - Application list with job details
    - Status counts (pending, reviewing, interview, etc.)
    - Pagination info
    """
)
async def get_my_applications(
    pagination: PaginationParams = Depends(),
    status_filter: Optional[str] = Query(
        None, 
        alias="status",
        description="Filter by status: pending, reviewing, interview, rejected, accepted"
    ),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's applications with status counts."""
    
    start_time = time.time()
    
    logger.info(f"Fetching applications for user: {current_user.id}")
    
    # Build query
    q = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    )
    
    if status_filter:
        q = q.filter(Application.status == status_filter)
    
    # Get total
    total = q.count()
    
    # Get status counts
    status_counts = db.query(
        Application.status,
        func.count(Application.id)
    ).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    ).group_by(Application.status).all()
    
    counts = {s: c for s, c in status_counts}
    
    # Apply pagination
    applications = q.order_by(Application.applied_at.desc()).offset(
        pagination.skip
    ).limit(pagination.limit).all()
    
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    
    # Build response
    app_list = ApplicationListData(
        applications=[
            application_to_data(a, include_job=True, include_resume=True)
            for a in applications
        ],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        pending_count=counts.get(ApplicationStatus.PENDING.value, 0),
        reviewing_count=counts.get(ApplicationStatus.REVIEWING.value, 0),
        interview_count=counts.get(ApplicationStatus.INTERVIEW.value, 0),
        accepted_count=counts.get(ApplicationStatus.ACCEPTED.value, 0),
        rejected_count=counts.get(ApplicationStatus.REJECTED.value, 0),
    )
    
    return create_response(
        success=True,
        message=f"Found {total} applications",
        data=app_list.model_dump(),
        start_time=start_time
    )


@router.get(
    "/stats",
    response_model=StandardResponse,
    summary="Get application stats",
    description="Get application counts for the current user.",
)
async def get_application_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get status counts for the current user's applications."""

    start_time = time.time()

    q = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    )

    total = q.count()
    status_counts = db.query(
        Application.status,
        func.count(Application.id)
    ).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    ).group_by(Application.status).all()

    counts = {status: count for status, count in status_counts}

    return create_response(
        success=True,
        message="Application stats retrieved successfully",
        data={
            "total": total,
            "counts": counts,
            "pending": counts.get(ApplicationStatus.PENDING.value, 0),
            "reviewing": counts.get(ApplicationStatus.REVIEWING.value, 0),
            "shortlisted": counts.get(ApplicationStatus.SHORTLISTED.value, 0),
            "interview": counts.get(ApplicationStatus.INTERVIEW.value, 0),
            "accepted": counts.get(ApplicationStatus.ACCEPTED.value, 0),
            "rejected": counts.get(ApplicationStatus.REJECTED.value, 0),
            "withdrawn": counts.get(ApplicationStatus.WITHDRAWN.value, 0),
        },
        start_time=start_time
    )


@router.get(
    "/{application_id}",
    response_model=StandardResponse,
    summary="Get application details",
    description="""
    Get detailed information about a specific application.
    
    **Access:**
    - Applicant can view their own applications
    - Company can view applications for their jobs
    - Admin can view any application
    """
)
async def get_application(
    application_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get application details."""
    
    start_time = time.time()
    
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.is_deleted == False
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check access permissions
    is_applicant = application.user_id == current_user.id
    is_job_owner = application.job and application.job.company_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    
    if not (is_applicant or is_job_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this application"
        )
    
    # Determine what to include based on viewer
    include_applicant = is_job_owner or is_admin
    include_notes = is_job_owner or is_admin
    # Applicants see their own breakdown (transparency); HR sees it too.
    include_breakdown = is_applicant or is_job_owner or is_admin

    app_data = application_to_data(
        application,
        include_job=True,
        include_resume=True,
        include_applicant=include_applicant,
        include_notes=include_notes,
        include_breakdown=include_breakdown,
    )
    
    return create_response(
        success=True,
        message="Application retrieved successfully",
        data=app_data.model_dump(),
        start_time=start_time
    )


@router.put(
    "/{application_id}/status",
    response_model=StandardResponse,
    summary="Update application status",
    description="""
    Update the status of an application.
    
    **Access:** Company (job owner) or Admin only
    
    **Valid Status Transitions:**
    - `pending` → `reviewing`, `rejected`
    - `reviewing` → `shortlisted`, `rejected`
    - `shortlisted` → `interview`, `rejected`
    - `interview` → `accepted`, `rejected`
    
    **Note:** For `interview` status, you must provide `interview_at` datetime.
    """
)
async def update_application_status(
    application_id: UUID,
    request: StatusUpdateRequest,
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """Update application status (company only)."""
    
    start_time = time.time()
    
    logger.info(f"Status update for application {application_id} to {request.status}")
    
    # Get application
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.is_deleted == False
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Check ownership
    if application.job.company_id != company.id and company.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update applications for your own jobs"
        )

    interview_email_payload = None
    
    # Validate status
    valid_statuses = [s.value for s in ApplicationStatus]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    _apply_status_transition(application, request)
    
    db.commit()
    db.refresh(application)
    
    logger.info(f"Application {application.id} updated to {request.status}")

    if request.status == ApplicationStatus.INTERVIEW.value:
        interview_email_payload = _format_interview_email_payload(application, application.interview_at)

    if interview_email_payload:
        try:
            await email_service.send_interview_scheduled_email(
                to_email=interview_email_payload["to_email"],
                user_name=interview_email_payload["user_name"],
                job_title=interview_email_payload["job_title"],
                company_name=interview_email_payload["company_name"],
                interview_date=interview_email_payload["interview_date"],
                interview_time=interview_email_payload["interview_time"],
                interview_type=interview_email_payload["interview_type"],
                meeting_link=interview_email_payload["meeting_link"],
            )
        except Exception as exc:
            logger.exception(
                "Failed to send interview scheduled email for application %s: %s",
                application.id,
                exc,
            )
    
    app_data = application_to_data(
        application,
        include_job=True,
        include_resume=True,
        include_applicant=True,
        include_notes=True
    )
    
    return create_response(
        success=True,
        message=f"Application status updated to '{request.status}'",
        data=app_data.model_dump(),
        start_time=start_time
    )


@router.post(
    "/{application_id}/withdraw",
    response_model=StandardResponse,
    summary="Withdraw application",
    description="""
    Withdraw a submitted application.
    
    **Access:** Applicant only
    
    **Note:** Cannot withdraw applications that have already been decided (accepted/rejected).
    """
)
async def withdraw_application(
    application_id: UUID,
    student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """Withdraw a job application."""
    
    start_time = time.time()
    
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == student.id,
        Application.is_deleted == False
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.is_decided:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot withdraw an application that has already been decided"
        )
    
    application.withdraw()
    db.commit()
    db.refresh(application)
    
    logger.info(f"Application {application.id} withdrawn by user {student.id}")
    
    app_data = application_to_data(application, include_job=True)

    return create_response(
        success=True,
        message="Application withdrawn successfully",
        data=app_data.model_dump(),
        start_time=start_time
    )


# =============================================================================
# HIRING FUNNEL ANALYTICS (COMPANY)
# =============================================================================


@router.get(
    "/analytics/funnel",
    response_model=StandardResponse,
    summary="Hiring funnel analytics for the current company",
    description="""
    Aggregates the company's hiring metrics: total jobs/applications/views,
    funnel by status, conversion rates, top-performing jobs, and recent activity.

    **Access:** Company users only.
    """,
)
async def hiring_funnel_analytics(
    days: int = Query(30, ge=1, le=365, description="Window for 'recent' metrics"),
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Hiring funnel + KPIs for the authenticated company."""
    start_time = time.time()
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)

    # =====================================================================
    # JOBS — totals + view aggregation
    # =====================================================================
    job_rows = db.query(Job).filter(
        Job.company_id == company.id,
        Job.is_deleted == False,
    ).all()
    total_jobs = len(job_rows)
    active_jobs = sum(1 for j in job_rows if j.status == JobStatus.ACTIVE.value)
    total_views = sum((j.views_count or 0) for j in job_rows)
    job_ids = [j.id for j in job_rows]

    if not job_ids:
        empty: Dict[str, Any] = {
            "totals": {
                "total_jobs": 0,
                "active_jobs": 0,
                "total_applications": 0,
                "total_views": 0,
                "avg_match_score": None,
            },
            "funnel": {k: 0 for k in (
                "views", "applications", "reviewing", "shortlisted",
                "interview", "accepted", "rejected",
            )},
            "conversion_rates": {
                "view_to_apply": 0.0,
                "apply_to_review": 0.0,
                "review_to_interview": 0.0,
                "interview_to_hire": 0.0,
            },
            "by_status": [],
            "top_jobs": [],
            "recent_activity": {
                "applications_in_window": 0,
                "hires_in_window": 0,
                "window_days": days,
            },
        }
        return create_response(
            success=True,
            message="No jobs yet",
            data=empty,
            start_time=start_time,
        )

    # =====================================================================
    # APPLICATIONS — single aggregated query by status
    # =====================================================================
    status_rows = (
        db.query(Application.status, func.count(Application.id))
        .filter(Application.job_id.in_(job_ids), Application.is_deleted == False)
        .group_by(Application.status)
        .all()
    )
    by_status: Dict[str, int] = {status_value: count for status_value, count in status_rows}
    total_applications = sum(by_status.values())

    reviewing = by_status.get(ApplicationStatus.REVIEWING.value, 0)
    shortlisted = by_status.get(ApplicationStatus.SHORTLISTED.value, 0)
    interview = by_status.get(ApplicationStatus.INTERVIEW.value, 0)
    accepted = by_status.get(ApplicationStatus.ACCEPTED.value, 0)
    rejected = by_status.get(ApplicationStatus.REJECTED.value, 0)
    # "Reached review or further" — anything past pending.
    reached_review = reviewing + shortlisted + interview + accepted + rejected
    reached_interview = interview + accepted

    # =====================================================================
    # AVG MATCH SCORE — parses "85%" strings from match_score
    # =====================================================================
    score_rows = (
        db.query(Application.match_score)
        .filter(
            Application.job_id.in_(job_ids),
            Application.is_deleted == False,
            Application.match_score.isnot(None),
        )
        .all()
    )
    scores: List[float] = []
    for (raw,) in score_rows:
        if not raw:
            continue
        digits = "".join(ch for ch in raw if ch.isdigit() or ch == ".")
        try:
            scores.append(float(digits))
        except ValueError:
            continue
    avg_match_score = round(sum(scores) / len(scores), 1) if scores else None

    # =====================================================================
    # TOP-PERFORMING JOBS — most applications, with interview count
    # =====================================================================
    per_job_rows = (
        db.query(
            Application.job_id,
            Application.status,
            func.count(Application.id),
        )
        .filter(Application.job_id.in_(job_ids), Application.is_deleted == False)
        .group_by(Application.job_id, Application.status)
        .all()
    )
    per_job: Dict[Any, Dict[str, int]] = {}
    for job_id, status_value, count in per_job_rows:
        bucket = per_job.setdefault(job_id, {})
        bucket[status_value] = count

    top_jobs = []
    for job in job_rows:
        bucket = per_job.get(job.id, {})
        apps_count = sum(bucket.values())
        if apps_count == 0 and (job.views_count or 0) == 0:
            continue
        top_jobs.append(
            {
                "id": str(job.id),
                "title": job.title,
                "status": job.status,
                "views": job.views_count or 0,
                "applications": apps_count,
                "interview_count": bucket.get(ApplicationStatus.INTERVIEW.value, 0)
                + bucket.get(ApplicationStatus.ACCEPTED.value, 0),
                "accepted_count": bucket.get(ApplicationStatus.ACCEPTED.value, 0),
            }
        )
    top_jobs.sort(key=lambda j: (j["applications"], j["views"]), reverse=True)
    top_jobs = top_jobs[:10]

    # =====================================================================
    # RECENT ACTIVITY — applications + hires in the requested window
    # =====================================================================
    applications_in_window = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids),
            Application.is_deleted == False,
            Application.applied_at >= window_start,
        )
        .scalar()
        or 0
    )
    hires_in_window = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids),
            Application.is_deleted == False,
            Application.status == ApplicationStatus.ACCEPTED.value,
            Application.decided_at >= window_start,
        )
        .scalar()
        or 0
    )

    # =====================================================================
    # CONVERSION RATES
    # =====================================================================
    def safe_pct(numerator: int, denominator: int) -> float:
        if denominator <= 0:
            return 0.0
        return round((numerator / denominator) * 100, 1)

    data = {
        "totals": {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_applications": total_applications,
            "total_views": total_views,
            "avg_match_score": avg_match_score,
        },
        "funnel": {
            "views": total_views,
            "applications": total_applications,
            "reviewing": reached_review,
            "shortlisted": shortlisted + interview + accepted,
            "interview": reached_interview,
            "accepted": accepted,
            "rejected": rejected,
        },
        "conversion_rates": {
            "view_to_apply": safe_pct(total_applications, total_views),
            "apply_to_review": safe_pct(reached_review, total_applications),
            "review_to_interview": safe_pct(reached_interview, reached_review),
            "interview_to_hire": safe_pct(accepted, reached_interview),
        },
        "by_status": [{"status": k, "count": v} for k, v in sorted(by_status.items())],
        "top_jobs": top_jobs,
        "recent_activity": {
            "applications_in_window": applications_in_window,
            "hires_in_window": hires_in_window,
            "window_days": days,
        },
    }

    return create_response(
        success=True,
        message="Hiring funnel analytics",
        data=data,
        start_time=start_time,
    )


@router.get(
    "/analytics/job/{job_id}",
    response_model=StandardResponse,
    summary="Per-vacancy analytics",
    description="Detailed analytics for a single company vacancy including daily trends and funnel.",
)
async def vacancy_analytics(
    job_id: UUID,
    days: int = Query(30, ge=1, le=365),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    start_at, end_at, window_days, start_day, end_day = _parse_analytics_window(
        days=days,
        start_date=start_date,
        end_date=end_date,
    )

    job = db.query(Job).filter(
        Job.id == job_id,
        Job.is_deleted == False,
    ).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.company_id != company.id and company.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    applications_all = db.query(Application).filter(
        Application.job_id == job.id,
        Application.is_deleted == False,
    ).all()

    applications_in_window = [
        app for app in applications_all
        if app.applied_at and start_at <= app.applied_at < end_at
    ]

    daily_app_map: Dict[str, int] = {}
    for app in applications_in_window:
        key = app.applied_at.astimezone(timezone.utc).date().isoformat()
        daily_app_map[key] = daily_app_map.get(key, 0) + 1

    view_rows = (
        db.query(FunnelEvent)
        .filter(
            FunnelEvent.job_id == job.id,
            FunnelEvent.event_name.in_(list(VIEW_EVENT_NAMES)),
            FunnelEvent.created_at >= start_at,
            FunnelEvent.created_at < end_at,
        )
        .all()
    )
    daily_view_map: Dict[str, int] = {}
    for row in view_rows:
        created = row.created_at
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        key = created.astimezone(timezone.utc).date().isoformat()
        daily_view_map[key] = daily_view_map.get(key, 0) + 1

    total_views = int(job.views_count or 0)
    total_applications = len(applications_all)
    conversion_pct = _safe_pct(total_applications, total_views)

    screened = sum(1 for app in applications_all if app.status != ApplicationStatus.PENDING.value)
    interview = sum(
        1 for app in applications_all
        if app.status in {
            ApplicationStatus.INTERVIEW.value,
            ApplicationStatus.ACCEPTED.value,
            ApplicationStatus.HIRED.value,
        }
    )
    hired = sum(
        1 for app in applications_all
        if app.status in {ApplicationStatus.HIRED.value, ApplicationStatus.ACCEPTED.value}
    )

    source_rows = (
        db.query(FunnelEvent.source, func.count(FunnelEvent.id))
        .filter(
            FunnelEvent.job_id == job.id,
            FunnelEvent.created_at >= start_at,
            FunnelEvent.created_at < end_at,
            FunnelEvent.source.isnot(None),
        )
        .group_by(FunnelEvent.source)
        .all()
    )
    source_total = sum(int(count) for _, count in source_rows) or 0
    source_breakdown = [
        {
            "source": source_value or "unknown",
            "count": int(count),
            "share_pct": _safe_pct(int(count), source_total),
        }
        for source_value, count in source_rows
    ]
    source_breakdown.sort(key=lambda item: item["count"], reverse=True)

    data = {
        "job": {
            "id": str(job.id),
            "title": job.title,
            "status": job.status,
        },
        "window": {
            "days": window_days,
            "start_date": start_day,
            "end_date": end_day,
        },
        "summary": {
            "views": total_views,
            "applications": total_applications,
            "conversion_pct": conversion_pct,
            "applications_in_window": len(applications_in_window),
            "views_events_in_window": sum(daily_view_map.values()),
        },
        "daily_views": _build_date_bucket_series(
            start_day=start_day,
            end_day=end_day,
            counts_map=daily_view_map,
        ),
        "daily_applications": _build_date_bucket_series(
            start_day=start_day,
            end_day=end_day,
            counts_map=daily_app_map,
        ),
        "funnel": {
            "views": total_views,
            "applications": total_applications,
            "screened": screened,
            "interview": interview,
            "hired": hired,
        },
        "source_breakdown": source_breakdown,
    }
    return create_response(True, "Vacancy analytics", data, start_time)


@router.get(
    "/analytics/company-dashboard",
    response_model=StandardResponse,
    summary="Company-level analytics dashboard",
    description="Aggregated analytics across all company vacancies with custom date range support.",
)
async def company_dashboard_analytics(
    days: int = Query(30, ge=1, le=365),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    start_at, end_at, window_days, start_day, end_day = _parse_analytics_window(
        days=days,
        start_date=start_date,
        end_date=end_date,
    )

    jobs = db.query(Job).filter(
        Job.company_id == company.id,
        Job.is_deleted == False,
    ).all()
    job_ids = [job.id for job in jobs]
    if not job_ids:
        empty = {
            "window": {
                "days": window_days,
                "start_date": start_day,
                "end_date": end_day,
            },
            "overview": {
                "total_active_jobs": 0,
                "applications_this_month": 0,
                "avg_time_to_hire_hours": 0.0,
                "response_rate_pct": 0.0,
                "avg_first_response_hours": 0.0,
            },
            "funnel": {"views": 0, "applications": 0, "screened": 0, "interview": 0, "hired": 0},
            "top_vacancies": [],
            "pipeline_summary": {},
            "response_time_tracker": {"avg_hours": 0.0, "sample_size": 0},
            "source_breakdown": [],
            "daily_views": [],
            "daily_applications": [],
        }
        return create_response(True, "Company analytics", empty, start_time)

    applications_all = db.query(Application).filter(
        Application.job_id.in_(job_ids),
        Application.is_deleted == False,
    ).all()
    # DB datetimes are stored as naive UTC; coerce to aware UTC before comparing
    # against the timezone-aware analytics window (otherwise: "can't compare
    # offset-naive and offset-aware datetimes").
    def _as_utc(dt):
        if dt is not None and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    applications_in_window = [
        app for app in applications_all
        if app.applied_at and start_at <= _as_utc(app.applied_at) < end_at
    ]

    today = datetime.now(timezone.utc).date()
    month_start = datetime.combine(today.replace(day=1), datetime.min.time(), tzinfo=timezone.utc)
    applications_this_month = sum(1 for app in applications_all if app.applied_at and _as_utc(app.applied_at) >= month_start)

    responded = [app for app in applications_in_window if app.status != ApplicationStatus.PENDING.value]
    response_rate_pct = _safe_pct(len(responded), len(applications_in_window))

    first_response_hours: List[float] = []
    for app in applications_in_window:
        if app.status == ApplicationStatus.PENDING.value or not app.applied_at:
            continue
        first_action_at = app.reviewed_at or app.interview_at or app.decided_at or app.updated_at
        if not first_action_at:
            continue
        delta = first_action_at - app.applied_at
        hours = delta.total_seconds() / 3600
        if hours >= 0:
            first_response_hours.append(hours)
    avg_first_response_hours = round(sum(first_response_hours) / len(first_response_hours), 2) if first_response_hours else 0.0

    hired_apps = [
        app for app in applications_in_window
        if app.status in {ApplicationStatus.HIRED.value, ApplicationStatus.ACCEPTED.value}
        and app.decided_at
        and app.applied_at
    ]
    time_to_hire_hours = [
        (app.decided_at - app.applied_at).total_seconds() / 3600
        for app in hired_apps
        if (app.decided_at - app.applied_at).total_seconds() >= 0
    ]
    avg_time_to_hire_hours = round(sum(time_to_hire_hours) / len(time_to_hire_hours), 2) if time_to_hire_hours else 0.0

    pipeline_summary: Dict[str, int] = {}
    for app in applications_all:
        pipeline_summary[app.status] = pipeline_summary.get(app.status, 0) + 1

    per_job_apps: Dict[Any, int] = {}
    per_job_status: Dict[Any, Dict[str, int]] = {}
    for app in applications_in_window:
        per_job_apps[app.job_id] = per_job_apps.get(app.job_id, 0) + 1
        status_bucket = per_job_status.setdefault(app.job_id, {})
        status_bucket[app.status] = status_bucket.get(app.status, 0) + 1

    top_vacancies: List[Dict[str, Any]] = []
    for job in jobs:
        apps_count = per_job_apps.get(job.id, 0)
        if apps_count == 0 and (job.views_count or 0) == 0:
            continue
        conversion = _safe_pct(apps_count, int(job.views_count or 0))
        status_bucket = per_job_status.get(job.id, {})
        top_vacancies.append(
            {
                "id": str(job.id),
                "title": job.title,
                "status": job.status,
                "views": int(job.views_count or 0),
                "applications": apps_count,
                "conversion_pct": conversion,
                "interview_count": status_bucket.get(ApplicationStatus.INTERVIEW.value, 0),
                "hired_count": status_bucket.get(ApplicationStatus.HIRED.value, 0)
                + status_bucket.get(ApplicationStatus.ACCEPTED.value, 0),
            }
        )
    top_vacancies.sort(key=lambda item: (item["applications"], item["conversion_pct"]), reverse=True)
    top_vacancies = top_vacancies[:10]

    view_event_rows = (
        db.query(FunnelEvent)
        .filter(
            FunnelEvent.job_id.in_(job_ids),
            FunnelEvent.event_name.in_(list(VIEW_EVENT_NAMES)),
            FunnelEvent.created_at >= start_at,
            FunnelEvent.created_at < end_at,
        )
        .all()
    )
    views_daily_map: Dict[str, int] = {}
    for row in view_event_rows:
        created = row.created_at
        if not created:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        key = created.astimezone(timezone.utc).date().isoformat()
        views_daily_map[key] = views_daily_map.get(key, 0) + 1

    apps_daily_map: Dict[str, int] = {}
    for app in applications_in_window:
        key = _as_utc(app.applied_at).astimezone(timezone.utc).date().isoformat()
        apps_daily_map[key] = apps_daily_map.get(key, 0) + 1

    source_rows = (
        db.query(FunnelEvent.source, func.count(FunnelEvent.id))
        .filter(
            FunnelEvent.job_id.in_(job_ids),
            FunnelEvent.created_at >= start_at,
            FunnelEvent.created_at < end_at,
            FunnelEvent.source.isnot(None),
        )
        .group_by(FunnelEvent.source)
        .all()
    )
    source_total = sum(int(count) for _, count in source_rows) or 0
    source_breakdown = [
        {
            "source": source_value or "unknown",
            "count": int(count),
            "share_pct": _safe_pct(int(count), source_total),
        }
        for source_value, count in source_rows
    ]
    source_breakdown.sort(key=lambda item: item["count"], reverse=True)

    funnel = {
        "views": sum(views_daily_map.values()),
        "applications": len(applications_in_window),
        "screened": sum(1 for app in applications_in_window if app.status != ApplicationStatus.PENDING.value),
        "interview": sum(
            1 for app in applications_in_window
            if app.status in {
                ApplicationStatus.INTERVIEW.value,
                ApplicationStatus.ACCEPTED.value,
                ApplicationStatus.HIRED.value,
            }
        ),
        "hired": sum(
            1 for app in applications_in_window
            if app.status in {ApplicationStatus.HIRED.value, ApplicationStatus.ACCEPTED.value}
        ),
    }

    data = {
        "window": {
            "days": window_days,
            "start_date": start_day,
            "end_date": end_day,
        },
        "overview": {
            "total_active_jobs": sum(1 for job in jobs if job.status == JobStatus.ACTIVE.value),
            "applications_this_month": applications_this_month,
            "avg_time_to_hire_hours": avg_time_to_hire_hours,
            "response_rate_pct": response_rate_pct,
            "avg_first_response_hours": avg_first_response_hours,
        },
        "funnel": funnel,
        "top_vacancies": top_vacancies,
        "pipeline_summary": pipeline_summary,
        "response_time_tracker": {
            "avg_hours": avg_first_response_hours,
            "sample_size": len(first_response_hours),
        },
        "source_breakdown": source_breakdown,
        "daily_views": _build_date_bucket_series(
            start_day=start_day,
            end_day=end_day,
            counts_map=views_daily_map,
        ),
        "daily_applications": _build_date_bucket_series(
            start_day=start_day,
            end_day=end_day,
            counts_map=apps_daily_map,
        ),
    }
    return create_response(True, "Company analytics dashboard", data, start_time)


@router.post(
    "/auto-apply",
    response_model=StandardResponse,
    summary="🔥 Auto-apply to matching jobs",
    description="""
    **PREMIUM FEATURE** - Automatically apply to jobs matching your criteria.
    
    This endpoint will:
    1. Find jobs matching your criteria
    2. Calculate match scores
    3. Apply to the best matches (up to max_applications)
    4. Optionally generate cover letters
    
    **Request Body:**
    ```json
    {
        "resume_id": "uuid",
        "criteria": {
            "job_types": ["remote", "full_time"],
            "locations": ["Tashkent"],
            "keywords": ["python", "backend"],
            "min_salary": 5000000,
            "max_applications": 10
        },
        "dry_run": false
    }
    ```
    
    **dry_run mode:**
    - If `true`: Only shows matches, doesn't apply
    - If `false`: Actually submits applications
    
    **Returns:**
    - List of matched jobs with scores
    - Which applications were submitted
    - Which were skipped (already applied, etc.)
    """
)
async def auto_apply(
    request: AutoApplyRequest,
    student: User = Depends(get_current_student),
    _premium_user: User = Depends(get_premium_user),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit(max_requests=5, window_seconds=60))  # Stricter rate limit
):
    """Auto-apply to matching jobs."""
    
    start_time = time.time()
    request_id = str(uuid_module.uuid4())
    
    logger.info(f"[{request_id}] 🤖 Auto-apply started for user: {student.id}")
    logger.info(f"[{request_id}] Criteria: {request.criteria.model_dump()}")
    logger.info(f"[{request_id}] Dry run: {request.dry_run}")
    
    try:
        # =====================================================================
        # VALIDATE RESUME
        # =====================================================================
        
        try:
            resume_uuid = UUID(request.resume_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid resume ID format"
            )
        
        resume = db.query(Resume).filter(
            Resume.id == resume_uuid,
            Resume.user_id == student.id,
            Resume.is_deleted == False
        ).first()
        
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found"
            )
        
        if resume.status != ResumeStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume must be published to use auto-apply"
            )

        # =====================================================================
        # CHECK MONTHLY QUOTA
        # =====================================================================

        month_start = _get_month_start()
        monthly_limit = get_feature_limit("auto_apply", student.subscription_tier)
        current_month_usage = _get_monthly_auto_apply_usage(db, student.id, month_start)
        quota_remaining = None
        if monthly_limit is not None:
            quota_remaining = max(monthly_limit - current_month_usage, 0)

        logger.info(
            f"[{request_id}] Monthly auto-apply usage: {current_month_usage} / "
            f"{monthly_limit if monthly_limit is not None else 'unlimited'}"
        )
        
        # =====================================================================
        # FIND MATCHING JOBS
        # =====================================================================
        
        criteria = request.criteria
        
        q = db.query(Job).filter(
            Job.is_deleted == False,
            Job.status == JobStatus.ACTIVE.value
        )
        
        # Apply filters
        if criteria.job_types:
            q = q.filter(Job.job_type.in_(criteria.job_types))
        
        if criteria.locations:
            location_filters = [Job.location.ilike(f"%{loc}%") for loc in criteria.locations]
            # Also include remote jobs if looking for remote
            if "remote" in [loc.lower() for loc in criteria.locations]:
                location_filters.append(Job.is_remote_allowed == True)
            q = q.filter(or_(*location_filters))
        
        if criteria.experience_levels:
            q = q.filter(Job.experience_level.in_(criteria.experience_levels))
        
        if criteria.min_salary:
            q = q.filter(
                or_(
                    Job.salary_min >= criteria.min_salary,
                    Job.salary_min.is_(None)
                )
            )
        
        if criteria.exclude_companies:
            try:
                exclude_uuids = [UUID(c) for c in criteria.exclude_companies]
                q = q.filter(~Job.company_id.in_(exclude_uuids))
            except ValueError:
                pass
        
        # Keyword search
        if criteria.keywords:
            keyword_filters = []
            for keyword in criteria.keywords:
                keyword_filters.append(Job.title.ilike(f"%{keyword}%"))
                keyword_filters.append(Job.description.ilike(f"%{keyword}%"))
            q = q.filter(or_(*keyword_filters))
        
        # Get jobs
        jobs = q.limit(100).all()  # Limit to 100 for performance
        
        logger.info(f"[{request_id}] Found {len(jobs)} matching jobs")
        
        # =====================================================================
        # GET EXISTING APPLICATIONS
        # =====================================================================
        
        existing_apps = db.query(Application.job_id).filter(
            Application.user_id == student.id,
            Application.is_deleted == False
        ).all()
        
        already_applied = {app[0] for app in existing_apps}
        
        # =====================================================================
        # CALCULATE SCORES AND RANK
        # =====================================================================
        
        # Use the shared matching service so candidate and recruiter see identical numbers.
        resume_skills = job_matching.extract_skills_from_resume(resume.content)
        resume_experience = job_matching.extract_experience_level(resume.content)
        resume_keywords = job_matching.extract_keywords(resume.content)

        scored_jobs: list = []
        for job in jobs:
            if job.id in already_applied:
                continue

            score, matched, missing, reasons = job_matching.calculate_match_score(
                resume_skills=resume_skills,
                resume_experience=resume_experience,
                resume_keywords=resume_keywords,
                job=job,
            )
            scored_jobs.append((job, score, matched, missing, reasons))
        
        # Sort by score (highest first)
        scored_jobs.sort(key=lambda x: x[1], reverse=True)
        
        # Limit to max_applications
        scored_jobs = scored_jobs[:criteria.max_applications]
        
        logger.info(f"[{request_id}] {len(scored_jobs)} jobs eligible for application")
        
        # =====================================================================
        # APPLY TO JOBS
        # =====================================================================
        
        results = []
        applications_submitted = 0
        applications_skipped = 0
        quota_notice_seen = False

        for job, score, matched, missing, reasons in scored_jobs:
            company_name = job.company.company_name or job.company.full_name if job.company else "Unknown"

            result = AutoApplyResult(
                job_id=str(job.id),
                job_title=job.title,
                company_name=company_name,
                match_score=round(score, 1),
                applied=False,
                message="",
            )

            if request.dry_run:
                result.message = "Dry run - not applied"
                applications_skipped += 1
            elif quota_remaining is not None and quota_remaining <= 0:
                result.message = "Monthly auto-apply quota reached"
                applications_skipped += 1
                quota_notice_seen = True
            else:
                try:
                    # Create application
                    application = Application(
                        job_id=job.id,
                        user_id=student.id,
                        resume_id=resume.id,
                        cover_letter=f"Auto-applied via IshTop with {score:.0f}% match score.",
                        status=ApplicationStatus.PENDING.value,
                        match_score=f"{score:.0f}%",
                        match_breakdown={
                            "score": round(score, 1),
                            "matched_skills": matched,
                            "missing_skills": missing,
                            "reasons": reasons,
                        },
                    )
                    
                    db.add(application)
                    job.increment_application_count()
                    db.flush()  # Get the ID
                    
                    result.applied = True
                    result.message = "Successfully applied"
                    result.application_id = str(application.id)
                    applications_submitted += 1
                    if quota_remaining is not None:
                        quota_remaining -= 1
                    
                except IntegrityError:
                    db.rollback()
                    result.message = "Already applied (duplicate)"
                    applications_skipped += 1
                except Exception as e:
                    db.rollback()
                    result.message = f"Error: {str(e)}"
                    applications_skipped += 1
            
            results.append(result)
        
        # Commit all applications
        if not request.dry_run:
            db.commit()
        
        # =====================================================================
        # BUILD RESPONSE
        # =====================================================================
        
        processing_time = time.time() - start_time
        
        logger.info(f"[{request_id}] ✅ Auto-apply complete:")
        logger.info(f"[{request_id}]    Submitted: {applications_submitted}")
        logger.info(f"[{request_id}]    Skipped: {applications_skipped}")
        logger.info(f"[{request_id}]    Time: {processing_time:.2f}s")
        
        response_data = AutoApplyData(
            total_jobs_matched=len(scored_jobs),
            applications_submitted=applications_submitted,
            applications_skipped=applications_skipped,
            results=results,
            resume_used=resume.title,
            dry_run=request.dry_run,
            monthly_limit=monthly_limit,
            monthly_used=(
                current_month_usage
                if request.dry_run
                else current_month_usage + applications_submitted
            ),
            monthly_remaining=(
                None
                if monthly_limit is None
                else max(
                    monthly_limit
                    - (
                        current_month_usage
                        if request.dry_run
                        else current_month_usage + applications_submitted
                    ),
                    0,
                )
            ),
        )
        
        message = f"Auto-apply complete! {applications_submitted} applications submitted."
        if request.dry_run:
            message = f"Dry run complete. {len(results)} jobs would be applied to."
        elif quota_notice_seen or (
            monthly_limit is not None
            and current_month_usage >= monthly_limit
            and applications_submitted == 0
        ):
            message = (
                f"Monthly auto-apply quota reached. {applications_submitted} "
                f"applications submitted."
            )

        return create_response(
            success=True,
            message=message,
            data=response_data.model_dump(),
            start_time=start_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[{request_id}] Auto-apply error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during auto-apply. Please try again."
        )


# =============================================================================
# REVERSE MATCHING — top candidates per job (HR side)
# =============================================================================


@router.get(
    "/jobs/{job_id}/top-candidates",
    response_model=StandardResponse,
    summary="Top candidates for a job, ranked by match score",
    description="""
    Ranks every applicant for this job (and optionally the broader candidate
    pool) using the shared `job_matching` service, then returns the top N.
    Owner-company only.
    """,
)
async def top_candidates_for_job(
    job_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    pool: str = Query(
        "applicants",
        description="'applicants' = only people who applied; 'all' = every published resume in the DB",
        regex="^(applicants|all)$",
    ),
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()

    job = db.query(Job).filter(Job.id == job_id, Job.is_deleted == False).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.company_id != company.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # =====================================================================
    # 1. APPLIED CANDIDATES — score from already-stored match_breakdown,
    #    fall back to live scoring if breakdown is missing (legacy data).
    # =====================================================================
    applied_apps = (
        db.query(Application)
        .filter(Application.job_id == job.id, Application.is_deleted == False)
        .all()
    )
    applied_ids = {a.user_id for a in applied_apps}

    scored: list = []
    for app in applied_apps:
        bd = app.match_breakdown
        if not bd and app.resume:
            try:
                bd = job_matching.score_resume_against_job(app.resume.content, job)
            except Exception:
                bd = None
        score = float(bd.get("score", 0)) if isinstance(bd, dict) else 0.0
        matched = (bd or {}).get("matched_skills") or []
        missing = (bd or {}).get("missing_skills") or []
        applicant = app.user
        scored.append(
            {
                "source": "applicant",
                "application_id": str(app.id),
                "user_id": str(applicant.id) if applicant else None,
                "full_name": applicant.full_name if applicant else None,
                "email": applicant.email if applicant else None,
                "avatar_url": getattr(applicant, "avatar_url", None),
                "status": app.status,
                "score": round(score, 1),
                "matched_skills": matched[:8],
                "missing_skills": missing[:5],
                "resume_title": app.resume.title if app.resume else None,
            }
        )

    # =====================================================================
    # 2. POOL = "all" — additionally score every published resume from
    #    candidates who haven't applied yet (sourcing suggestions).
    # =====================================================================
    if pool == "all":
        candidate_resumes = (
            db.query(Resume)
            .join(User, User.id == Resume.user_id)
            .filter(
                Resume.is_deleted == False,
                Resume.status == ResumeStatus.PUBLISHED.value,
                User.role == UserRole.STUDENT,
                User.is_deleted == False,
                ~Resume.user_id.in_(applied_ids) if applied_ids else True,
            )
            .all()
        )
        for resume in candidate_resumes:
            try:
                bd = job_matching.score_resume_against_job(resume.content, job)
            except Exception:
                continue
            score = float(bd.get("score", 0))
            if score < 25:  # below this it's noise
                continue
            user = resume.user
            scored.append(
                {
                    "source": "sourced",
                    "application_id": None,
                    "user_id": str(user.id) if user else None,
                    "full_name": user.full_name if user else None,
                    "email": user.email if user else None,
                    "avatar_url": getattr(user, "avatar_url", None),
                    "status": None,
                    "score": round(score, 1),
                    "matched_skills": (bd.get("matched_skills") or [])[:8],
                    "missing_skills": (bd.get("missing_skills") or [])[:5],
                    "resume_title": resume.title,
                }
            )

    scored.sort(key=lambda x: x["score"], reverse=True)

    return create_response(
        success=True,
        message=f"Top {min(len(scored), limit)} candidates ranked for {job.title}",
        data={
            "job": {
                "id": str(job.id),
                "title": job.title,
                "requirements_count": len(job.requirements) if isinstance(job.requirements, list) else 0,
            },
            "candidates": scored[:limit],
            "pool": pool,
            "total_evaluated": len(scored),
        },
        start_time=start_time,
    )


@router.get(
    "/company/list",
    response_model=StandardResponse,
    summary="List company applications (optionally by job)",
)
async def list_company_applications(
    job_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()

    q = (
        db.query(Application)
        .join(Job, Job.id == Application.job_id)
        .join(User, User.id == Application.user_id)
        .filter(
            Application.is_deleted == False,
            Job.is_deleted == False,
            Job.company_id == company.id,
            User.is_deleted == False,
        )
    )

    if job_id:
        try:
            q = q.filter(Application.job_id == UUID(job_id))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job_id")

    if status_filter:
        q = q.filter(Application.status == status_filter.strip().lower())

    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(or_(User.full_name.ilike(term), User.email.ilike(term)))

    rows = q.order_by(Application.applied_at.desc()).all()

    if tag and tag.strip():
        lookup = tag.strip().lower()
        rows = [
            app for app in rows
            if any(str(item).strip().lower() == lookup for item in (app.tags or []))
        ]

    total = len(rows)
    start = (page - 1) * page_size
    end = start + page_size
    paged = rows[start:end]

    status_counts: Dict[str, int] = {}
    for app in rows:
        status_counts[app.status] = status_counts.get(app.status, 0) + 1

    data = {
        "applications": [
            application_to_data(
                app,
                include_job=True,
                include_resume=True,
                include_applicant=True,
                include_notes=True,
                include_breakdown=True,
            ).model_dump()
            for app in paged
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
        "status_counts": status_counts,
    }
    return create_response(True, "Company applications retrieved", data, start_time)


def _company_scoped_applications(
    db: Session,
    company_id: UUID,
    application_ids: List[str],
) -> List[Application]:
    valid_ids: List[UUID] = []
    for raw_id in application_ids:
        try:
            valid_ids.append(UUID(raw_id))
        except ValueError:
            continue
    if not valid_ids:
        return []
    return (
        db.query(Application)
        .join(Job, Job.id == Application.job_id)
        .filter(
            Application.id.in_(valid_ids),
            Application.is_deleted == False,
            Job.is_deleted == False,
            Job.company_id == company_id,
        )
        .all()
    )


@router.post(
    "/company/bulk-status",
    response_model=StandardResponse,
    summary="Bulk update candidate status",
)
async def company_bulk_status_update(
    request: BulkStatusUpdateRequest,
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()

    valid_statuses = [s.value for s in ApplicationStatus]
    target_status = (request.status or "").strip().lower()
    if target_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
        )
    if target_status == ApplicationStatus.INTERVIEW.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bulk interview status update is not supported. Use individual scheduling.",
        )

    rows = _company_scoped_applications(db, company.id, request.application_ids)
    if not rows:
        return create_response(True, "No applications matched", {"updated": 0}, start_time)

    payload = StatusUpdateRequest(status=target_status, notes=request.notes)
    for app in rows:
        _apply_status_transition(app, payload)

    db.commit()
    return create_response(
        True,
        "Bulk status update completed",
        {"updated": len(rows), "status": target_status},
        start_time,
    )


def _append_message_history(
    application: Application,
    *,
    sender: User,
    subject: str,
    body: str,
    template_key: Optional[str],
    delivered: bool,
) -> None:
    history = list(application.message_history or [])
    history.append(
        {
            "id": str(uuid_module.uuid4()),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "sender_id": str(sender.id),
            "sender_name": sender.full_name,
            "channel": "email",
            "subject": subject,
            "body": body,
            "template_key": template_key,
            "delivered": delivered,
        }
    )
    application.message_history = history[-100:]


@router.post(
    "/company/bulk-email",
    response_model=StandardResponse,
    summary="Send templated email to selected candidates",
)
async def company_bulk_email_send(
    request: BulkEmailRequest,
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    rows = _company_scoped_applications(db, company.id, request.application_ids)
    if not rows:
        return create_response(True, "No applications matched", {"sent": 0, "failed": 0}, start_time)

    sent = 0
    failed = 0
    for app in rows:
        to_email = app.user.email if app.user else None
        if not to_email:
            failed += 1
            _append_message_history(
                app,
                sender=company,
                subject=request.subject,
                body=request.body,
                template_key=request.template_key,
                delivered=False,
            )
            continue

        ok = await email_service.send_raw_email(
            to_email=to_email,
            to_name=app.user.full_name if app.user else None,
            subject=request.subject,
            body=request.body,
            html=False,
        )
        if ok:
            sent += 1
        else:
            failed += 1
        _append_message_history(
            app,
            sender=company,
            subject=request.subject,
            body=request.body,
            template_key=request.template_key,
            delivered=ok,
        )

    db.commit()
    return create_response(
        True,
        "Bulk email operation completed",
        {"sent": sent, "failed": failed, "total": len(rows)},
        start_time,
    )


@router.put(
    "/{application_id}/notes-tags",
    response_model=StandardResponse,
    summary="Update private notes and tags for an application",
)
async def update_notes_and_tags(
    application_id: UUID,
    request: NotesTagsUpdateRequest,
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.is_deleted == False,
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if not _company_owns_application(app, company):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    app.notes = request.notes
    app.tags = _normalize_tags(request.tags)
    db.commit()
    db.refresh(app)

    data = application_to_data(
        app,
        include_job=True,
        include_resume=True,
        include_applicant=True,
        include_notes=True,
        include_breakdown=True,
    ).model_dump()
    return create_response(True, "Notes and tags updated", data, start_time)


@router.get(
    "/{application_id}/messages",
    response_model=StandardResponse,
    summary="Get sent message history for an application",
)
async def get_application_messages(
    application_id: UUID,
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.is_deleted == False,
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if not _company_owns_application(app, company):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    history = list(app.message_history or [])
    return create_response(True, "Message history retrieved", {"messages": history}, start_time)


@router.post(
    "/{application_id}/messages/send",
    response_model=StandardResponse,
    summary="Send message to candidate and log history",
)
async def send_application_message(
    application_id: UUID,
    request: MessageSendRequest,
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.is_deleted == False,
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if not _company_owns_application(app, company):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    to_email = app.user.email if app.user else None
    if not to_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate email not found")

    delivered = await email_service.send_raw_email(
        to_email=to_email,
        to_name=app.user.full_name if app.user else None,
        subject=request.subject,
        body=request.body,
        html=False,
    )
    _append_message_history(
        app,
        sender=company,
        subject=request.subject,
        body=request.body,
        template_key=request.template_key,
        delivered=delivered,
    )
    db.commit()
    db.refresh(app)

    return create_response(
        delivered,
        "Message sent" if delivered else "Message queued/logged but delivery failed",
        {"delivered": delivered, "messages": app.message_history or []},
        start_time,
    )


# =============================================================================
# INTERVIEW SCORECARDS — structured, bias-resistant evaluation
# =============================================================================


class ScorecardSubmit(BaseModel):
    """Submit / update an interview scorecard."""

    technical_score: Optional[int] = Field(None, ge=1, le=5)
    communication_score: Optional[int] = Field(None, ge=1, le=5)
    cultural_fit_score: Optional[int] = Field(None, ge=1, le=5)
    motivation_score: Optional[int] = Field(None, ge=1, le=5)
    problem_solving_score: Optional[int] = Field(None, ge=1, le=5)
    recommendation: Optional[str] = Field(None, description="hire | maybe | pass")
    notes: Optional[str] = Field(None, max_length=4000)

    @field_validator("recommendation")
    @classmethod
    def _valid_rec(cls, v):
        if v is None:
            return v
        if v not in {"hire", "maybe", "pass"}:
            raise ValueError("recommendation must be one of hire/maybe/pass")
        return v


def _scorecard_to_dict(s) -> Dict[str, Any]:
    return {
        "id": str(s.id),
        "application_id": str(s.application_id),
        "evaluator": {
            "id": str(s.evaluator.id) if s.evaluator else None,
            "name": s.evaluator.full_name if s.evaluator else None,
        },
        "technical_score": s.technical_score,
        "communication_score": s.communication_score,
        "cultural_fit_score": s.cultural_fit_score,
        "motivation_score": s.motivation_score,
        "problem_solving_score": s.problem_solving_score,
        "overall_score": s.overall_score,
        "recommendation": s.recommendation,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _company_owns_application(application: Application, user: User) -> bool:
    if user.role == UserRole.ADMIN.value:
        return True
    return bool(application.job and application.job.company_id == user.id)


def _normalize_tags(raw_tags: List[str]) -> List[str]:
    seen: set[str] = set()
    normalized: List[str] = []
    for tag in raw_tags:
        value = str(tag or "").strip()
        if not value:
            continue
        if value.lower() in seen:
            continue
        seen.add(value.lower())
        normalized.append(value[:64])
        if len(normalized) >= 20:
            break
    return normalized


def _apply_status_transition(application: Application, request: StatusUpdateRequest) -> None:
    if request.status == ApplicationStatus.REVIEWING.value:
        application.mark_as_reviewing(request.notes)
    elif request.status == ApplicationStatus.SHORTLISTED.value:
        application.shortlist(request.notes)
    elif request.status == ApplicationStatus.INTERVIEW.value:
        if request.interview_at:
            resolved_interview_type = _resolve_interview_type(
                request.interview_type,
                application.job,
                request.meeting_link,
            )
            application.schedule_interview(
                request.interview_at,
                interview_type=resolved_interview_type,
                meeting_link=request.meeting_link,
                notes=request.notes,
            )
        else:
            application.status = ApplicationStatus.INTERVIEW.value
            if request.notes:
                application.notes = request.notes
    elif request.status == ApplicationStatus.REJECTED.value:
        application.reject(request.notes)
    elif request.status == ApplicationStatus.ACCEPTED.value:
        application.accept(request.notes)
    elif request.status == ApplicationStatus.HIRED.value:
        application.mark_hired(request.notes)
    else:
        application.status = request.status
        if request.notes:
            application.notes = request.notes




@router.get(
    "/{application_id}/scorecards",
    response_model=StandardResponse,
    summary="List interview scorecards for an application",
)
async def list_scorecards(
    application_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.models import InterviewScorecard

    app = db.query(Application).filter(
        Application.id == application_id, Application.is_deleted == False
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if not _company_owns_application(app, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    rows = (
        db.query(InterviewScorecard)
        .filter(InterviewScorecard.application_id == app.id)
        .order_by(InterviewScorecard.created_at.desc())
        .all()
    )
    return {"success": True, "message": "Scorecards retrieved", "data": {"scorecards": [_scorecard_to_dict(s) for s in rows]}}


@router.post(
    "/{application_id}/scorecards",
    response_model=StandardResponse,
    summary="Submit a structured interview scorecard",
    description=(
        "Submits a 5-criteria evaluation (1-5 each) plus optional notes & "
        "hire/maybe/pass recommendation. Returns the persisted scorecard with "
        "an auto-computed overall_score (average of provided criteria)."
    ),
)
async def create_scorecard(
    application_id: UUID,
    payload: ScorecardSubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.models import InterviewScorecard

    app = db.query(Application).filter(
        Application.id == application_id, Application.is_deleted == False
    ).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if not _company_owns_application(app, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    overall = InterviewScorecard.average(
        payload.technical_score,
        payload.communication_score,
        payload.cultural_fit_score,
        payload.motivation_score,
        payload.problem_solving_score,
    )

    scorecard = InterviewScorecard(
        application_id=app.id,
        evaluator_id=current_user.id,
        technical_score=payload.technical_score,
        communication_score=payload.communication_score,
        cultural_fit_score=payload.cultural_fit_score,
        motivation_score=payload.motivation_score,
        problem_solving_score=payload.problem_solving_score,
        overall_score=overall,
        recommendation=payload.recommendation,
        notes=payload.notes,
    )
    db.add(scorecard)
    db.commit()
    db.refresh(scorecard)
    return {"success": True, "data": _scorecard_to_dict(scorecard), "message": "Scorecard saved"}


# =============================================================================
# DASHBOARD WIDGETS (COMPANY)
# =============================================================================


@router.get(
    "/analytics/dashboard-actions",
    response_model=StandardResponse,
    summary="Action item counters for the company HR dashboard",
)
async def dashboard_actions(
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    from app.models.interview_scorecard import InterviewScorecard

    start_time = time.time()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    job_ids_q = db.query(Job.id).filter(
        Job.company_id == company.id,
        Job.is_deleted == False,
    )

    awaiting_review = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids_q),
            Application.is_deleted == False,
            Application.status == ApplicationStatus.PENDING.value,
        )
        .scalar()
        or 0
    )

    scored_app_ids = db.query(InterviewScorecard.application_id)

    scorecards_pending = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids_q),
            Application.is_deleted == False,
            Application.status == ApplicationStatus.INTERVIEW.value,
            Application.interview_at.isnot(None),
            Application.interview_at < now,
            ~Application.id.in_(scored_app_ids),
        )
        .scalar()
        or 0
    )

    interviews_today = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id.in_(job_ids_q),
            Application.is_deleted == False,
            Application.status == ApplicationStatus.INTERVIEW.value,
            Application.interview_at >= today_start,
            Application.interview_at < today_end,
        )
        .scalar()
        or 0
    )

    return create_response(
        success=True,
        message="Dashboard action counters",
        data={
            "awaiting_review": awaiting_review,
            "scorecards_pending": scorecards_pending,
            "interviews_today": interviews_today,
        },
        start_time=start_time,
    )


@router.get(
    "/interviews/upcoming",
    response_model=StandardResponse,
    summary="Upcoming interviews for the company within the next N days",
)
async def upcoming_interviews(
    days: int = Query(7, ge=1, le=30),
    company: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    start_time = time.time()
    now = datetime.now(timezone.utc)
    until = now + timedelta(days=days)

    rows = (
        db.query(Application)
        .join(Job, Job.id == Application.job_id)
        .join(User, User.id == Application.user_id)
        .filter(
            Job.company_id == company.id,
            Job.is_deleted == False,
            Application.is_deleted == False,
            Application.status == ApplicationStatus.INTERVIEW.value,
            Application.interview_at >= now,
            Application.interview_at < until,
        )
        .order_by(Application.interview_at.asc())
        .limit(50)
        .all()
    )

    interviews = []
    for app in rows:
        candidate = app.user
        if candidate:
            candidate_name = candidate.full_name or candidate.email
            candidate_avatar_url = getattr(candidate, "avatar_url", None)
        else:
            candidate_name = "Unknown"
            candidate_avatar_url = None

        job = app.job
        interviews.append(
            {
                "application_id": str(app.id),
                "candidate_name": candidate_name,
                "candidate_avatar_url": candidate_avatar_url,
                "job_id": str(job.id) if job else None,
                "job_title": job.title if job else None,
                "interview_at": app.interview_at.isoformat() if app.interview_at else None,
                "interview_type": app.interview_type,
                "meeting_link": app.meeting_link,
            }
        )

    return create_response(
        success=True,
        message=f"Upcoming interviews for the next {days} days",
        data={"interviews": interviews, "total": len(interviews)},
        start_time=start_time,
    )
