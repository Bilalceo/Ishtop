"""
=============================================================================
ADMIN ENDPOINTS
=============================================================================

Admin uchun boshqaruv endpointlari:
- Error Dashboard
- User Management
- System Statistics
- Logs

ENDPOINTS:
    GET    /errors                 - Error ro'yxati
    GET    /errors/stats           - Error statistikasi
    GET    /errors/{error_id}      - Error tafsilotlari
    POST   /errors/{error_id}/resolve - Errorni hal qilish
    POST   /errors/bulk-resolve    - Ko'p errorlarni hal qilish
    GET    /system/health          - Tizim holati
    GET    /users/stats            - User statistikasi

=============================================================================
AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import logging
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, text
from pydantic import BaseModel, Field, field_validator

from app.core.dependencies import (
    get_db,
    get_current_super_admin,
    require_admin_permission,
)
from app.models import (
    User,
    Resume,
    Job,
    Application,
    VerificationAuditLog,
    FunnelEvent,
    UserRole,
    AdminSubRole,
    ADMIN_PERMISSION_MATRIX,
)
from app.models.audit_log import AuditLog
from app.models.admin_notification import AdminNotification
from app.services.error_logging_service import (
    error_logger,
    ErrorCategory,
    ErrorSeverity,
    ErrorLog,
    ErrorStats,
)

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter()


# =============================================================================
# AUDIT LOG HELPER
# =============================================================================

def write_audit(
    db: Session,
    admin_id,
    action: str,
    target_type: str,
    target_id=None,
    target_label: str = None,
    notes: str = None,
) -> None:
    """Write an audit log entry after a successful admin action."""
    entry = AuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        target_label=target_label,
        notes=notes,
    )
    db.add(entry)
    db.commit()


def create_admin_notification(
    db: Session,
    type_: str,
    message: str,
    link: str = None,
    admin_id=None,
) -> None:
    """Create a notification for a specific admin or all admins (admin_id=None for broadcast)."""
    notif = AdminNotification(
        admin_id=admin_id,
        type=type_,
        message=message,
        link=link,
    )
    db.add(notif)
    db.commit()


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class ErrorListResponse(BaseModel):
    """Error list response."""
    success: bool = True
    total: int
    errors: List[Dict[str, Any]]


class ErrorDetailResponse(BaseModel):
    """Single error detail response."""
    success: bool = True
    error: Dict[str, Any]


class ErrorStatsResponse(BaseModel):
    """Error statistics response."""
    success: bool = True
    stats: Dict[str, Any]


class ResolveRequest(BaseModel):
    """Error resolve request."""
    resolution_notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Hal qilish haqida izoh"
    )


class BulkResolveRequest(BaseModel):
    """Bulk resolve request."""
    error_ids: List[str] = Field(
        ...,
        description="Hal qilinadigan error ID'lar"
    )
    resolution_notes: Optional[str] = None

    @field_validator("error_ids")
    @classmethod
    def validate_error_ids(cls, v: List[str]) -> List[str]:
        if len(v) < 1:
            raise ValueError("At least 1 error_id is required")
        if len(v) > 100:
            raise ValueError("Maximum 100 error_ids allowed at once")
        return v


class SystemHealthResponse(BaseModel):
    """System health response."""
    success: bool = True
    status: str
    components: Dict[str, Any]
    timestamp: datetime


class UserStatsResponse(BaseModel):
    """User statistics response."""
    success: bool = True
    stats: Dict[str, Any]


class FunnelKpiResponse(BaseModel):
    """Candidate funnel KPI response."""
    success: bool = True
    days: int
    start_date: str
    end_date: str
    events: List[str]
    totals: Dict[str, int]
    conversions: Dict[str, float]
    daily: List[Dict[str, Any]]


class AdminRoleMatrixResponse(BaseModel):
    """Admin sub-role permission matrix response."""
    success: bool = True
    roles: Dict[str, List[str]]


class AdminUserAccessItem(BaseModel):
    """Admin user access row."""
    user_id: str
    email: str
    full_name: str
    is_active: bool
    admin_role: str
    effective_permissions: List[str]


class AdminUsersAccessResponse(BaseModel):
    """Admin users with assigned sub-roles."""
    success: bool = True
    total: int
    users: List[AdminUserAccessItem]


class UpdateAdminRoleRequest(BaseModel):
    """Request body for assigning admin sub-role."""
    admin_role: AdminSubRole = Field(..., description="Admin sub-role to assign")


class UserListItem(BaseModel):
    """User item for admin list."""
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class UserListResponse(BaseModel):
    """User list response."""
    success: bool = True
    total: int
    users: List[UserListItem]


class UpdateUserStatusRequest(BaseModel):
    """Request body for updating user status."""
    is_active: bool = Field(..., description="Account status")


class CompanyVerificationReviewRequest(BaseModel):
    action: str = Field(..., description="approve or reject")
    notes: Optional[str] = Field(None, max_length=1000)
    badges: List[str] = Field(default_factory=list)

    @field_validator("action")
    @classmethod
    def validate_action(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in {"approve", "reject"}:
            raise ValueError("action must be 'approve' or 'reject'")
        return normalized


# =============================================================================
# ERROR DASHBOARD ENDPOINTS
# =============================================================================

@router.get(
    "/access/roles-matrix",
    response_model=AdminRoleMatrixResponse,
    summary="Admin role matrix",
    description="Available admin sub-roles and their permissions.",
)
async def get_admin_roles_matrix(
    admin: User = Depends(require_admin_permission("admin.access.read")),
):
    """Return role -> permissions mapping."""
    roles = {
        role.value: sorted(list(permissions))
        for role, permissions in ADMIN_PERMISSION_MATRIX.items()
    }
    return AdminRoleMatrixResponse(roles=roles)


@router.get(
    "/access/admin-users",
    response_model=AdminUsersAccessResponse,
    summary="List admin users and sub-roles",
    description="Return all admin users with effective admin sub-role.",
)
async def list_admin_users_access(
    admin: User = Depends(require_admin_permission("admin.access.read")),
    db: Session = Depends(get_db),
):
    """List admins with effective sub-role and permissions."""
    admin_users = db.query(User).filter(
        User.role == UserRole.ADMIN,
        User.is_deleted == False,
    ).order_by(User.created_at.desc()).all()

    users: List[AdminUserAccessItem] = []
    for admin_user in admin_users:
        effective_role = admin_user.effective_admin_role or AdminSubRole.SUPER_ADMIN
        permissions = sorted(list(ADMIN_PERMISSION_MATRIX.get(effective_role, set())))
        users.append(
            AdminUserAccessItem(
                user_id=str(admin_user.id),
                email=admin_user.email,
                full_name=admin_user.full_name,
                is_active=admin_user.is_active_account,
                admin_role=effective_role.value,
                effective_permissions=permissions,
            )
        )

    return AdminUsersAccessResponse(total=len(users), users=users)


@router.patch(
    "/access/admin-users/{user_id}/role",
    summary="Update admin sub-role",
    description="Assign admin sub-role to an admin user. Super admin only.",
)
async def update_admin_user_role(
    user_id: UUID,
    request: UpdateAdminRoleRequest,
    super_admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Update admin sub-role for a target admin user."""
    target_user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False,
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin user not found",
        )

    if target_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user is not an admin account",
        )

    current_effective_role = target_user.effective_admin_role or AdminSubRole.SUPER_ADMIN
    requested_role = request.admin_role

    if current_effective_role == AdminSubRole.SUPER_ADMIN and requested_role != AdminSubRole.SUPER_ADMIN:
        remaining_super_admins = db.query(func.count(User.id)).filter(
            User.role == UserRole.ADMIN,
            User.is_deleted == False,
            or_(User.admin_role == AdminSubRole.SUPER_ADMIN.value, User.admin_role.is_(None)),
        ).scalar()
        if remaining_super_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one super_admin must remain",
            )

    target_user.admin_role = requested_role.value
    db.commit()
    db.refresh(target_user)

    logger.info(
        "Admin role updated by %s: target=%s role=%s",
        super_admin.id,
        target_user.id,
        requested_role.value,
    )

    return {
        "success": True,
        "message": "Admin role updated successfully",
        "data": {
            "user_id": str(target_user.id),
            "admin_role": target_user.admin_role,
        },
    }


