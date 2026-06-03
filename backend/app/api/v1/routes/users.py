"""
=============================================================================
USER ENDPOINTS
=============================================================================

Handles user profile management.

ENDPOINTS:
    GET  /me              - Get current user profile
    PUT  /me              - Update current user profile
    GET  /{user_id}       - Get user by ID (public info)
    GET  /                - List users (admin only)
    DELETE /me            - Delete current user account
"""

import logging
from typing import Optional
from uuid import UUID
import os
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.dependencies import (
    get_db, 
    get_current_active_user, 
    get_current_admin,
    PaginationParams
)
from app.core.security import get_password_hash, verify_password
from app.models import User, Resume, Application, Job
from app.schemas.user import (
    UserUpdate, 
    UserProfileResponse, 
    UserListResponse
)
from app.schemas.auth import MessageResponse
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for password change
class PasswordChangeRequest(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "OldPassword123!",
                "new_password": "NewPassword123!"
            }
        }


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user profile"
)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed profile of current user."""
    
    # Get statistics
    resume_count = db.query(func.count(Resume.id)).filter(
        Resume.user_id == current_user.id,
        Resume.is_deleted == False
    ).scalar()
    
    application_count = db.query(func.count(Application.id)).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    ).scalar()
    
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        role=current_user.role.value,
        admin_role=current_user.effective_admin_role.value if current_user.effective_admin_role else None,
        is_verified=current_user.is_verified,
        is_active=current_user.is_active_account,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        location=current_user.location,
        company_name=current_user.company_name,
        company_website=current_user.company_website,
        company_cover_photo_url=current_user.company_cover_photo_url,
        company_gallery_images=current_user.company_gallery_images or [],
        company_culture=current_user.company_culture,
        company_linkedin_url=current_user.company_linkedin_url,
        company_telegram_url=current_user.company_telegram_url,
        company_instagram_url=current_user.company_instagram_url,
        company_facebook_url=current_user.company_facebook_url,
        company_founded_year=current_user.company_founded_year,
        company_video_url=current_user.company_video_url,
        verification_state=current_user.verification_state,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login,
        resume_count=resume_count,
        application_count=application_count,
    )


@router.put(
    "/me",
    response_model=UserProfileResponse,
    summary="Update current user profile"
)
async def update_my_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    
    # Update fields if provided
    update_dict = update_data.model_dump(exclude_unset=True)
    if "company_gallery_images" in update_dict and update_dict["company_gallery_images"] is not None:
        update_dict["company_gallery_images"] = [
            str(item).strip()
            for item in update_dict["company_gallery_images"]
            if str(item).strip()
        ][:6]
    
    for field, value in update_dict.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Profile updated for user: {current_user.id}")
    
    # Get statistics
    resume_count = db.query(func.count(Resume.id)).filter(
        Resume.user_id == current_user.id,
        Resume.is_deleted == False
    ).scalar()
    
    application_count = db.query(func.count(Application.id)).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    ).scalar()
    
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        role=current_user.role.value,
        admin_role=current_user.effective_admin_role.value if current_user.effective_admin_role else None,
        is_verified=current_user.is_verified,
        is_active=current_user.is_active_account,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        location=current_user.location,
        company_name=current_user.company_name,
        company_website=current_user.company_website,
        company_cover_photo_url=current_user.company_cover_photo_url,
        company_gallery_images=current_user.company_gallery_images or [],
        company_culture=current_user.company_culture,
        company_linkedin_url=current_user.company_linkedin_url,
        company_telegram_url=current_user.company_telegram_url,
        company_instagram_url=current_user.company_instagram_url,
        company_facebook_url=current_user.company_facebook_url,
        company_founded_year=current_user.company_founded_year,
        company_video_url=current_user.company_video_url,
        verification_state=current_user.verification_state,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login,
        resume_count=resume_count,
        application_count=application_count,
    )


@router.delete(
    "/me",
    response_model=MessageResponse,
    summary="Delete current user account"
)
async def delete_my_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Soft delete current user's account."""
    
    current_user.soft_delete()
    db.commit()
    
    logger.info(f"Account deleted for user: {current_user.id}")
    
    return MessageResponse(
        message="Your account has been deleted successfully.",
        success=True
    )


