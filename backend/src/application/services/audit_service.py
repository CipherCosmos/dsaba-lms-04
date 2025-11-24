"""
Audit Service
Comprehensive audit logging for all critical operations
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import Request

from src.infrastructure.database.models import AuditLogModel, MarkAuditLogModel, MarksWorkflowAuditModel
from src.config import settings

logger = logging.getLogger(__name__)


class AuditService:
    """Service for comprehensive audit logging"""

    def __init__(self, db: Session):
        self.db = db

    def log_system_event(
        self,
        action: str,
        user_id: Optional[int] = None,
        resource: Optional[str] = None,
        resource_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """
        Log a system-wide audit event

        Args:
            action: The action performed (e.g., 'login', 'create_user', 'update_marks')
            user_id: ID of the user performing the action
            resource: The resource type being acted upon (e.g., 'user', 'exam', 'marks')
            resource_id: ID of the specific resource
            details: Additional details about the action
            request: FastAPI request object for extracting metadata
            ip_address: Override IP address
            user_agent: Override user agent
        """
        try:
            # Extract metadata from request if provided
            if request:
                ip_address = ip_address or self._get_client_ip(request)
                user_agent = user_agent or request.headers.get("User-Agent")

            # Create audit log entry
            audit_log = AuditLogModel(
                user_id=user_id,
                action=action,
                resource=resource,
                resource_id=resource_id,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent
            )

            self.db.add(audit_log)
            self.db.commit()

            # Log to application logger for monitoring
            logger.info(
                f"AUDIT: {action} by user {user_id} on {resource} {resource_id} "
                f"from {ip_address}"
            )

        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Don't raise exception to avoid breaking business logic

    def log_mark_change(
        self,
        mark_id: int,
        changed_by: int,
        field_changed: str,
        old_value: Optional[float] = None,
        new_value: Optional[float] = None,
        reason: Optional[str] = None,
        change_type: str = "edit"
    ) -> None:
        """
        Log a mark change event

        Args:
            mark_id: ID of the mark that was changed
            changed_by: ID of the user making the change
            field_changed: The field that was changed
            old_value: Previous value
            new_value: New value
            reason: Reason for the change
            change_type: Type of change (edit, override, recalculation)
        """
        try:
            audit_log = MarkAuditLogModel(
                mark_id=mark_id,
                changed_by=changed_by,
                field_changed=field_changed,
                old_value=old_value,
                new_value=new_value,
                reason=reason,
                change_type=change_type
            )

            self.db.add(audit_log)
            self.db.commit()

            logger.info(
                f"MARK_AUDIT: Mark {mark_id} {field_changed} changed from {old_value} "
                f"to {new_value} by user {changed_by}"
            )

        except Exception as e:
            logger.error(f"Failed to log mark change: {e}")

    def log_workflow_change(
        self,
        internal_mark_id: int,
        old_state: Optional[str],
        new_state: str,
        changed_by: int,
        reason: Optional[str] = None,
        change_metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log a workflow state change

        Args:
            internal_mark_id: ID of the internal mark
            old_state: Previous workflow state
            new_state: New workflow state
            changed_by: ID of the user making the change
            reason: Reason for the change
            change_metadata: Additional metadata
        """
        try:
            audit_log = MarksWorkflowAuditModel(
                internal_mark_id=internal_mark_id,
                old_state=old_state,
                new_state=new_state,
                changed_by=changed_by,
                reason=reason,
                change_metadata=change_metadata or {}
            )

            self.db.add(audit_log)
            self.db.commit()

            logger.info(
                f"WORKFLOW_AUDIT: Internal mark {internal_mark_id} state changed "
                f"from {old_state} to {new_state} by user {changed_by}"
            )

        except Exception as e:
            logger.error(f"Failed to log workflow change: {e}")

    def log_security_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        severity: str = "info"
    ) -> None:
        """
        Log security-related events

        Args:
            event_type: Type of security event (login_attempt, rate_limit, suspicious_activity)
            user_id: ID of the user involved
            details: Additional details
            request: FastAPI request object
            severity: Severity level (info, warning, error, critical)
        """
        try:
            action = f"security_{event_type}"
            resource = "security"

            # Extract request metadata
            ip_address = None
            user_agent = None
            if request:
                ip_address = self._get_client_ip(request)
                user_agent = request.headers.get("User-Agent")

            # Add severity to details
            event_details = details or {}
            event_details["severity"] = severity
            event_details["event_type"] = event_type

            self.log_system_event(
                action=action,
                user_id=user_id,
                resource=resource,
                details=event_details,
                request=request,
                ip_address=ip_address,
                user_agent=user_agent
            )

            # Log with appropriate level
            log_method = getattr(logger, severity, logger.info)
            log_method(f"SECURITY: {event_type} for user {user_id} from {ip_address}")

        except Exception as e:
            logger.error(f"Failed to log security event: {e}")

    def log_data_access(
        self,
        user_id: int,
        resource: str,
        resource_id: Optional[int] = None,
        action: str = "read",
        request: Optional[Request] = None,
        sensitive: bool = False
    ) -> None:
        """
        Log data access events (especially for sensitive data)

        Args:
            user_id: ID of the user accessing data
            resource: Resource being accessed
            resource_id: Specific resource ID
            action: Type of access (read, export, bulk_read)
            request: FastAPI request object
            sensitive: Whether this is sensitive data access
        """
        try:
            details = {
                "access_type": action,
                "sensitive": sensitive,
                "resource_type": resource
            }

            self.log_system_event(
                action=f"data_access_{action}",
                user_id=user_id,
                resource=resource,
                resource_id=resource_id,
                details=details,
                request=request
            )

            if sensitive:
                logger.warning(
                    f"SENSITIVE_DATA_ACCESS: User {user_id} accessed {resource} "
                    f"{resource_id} via {action}"
                )

        except Exception as e:
            logger.error(f"Failed to log data access: {e}")

    def get_audit_trail(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve audit trail with filtering

        Args:
            user_id: Filter by user ID
            action: Filter by action
            resource: Filter by resource
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of records to return

        Returns:
            List of audit log entries
        """
        try:
            query = self.db.query(AuditLogModel)

            if user_id:
                query = query.filter(AuditLogModel.user_id == user_id)
            if action:
                query = query.filter(AuditLogModel.action.ilike(f"%{action}%"))
            if resource:
                query = query.filter(AuditLogModel.resource.ilike(f"%{resource}%"))
            if start_date:
                query = query.filter(AuditLogModel.created_at >= start_date)
            if end_date:
                query = query.filter(AuditLogModel.created_at <= end_date)

            logs = query.order_by(AuditLogModel.created_at.desc()).limit(limit).all()

            return [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "resource": log.resource,
                    "resource_id": log.resource_id,
                    "details": log.details,
                    "ip_address": str(log.ip_address) if log.ip_address else None,
                    "user_agent": log.user_agent,
                    "created_at": log.created_at.isoformat() if log.created_at else None
                }
                for log in logs
            ]

        except Exception as e:
            logger.error(f"Failed to retrieve audit trail: {e}")
            return []

    def _get_client_ip(self, request: Request) -> Optional[str]:
        """
        Extract client IP address from request

        Handles X-Forwarded-For header for proxy setups
        """
        try:
            # Check for X-Forwarded-For header (common with proxies/load balancers)
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                # Take the first IP in case of multiple
                return forwarded_for.split(",")[0].strip()

            # Fall back to direct client IP
            return request.client.host if request.client else None

        except Exception:
            return None


# Convenience function to get audit service instance
def get_audit_service(db: Session) -> AuditService:
    """Get audit service instance"""
    return AuditService(db)