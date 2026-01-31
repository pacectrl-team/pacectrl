from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.api_log import ApiLog
from app.models.user import User


# Paths to exclude from audit log queries by default
# These are high-frequency or low-value endpoints for auditing purposes
EXCLUDED_PATHS = [
    "GET /api/v1/operator/auth/me",
    "GET /health",
]


class AuditLogEntry(BaseModel):
    """Schema for a single audit log entry."""
    request_id: str
    created_at: datetime
    method: str
    path: str
    status_code: int
    response_ms: int
    user_id: Optional[int] = None
    voyage_id: Optional[int] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    """Response schema for audit log queries with pagination info."""
    total: int
    limit: int
    offset: int
    items: List[AuditLogEntry]


router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("/", response_model=AuditLogResponse)
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    # Filtering parameters
    path: Optional[str] = Query(None, description="Filter by path (partial match)"),
    method: Optional[str] = Query(None, description="Filter by HTTP method (GET, POST, etc.)"),
    start_datetime: Optional[datetime] = Query(None, description="Filter logs after this datetime"),
    end_datetime: Optional[datetime] = Query(None, description="Filter logs before this datetime"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    voyage_id: Optional[int] = Query(None, description="Filter by voyage ID"),
    status_code: Optional[int] = Query(None, description="Filter by HTTP status code"),
    include_excluded: bool = Query(False, description="Include normally excluded paths like /auth/me"),
    # Pagination parameters
    limit: int = Query(50, ge=1, le=500, description="Maximum number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
):
    """
    Get audit logs for the current operator.
    
    Supports filtering by:
    - path: Partial match on the request path
    - method: HTTP method (GET, POST, PATCH, DELETE)
    - start_datetime / end_datetime: Date range filter
    - user_id: Filter by specific user
    - voyage_id: Filter by specific voyage
    - status_code: Filter by HTTP response status
    
    By default, excludes high-frequency/low-value paths like /auth/me.
    Set include_excluded=true to include all paths.
    
    Results are ordered by created_at descending (most recent first).
    """
    operator_id = current_user.operator_id

    # Build the base query, scoped to the current operator
    query = db.query(ApiLog).filter(ApiLog.operator_id == operator_id)

    # Exclude default paths unless explicitly requested
    if not include_excluded:
        for excluded in EXCLUDED_PATHS:
            # Parse "METHOD /path" format
            parts = excluded.split(" ", 1)
            if len(parts) == 2:
                ex_method, ex_path = parts
                # Exclude entries matching both method and path
                query = query.filter(
                    ~((ApiLog.method == ex_method) & (ApiLog.path == ex_path))
                )

    # Apply filters
    if path:
        # Partial match on path using LIKE
        query = query.filter(ApiLog.path.ilike(f"%{path}%"))

    if method:
        query = query.filter(ApiLog.method == method.upper())

    if start_datetime:
        query = query.filter(ApiLog.created_at >= start_datetime)

    if end_datetime:
        query = query.filter(ApiLog.created_at <= end_datetime)

    if user_id:
        query = query.filter(ApiLog.user_id == user_id)

    if voyage_id:
        query = query.filter(ApiLog.voyage_id == voyage_id)

    if status_code:
        query = query.filter(ApiLog.status_code == status_code)

    # Get total count before pagination
    total = query.count()

    # Apply ordering and pagination
    items = (
        query
        .order_by(ApiLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Convert to response format, converting UUID to string
    entries = []
    for item in items:
        entries.append(
            AuditLogEntry(
                request_id=str(item.request_id),
                created_at=item.created_at,
                method=item.method,
                path=item.path,
                status_code=item.status_code,
                response_ms=item.response_ms,
                user_id=item.user_id,
                voyage_id=item.voyage_id,
            )
        )

    return AuditLogResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=entries,
    )
