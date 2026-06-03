"""
=============================================================================
PREMIUM FEATURE GATING
=============================================================================

Dependency functions to restrict premium features to paid subscribers.

Usage:
    from app.core.premium import get_premium_user
    
    @router.post("/premium-feature")
    async def premium_feature(user: User = Depends(get_premium_user)):
        # Only premium users can access this endpoint
        pass

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# PREMIUM TIERS
# =============================================================================

class SubscriptionTier:
    """Subscription tier constants."""
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def is_subscription_active(user: User) -> bool:
    """
    Check if user's subscription is active.
    
    Args:
        user: User model instance
        
    Returns:
        True if subscription is active, False otherwise
    """
    # FREE tier is always "active" but has no premium features
    if user.subscription_tier == SubscriptionTier.FREE:
        return False
    
    # Check expiration date
    if user.subscription_expires_at is None:
        return False

    # Check if expired
    now = datetime.now(timezone.utc)
    expires_at = user.subscription_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    else:
        expires_at = expires_at.astimezone(timezone.utc)
    return expires_at > now


def get_user_subscription_info(user: User) -> dict:
    """
    Get user subscription information.
    
    Args:
        user: User model instance
        
    Returns:
        Dictionary with subscription details
    """
    is_active = is_subscription_active(user)
    
    return {
        "tier": user.subscription_tier,
        "is_active": is_active,
        "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        "days_remaining": (
            (
                (
                    user.subscription_expires_at.replace(tzinfo=timezone.utc)
                    if user.subscription_expires_at.tzinfo is None
                    else user.subscription_expires_at.astimezone(timezone.utc)
                )
                - datetime.now(timezone.utc)
            ).days
            if user.subscription_expires_at
            else 0
        ),
        "is_premium": is_active and user.subscription_tier == SubscriptionTier.PREMIUM,
        "is_enterprise": is_active and user.subscription_tier == SubscriptionTier.ENTERPRISE,
    }


# =============================================================================
# DEPENDENCY FUNCTIONS
# =============================================================================

async def get_premium_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to require PREMIUM or ENTERPRISE subscription.
    
    Raises HTTPException if user doesn't have active premium subscription.
    
    Usage:
        @router.post("/premium-endpoint")
        async def premium_endpoint(user: User = Depends(get_premium_user)):
            # Only accessible to premium/enterprise users
            pass
    """
    if not is_subscription_active(current_user):
        logger.warning(
            f"Premium feature access denied for user {current_user.id} "
            f"(tier: {current_user.subscription_tier})"
        )
        
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Premium subscription required",
                "message": "This feature requires an active Premium or Enterprise subscription.",
                "current_tier": current_user.subscription_tier,
                "upgrade_url": "/pricing",
            }
        )
    
    return current_user


async def get_enterprise_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to require ENTERPRISE subscription.
    
    Raises HTTPException if user doesn't have active enterprise subscription.
    
    Usage:
        @router.post("/enterprise-endpoint")
        async def enterprise_endpoint(user: User = Depends(get_enterprise_user)):
            # Only accessible to enterprise users
            pass
    """
    if not is_subscription_active(current_user):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Enterprise subscription required",
                "message": "This feature requires an active Enterprise subscription.",
                "current_tier": current_user.subscription_tier,
                "contact_url": "/contact-sales",
            }
        )
    
    if current_user.subscription_tier != SubscriptionTier.ENTERPRISE:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Enterprise subscription required",
                "message": "This feature is only available for Enterprise customers.",
                "current_tier": current_user.subscription_tier,
                "contact_url": "/contact-sales",
            }
        )
    
    return current_user


async def check_feature_limit(
    user: User,
    feature: str,
    current_usage: int,
    free_limit: int,
    premium_limit: Optional[int] = None,
) -> dict:
    """
    Check if user has exceeded feature usage limit.
    
    Args:
        user: User model instance
        feature: Feature name (for logging/error messages)
        current_usage: Current usage count
        free_limit: Limit for FREE users
        premium_limit: Limit for PREMIUM users (None = unlimited)
        
    Returns:
        Dictionary with:
        - allowed: bool (whether action is allowed)
        - limit: int (user's limit)
        - current: int (current usage)
        - remaining: int (remaining quota)
        
    Example:
        result = await check_feature_limit(
            user=user,
            feature="AI resume generation",
            current_usage=user_resumes_count,
            free_limit=1,
            premium_limit=None,  # unlimited for premium
        )
        
        if not result["allowed"]:
            raise HTTPException(402, detail=result)
    """
    is_active = is_subscription_active(user)
    
    # Determine user's limit
    if is_active:
        # Premium/Enterprise - use premium limit
        limit = premium_limit if premium_limit is not None else float('inf')
    else:
        # FREE tier
        limit = free_limit
    
    # Check if exceeded
    allowed = current_usage < limit
    remaining = max(0, limit - current_usage) if limit != float('inf') else float('inf')
    
    return {
        "allowed": allowed,
        "feature": feature,
        "limit": limit if limit != float('inf') else "unlimited",
        "current": current_usage,
        "remaining": remaining if remaining != float('inf') else "unlimited",
        "tier": user.subscription_tier,
        "upgrade_required": not allowed and not is_active,
    }


# =============================================================================
# FEATURE LIMITS
# =============================================================================

FEATURE_LIMITS = {
    "ai_resume_generation": {
        "free": 1,
        "premium": None,  # unlimited
        "enterprise": None,  # unlimited
    },
    "job_applications_per_month": {
        "free": 5,
        "premium": 50,
        "enterprise": None,  # unlimited
    },
    "auto_apply": {
        "free": 0,  # not available
        "premium": 50,
        "enterprise": None,  # unlimited
    },
}


def get_feature_limit(feature: str, tier: str) -> Optional[int]:
    """
    Get feature limit for a specific tier.
    
    Args:
        feature: Feature name
        tier: Subscription tier
        
    Returns:
        Limit (int) or None for unlimited
    """
    limits = FEATURE_LIMITS.get(feature, {})
    return limits.get(tier, 0)


# =============================================================================
# PREMIUM FEATURES FLAGS
# =============================================================================

def get_user_features(user: User) -> dict:
    """
    Get dictionary of features available to user.
    
    Args:
        user: User model instance
        
    Returns:
        Dictionary with feature flags
    """
    is_active = is_subscription_active(user)
    tier = user.subscription_tier
    
    return {
        # AI Features
        "unlimited_ai_resumes": is_active,
        "ai_cover_letters": is_active,
        
        # Job Features
        "auto_apply": is_active,
        "priority_job_matching": is_active,
        "job_alerts": is_active,
        
        # Analytics
        "advanced_analytics": is_active,
        "export_data": is_active,
        
        # Support
        "priority_support": is_active,
        "chat_support": tier == SubscriptionTier.ENTERPRISE,
        
        # Enterprise Only
        "api_access": tier == SubscriptionTier.ENTERPRISE,
        "team_management": tier == SubscriptionTier.ENTERPRISE,
        "custom_integrations": tier == SubscriptionTier.ENTERPRISE,
        "sla_guarantee": tier == SubscriptionTier.ENTERPRISE,
    }
