"""
=============================================================================
FILE UPLOAD VALIDATION
=============================================================================

Secure file upload validation with type checking and size limits.
"""

import logging
from typing import Optional
from fastapi import UploadFile, HTTPException, status

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',  # .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    'text/plain',  # .txt
]

ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
]

# File signatures (magic bytes) for validation
FILE_SIGNATURES = {
    'application/pdf': b'%PDF',
    'image/jpeg': b'\xFF\xD8\xFF',
    'image/png': b'\x89PNG\r\n\x1a\n',
    'image/gif': b'GIF89a',
}


# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

async def validate_file_size(file: UploadFile, max_size: int = MAX_FILE_SIZE) -> bytes:
    """
    Validate file size.
    
    Args:
        file: Uploaded file
        max_size: Maximum allowed size in bytes
        
    Returns:
        File contents as bytes
        
    Raises:
        HTTPException: If file is too large
    """
    contents = await file.read()
    
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {max_size / 1024 / 1024:.1f}MB"
        )
    
    # Reset file pointer
    await file.seek(0)
    
    return contents


def validate_file_type(contents: bytes, content_type: str, allowed_types: list) -> bool:
    """
    Validate file type using magic bytes (file signature).
    
    Args:
        contents: File contents
        content_type: Declared content type
        allowed_types: List of allowed MIME types
        
    Returns:
        True if valid
        
    Raises:
        HTTPException: If file type is not allowed
    """
    # Check declared content type
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Verify magic bytes (if signature available)
    if content_type in FILE_SIGNATURES:
        signature = FILE_SIGNATURES[content_type]
        if not contents.startswith(signature):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="File content does not match declared type"
            )
    
    return True


async def validate_document_upload(file: UploadFile) -> bytes:
    """
    Validate document upload (PDF, DOC, DOCX, TXT).
    
    Args:
        file: Uploaded file
        
    Returns:
        File contents as bytes
        
    Raises:
        HTTPException: If validation fails
    """
    # Check file size
    contents = await validate_file_size(file, MAX_FILE_SIZE)
    
    # Check file type
    validate_file_type(contents, file.content_type, ALLOWED_DOCUMENT_TYPES)
    
    logger.info(f"Document validated: {file.filename} ({file.content_type}, {len(contents)} bytes)")
    
    return contents


async def validate_image_upload(file: UploadFile, max_size: int = 5 * 1024 * 1024) -> bytes:
    """
    Validate image upload (JPEG, PNG, GIF, WebP).
    
    Args:
        file: Uploaded file
        max_size: Maximum size (default 5MB for images)
        
    Returns:
        File contents as bytes
        
    Raises:
        HTTPException: If validation fails
    """
    # Check file size (smaller limit for images)
    contents = await validate_file_size(file, max_size)
    
    # Check file type
    validate_file_type(contents, file.content_type, ALLOWED_IMAGE_TYPES)
    
    logger.info(f"Image validated: {file.filename} ({file.content_type}, {len(contents)} bytes)")
    
    return contents


def get_safe_filename(filename: str) -> str:
    """
    Generate safe filename by removing potentially dangerous characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    import re
    import uuid
    
    # Remove path components
    filename = filename.split('/')[-1].split('\\')[-1]
    
    # Get extension
    parts = filename.rsplit('.', 1)
    if len(parts) == 2:
        name, ext = parts
        # Clean name
        name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
        # Add UUID to prevent collisions
        safe_name = f"{name}_{uuid.uuid4().hex[:8]}.{ext}"
    else:
        safe_name = f"{uuid.uuid4().hex}.bin"
    
    return safe_name
