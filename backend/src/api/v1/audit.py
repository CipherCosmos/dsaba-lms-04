"""
Audit Trail API Endpoints
Audit logs for mark changes and system actions
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from datetime import datetime

from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import MarkAuditLogModel, AuditLogModel, UserModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_


# Create router
router = APIRouter(
    prefix="/audit",
    tags=["Audit"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
    }
)


@router.get("/marks")
async def get_mark_audit_logs(
    mark_id: Optional[int] = Query(None, gt=0),
    exam_id: Optional[int] = Query(None, gt=0),
    student_id: Optional[int] = Query(None, gt=0),
    changed_by: Optional[int] = Query(None, gt=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get mark audit logs
    
    - **mark_id**: Optional mark ID filter
    - **exam_id**: Optional exam ID filter (through marks)
    - **student_id**: Optional student ID filter (through marks)
    - **changed_by**: Optional user ID who made the change
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    
    Returns audit trail of mark changes
    """
    # Only HOD, Principal, and Admin can view audit logs
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can view audit logs"
        )
    
    try:
        query = db.query(MarkAuditLogModel)
        
        # Apply filters
        if mark_id:
            query = query.filter(MarkAuditLogModel.mark_id == mark_id)
        
        if exam_id:
            # Filter by exam through marks
            from src.infrastructure.database.models import MarkModel
            query = query.join(MarkModel).filter(MarkModel.exam_id == exam_id)
        
        if student_id:
            # Filter by student through marks
            from src.infrastructure.database.models import MarkModel
            query = query.join(MarkModel).filter(MarkModel.student_id == student_id)
        
        if changed_by:
            query = query.filter(MarkAuditLogModel.changed_by == changed_by)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        logs = query.order_by(desc(MarkAuditLogModel.changed_at)).offset(skip).limit(limit).all()
        
        # Format response
        log_list = []
        for log in logs:
            changed_by_user = None
            if log.changed_by:
                changed_by_user = db.query(UserModel).filter(UserModel.id == log.changed_by).first()
            
            log_list.append({
                "id": log.id,
                "mark_id": log.mark_id,
                "changed_by": log.changed_by,
                "changed_by_name": f"{changed_by_user.first_name} {changed_by_user.last_name}" if changed_by_user else None,
                "field_changed": log.field_changed,
                "old_value": float(log.old_value) if log.old_value else None,
                "new_value": float(log.new_value) if log.new_value else None,
                "reason": log.reason,
                "change_type": log.change_type,
                "changed_at": log.changed_at.isoformat() if log.changed_at else None
            })
        
        return {
            "items": log_list,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit logs: {str(e)}"
        )


@router.get("/system")
async def get_system_audit_logs(
    user_id: Optional[int] = Query(None, gt=0),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get system audit logs

    - **user_id**: Optional user ID filter
    - **action**: Optional action filter
    - **resource**: Optional resource filter
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records

    Returns system-wide audit trail
    """
    logger = logging.getLogger(__name__)
    logger.info(f"get_system_audit_logs called by user {current_user.id} with role {current_user.role.value}")

    # Only Admin and Principal can view system audit logs
    if current_user.role.value not in ['admin', 'principal']:
        logger.warning(f"Access denied for user {current_user.id} with role {current_user.role.value}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Principal can view system audit logs"
        )
    
    try:
        query = db.query(AuditLogModel)
        
        # Apply filters
        if user_id:
            query = query.filter(AuditLogModel.user_id == user_id)
        
        if action:
            query = query.filter(AuditLogModel.action.ilike(f"%{action}%"))
        
        if resource:
            query = query.filter(AuditLogModel.resource.ilike(f"%{resource}%"))
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        logs = query.order_by(desc(AuditLogModel.created_at)).offset(skip).limit(limit).all()
        
        # Format response
        log_list = []
        for log in logs:
            user = None
            if log.user_id:
                user = db.query(UserModel).filter(UserModel.id == log.user_id).first()
            
            log_list.append({
                "id": log.id,
                "user_id": log.user_id,
                "user_name": f"{user.first_name} {user.last_name}" if user else None,
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": str(log.ip_address) if log.ip_address else None,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        
        return {
            "items": log_list,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system audit logs: {str(e)}"
        )

