"""
=============================================================================
ERROR LOGGING SERVICE - Production Error Tracking
=============================================================================

Bu service barcha xatolarni qayd qiladi:
- API errors
- Auth errors  
- AI errors
- Database errors
- Payment errors

Xususiyatlari:
- Strukturalangan logging
- Error kategoriyalash
- Admin dashboard uchun API
- Email bildirishnomalar (kritik xatolar)
- Statistika va analytics

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import logging
import traceback
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from uuid import UUID, uuid4
from collections import defaultdict
import asyncio

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# ERROR TYPES
# =============================================================================

class ErrorCategory(str, Enum):
    """Error kategoriyalari."""
    API = "api"
    AUTH = "auth"
    AI = "ai"
    DATABASE = "database"
    PAYMENT = "payment"
    EMAIL = "email"
    VALIDATION = "validation"
    EXTERNAL = "external"
    UNKNOWN = "unknown"


class ErrorSeverity(str, Enum):
    """Error jiddiyligi."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


# =============================================================================
# ERROR LOG MODEL
# =============================================================================

class ErrorLog(BaseModel):
    """Error log entry."""
    
    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Error classification
    category: ErrorCategory
    severity: ErrorSeverity
    
    # Error details
    error_type: str  # Exception class name
    error_message: str
    error_code: Optional[str] = None
    
    # Stack trace
    stack_trace: Optional[str] = None
    
    # Request context
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    query_params: Optional[Dict[str, Any]] = None
    
    # User context
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Additional context
    extra_data: Optional[Dict[str, Any]] = None
    
    # Resolution
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None


# =============================================================================
# ERROR STATISTICS
# =============================================================================

class ErrorStats(BaseModel):
    """Error statistics."""
    
    total_errors: int = 0
    errors_by_category: Dict[str, int] = Field(default_factory=dict)
    errors_by_severity: Dict[str, int] = Field(default_factory=dict)
    errors_by_hour: Dict[str, int] = Field(default_factory=dict)
    
    # Top errors
    top_error_types: List[Dict[str, Any]] = Field(default_factory=list)
    top_endpoints: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Time range
    from_time: Optional[datetime] = None
    to_time: Optional[datetime] = None


# =============================================================================
# ERROR LOGGING SERVICE
# =============================================================================

