"""
=============================================================================
API VERSION 1
=============================================================================

All v1 API routes are registered here.
"""

from fastapi import APIRouter
from app.api.v1.routes import (
    auth, users, resumes, jobs, applications, 
    admin, payments, landing,
    profile, notifications, saved_searches
)
from app.routers import ai  # Import AI router

# Create main v1 router
api_router = APIRouter()

# Include all route modules
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)

api_router.include_router(
    resumes.router,
    prefix="/resumes",
    tags=["Resumes"]
)

api_router.include_router(
    jobs.router,
    prefix="/jobs",
    tags=["Jobs"]
)

api_router.include_router(
    applications.router,
    prefix="/applications",
    tags=["Applications"]
)

# AI Router - all AI-powered features
api_router.include_router(
    ai.router,
    prefix="/ai",
    tags=["AI Features"]
)

# Admin Router - Admin dashboard and management
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"]
)

# Payment Router - Subscription and billing
api_router.include_router(
    payments.router,
    prefix="/payments",
    tags=["Payments"]
)

# Profile Router - User profile management
api_router.include_router(
    profile.router,
    prefix="/profile",
    tags=["Profile"]
)

# Notifications Router - Real-time notifications
api_router.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["Notifications"]
)

# Saved Searches Router - Search filter management
api_router.include_router(
    saved_searches.router,
    prefix="/saved-searches",
    tags=["Saved Searches"]
)

api_router.include_router(
    landing.router,
    prefix="/landing",
    tags=["Landing CMS"]
)












