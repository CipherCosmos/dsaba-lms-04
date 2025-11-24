"""
Audit Middleware
Automatically logs API requests and responses for audit trail
"""

import logging
import time
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from src.application.services.audit_service import get_audit_service
from src.infrastructure.database.session import get_db
from src.api.dependencies import get_current_user_optional
from src.config import settings

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic audit logging of API requests"""

    async def dispatch(self, request: Request, call_next):
        # Skip audit logging for certain endpoints
        path = request.url.path
        if self._should_skip_audit(path):
            return await call_next(request)

        start_time = time.time()

        try:
            # Get database session for audit logging
            db = next(get_db())

            # Extract user information if available
            user = None
            try:
                user = await get_current_user_optional(request, db)
            except Exception:
                pass  # User not authenticated, that's ok

            # Log the request
            await self._log_request(request, user, db)

            # Process the request
            response = await call_next(request)

            # Log the response
            processing_time = time.time() - start_time
            await self._log_response(
                request, response.status_code, response.body, processing_time, user, db
            )

            return response

        except Exception as e:
            logger.error(f"Audit middleware error: {e}")
            # Continue processing even if audit logging fails
            return await call_next(request)

    def _should_skip_audit(self, path: str) -> bool:
        """Determine if a path should be skipped from audit logging"""
        skip_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
            "/static/",
            "/cache/clear"
        ]

        # Skip health check endpoints
        if any(skip_path in path for skip_path in skip_paths):
            return True

        # Skip OPTIONS requests (CORS preflight)
        return False

    async def _log_request(self, request: Request, user, db: Session) -> None:
        """Log API request"""
        try:
            audit_service = get_audit_service(db)

            # Extract request details
            method = request.method
            path = request.url.path
            query_params = str(request.url.query)
            user_agent = request.headers.get("User-Agent", "")
            content_length = request.headers.get("Content-Length", "0")

            # Determine action type based on HTTP method
            action_map = {
                "GET": "api_read",
                "POST": "api_create",
                "PUT": "api_update",
                "PATCH": "api_update",
                "DELETE": "api_delete"
            }
            action = action_map.get(method, f"api_{method.lower()}")

            # Extract resource from path
            resource = self._extract_resource_from_path(path)

            details = {
                "method": method,
                "path": path,
                "query_params": query_params if query_params else None,
                "user_agent": user_agent,
                "content_length": int(content_length) if content_length.isdigit() else 0,
                "endpoint": f"{method} {path}"
            }

            audit_service.log_system_event(
                action=action,
                user_id=user.id if user else None,
                resource=resource,
                details=details,
                request=request
            )

        except Exception as e:
            logger.error(f"Failed to log request: {e}")

    async def _log_response(
        self,
        request: Request,
        status_code: int,
        response_body: bytes,
        processing_time: float,
        user,
        db: Session
    ) -> None:
        """Log API response"""
        try:
            # Only log errors or slow responses for performance
            if status_code < 400 and processing_time < 5.0:
                return

            audit_service = get_audit_service(db)

            path = request.url.path
            method = request.method
            resource = self._extract_resource_from_path(path)

            details = {
                "method": method,
                "path": path,
                "status_code": status_code,
                "processing_time_seconds": round(processing_time, 3),
                "response_size_bytes": len(response_body),
                "is_error": status_code >= 400,
                "is_slow": processing_time >= 5.0
            }

            # Determine severity
            severity = "warning" if status_code >= 400 else "info"
            if processing_time >= 10.0:
                severity = "error"

            action = f"api_response_{status_code}"

            audit_service.log_system_event(
                action=action,
                user_id=user.id if user else None,
                resource=resource,
                details=details,
                request=request
            )

            # Log performance issues
            if processing_time >= 5.0:
                logger.warning(
                    f"SLOW_API_RESPONSE: {method} {path} took {processing_time:.2f}s "
                    f"(user: {user.id if user else 'anonymous'})"
                )

        except Exception as e:
            logger.error(f"Failed to log response: {e}")

    def _extract_resource_from_path(self, path: str) -> str:
        """Extract resource name from API path"""
        try:
            # Remove API prefix
            if path.startswith("/api/v1/"):
                path = path[8:]  # Remove "/api/v1/"

            # Split by "/" and take the first meaningful segment
            parts = [p for p in path.split("/") if p and not p.isdigit()]

            if not parts:
                return "unknown"

            resource = parts[0]

            # Map common resources
            resource_map = {
                "auth": "authentication",
                "users": "user",
                "departments": "department",
                "exams": "exam",
                "marks": "mark",
                "students": "student",
                "subjects": "subject",
                "analytics": "analytics",
                "reports": "report",
                "audit": "audit",
                "final-marks": "final_mark",
                "academic-structure": "academic_structure",
                "dashboard": "dashboard"
            }

            return resource_map.get(resource, resource)

        except Exception:
            return "unknown"


def setup_audit_middleware(app):
    """
    Setup audit middleware for FastAPI app

    Args:
        app: FastAPI application instance
    """
    if settings.is_production or getattr(settings, 'AUDIT_API_REQUESTS', True):
        app.add_middleware(AuditMiddleware)
        logger.info("✅ Audit middleware enabled")