"""
Enhanced Student Analytics API Endpoints
Detailed internal marks analysis for students
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from pydantic import BaseModel

from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session
from src.api.v1.dependencies import get_current_user
from src.domain.entities.user import User as UserEntity
from src.application.services.enhanced_student_analytics_service import EnhancedStudentAnalyticsService
from src.domain.exceptions import EntityNotFoundError

router = APIRouter(prefix="/student-analytics", tags=["Student Analytics"])


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/dashboard/{student_id}")
async def get_student_dashboard(
    student_id: int,
    semester_id: Optional[int] = Query(None, description="Semester ID (defaults to current)"),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get comprehensive student performance dashboard
    
    **Returns**:
    - Performance overview (SGPA, percentage, rank)
    - Component-wise breakdown (IA1, IA2, Quiz, etc.)
    - Subject-wise performance
    - CO attainment status
    - Performance trends
    - Strengths & weaknesses
    
    **Permissions**: Student (own data), Teacher, HOD, Admin, Principal
    """
    # Access control
    if current_user.role == "student":
        # Students can only view their own data
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own analytics"
            )
    elif current_user.role not in ["teacher", "hod", "admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        dashboard = await service.get_student_dashboard(student_id, semester_id)
        return dashboard
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/performance/{student_id}")
async def get_performance_overview(
    student_id: int,
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get performance overview metrics
    
    **Returns**: Overall stats, SGPA, percentage, rank, class average
    """
    # Access control (same as dashboard)
    if current_user.role == "student":
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        overview = await service.get_performance_overview(student_id, semester_id)
        return overview
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/components/{student_id}")
async def get_component_breakdown(
    student_id: int,
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get component-wise performance breakdown
    
    **Returns**: Performance by assessment type (IA1, IA2, Quiz, Assignment, etc.)
    """
    if current_user.role == "student":
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        breakdown = await service.get_component_wise_breakdown(student_id, semester_id)
        return breakdown
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/subjects/{student_id}")
async def get_subject_performance(
    student_id: int,
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get subject-wise performance
    
    **Returns**: List of subjects with marks, percentage, components
    """
    if current_user.role == "student":
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        subjects = await service.get_subject_wise_performance(student_id, semester_id)
        return {"subjects": subjects}
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/trends/{student_id}")
async def get_performance_trends(
    student_id: int,
    num_semesters: int = Query(4, ge=1, le=8, description="Number of semesters to analyze"),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get performance trends over semesters
    
    **Returns**: Semester-wise performance with trend analysis
    """
    if current_user.role == "student":
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        trends = await service.get_performance_trends(student_id, num_semesters)
        return trends
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/insights/{student_id}")
async def get_student_insights(
    student_id: int,
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get strengths, weaknesses, and recommendations
    
    **Returns**: Identified strengths, weaknesses, and actionable suggestions
    """
    if current_user.role == "student":
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        insights = await service.identify_strengths_weaknesses(student_id, semester_id)
        return insights
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/co-attainment/{student_id}")
async def get_co_attainment(
    student_id: int,
    semester_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get Course Outcome attainment status
    
    **Returns**: CO-wise attainment data
    """
    if current_user.role == "student":
        if current_user.student_profile and current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        service = EnhancedStudentAnalyticsService(db)
        co_status = await service.get_co_attainment_status(student_id, semester_id)
        return co_status
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