@router.get(
    "/{user_id}",
    response_model=UserProfileResponse,
    summary="Get user by ID"
)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """Get public profile of a user."""
    
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False,
        User.is_active_account == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=None,  # Hide phone for public profile
        role=user.role.value,
        admin_role=user.effective_admin_role.value if user.effective_admin_role else None,
        is_verified=user.is_verified,
        is_active=user.is_active_account,
        avatar_url=user.avatar_url,
        bio=user.bio,
        location=user.location,
        company_name=user.company_name,
        company_website=user.company_website,
        company_cover_photo_url=user.company_cover_photo_url,
        company_gallery_images=user.company_gallery_images or [],
        company_culture=user.company_culture,
        company_linkedin_url=user.company_linkedin_url,
        company_telegram_url=user.company_telegram_url,
        company_instagram_url=user.company_instagram_url,
        company_facebook_url=user.company_facebook_url,
        company_founded_year=user.company_founded_year,
        company_video_url=user.company_video_url,
        verification_state=user.verification_state,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=None,  # Hide last login for public
        resume_count=0,
        application_count=0,
    )


@router.get(
    "/",
    response_model=UserListResponse,
    summary="List users (admin only)"
)
async def list_users(
    pagination: PaginationParams = Depends(),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name/email"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all users (admin only)."""
    
    query = db.query(User).filter(User.is_deleted == False)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_term)) |
            (User.email.ilike(search_term))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    users = query.order_by(User.created_at.desc()).offset(
        pagination.skip
    ).limit(pagination.limit).all()
    
    # Build response
    user_responses = []
    for user in users:
        user_responses.append(UserProfileResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role.value,
            admin_role=user.effective_admin_role.value if user.effective_admin_role else None,
            is_verified=user.is_verified,
            is_active=user.is_active_account,
            avatar_url=user.avatar_url,
            bio=user.bio,
            location=user.location,
            company_name=user.company_name,
            company_website=user.company_website,
            company_cover_photo_url=user.company_cover_photo_url,
            company_gallery_images=user.company_gallery_images or [],
            company_culture=user.company_culture,
            company_linkedin_url=user.company_linkedin_url,
            company_telegram_url=user.company_telegram_url,
            company_instagram_url=user.company_instagram_url,
            company_facebook_url=user.company_facebook_url,
            company_founded_year=user.company_founded_year,
            company_video_url=user.company_video_url,
            verification_state=user.verification_state,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login,
            resume_count=0,
            application_count=0,
        ))
    
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    
    return UserListResponse(
        users=user_responses,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
    )


@router.post(
    "/me/change-password",
    response_model=MessageResponse,
    summary="Change password"
)
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password strength (full validation via model method)
    try:
        current_user.set_password(request.new_password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    db.commit()
    
    logger.info(f"Password changed for user: {current_user.id}")
    
    # Send email notification
    try:
        from app.services.email_service import email_service
        await email_service.send_password_changed_email(
            to_email=current_user.email,
            user_name=current_user.full_name,
            language="uz"
        )
    except Exception as e:
        logger.error(f"Failed to send password change email: {e}")
    
    return MessageResponse(
        message="Password changed successfully",
        success=True
    )


@router.post(
    "/me/avatar",
    response_model=UserProfileResponse,
    summary="Upload avatar"
)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar image."""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 5MB)
    MAX_SIZE = 5 * 1024 * 1024  # 5MB
    file_content = await file.read()
    if len(file_content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    # Create uploads directory if not exists
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    import uuid
    file_ext = Path(file.filename).suffix
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Delete old avatar if exists
    if current_user.avatar_url:
        old_path = Path(current_user.avatar_url.replace("/uploads/", "uploads/"))
        if old_path.exists():
            try:
                old_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete old avatar: {e}")
    
    # Save new file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Update user avatar URL
    current_user.avatar_url = f"/uploads/avatars/{unique_filename}"
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"Avatar uploaded for user: {current_user.id}")
    
    # Get statistics
    resume_count = db.query(func.count(Resume.id)).filter(
        Resume.user_id == current_user.id,
        Resume.is_deleted == False
    ).scalar()
    
    application_count = db.query(func.count(Application.id)).filter(
        Application.user_id == current_user.id,
        Application.is_deleted == False
    ).scalar()
    
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        role=current_user.role.value,
        admin_role=current_user.effective_admin_role.value if current_user.effective_admin_role else None,
        is_verified=current_user.is_verified,
        is_active=current_user.is_active_account,
        avatar_url=current_user.avatar_url,
        bio=current_user.bio,
        location=current_user.location,
        company_name=current_user.company_name,
        company_website=current_user.company_website,
        company_cover_photo_url=current_user.company_cover_photo_url,
        company_gallery_images=current_user.company_gallery_images or [],
        company_culture=current_user.company_culture,
        company_linkedin_url=current_user.company_linkedin_url,
        company_telegram_url=current_user.company_telegram_url,
        company_instagram_url=current_user.company_instagram_url,
        company_facebook_url=current_user.company_facebook_url,
        company_founded_year=current_user.company_founded_year,
        company_video_url=current_user.company_video_url,
        verification_state=current_user.verification_state,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login,
        resume_count=resume_count,
        application_count=application_count,
    )


@router.delete(
    "/me/avatar",
    response_model=MessageResponse,
    summary="Delete avatar"
)
async def delete_avatar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete user avatar."""
    
    if not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No avatar to delete"
        )
    
    # Delete file
    avatar_path = Path(current_user.avatar_url.replace("/uploads/", "uploads/"))
    if avatar_path.exists():
        try:
            avatar_path.unlink()
        except Exception as e:
            logger.error(f"Failed to delete avatar file: {e}")
    
    # Update database
    current_user.avatar_url = None
    db.commit()
    
    logger.info(f"Avatar deleted for user: {current_user.id}")
    
    return MessageResponse(
        message="Avatar deleted successfully",
        success=True
    )


