"""
=============================================================================
PROFILE ENDPOINTS
=============================================================================

User profile management including avatar upload.
"""

import logging
import os
from pathlib import Path
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.core.file_validation import validate_image_upload, get_safe_filename
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Upload directory
UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =============================================================================
# PROFILE AVATAR ENDPOINTS
# =============================================================================

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload user profile picture.
    
    - Validates image type and size (max 5MB)
    - Supports JPEG, PNG, GIF, WebP
    - Returns avatar URL
    """
    try:
        # Validate image
        contents = await validate_image_upload(file, max_size=5 * 1024 * 1024)
        
        # Generate safe filename with user ID
        _allowed_exts = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
        raw_ext = Path(file.filename).suffix.lstrip('.').lower() if file.filename else ''
        ext = raw_ext if raw_ext in _allowed_exts else 'jpg'
        safe_filename = f"{current_user.id}_{uuid4().hex[:8]}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Update user avatar URL
        avatar_url = f"/uploads/avatars/{safe_filename}"
        current_user.avatar_url = avatar_url
        db.commit()
        
        logger.info(f"Avatar uploaded for user {current_user.id}: {safe_filename}")
        
        return {
            "success": True,
            "avatar_url": avatar_url,
            "message": "Profile picture uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Avatar upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload profile picture"
        )


@router.delete("/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete user profile picture.
    """
    if not current_user.avatar_url:
        return {"success": True, "message": "No avatar to delete"}
    
    try:
        # Delete file if exists — resolve to prevent path traversal
        if current_user.avatar_url.startswith('/uploads/'):
            upload_root = Path(UPLOAD_DIR).resolve()
            candidate = Path(current_user.avatar_url.lstrip('/')).resolve()
            if candidate.is_relative_to(upload_root) and candidate.exists():
                candidate.unlink()
        
        # Remove from user record
        current_user.avatar_url = None
        db.commit()
        
        logger.info(f"Avatar deleted for user {current_user.id}")
        
        return {
            "success": True,
            "message": "Profile picture deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Avatar deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile picture"
        )
