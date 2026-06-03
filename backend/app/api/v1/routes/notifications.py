"""
=============================================================================
NOTIFICATIONS ENDPOINTS
=============================================================================

Real-time user notifications.
"""

import logging
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.models.notification import Notification

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    link: str | None
    is_read: bool
    created_at: datetime
    read_at: datetime | None
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


# =============================================================================
# NOTIFICATION ENDPOINTS
# =============================================================================

@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user notifications.
    
    - Returns paginated list of notifications
    - Can filter to unread only
    - Ordered by newest first
    """
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    # Get total counts
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    # Get paginated results
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count
    }


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mark notification as read.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"success": True, "message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read.
    """
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })
    db.commit()
    
    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a notification.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"success": True, "message": "Notification deleted"}


# =============================================================================
# HELPER FUNCTION
# =============================================================================

def create_notification(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    type: str = "info",
    link: str | None = None
):
    """
    Create a new notification for a user.
    
    Usage:
        create_notification(
            db, user.id,
            "Application Status Updated",
            "Your application to MIT has been reviewed!",
            type="success",
            link="/applications/123"
        )
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link
    )
    db.add(notification)
    db.commit()
    logger.info(f"Notification created for user {user_id}: {title}")
    return notification

    