# =============================================================================
# NOTIFICATION PREFERENCES
# =============================================================================

class NotificationPreferences(BaseModel):
    email_applications: bool = True
    email_interviews: bool = True
    email_jobs: bool = True
    email_tips: bool = False
    push_applications: bool = True
    push_messages: bool = True
    telegram_enabled: bool = False
    telegram_new_applications: bool = True
    telegram_deadline_reminders: bool = True
    telegram_chat_id: Optional[str] = None
    telegram_channel: Optional[str] = None
    preferred_salary_currency: str = "UZS"
    company_size: Optional[str] = None
    company_industry: Optional[str] = None


class OnboardingChecklistStep(BaseModel):
    key: str
    label: str
    url: str
    completed: bool


class OnboardingChecklistResponse(BaseModel):
    success: bool = True
    progress: str
    completed_count: int
    total_count: int
    all_done: bool
    dismissed: bool
    steps: list[OnboardingChecklistStep]


def _compute_company_onboarding_state(
    *,
    company: User,
    db: Session,
) -> dict:
    prefs = company.notification_preferences or {}
    onboarding_prefs = prefs.get("company_onboarding") or {}
    if not isinstance(onboarding_prefs, dict):
        onboarding_prefs = {}

    completed_profile = all(
        [
            bool((company.avatar_url or "").strip()),
            bool((company.company_name or "").strip()),
            bool((company.company_website or "").strip()),
            bool((company.location or "").strip()),
            bool((company.bio or "").strip()),
            bool(str(prefs.get("company_size") or "").strip()),
            bool(str(prefs.get("company_industry") or "").strip()),
        ]
    )

    jobs_count = (
        db.query(func.count(Job.id))
        .filter(
            Job.company_id == company.id,
            Job.is_deleted == False,
        )
        .scalar()
        or 0
    )
    has_first_job = jobs_count > 0

    responded_count = (
        db.query(func.count(Application.id))
        .join(Job, Job.id == Application.job_id)
        .filter(
            Job.company_id == company.id,
            Job.is_deleted == False,
            Application.is_deleted == False,
            Application.status != "pending",
        )
        .scalar()
        or 0
    )
    has_first_response = responded_count > 0

    completed_map = {
        "complete_profile": completed_profile,
        "first_job_posted": has_first_job,
        "first_candidate_responded": has_first_response,
    }

    steps = [
        {
            "key": "complete_profile",
            "label": "Kompaniya profilini to'ldiring",
            "url": "/company/settings#company",
            "completed": completed_profile,
        },
        {
            "key": "first_job_posted",
            "label": "Birinchi vakansiyani e'lon qiling",
            "url": "/company/jobs/new",
            "completed": has_first_job,
        },
        {
            "key": "first_candidate_responded",
            "label": "Birinchi nomzodga javob bering",
            "url": "/company/applicants",
            "completed": has_first_response,
        },
    ]

    completed_count = sum(1 for item in steps if item["completed"])
    total_count = len(steps)
    all_done = completed_count == total_count
    dismissed = bool(onboarding_prefs.get("dismissed", False) and all_done)

    now = datetime.now(timezone.utc).isoformat()
    next_onboarding_state = {
        "completed_map": completed_map,
        "completed_count": completed_count,
        "total_count": total_count,
        "all_done": all_done,
        "dismissed": dismissed,
        "updated_at": now,
        "dismissed_at": onboarding_prefs.get("dismissed_at"),
    }
    if not all_done:
        next_onboarding_state["dismissed"] = False
        next_onboarding_state["dismissed_at"] = None

    return {
        "steps": steps,
        "completed_count": completed_count,
        "total_count": total_count,
        "all_done": all_done,
        "dismissed": bool(next_onboarding_state["dismissed"]),
        "persisted_state": next_onboarding_state,
    }


