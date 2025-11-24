"""
Rate Limiting Middleware
Implements request rate limiting using slowapi and Redis
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Callable, Dict, Tuple
import logging
import time
from collections import defaultdict

from src.config import settings
from src.application.services.audit_service import get_audit_service
from src.infrastructure.database.session import get_db

logger = logging.getLogger(__name__)

# DDoS Protection
class DDoSProtection:
    """Advanced DDoS protection mechanisms"""

    def __init__(self):
        self.ip_request_counts = defaultdict(lambda: defaultdict(int))
        self.ip_blocklist = set()
        self.suspicious_ips = defaultdict(int)
        self.last_cleanup = time.time()

    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        return ip in self.ip_blocklist

    def record_request(self, ip: str, endpoint: str) -> None:
        """Record a request for DDoS monitoring"""
        current_time = int(time.time() / 60)  # Per minute

        # Clean up old data periodically
        if time.time() - self.last_cleanup > 300:  # Every 5 minutes
            self._cleanup_old_data()
            self.last_cleanup = time.time()

        # Record request
        self.ip_request_counts[ip][current_time] += 1

        # Check for suspicious patterns
        self._check_suspicious_activity(ip, endpoint)

    def _check_suspicious_activity(self, ip: str, endpoint: str) -> None:
        """Check for suspicious activity patterns"""
        current_time = int(time.time() / 60)

        # Count requests in last 5 minutes
        recent_requests = 0
        for minute in range(current_time - 5, current_time + 1):
            recent_requests += self.ip_request_counts[ip].get(minute, 0)

        # Very high request rate - potential DDoS
        if recent_requests > 1000:  # More than 1000 requests in 5 minutes
            if ip not in self.ip_blocklist:
                logger.warning(f"DDoS protection: Blocking IP {ip} - {recent_requests} requests in 5 minutes")
                self.ip_blocklist.add(ip)

                # Log security event
                try:
                    db = next(get_db())
                    audit_service = get_audit_service(db)
                    audit_service.log_security_event(
                        event_type="ip_blocked_ddos",
                        details={
                            "ip_address": ip,
                            "reason": "excessive_requests",
                            "request_count": recent_requests,
                            "time_window": "5_minutes"
                        },
                        severity="critical"
                    )
                except Exception as e:
                    logger.error(f"Failed to log DDoS block: {e}")

        # Suspicious patterns
        elif recent_requests > 500:  # More than 500 requests in 5 minutes
            self.suspicious_ips[ip] += 1

            if self.suspicious_ips[ip] > 3:  # Multiple violations
                logger.warning(f"DDoS protection: Monitoring suspicious IP {ip}")

    def _cleanup_old_data(self) -> None:
        """Clean up old request count data"""
        current_time = int(time.time() / 60)
        cutoff_time = current_time - 10  # Keep last 10 minutes

        # Clean up request counts
        for ip in list(self.ip_request_counts.keys()):
            self.ip_request_counts[ip] = {
                minute: count
                for minute, count in self.ip_request_counts[ip].items()
                if minute > cutoff_time
            }
            if not self.ip_request_counts[ip]:
                del self.ip_request_counts[ip]

        # Clean up suspicious IPs (reset counters periodically)
        for ip in list(self.suspicious_ips.keys()):
            if self.suspicious_ips[ip] > 0:
                self.suspicious_ips[ip] = max(0, self.suspicious_ips[ip] - 1)
            else:
                del self.suspicious_ips[ip]

# Initialize DDoS protection
ddos_protection = DDoSProtection()

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
    
    # Bulk operations, reports generation, and analytics - lower limit
    if any(bulk_path in endpoint_path for bulk_path in [
        "/bulk", "/upload", "/marks/bulk", "/reports", "/analytics"
    ]):
        return "10/minute"
    
    # Default limit for all other endpoints
    return f"{settings.RATE_LIMIT_PER_MINUTE}/minute"


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors

    Returns JSON response with rate limit information and logs security event
    """
    client_ip = get_remote_address(request)

    # Log security event
    try:
        db = next(get_db())
        audit_service = get_audit_service(db)
        audit_service.log_security_event(
            event_type="rate_limit_exceeded",
            details={
                "ip_address": client_ip,
                "endpoint": f"{request.method} {request.url.path}",
                "user_agent": request.headers.get("User-Agent"),
                "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else None,
                "limit": str(exc.limit) if hasattr(exc, 'limit') else None
            },
            request=request,
            severity="warning"
        )
    except Exception as e:
        logger.error(f"Failed to log rate limit event: {e}")

    logger.warning(f"Rate limit exceeded for IP {client_ip}: {request.method} {request.url.path}")

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


def ddos_protection_middleware(request: Request) -> None:
    """
    DDoS protection middleware - checks if IP is blocked

    Raises HTTPException if IP is blocked
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    client_ip = get_remote_address(request)

    # Check if IP is blocked
    if ddos_protection.is_ip_blocked(client_ip):
        logger.warning(f"Blocked request from blacklisted IP: {client_ip}")

        # Log security event
        try:
            db = next(get_db())
            audit_service = get_audit_service(db)
            audit_service.log_security_event(
                event_type="blocked_ip_access",
                details={
                    "ip_address": client_ip,
                    "endpoint": f"{request.method} {request.url.path}",
                    "user_agent": request.headers.get("User-Agent"),
                    "reason": "ip_blocked"
                },
                request=request,
                severity="error"
            )
        except Exception as e:
            logger.error(f"Failed to log blocked IP access: {e}")

        raise JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "success": False,
                "error": {
                    "code": "IP_BLOCKED",
                    "message": "Access denied. Your IP address has been blocked due to suspicious activity."
                }
            }
        )

    # Record request for DDoS monitoring
    ddos_protection.record_request(client_ip, request.url.path)


def setup_rate_limiting(app):
    """
    Setup rate limiting and DDoS protection for FastAPI app

    Args:
        app: FastAPI application instance
    """
    if not settings.RATE_LIMIT_ENABLED:
        return

    # Register rate limit exception handler
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Add DDoS protection middleware
    app.middleware("http")(ddos_protection_middleware_wrapper)

    logger.info("✅ Rate limiting and DDoS protection enabled")


def ddos_protection_middleware_wrapper(request: Request, call_next):
    """
    Wrapper for DDoS protection middleware to work with FastAPI

    Args:
        request: FastAPI request object
        call_next: Next middleware/route handler

    Returns:
        Response from next handler
    """
    # Run DDoS protection check
    ddos_protection_middleware(request)

    # Continue to next handler
    return call_next(request)


# Export limiter for use in endpoint decorators
__all__ = ["limiter", "setup_rate_limiting", "get_rate_limit_for_endpoint"]

