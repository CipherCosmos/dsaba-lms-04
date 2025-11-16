"""
Enhanced Analytics API Endpoints
Real-time analytics with Bloom's taxonomy, trends, and department comparisons
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.enhanced_analytics_service import EnhancedAnalyticsService
from src.api.dependencies import get_current_user, get_db
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from sqlalchemy.orm import Session


def get_enhanced_analytics_service(
    db: Session = Depends(get_db)
) -> EnhancedAnalyticsService:
    """Get enhanced analytics service instance"""
    return EnhancedAnalyticsService(db)


# Create router
router = APIRouter(
    prefix="/enhanced-analytics",
    tags=["Enhanced Analytics"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
    }
)


@router.get("/blooms-taxonomy")
async def get_blooms_analysis(
    subject_assignment_id: Optional[int] = Query(None, description="Filter by subject assignment"),
    department_id: Optional[int] = Query(None, description="Filter by department"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    service: EnhancedAnalyticsService = Depends(get_enhanced_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze student performance based on Bloom's taxonomy levels
    
    Returns distribution across:
    - L1: Remember
    - L2: Understand
    - L3: Apply
    - L4: Analyze
    - L5: Evaluate
    - L6: Create
    """
    try:
        result = service.get_blooms_taxonomy_analysis(
            subject_assignment_id=subject_assignment_id,
            department_id=department_id,
            semester_id=semester_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing Bloom's taxonomy: {str(e)}"
        )


@router.get("/performance-trends")
async def get_performance_trends(
    student_id: Optional[int] = Query(None, description="Filter by student"),
    subject_id: Optional[int] = Query(None, description="Filter by subject"),
    department_id: Optional[int] = Query(None, description="Filter by department"),
    months: int = Query(6, description="Number of months to analyze"),
    service: EnhancedAnalyticsService = Depends(get_enhanced_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get performance trends over time
    
    Returns:
    - Monthly performance averages
    - Trend direction (improving/declining/stable)
    - Overall statistics
    """
    try:
        result = service.get_performance_trends(
            student_id=student_id,
            subject_id=subject_id,
            department_id=department_id,
            months=months
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating performance trends: {str(e)}"
        )


@router.get("/department-comparison")
async def get_department_comparison(
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    service: EnhancedAnalyticsService = Depends(get_enhanced_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Compare performance across departments
    
    Returns:
    - Department-wise statistics
    - Student/teacher/subject counts
    - Average performance
    - Pass rates
    - Rankings
    """
    # Only admins and principals can see department comparisons
    if not any(role in [UserRole.ADMIN, UserRole.PRINCIPAL] for role in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view department comparisons"
        )
    
    try:
        result = service.get_department_comparison(
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing departments: {str(e)}"
        )


@router.get("/student-performance/{student_id}")
async def get_student_performance(
    student_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    service: EnhancedAnalyticsService = Depends(get_enhanced_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Comprehensive performance analytics for a student
    
    Returns:
    - Subject-wise performance
    - Overall statistics
    - Strengths and weaknesses
    - Pass/fail status
    """
    try:
        result = service.get_student_performance_analytics(
            student_id=student_id,
            academic_year_id=academic_year_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching student performance: {str(e)}"
        )


@router.get("/teacher-performance/{teacher_id}")
async def get_teacher_performance(
    teacher_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    service: EnhancedAnalyticsService = Depends(get_enhanced_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Analytics for teacher performance
    
    Returns:
    - Students taught
    - Subjects handled
    - Average student performance
    - Marks submission status
    """
    try:
        result = service.get_teacher_performance_analytics(
            teacher_id=teacher_id,
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching teacher performance: {str(e)}"
        )

