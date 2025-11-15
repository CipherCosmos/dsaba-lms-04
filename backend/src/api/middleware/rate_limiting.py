"""
Rate Limiting Middleware
Implements request rate limiting using slowapi and Redis
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Callable

from src.config import settings

# Initialize rate limiter
# Use in-memory storage for simplicity (can be upgraded to Redis later)
# SlowAPI supports Redis via storage_uri, but for now we use default in-memory
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"] if settings.RATE_LIMIT_ENABLED else []
)


def get_rate_limit_for_endpoint(endpoint_path: str) -> str:
    """
    Get rate limit for specific endpoint path
    
    Args:
        endpoint_path: The endpoint path
        
    Returns:
        Rate limit string (e.g., "5/minute")
    """
    # Login endpoint - strictest limit
    if "/auth/login" in endpoint_path or "/auth/forgot-password" in endpoint_path:
        return f"{settings.RATE_LIMIT_LOGIN_PER_MINUTE}/minute"
    
    # Admin endpoints - moderate limit
    if any(admin_path in endpoint_path for admin_path in [
        "/users", "/departments", "/batches", "/subjects", "/admin"
    ]):
        return f"{settings.RATE_LIMIT_PER_MINUTE // 2}/minute"
    
    # Bulk operations - lower limit
    if any(bulk_path in endpoint_path for bulk_path in [
        "/bulk", "/upload", "/marks/bulk"
    ]):
        return "10/minute"
    
    # Default limit for all other endpoints
    return f"{settings.RATE_LIMIT_PER_MINUTE}/minute"


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors
    
    Returns JSON response with rate limit information
    """
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
                "details": {
                    "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else None,
                    "limit": str(exc.limit) if hasattr(exc, 'limit') else None
                }
            }
        },
        headers={
            "Retry-After": str(exc.retry_after) if hasattr(exc, 'retry_after') else "60",
            "X-RateLimit-Limit": str(exc.limit) if hasattr(exc, 'limit') else "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(exc.reset_at) if hasattr(exc, 'reset_at') else None
        }
    )
    return response


def setup_rate_limiting(app):
    """
    Setup rate limiting for FastAPI app
    
    Args:
        app: FastAPI application instance
    """
    if not settings.RATE_LIMIT_ENABLED:
        return
    
    # Register rate limit exception handler
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


# Export limiter for use in endpoint decorators
__all__ = ["limiter", "setup_rate_limiting", "get_rate_limit_for_endpoint"]

