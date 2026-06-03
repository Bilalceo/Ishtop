"""
=============================================================================
EMAIL VERIFICATION SYSTEM
=============================================================================

Token-based email verification for new user registrations.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

from jose import jwt, JWTError
from app.config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# TOKEN GENERATION
# =============================================================================

def create_verification_token(email: str, expires_delta: timedelta = timedelta(hours=24)) -> str:
    """
    Create email verification token.
    
    Args:
        email: User email address
        expires_delta: Token expiration time (default 24 hours)
        
    Returns:
        JWT token string
    """
    expire = datetime.now(timezone.utc) + expires_delta
    
    to_encode = {
        "sub": email,
        "type": "email_verification",
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def verify_verification_token(token: str) -> Optional[str]:
    """
    Verify email verification token.
    
    Args:
        token: JWT token string
        
    Returns:
        Email address if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "email_verification":
            return None
            
        return email
        
    except JWTError as e:
        logger.error(f"Token verification failed: {e}")
        return None


# =============================================================================
# PASSWORD RESET TOKENS
# =============================================================================

def create_password_reset_token(email: str, expires_delta: timedelta = timedelta(hours=1)) -> str:
    """
    Create password reset token.
    
    Args:
        email: User email address
        expires_delta: Token expiration time (default 1 hour)
        
    Returns:
        JWT token string
    """
    expire = datetime.now(timezone.utc) + expires_delta
    
    to_encode = {
        "sub": email,
        "type": "password_reset",
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify password reset token.
    
    Args:
        token: JWT token string
        
    Returns:
        Email address if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "password_reset":
            return None
            
        return email
        
    except JWTError as e:
        logger.error(f"Password reset token verification failed: {e}")
        return None
