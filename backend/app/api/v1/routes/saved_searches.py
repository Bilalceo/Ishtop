"""
=============================================================================
SAVED SEARCHES ENDPOINTS
=============================================================================

Save and manage search filters.
"""

import logging
from typing import List, Literal
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.models.saved_search import SavedSearch

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

from pydantic import BaseModel


class SavedSearchCreate(BaseModel):
    name: str
    search_type: Literal["jobs"] = "jobs"
    filters: dict


class SavedSearchUpdate(BaseModel):
    name: str | None = None
    filters: dict | None = None


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    search_type: str
    filters: dict
    created_at: datetime
    last_used_at: datetime
    
    class Config:
        from_attributes = True


class SavedSearchListResponse(BaseModel):
    searches: List[SavedSearchResponse]
    total: int


# =============================================================================
# SAVED SEARCH ENDPOINTS
# =============================================================================

@router.get("", response_model=SavedSearchListResponse)
async def list_saved_searches(
    search_type: Literal["jobs"] | None = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get user's saved searches.
    
    - Can filter by search_type (jobs)
    - Ordered by most recently used
    """
    query = db.query(SavedSearch).filter(SavedSearch.user_id == current_user.id)
    
    if search_type:
        query = query.filter(SavedSearch.search_type == search_type)
    
    searches = query.order_by(desc(SavedSearch.last_used_at)).all()
    
    return {
        "searches": searches,
        "total": len(searches)
    }


@router.post("", response_model=SavedSearchResponse)
async def create_saved_search(
    data: SavedSearchCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Save a search for quick access.
    
    - Name must be unique per user
    - Filters stored as JSON
    """
    # Check if name already exists
    existing = db.query(SavedSearch).filter(
        SavedSearch.user_id == current_user.id,
        SavedSearch.name == data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A search with this name already exists"
        )
    
    saved_search = SavedSearch(
        user_id=current_user.id,
        name=data.name,
        search_type=data.search_type,
        filters=data.filters
    )
    
    db.add(saved_search)
    db.commit()
    db.refresh(saved_search)
    
    logger.info(f"Saved search created: {saved_search.id} by user {current_user.id}")
    
    return saved_search


@router.put("/{search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    search_id: str,
    data: SavedSearchUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a saved search.
    """
    saved_search = db.query(SavedSearch).filter(
        SavedSearch.id == search_id,
        SavedSearch.user_id == current_user.id
    ).first()
    
    if not saved_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    # Update fields
    if data.name:
        # Check if new name conflicts
        existing = db.query(SavedSearch).filter(
            SavedSearch.user_id == current_user.id,
            SavedSearch.name == data.name,
            SavedSearch.id != search_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A search with this name already exists"
            )
        
        saved_search.name = data.name
    
    if data.filters is not None:
        saved_search.filters = data.filters
    
    saved_search.last_used_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(saved_search)
    
    return saved_search


@router.delete("/{search_id}")
async def delete_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a saved search.
    """
    saved_search = db.query(SavedSearch).filter(
        SavedSearch.id == search_id,
        SavedSearch.user_id == current_user.id
    ).first()
    
    if not saved_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    db.delete(saved_search)
    db.commit()
    
    logger.info(f"Saved search deleted: {search_id}")
    
    return {"success": True, "message": "Saved search deleted"}


@router.post("/{search_id}/use")
async def use_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Mark a saved search as used (updates last_used_at).
    """
    saved_search = db.query(SavedSearch).filter(
        SavedSearch.id == search_id,
        SavedSearch.user_id == current_user.id
    ).first()
    
    if not saved_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    saved_search.last_used_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"success": True, "filters": saved_search.filters}