@router.get(
    "/errors",
    response_model=ErrorListResponse,
    summary="📋 Error ro'yxati",
    description="Barcha errorlarni filterlash va pagination bilan olish",
)
async def list_errors(
    admin: User = Depends(require_admin_permission("admin.errors.read")),
    category: Optional[ErrorCategory] = Query(None, description="Error kategoriyasi"),
    severity: Optional[ErrorSeverity] = Query(None, description="Jiddiylik darajasi"),
    from_time: Optional[datetime] = Query(None, description="Boshlanish vaqti"),
    to_time: Optional[datetime] = Query(None, description="Tugash vaqti"),
    user_id: Optional[str] = Query(None, description="User ID"),
    resolved: Optional[bool] = Query(None, description="Hal qilinganmi"),
    limit: int = Query(50, ge=1, le=200, description="Natija soni"),
    offset: int = Query(0, ge=0, description="O'tkazib yuborish"),
):
    """Get list of errors with filters."""
    
    errors = error_logger.get_errors(
        category=category,
        severity=severity,
        from_time=from_time,
        to_time=to_time,
        user_id=user_id,
        resolved=resolved,
        limit=limit,
        offset=offset,
    )
    
    return ErrorListResponse(
        total=len(errors),
        errors=[e.model_dump() for e in errors],
    )


@router.get(
    "/errors/stats",
    response_model=ErrorStatsResponse,
    summary="📊 Error statistikasi",
    description="Error statistikasi va analytics",
)
async def get_error_statistics(
    admin: User = Depends(require_admin_permission("admin.errors.read")),
    hours: int = Query(24, ge=1, le=168, description="Soatlar soni (1-168)"),
):
    """Get error statistics."""
    
    to_time = datetime.now(timezone.utc)
    from_time = to_time - timedelta(hours=hours)
    
    stats = error_logger.get_statistics(
        from_time=from_time,
        to_time=to_time,
    )
    
    return ErrorStatsResponse(
        stats=stats.model_dump(),
    )