@router.get("/me/notification-preferences", summary="Get notification preferences")
async def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's notification preferences."""
    prefs = current_user.notification_preferences or {}
    return {
        "success": True,
        "data": {
            "email_applications": prefs.get("email_applications", True),
            "email_interviews": prefs.get("email_interviews", True),
            "email_jobs": prefs.get("email_jobs", True),
            "email_tips": prefs.get("email_tips", False),
            "push_applications": prefs.get("push_applications", True),
            "push_messages": prefs.get("push_messages", True),
            "telegram_enabled": prefs.get("telegram_enabled", False),
            "telegram_new_applications": prefs.get("telegram_new_applications", True),
            "telegram_deadline_reminders": prefs.get("telegram_deadline_reminders", True),
            "telegram_chat_id": prefs.get("telegram_chat_id"),
            "telegram_channel": prefs.get("telegram_channel"),
            "preferred_salary_currency": str(prefs.get("preferred_salary_currency", "UZS")).upper(),
            "company_size": prefs.get("company_size"),
            "company_industry": prefs.get("company_industry"),
        }
    }


@router.put("/me/notification-preferences", summary="Update notification preferences")
async def update_notification_preferences(
    prefs: NotificationPreferences,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save user's notification preferences."""
    merged = dict(current_user.notification_preferences or {})
    payload = prefs.model_dump()
    normalized_currency = str(payload.get("preferred_salary_currency") or "UZS").upper()
    payload["preferred_salary_currency"] = normalized_currency if normalized_currency in {"UZS", "USD"} else "UZS"
    merged.update(payload)
    current_user.notification_preferences = merged
    db.commit()
    return {"success": True, "message": "Bildirishnoma sozlamalari saqlandi"}


@router.get(
    "/me/company-onboarding-checklist",
    response_model=OnboardingChecklistResponse,
    summary="Get company onboarding checklist state",
)
async def get_company_onboarding_checklist(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role.value != "company":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access onboarding checklist",
        )

    payload = _compute_company_onboarding_state(company=current_user, db=db)
    prefs = dict(current_user.notification_preferences or {})
    prefs["company_onboarding"] = payload["persisted_state"]
    current_user.notification_preferences = prefs
    db.commit()

    completed_count = payload["completed_count"]
    total_count = payload["total_count"]
    progress = f"{completed_count}/{total_count} bajarildi"

    return OnboardingChecklistResponse(
        progress=progress,
        completed_count=completed_count,
        total_count=total_count,
        all_done=payload["all_done"],
        dismissed=payload["dismissed"],
        steps=[OnboardingChecklistStep(**item) for item in payload["steps"]],
    )


@router.post(
    "/me/company-onboarding-checklist/dismiss",
    summary="Dismiss company onboarding checklist when fully complete",
)
async def dismiss_company_onboarding_checklist(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role.value != "company":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can dismiss onboarding checklist",
        )

    payload = _compute_company_onboarding_state(company=current_user, db=db)
    if not payload["all_done"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Checklist can be dismissed only after all steps are completed",
        )

    prefs = dict(current_user.notification_preferences or {})
    onboarding = dict(payload["persisted_state"])
    onboarding["dismissed"] = True
    onboarding["dismissed_at"] = datetime.now(timezone.utc).isoformat()
    prefs["company_onboarding"] = onboarding
    current_user.notification_preferences = prefs
    db.commit()

    return {"success": True, "message": "Onboarding checklist dismissed"}


# =============================================================================
# PRIVACY SETTINGS
# =============================================================================

class PrivacySettings(BaseModel):
    public_profile: bool = True
    show_email: bool = False
    show_phone: bool = False


@router.get("/me/privacy-settings", summary="Get privacy settings")
async def get_privacy_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's privacy settings."""
    prefs = current_user.privacy_settings or {}
    return {
        "success": True,
        "data": {
            "public_profile": prefs.get("public_profile", True),
            "show_email": prefs.get("show_email", False),
            "show_phone": prefs.get("show_phone", False),
        }
    }


@router.put("/me/privacy-settings", summary="Update privacy settings")
async def update_privacy_settings(
    settings_data: PrivacySettings,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save user's privacy settings."""
    current_user.privacy_settings = settings_data.model_dump()
    db.commit()
    return {"success": True, "message": "Maxfiylik sozlamalari saqlandi"}