class ErrorLoggingService:
    """
    Markazlashtirilgan error logging xizmati.
    
    Barcha xatolarni qayd qiladi va admin dashboard uchun
    statistika beradi.
    """
    
    def __init__(self):
        """Initialize error logging service."""
        # In-memory storage (Production da Redis/Database ishlatiladi)
        self._errors: List[ErrorLog] = []
        self._max_errors = 10000  # Max errors to keep in memory
        
        # Error count cache
        self._error_counts: Dict[str, int] = defaultdict(int)
        
        # Alert thresholds
        self._alert_thresholds = {
            ErrorSeverity.CRITICAL: 1,    # Alert on first critical
            ErrorSeverity.ERROR: 10,      # Alert after 10 errors/hour
            ErrorSeverity.WARNING: 50,    # Alert after 50 warnings/hour
        }
        
        logger.info("ErrorLoggingService initialized")
    
    # =========================================================================
    # LOGGING METHODS
    # =========================================================================
    
    async def log_error(
        self,
        category: ErrorCategory,
        severity: ErrorSeverity,
        error: Union[Exception, str],
        error_code: Optional[str] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        path: Optional[str] = None,
        query_params: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """
        Log an error.
        
        Args:
            category: Error kategoriyasi
            severity: Jiddiylik darajasi
            error: Exception yoki xato xabari
            ... (boshqa parametrlar)
            
        Returns:
            ErrorLog entry
        """
        # Extract error details
        if isinstance(error, Exception):
            error_type = type(error).__name__
            error_message = str(error)
            stack_trace = traceback.format_exc()
        else:
            error_type = "CustomError"
            error_message = str(error)
            stack_trace = None
        
        # Create error log
        error_log = ErrorLog(
            category=category,
            severity=severity,
            error_type=error_type,
            error_message=error_message,
            error_code=error_code,
            stack_trace=stack_trace,
            request_id=request_id,
            endpoint=endpoint,
            method=method,
            path=path,
            query_params=query_params,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )
        
        # Store error
        self._errors.append(error_log)
        
        # Update counts
        self._error_counts[f"{category.value}:{severity.value}"] += 1
        
        # Trim old errors
        if len(self._errors) > self._max_errors:
            self._errors = self._errors[-self._max_errors:]
        
        # Log to standard logger
        log_message = f"[{category.value.upper()}] {error_type}: {error_message}"
        
        if severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message)
        elif severity == ErrorSeverity.ERROR:
            logger.error(log_message)
        elif severity == ErrorSeverity.WARNING:
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Check if alert needed
        await self._check_alert_threshold(error_log)
        
        return error_log
    
    # =========================================================================
    # SPECIALIZED LOGGING METHODS
    # =========================================================================
    
    async def log_api_error(
        self,
        error: Union[Exception, str],
        endpoint: str,
        method: str,
        status_code: int,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """Log API error."""
        severity = (
            ErrorSeverity.ERROR if status_code >= 500 
            else ErrorSeverity.WARNING if status_code >= 400
            else ErrorSeverity.INFO
        )
        
        return await self.log_error(
            category=ErrorCategory.API,
            severity=severity,
            error=error,
            error_code=f"HTTP_{status_code}",
            request_id=request_id,
            endpoint=endpoint,
            method=method,
            user_id=user_id,
            ip_address=ip_address,
            extra_data={
                "status_code": status_code,
                **(extra_data or {}),
            },
        )
    
    async def log_auth_error(
        self,
        error: Union[Exception, str],
        error_type: str,  # login_failed, token_expired, unauthorized, etc.
        email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """Log authentication error."""
        # Determine severity
        severity = ErrorSeverity.WARNING
        if error_type in ["brute_force_detected", "suspicious_activity"]:
            severity = ErrorSeverity.CRITICAL
        elif error_type in ["token_expired", "invalid_token"]:
            severity = ErrorSeverity.INFO
        
        return await self.log_error(
            category=ErrorCategory.AUTH,
            severity=severity,
            error=error,
            error_code=error_type,
            user_email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )
    
    async def log_ai_error(
        self,
        error: Union[Exception, str],
        ai_provider: str,  # openai, gemini
        operation: str,  # generate_resume, analyze, etc.
        user_id: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """Log AI service error."""
        return await self.log_error(
            category=ErrorCategory.AI,
            severity=ErrorSeverity.ERROR,
            error=error,
            error_code=f"{ai_provider}_{operation}",
            user_id=user_id,
            extra_data={
                "ai_provider": ai_provider,
                "operation": operation,
                "prompt_tokens": prompt_tokens,
                **(extra_data or {}),
            },
        )
    
    async def log_database_error(
        self,
        error: Union[Exception, str],
        operation: str,  # query, insert, update, delete
        table: Optional[str] = None,
        query: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """Log database error."""
        # Don't log the full query in production (security)
        safe_query = query[:200] + "..." if query and len(query) > 200 else query
        
        return await self.log_error(
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.ERROR,
            error=error,
            error_code=f"db_{operation}",
            extra_data={
                "operation": operation,
                "table": table,
                "query_preview": safe_query if settings.DEBUG else None,
                **(extra_data or {}),
            },
        )
    
    async def log_payment_error(
        self,
        error: Union[Exception, str],
        provider: str,  # stripe, payme, click
        operation: str,  # charge, refund, webhook
        amount: Optional[int] = None,
        currency: Optional[str] = None,
        user_id: Optional[str] = None,
        transaction_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """Log payment error."""
        return await self.log_error(
            category=ErrorCategory.PAYMENT,
            severity=ErrorSeverity.CRITICAL,  # Payment errors are always critical
            error=error,
            error_code=f"{provider}_{operation}",
            user_id=user_id,
            extra_data={
                "provider": provider,
                "operation": operation,
                "amount": amount,
                "currency": currency,
                "transaction_id": transaction_id,
                **(extra_data or {}),
            },
        )
    
    async def log_email_error(
        self,
        error: Union[Exception, str],
        email_type: str,
        to_email: str,
        provider: str,  # smtp, sendgrid
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> ErrorLog:
        """Log email sending error."""
        # Mask email for privacy
        masked_email = to_email[:3] + "***@" + to_email.split("@")[-1]
        
        return await self.log_error(
            category=ErrorCategory.EMAIL,
            severity=ErrorSeverity.WARNING,
            error=error,
            error_code=f"email_{email_type}",
            extra_data={
                "email_type": email_type,
                "to_email_masked": masked_email,
                "provider": provider,
                **(extra_data or {}),
            },
        )
    
    # =========================================================================
    # QUERY METHODS
    # =========================================================================
    
    def get_errors(
        self,
        category: Optional[ErrorCategory] = None,
        severity: Optional[ErrorSeverity] = None,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
        user_id: Optional[str] = None,
        resolved: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[ErrorLog]:
        """Get filtered errors."""
        filtered = self._errors.copy()
        
        # Apply filters
        if category:
            filtered = [e for e in filtered if e.category == category]
        
        if severity:
            filtered = [e for e in filtered if e.severity == severity]
        
        if from_time:
            filtered = [e for e in filtered if e.timestamp >= from_time]
        
        if to_time:
            filtered = [e for e in filtered if e.timestamp <= to_time]
        
        if user_id:
            filtered = [e for e in filtered if e.user_id == user_id]
        
        if resolved is not None:
            filtered = [e for e in filtered if e.resolved == resolved]
        
        # Sort by timestamp (newest first)
        filtered.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Paginate
        return filtered[offset:offset + limit]
    
    def get_error_by_id(self, error_id: str) -> Optional[ErrorLog]:
        """Get single error by ID."""
        for error in self._errors:
            if error.id == error_id:
                return error
        return None
    
    def get_statistics(
        self,
        from_time: Optional[datetime] = None,
        to_time: Optional[datetime] = None,
    ) -> ErrorStats:
        """Get error statistics."""
        # Default time range: last 24 hours
        if not to_time:
            to_time = datetime.now(timezone.utc)
        if not from_time:
            from_time = to_time - timedelta(hours=24)
        
        # Filter errors in time range
        errors = [
            e for e in self._errors
            if from_time <= e.timestamp <= to_time
        ]
        
        # Calculate statistics
        stats = ErrorStats(
            total_errors=len(errors),
            from_time=from_time,
            to_time=to_time,
        )
        
        # Count by category
        for error in errors:
            cat = error.category.value
            stats.errors_by_category[cat] = stats.errors_by_category.get(cat, 0) + 1
        
        # Count by severity
        for error in errors:
            sev = error.severity.value
            stats.errors_by_severity[sev] = stats.errors_by_severity.get(sev, 0) + 1
        
        # Count by hour
        for error in errors:
            hour = error.timestamp.strftime("%Y-%m-%d %H:00")
            stats.errors_by_hour[hour] = stats.errors_by_hour.get(hour, 0) + 1
        
        # Top error types
        error_type_counts: Dict[str, int] = defaultdict(int)
        for error in errors:
            error_type_counts[error.error_type] += 1
        
        stats.top_error_types = [
            {"type": k, "count": v}
            for k, v in sorted(
                error_type_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        ]
        
        # Top endpoints
        endpoint_counts: Dict[str, int] = defaultdict(int)
        for error in errors:
            if error.endpoint:
                endpoint_counts[error.endpoint] += 1
        
        stats.top_endpoints = [
            {"endpoint": k, "count": v}
            for k, v in sorted(
                endpoint_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        ]
        
        return stats
    
    # =========================================================================
    # RESOLUTION METHODS
    # =========================================================================
    
    def resolve_error(
        self,
        error_id: str,
        resolved_by: str,
        resolution_notes: Optional[str] = None,
    ) -> Optional[ErrorLog]:
        """Mark error as resolved."""
        error = self.get_error_by_id(error_id)
        if error:
            error.resolved = True
            error.resolved_at = datetime.now(timezone.utc)
            error.resolved_by = resolved_by
            error.resolution_notes = resolution_notes
            
            logger.info(f"Error resolved: {error_id} by {resolved_by}")
        
        return error
    
    def bulk_resolve(
        self,
        error_ids: List[str],
        resolved_by: str,
        resolution_notes: Optional[str] = None,
    ) -> int:
        """Resolve multiple errors."""
        resolved_count = 0
        
        for error_id in error_ids:
            if self.resolve_error(error_id, resolved_by, resolution_notes):
                resolved_count += 1
        
        return resolved_count
    
    # =========================================================================
    # ALERT METHODS
    # =========================================================================
    
    async def _check_alert_threshold(self, error_log: ErrorLog):
        """Check if alert threshold is reached."""
        threshold = self._alert_thresholds.get(error_log.severity)
        
        if not threshold:
            return
        
        # Count recent errors of same severity
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        recent_count = sum(
            1 for e in self._errors
            if e.severity == error_log.severity and e.timestamp >= one_hour_ago
        )
        
        if recent_count >= threshold:
            await self._send_alert(error_log, recent_count)
    
    async def _send_alert(self, error_log: ErrorLog, error_count: int):
        """Send alert for critical errors."""
        # In production, this would send email/Slack/PagerDuty alerts
        logger.critical(
            f"🚨 ALERT: {error_count} {error_log.severity.value} errors in last hour! "
            f"Latest: [{error_log.category.value}] {error_log.error_message}"
        )
        
        # TODO: Send email to admins
        # TODO: Send Slack notification
        # TODO: Trigger PagerDuty


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

error_logger = ErrorLoggingService()


# =============================================================================
# FASTAPI MIDDLEWARE
# =============================================================================

async def log_request_error(
    request,
    error: Exception,
    status_code: int = 500,
) -> ErrorLog:
    """
    Helper to log request errors from FastAPI exception handlers.
    
    Usage in main.py:
        @app.exception_handler(Exception)
        async def general_exception_handler(request: Request, exc: Exception):
            await log_request_error(request, exc)
            return JSONResponse(...)
    """
    return await error_logger.log_api_error(
        error=error,
        endpoint=request.url.path,
        method=request.method,
        status_code=status_code,
        request_id=getattr(request.state, "request_id", None),
        user_id=getattr(request.state, "user_id", None),
        ip_address=request.client.host if request.client else None,
        extra_data={
            "headers": dict(request.headers) if settings.DEBUG else None,
        },
    )


# =============================================================================
# CONTEXT MANAGER
# =============================================================================

class ErrorContext:
    """
    Context manager for automatic error logging.
    
    Usage:
        async with ErrorContext(ErrorCategory.AI, user_id="123"):
            # AI operations here
            result = await ai_service.generate_resume(...)
    """
    
    def __init__(
        self,
        category: ErrorCategory,
        user_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ):
        self.category = category
        self.user_id = user_id
        self.extra_data = extra_data
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            await error_logger.log_error(
                category=self.category,
                severity=ErrorSeverity.ERROR,
                error=exc_val,
                user_id=self.user_id,
                extra_data=self.extra_data,
            )
        return False  # Don't suppress the exception