@router.get(
    "/errors/{error_id}",
    response_model=ErrorDetailResponse,
    summary="🔍 Error tafsilotlari",
    description="Bitta error haqida to'liq ma'lumot",
)
async def get_error_detail(
    error_id: str,
    admin: User = Depends(require_admin_permission("admin.errors.read")),
):
    """Get single error details."""
    
    error = error_logger.get_error_by_id(error_id)
    
    if not error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error topilmadi"
        )
    
    return ErrorDetailResponse(
        error=error.model_dump(),
    )


@router.post(
    "/errors/{error_id}/resolve",
    response_model=ErrorDetailResponse,
    summary="✅ Errorni hal qilish",
    description="Errorni hal qilingan deb belgilash",
)
async def resolve_error(
    error_id: str,
    request: ResolveRequest,
    admin: User = Depends(require_admin_permission("admin.errors.resolve")),
    db: Session = Depends(get_db),
):
    """Mark error as resolved."""

    error = error_logger.resolve_error(
        error_id=error_id,
        resolved_by=str(admin.id),
        resolution_notes=request.resolution_notes,
    )

    if not error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error topilmadi"
        )

    write_audit(db, admin.id, "error_resolve", "error", error_id)
    return ErrorDetailResponse(
        error=error.model_dump(),
    )


@router.post(
    "/errors/bulk-resolve",
    summary="✅ Ko'p errorlarni hal qilish",
    description="Bir nechta errorni bir vaqtda hal qilish",
)
async def bulk_resolve_errors(
    request: BulkResolveRequest,
    admin: User = Depends(require_admin_permission("admin.errors.resolve")),
):
    """Resolve multiple errors at once."""
    
    resolved_count = error_logger.bulk_resolve(
        error_ids=request.error_ids,
        resolved_by=str(admin.id),
        resolution_notes=request.resolution_notes,
    )
    
    return {
        "success": True,
        "message": f"{resolved_count} ta error hal qilindi",
        "resolved_count": resolved_count,
        "requested_count": len(request.error_ids),
    }


# =============================================================================
# SYSTEM HEALTH ENDPOINTS
# =============================================================================

