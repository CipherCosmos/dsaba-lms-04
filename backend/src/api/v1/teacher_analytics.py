"""
Enhanced Teacher Analytics API Endpoints
Class-level analysis and student insights for teachers
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from pydantic import BaseModel

from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session
from src.api.v1.dependencies import get_current_user
from src.domain.entities.user import User as UserEntity
from src.application.services.enhanced_teacher_analytics_service import EnhancedTeacherAnalyticsService
from src.domain.exceptions import EntityNotFoundError

router = APIRouter(prefix="/teacher-analytics", tags=["Teacher Analytics"])


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/dashboard/{teacher_id}")
async def get_teacher_dashboard(
    teacher_id: int,
    subject_assignment_id: Optional[int] = Query(None, description="Filter by specific subject assignment"),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get comprehensive teacher analytics dashboard
    
    **Returns**:
    - Class analytics for all/specific assignments
    - At-risk students across all classes
    - Overall teaching statistics
    
    **Permissions**: Teacher (own data), HOD, Admin, Principal
    """
    # Access control
    if current_user.role == "teacher":
        if current_user.teacher_profile and current_user.teacher_profile.id != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own analytics"
            )
    elif current_user.role not in ["hod", "admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        service = EnhancedTeacherAnalyticsService(db)
        dashboard = await service.get_teacher_dashboard(teacher_id, subject_assignment_id)
        return dashboard
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/class-performance/{subject_assignment_id}")
async def get_class_performance(
    subject_assignment_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get performance overview for a specific class
    
    **Returns**:
    - Class statistics (average, median, pass rate)
    - Grade distribution
    - Top and bottom performers
    """
    # Authorization: Teacher must own assignment or be HOD/Admin/Principal
    if current_user.role not in ["hod", "admin", "principal"]:
        # Verify teacher owns this assignment
        from src.infrastructure.database.models import SubjectAssignmentModel
        assignment = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == subject_assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject assignment not found")
        
        if current_user.role == "teacher":
            if not current_user.teacher_profile or current_user.teacher_profile.id != assignment.teacher_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own class performance"
                )
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        service = EnhancedTeacherAnalyticsService(db)
        performance = await service.get_class_performance(subject_assignment_id)
        return performance
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/component-analysis/{subject_assignment_id}")
async def get_component_analysis(
    subject_assignment_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get component-wise class analysis
    
    **Returns**: Performance breakdown by assessment type
    """
    try:
        service = EnhancedTeacherAnalyticsService(db)
        analysis = await service.get_component_analysis(subject_assignment_id)
        return analysis
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/at-risk-students/{teacher_id}")
async def get_at_risk_students(
    teacher_id: int,
    threshold: float = Query(40.0, ge=0.0, le=100.0, description="Risk threshold percentage"),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get list of at-risk students across all teacher's classes
    
    **Returns**: Students scoring below threshold with recommendations
    """
    # Access control
    if current_user.role == "teacher":
        if current_user.teacher_profile and current_user.teacher_profile.id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedTeacherAnalyticsService(db)
        at_risk = await service.identify_at_risk_students(teacher_id, threshold)
        return {"at_risk_students": at_risk, "total_count": len(at_risk)}
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/student-detail/{student_id}/{subject_assignment_id}")
async def get_student_detail(
    student_id: int,
    subject_assignment_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get detailed performance view for a specific student in a subject
    
    **Returns**: Component-wise marks, overall stats, assessment history
    """
    try:
        service = EnhancedTeacherAnalyticsService(db)
        detail = await service.get_student_detail_view(student_id, subject_assignment_id)
        return detail
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/teaching-stats/{teacher_id}")
async def get_teaching_stats(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get overall teaching statistics
    
    **Returns**: Aggregated stats across all classes
    """
    if current_user.role == "teacher":
        if current_user.teacher_profile and current_user.teacher_profile.id != teacher_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedTeacherAnalyticsService(db)
        stats = await service.get_overall_teaching_stats(teacher_id)
        return stats
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