@router.get(
    "/system/health",
    response_model=SystemHealthResponse,
    summary="🏥 Tizim holati",
    description="Barcha tizim komponentlari holati",
)
async def get_system_health(
    admin: User = Depends(require_admin_permission("admin.system.read")),
    db: Session = Depends(get_db),
):
    """Get system health status."""
    
    components = {}
    overall_status = "healthy"
    
    # Check database
    try:
        db.execute(text("SELECT 1"))
        components["database"] = {
            "status": "healthy",
            "type": "sqlite" if "sqlite" in str(db.bind.url) else "postgresql",
        }
    except Exception as e:
        components["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        overall_status = "unhealthy"
    
    # Check AI service
    from app.config import settings
    components["ai_service"] = {
        "status": "healthy" if settings.GEMINI_API_KEY or settings.OPENAI_API_KEY else "warning",
        "provider": settings.AI_PROVIDER,
        "configured": bool(settings.GEMINI_API_KEY or settings.OPENAI_API_KEY),
    }
    
    # Check email service
    email_mode = getattr(settings, "EMAIL_TRANSPORT", "auto").strip().lower()
    smtp_configured = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    sendgrid_configured = bool(settings.SENDGRID_API_KEY)
    email_configured = (
        email_mode == "disabled"
        or email_mode == "auto" and (smtp_configured or sendgrid_configured)
        or email_mode == "smtp" and smtp_configured
        or email_mode == "sendgrid" and sendgrid_configured
    )
    components["email_service"] = {
        "status": "healthy" if email_configured else "warning",
        "transport_mode": email_mode,
        "smtp_configured": smtp_configured,
        "sendgrid_configured": sendgrid_configured,
    }
    
    # Error stats (last hour)
    error_stats = error_logger.get_statistics(
        from_time=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    components["error_rate"] = {
        "status": "healthy" if error_stats.total_errors < 100 else "warning",
        "errors_last_hour": error_stats.total_errors,
        "critical_errors": error_stats.errors_by_severity.get("critical", 0),
    }
    
    # Memory usage (simplified)
    import sys
    components["memory"] = {
        "status": "healthy",
        "python_version": sys.version.split()[0],
    }
    
    return SystemHealthResponse(
        status=overall_status,
        components=components,
        timestamp=datetime.now(timezone.utc),
    )


# =============================================================================
# USER STATISTICS ENDPOINTS
# =============================================================================

@router.get(
    "/users/stats",
    response_model=UserStatsResponse,
    summary="👥 User statistikasi",
    description="Foydalanuvchilar statistikasi",
)
async def get_user_statistics(
    admin: User = Depends(require_admin_permission("admin.users.read")),
    db: Session = Depends(get_db),
):
    """Get user statistics."""
    
    # Total users
    total_users = db.query(func.count(User.id)).filter(
        User.is_deleted == False
    ).scalar()
    
    # Users by role
    users_by_role = {}
    for role in UserRole:
        count = db.query(func.count(User.id)).filter(
            User.role == role,
            User.is_deleted == False
        ).scalar()
        users_by_role[role.value] = count
    
    # Active users (logged in last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_users = db.query(func.count(User.id)).filter(
        User.last_login >= week_ago,
        User.is_deleted == False
    ).scalar()
    
    # New users (registered last 7 days)
    new_users = db.query(func.count(User.id)).filter(
        User.created_at >= week_ago,
        User.is_deleted == False
    ).scalar()
    
    # Verified users
    verified_users = db.query(func.count(User.id)).filter(
        User.is_verified == True,
        User.is_deleted == False
    ).scalar()
    
    # Total resumes
    total_resumes = db.query(func.count(Resume.id)).filter(
        Resume.is_deleted == False
    ).scalar()
    
    # Total jobs
    total_jobs = db.query(func.count(Job.id)).filter(
        Job.is_deleted == False
    ).scalar()
    
    # Total applications
    total_applications = db.query(func.count(Application.id)).filter(
        Application.is_deleted == False
    ).scalar()
    
    return UserStatsResponse(
        stats={
            "users": {
                "total": total_users,
                "by_role": users_by_role,
                "active_last_7_days": active_users,
                "new_last_7_days": new_users,
                "verified": verified_users,
                "unverified": total_users - verified_users,
            },
            "content": {
                "total_resumes": total_resumes,
                "total_jobs": total_jobs,
                "total_applications": total_applications,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


# =============================================================================
# DASHBOARD SUMMARY
# =============================================================================

FUNNEL_KPI_EVENTS = [
    "search",
    "view_job",
    "view_explainability",
    "apply_after_explainability",
    "interview_scheduled",
]

FUNNEL_CONVERSION_STEPS = [
    ("search_to_view_job", "view_job", "search"),
    ("view_job_to_view_explainability", "view_explainability", "view_job"),
    (
        "view_explainability_to_apply_after_explainability",
        "apply_after_explainability",
        "view_explainability",
    ),
    (
        "apply_after_explainability_to_interview_scheduled",
        "interview_scheduled",
        "apply_after_explainability",
    ),
]


def _funnel_conversions(counts: Dict[str, int]) -> Dict[str, float]:
    conversions: Dict[str, float] = {}
    for name, numerator_key, denominator_key in FUNNEL_CONVERSION_STEPS:
        denominator = counts.get(denominator_key, 0)
        if denominator > 0:
            conversions[name] = round(counts.get(numerator_key, 0) / denominator, 4)
    return conversions


@router.get(
    "/kpi/funnel",
    response_model=FunnelKpiResponse,
    summary="Candidate funnel KPI summary",
    description="Daily funnel event counts and conversion ratios for the last N days.",
)
async def get_funnel_kpis(
    days: int = Query(7, ge=1, le=90, description="Number of trailing days to include"),
    admin: User = Depends(require_admin_permission("admin.dashboard.read")),
    db: Session = Depends(get_db),
):
    """Return daily and total KPI counts for persisted funnel events."""
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=days - 1)
    start_at = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)

    rows = (
        db.query(FunnelEvent)
        .filter(
            FunnelEvent.event_name.in_(FUNNEL_KPI_EVENTS),
            FunnelEvent.created_at >= start_at,
        )
        .all()
    )

    daily_counts: Dict[str, Dict[str, int]] = {
        (start_date + timedelta(days=offset)).isoformat(): {event: 0 for event in FUNNEL_KPI_EVENTS}
        for offset in range(days)
    }
    totals: Dict[str, int] = {event: 0 for event in FUNNEL_KPI_EVENTS}

    for row in rows:
        created_at = row.created_at
        if created_at is None or row.event_name not in totals:
            continue
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        day_key = created_at.astimezone(timezone.utc).date().isoformat()
        if day_key not in daily_counts:
            continue
        daily_counts[day_key][row.event_name] += 1
        totals[row.event_name] += 1

    daily = [
        {
            "date": day,
            "counts": counts,
            "conversions": _funnel_conversions(counts),
        }
        for day, counts in sorted(daily_counts.items())
    ]

    return FunnelKpiResponse(
        days=days,
        start_date=start_date.isoformat(),
        end_date=today.isoformat(),
        events=FUNNEL_KPI_EVENTS,
        totals=totals,
        conversions=_funnel_conversions(totals),
        daily=daily,
    )


@router.get(
    "/dashboard",
    summary="📊 Admin Dashboard",
    description="Admin uchun umumiy dashboard ma'lumotlari",
)
async def get_admin_dashboard(
    admin: User = Depends(require_admin_permission("admin.dashboard.read")),
    db: Session = Depends(get_db),
):
    """Get admin dashboard summary."""
    
    # Get error stats
    error_stats = error_logger.get_statistics()
    
    # Get user counts
    total_users = db.query(func.count(User.id)).filter(
        User.is_deleted == False
    ).scalar()
    
    new_users_today = db.query(func.count(User.id)).filter(
        User.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0),
        User.is_deleted == False
    ).scalar()
    
    # Get content counts
    total_resumes = db.query(func.count(Resume.id)).filter(
        Resume.is_deleted == False
    ).scalar()
    
    total_jobs = db.query(func.count(Job.id)).filter(
        Job.is_deleted == False
    ).scalar()
    
    total_applications = db.query(func.count(Application.id)).filter(
        Application.is_deleted == False
    ).scalar()
    
    # Recent errors (last 5)
    recent_errors = error_logger.get_errors(limit=5)
    
    return {
        "success": True,
        "dashboard": {
            "overview": {
                "total_users": total_users,
                "new_users_today": new_users_today,
                "total_resumes": total_resumes,
                "total_jobs": total_jobs,
                "total_applications": total_applications,
            },
            "errors": {
                "total_24h": error_stats.total_errors,
                "by_severity": error_stats.errors_by_severity,
                "by_category": error_stats.errors_by_category,
                "recent": [e.model_dump() for e in recent_errors],
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="👥 Foydalanuvchilar ro'yxati",
    description="Tizimdagi barcha foydalanuvchilarni boshqarish uchun olish",
)
async def list_users_for_admin(
    admin: User = Depends(require_admin_permission("admin.users.read")),
    db: Session = Depends(get_db),
    role: Optional[UserRole] = Query(None, description="Role bo'yicha filter"),
    is_active: Optional[bool] = Query(None, description="Holati bo'yicha filter"),
    search: Optional[str] = Query(None, description="Email yoki ism bo'yicha qidirish"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Get all users with filtering and search."""
    query = db.query(User).filter(User.is_deleted == False)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active_account == is_active)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_filter),
                User.full_name.ilike(search_filter)
            )
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    user_items = [
        UserListItem(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active_account,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login,
        )
        for user in users
    ]

    return UserListResponse(total=total, users=user_items)


@router.patch(
    "/users/{user_id}/status",
    summary="🚫 Foydalanuvchi holatini o'zgartirish",
    description="Foydalanuvchini bloklash yoki faollashtirish",
)
async def update_user_status(
    user_id: UUID,
    request: UpdateUserStatusRequest,
    admin: User = Depends(require_admin_permission("admin.users.write")),
    db: Session = Depends(get_db),
):
    """Enable or disable a user account."""
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foydalanuvchi topilmadi"
        )

    user.is_active_account = request.is_active
    db.commit()
    write_audit(db, admin.id, "user_activate" if request.is_active else "user_deactivate", "user", user.id, user.email)

    action = "activated" if request.is_active else "blocked"
    logger.info(f"User {user.email} (ID: {user.id}) {action} by admin {admin.id}")

    return {
        "success": True,
        "message": f"Foydalanuvchi muvaffaqiyatli {'faollashtirildi' if request.is_active else 'bloklandi'}",
        "data": {
            "user_id": str(user.id),
            "is_active": user.is_active_account
        }
    }


@router.get(
    "/companies/verification",
    summary="List company verification submissions",
    description="Review company verification queue with optional state filter.",
)
async def list_company_verification_submissions(
    state: Optional[str] = Query(None, description="unverified|pending|approved|rejected"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin_permission("admin.users.read")),
    db: Session = Depends(get_db),
):
    q = db.query(User).filter(
        User.role == UserRole.COMPANY,
        User.is_deleted == False,
    )
    if state:
        q = q.filter(User.verification_state == state.strip().lower())

    total = q.count()
    companies = q.order_by(User.verification_submitted_at.desc(), User.created_at.desc()).offset(offset).limit(limit).all()

    items: List[Dict[str, Any]] = []
    for company in companies:
        latest_audit = (
            db.query(VerificationAuditLog)
            .filter(VerificationAuditLog.company_id == company.id)
            .order_by(VerificationAuditLog.created_at.desc())
            .first()
        )
        items.append(
            {
                "company_id": str(company.id),
                "company_name": company.company_name or company.full_name,
                "email": company.email,
                "verification_state": company.verification_state,
                "submitted_at": company.verification_submitted_at.isoformat() if company.verification_submitted_at else None,
                "reviewed_at": company.verification_reviewed_at.isoformat() if company.verification_reviewed_at else None,
                "trust_badges": company.trust_badges or [],
                "last_audit": latest_audit.to_dict() if latest_audit else None,
            }
        )

    return {"success": True, "total": total, "items": items}


@router.post(
    "/companies/{company_id}/verification/review",
    summary="Approve/reject company verification",
)
async def review_company_verification(
    company_id: UUID,
    request: CompanyVerificationReviewRequest,
    admin: User = Depends(require_admin_permission("admin.users.write")),
    db: Session = Depends(get_db),
):
    company = db.query(User).filter(
        User.id == company_id,
        User.role == UserRole.COMPANY,
        User.is_deleted == False,
    ).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    company.verification_state = "approved" if request.action == "approve" else "rejected"
    company.verification_reviewed_at = datetime.now(timezone.utc)
    company.verification_reviewed_by = str(admin.id)
    company.verification_notes = request.notes
    if request.action == "reject":
        company.trust_badges = []
    elif request.badges:
        company.trust_badges = request.badges

    audit = VerificationAuditLog(
        company_id=company.id,
        actor_id=admin.id,
        action=request.action,
        notes=request.notes,
        payload={"badges": request.badges},
    )
    db.add(audit)

    # Recompute trust payload for all active jobs from this company.
    jobs = db.query(Job).filter(Job.company_id == company.id, Job.is_deleted == False).all()
    for job in jobs:
        trust_payload = calculate_job_trust(job, company)
        job.trust_score = float(trust_payload["trust_score"])
        job.trust_badges = trust_payload["trust_badges"]
        job.trust_factors = trust_payload["trust_factors"]

    db.commit()
    db.refresh(company)
    db.refresh(audit)

    return {
        "success": True,
        "message": f"Company verification {request.action}d",
        "verification_state": company.verification_state,
        "audit_id": str(audit.id),
    }












# =============================================================================
# JOB MODERATION (ADMIN)
# =============================================================================


class AdminJobUpdate(BaseModel):
    """Admin-side job status update."""

    status: str = Field(..., description="New job status: draft, active, paused, closed")

    @field_validator("status")
    @classmethod
    def _validate(cls, v: str) -> str:
        valid = {"draft", "active", "paused", "closed"}
        if v not in valid:
            raise ValueError(f"status must be one of {sorted(valid)}")
        return v


@router.get(
    "/jobs",
    summary="List all jobs across companies (admin)",
    description="Platform-wide job moderation list with filters and search.",
)
async def admin_list_jobs(
    search: Optional[str] = Query(None, description="Search by title or company name"),
    status_filter: Optional[str] = Query(None, alias="status",
                                         description="Filter by job status"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin_permission("admin.users.read")),
    db: Session = Depends(get_db),
):
    """List jobs across all companies for admin moderation."""
    from app.models import Job

    q = db.query(Job).filter(Job.is_deleted == False)
    if status_filter:
        q = q.filter(Job.status == status_filter)
    if search:
        like = f"%{search.lower()}%"
        company_ids = (
            db.query(User.id)
            .filter(
                User.role == UserRole.COMPANY,
                func.lower(User.company_name).like(like),
            )
            .all()
        )
        company_id_list = [c[0] for c in company_ids]
        q = q.filter(
            or_(
                func.lower(Job.title).like(like),
                Job.company_id.in_(company_id_list) if company_id_list else False,
            )
        )

    total = q.count()
    rows = (
        q.order_by(Job.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    jobs_out = []
    for j in rows:
        company = j.company
        jobs_out.append(
            {
                "id": str(j.id),
                "title": j.title,
                "status": j.status,
                "job_type": j.job_type,
                "experience_level": j.experience_level,
                "location": j.location,
                "is_remote_allowed": j.is_remote_allowed,
                "salary_min": j.salary_min,
                "salary_max": j.salary_max,
                "views_count": j.views_count or 0,
                "applications_count": j.applications_count or 0,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "expires_at": j.expires_at.isoformat() if j.expires_at else None,
                "company": {
                    "id": str(company.id) if company else None,
                    "name": (company.company_name or company.full_name) if company else None,
                    "email": company.email if company else None,
                    "is_verified": company.is_verified if company else False,
                },
            }
        )

    return {"success": True, "data": {"jobs": jobs_out, "total": total, "offset": offset, "limit": limit}}


@router.patch(
    "/jobs/{job_id}/status",
    summary="Update job status (admin moderation)",
)
async def admin_update_job_status(
    job_id: UUID,
    payload: AdminJobUpdate,
    admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Set a job's status as an admin action (publish/pause/close)."""
    from app.models import Job

    job = db.query(Job).filter(Job.id == job_id, Job.is_deleted == False).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    previous = job.status
    job.status = payload.status
    db.commit()
    db.refresh(job)
    write_audit(db, admin.id, f"job_{payload.status}", "job", job.id, getattr(job, 'title', str(job.id)))
    logger.info(f"Admin {admin.email} changed job {job.id} status: {previous} -> {job.status}")

    return {
        "success": True,
        "message": "Job status updated",
        "data": {"id": str(job.id), "status": job.status, "previous_status": previous},
    }


@router.delete(
    "/jobs/{job_id}",
    summary="Soft-delete a job (admin moderation)",
)
async def admin_delete_job(
    job_id: UUID,
    admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Soft-delete a job posting."""
    from app.models import Job

    job = db.query(Job).filter(Job.id == job_id, Job.is_deleted == False).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_title = getattr(job, 'title', str(job_id))
    job.is_deleted = True
    job.deleted_at = datetime.now(timezone.utc)
    db.commit()
    write_audit(db, admin.id, "job_delete", "job", job_id, job_title)
    logger.info(f"Admin {admin.email} soft-deleted job {job.id}")

    return {"success": True, "message": "Job deleted", "data": {"id": str(job.id)}}


# =============================================================================
# COMPANIES MANAGEMENT (ADMIN)
# =============================================================================


class AdminVerifyCompany(BaseModel):
    """Toggle a company's verified status."""

    is_verified: bool = Field(..., description="Whether the company is verified")


@router.get(
    "/companies",
    summary="List all companies (admin)",
    description="Platform-wide company list with hiring activity per company.",
)
async def admin_list_companies(
    search: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin_permission("admin.users.read")),
    db: Session = Depends(get_db),
):
    """List companies with per-company job & application counts."""
    from app.models import Job, Application

    q = db.query(User).filter(
        User.role == UserRole.COMPANY,
        User.is_deleted == False,
    )
    if is_verified is not None:
        q = q.filter(User.is_verified == is_verified)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(
            or_(
                func.lower(User.company_name).like(like),
                func.lower(User.email).like(like),
                func.lower(User.full_name).like(like),
            )
        )

    total = q.count()
    companies = (
        q.order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Aggregate per-company counts in one query
    company_ids = [c.id for c in companies]
    job_counts = dict(
        db.query(Job.company_id, func.count(Job.id))
        .filter(Job.company_id.in_(company_ids), Job.is_deleted == False)
        .group_by(Job.company_id)
        .all()
    ) if company_ids else {}

    app_counts = dict(
        db.query(Job.company_id, func.count(Application.id))
        .join(Application, Application.job_id == Job.id)
        .filter(Job.company_id.in_(company_ids), Application.is_deleted == False)
        .group_by(Job.company_id)
        .all()
    ) if company_ids else {}

    out = []
    for c in companies:
        company_verified = bool((c.verification_state or "").lower() == "approved")
        out.append(
            {
                "id": str(c.id),
                "email": c.email,
                "company_name": c.company_name or c.full_name,
                "company_website": c.company_website,
                "contact_name": c.full_name,
                "phone": c.phone,
                "is_verified": c.is_verified,
                "company_verified": company_verified,
                "verification_state": c.verification_state,
                "is_active": c.is_active_account,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "last_login": c.last_login.isoformat() if c.last_login else None,
                "jobs_count": job_counts.get(c.id, 0),
                "applications_count": app_counts.get(c.id, 0),
            }
        )

    return {"success": True, "data": {"companies": out, "total": total, "offset": offset, "limit": limit}}


@router.patch(
    "/companies/{company_id}/verify",
    summary="Toggle company verified status (admin)",
)
async def admin_verify_company(
    company_id: UUID,
    payload: AdminVerifyCompany,
    admin: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Verify or un-verify a company account."""
    company = db.query(User).filter(
        User.id == company_id,
        User.role == UserRole.COMPANY,
        User.is_deleted == False,
    ).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    company.is_verified = payload.is_verified
    company.verification_state = "approved" if payload.is_verified else "unverified"
    company.verification_reviewed_at = datetime.now(timezone.utc)
    company.verification_reviewed_by = str(admin.id)
    db.commit()
    write_audit(db, admin.id, "company_verify" if payload.is_verified else "company_unverify", "company", company.id, getattr(company, 'company_name', None) or company.email)
    logger.info(
        f"Admin {admin.email} set company {company.id} verified={payload.is_verified}"
    )

    return {
        "success": True,
        "message": "Company verification updated",
        "data": {
            "id": str(company.id),
            "is_verified": company.is_verified,
            "verification_state": company.verification_state,
        },
    }


# =============================================================================
# PLATFORM-WIDE APPLICATIONS (ADMIN)
# =============================================================================


@router.get(
    "/applications",
    summary="List all applications across the platform (admin)",
)
async def admin_list_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Search by applicant email or job title"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin_permission("admin.users.read")),
    db: Session = Depends(get_db),
):
    """Platform-wide applications list."""
    from app.models import Job

    q = db.query(Application).filter(Application.is_deleted == False)
    if status_filter:
        q = q.filter(Application.status == status_filter)
    if search:
        like = f"%{search.lower()}%"
        applicant_ids = [
            r[0] for r in db.query(User.id)
            .filter(func.lower(User.email).like(like))
            .all()
        ]
        job_ids = [
            r[0] for r in db.query(Job.id)
            .filter(func.lower(Job.title).like(like))
            .all()
        ]
        q = q.filter(
            or_(
                Application.user_id.in_(applicant_ids) if applicant_ids else False,
                Application.job_id.in_(job_ids) if job_ids else False,
            )
        )

    total = q.count()
    rows = (
        q.order_by(Application.applied_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    out = []
    for a in rows:
        applicant = a.user
        job = a.job
        out.append(
            {
                "id": str(a.id),
                "status": a.status,
                "match_score": a.match_score,
                "applied_at": a.applied_at.isoformat() if a.applied_at else None,
                "applicant": {
                    "id": str(applicant.id) if applicant else None,
                    "email": applicant.email if applicant else None,
                    "full_name": applicant.full_name if applicant else None,
                },
                "job": {
                    "id": str(job.id) if job else None,
                    "title": job.title if job else None,
                    "company": (
                        (job.company.company_name or job.company.full_name)
                        if job and job.company
                        else None
                    ),
                },
            }
        )

    return {"success": True, "data": {"applications": out, "total": total, "offset": offset, "limit": limit}}


@router.get("/stats/timeseries")
async def get_stats_timeseries(
    metric: str = Query(..., regex="^(users|jobs|applications)$"),
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    _current_admin=Depends(get_current_super_admin),
):
    """Return daily counts for a metric over the past N days."""
    today = date.today()
    result = []
    # One COUNT query per day — acceptable for admin-only, small-usage endpoint

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        if metric == "users":
            count = db.query(func.count(User.id)).filter(
                User.created_at >= day_start,
                User.created_at < day_end,
            ).scalar() or 0
        elif metric == "jobs":
            count = db.query(func.count(Job.id)).filter(
                Job.created_at >= day_start,
                Job.created_at < day_end,
            ).scalar() or 0
        else:  # applications
            count = db.query(func.count(Application.id)).filter(
                Application.applied_at >= day_start,
                Application.applied_at < day_end,
            ).scalar() or 0

        result.append({"date": day.isoformat(), "value": count})

    return {"success": True, "metric": metric, "days": days, "data": result}


# ---------------------------------------------------------------------------
# BULK ACTION MODELS
# ---------------------------------------------------------------------------

class BulkActionRequest(BaseModel):
    ids: List[str] = Field(..., min_length=1, max_length=200)
    action: str


# ---------------------------------------------------------------------------
# BULK ACTION ENDPOINTS
# ---------------------------------------------------------------------------

@router.post("/users/bulk-action")
async def bulk_action_users(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_permission("admin.users.write")),
):
    """Bulk activate or deactivate users."""
    valid_actions = {"activate", "deactivate"}
    if payload.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Action must be one of {valid_actions}")

    try:
        uuids = [UUID(id_) for id_ in payload.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="One or more IDs are not valid UUIDs")
    users = db.query(User).filter(User.id.in_(uuids)).all()

    for u in users:
        u.is_active_account = payload.action == "activate"

    db.commit()
    write_audit(db, current_admin.id, f"bulk_{payload.action}_users", "user", notes=f"{len(users)} users")
    return {"success": True, "affected": len(users), "action": payload.action}


@router.post("/jobs/bulk-action")
async def bulk_action_jobs(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_permission("admin.jobs.write")),
):
    """Bulk approve, pause, close, or delete jobs."""
    valid_actions = {"approve", "pause", "close", "delete"}
    if payload.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Action must be one of {valid_actions}")

    try:
        uuids = [UUID(id_) for id_ in payload.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="One or more IDs are not valid UUIDs")
    jobs = db.query(Job).filter(Job.id.in_(uuids)).all()

    if payload.action == "delete":
        for j in jobs:
            j.is_deleted = True
            j.deleted_at = datetime.now(timezone.utc)
    else:
        status_map = {"approve": "active", "pause": "paused", "close": "closed"}
        for j in jobs:
            j.status = status_map[payload.action]

    db.commit()
    write_audit(db, current_admin.id, f"bulk_{payload.action}_jobs", "job", notes=f"{len(jobs)} jobs")
    return {"success": True, "affected": len(jobs), "action": payload.action}


@router.post("/companies/bulk-action")
async def bulk_action_companies(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin_permission("admin.companies.write")),
):
    """Bulk verify or deactivate companies."""
    valid_actions = {"verify", "deactivate"}
    if payload.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Action must be one of {valid_actions}")

    try:
        uuids = [UUID(id_) for id_ in payload.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="One or more IDs are not valid UUIDs")
    companies = db.query(User).filter(
        User.id.in_(uuids),
        User.role == UserRole.COMPANY,
    ).all()

    if payload.action == "verify":
        for c in companies:
            c.is_verified = True
    else:
        for c in companies:
            c.is_active_account = False

    db.commit()
    write_audit(db, current_admin.id, f"bulk_{payload.action}_companies", "company", notes=f"{len(companies)} companies")
    return {"success": True, "affected": len(companies), "action": payload.action}


# =============================================================================
# AUDIT LOG ENDPOINT
# =============================================================================

@router.get("/audit-logs")
async def list_audit_logs(
    admin_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _current_admin: User = Depends(get_current_super_admin),
):
    """Paginated list of admin audit log entries."""
    q = db.query(AuditLog).options(joinedload(AuditLog.admin)).order_by(AuditLog.created_at.desc())

    if admin_id:
        q = q.filter(AuditLog.admin_id == admin_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if from_date:
        try:
            q = q.filter(AuditLog.created_at >= datetime.fromisoformat(from_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date format")
    if to_date:
        try:
            q = q.filter(AuditLog.created_at <= datetime.fromisoformat(to_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date format")

    total = q.count()
    logs = q.offset((page - 1) * limit).limit(limit).all()

    return {
        "success": True,
        "total": total,
        "page": page,
        "logs": [
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id) if log.admin_id else None,
                "admin_name": log.admin.full_name if log.admin else "Unknown",
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "target_label": log.target_label,
                "notes": log.notes,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }


# =============================================================================
# ADMIN NOTIFICATIONS
# =============================================================================

@router.get("/admin-notifications")
async def list_admin_notifications(
    unread: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_super_admin),
):
    """List notifications for the current admin (targeted + broadcasts)."""
    q = (
        db.query(AdminNotification)
        .filter(
            or_(
                AdminNotification.admin_id == current_admin.id,
                AdminNotification.admin_id.is_(None),
            )
        )
        .order_by(AdminNotification.created_at.desc())
    )

    if unread:
        q = q.filter(AdminNotification.is_read == False)  # noqa: E712

    notifications = q.limit(limit).all()
    unread_count = (
        db.query(func.count(AdminNotification.id))
        .filter(
            or_(
                AdminNotification.admin_id == current_admin.id,
                AdminNotification.admin_id.is_(None),
            ),
            AdminNotification.is_read == False,  # noqa: E712
        )
        .scalar()
        or 0
    )

    return {
        "success": True,
        "unread_count": unread_count,
        "notifications": [
            {
                "id": str(n.id),
                "type": n.type,
                "message": n.message,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
    }


@router.post("/admin-notifications/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_super_admin),
):
    """Mark all notifications for the current admin as read."""
    db.query(AdminNotification).filter(
        or_(
            AdminNotification.admin_id == current_admin.id,
            AdminNotification.admin_id.is_(None),
        ),
        AdminNotification.is_read == False,  # noqa: E712
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


@router.post("/admin-notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_super_admin),
):
    """Mark a single notification as read."""
    try:
        nid = UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    notif = db.query(AdminNotification).filter(AdminNotification.id == nid).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"success": True}
