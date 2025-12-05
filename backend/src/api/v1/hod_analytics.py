"""
HOD Analytics API Endpoints
Department-wide analysis for Heads of Department
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session
from src.api.v1.auth import get_current_user
from src.domain.entities.user import User as UserEntity
from src.application.services.hod_analytics_service import HODAnalyticsService
from src.domain.exceptions import EntityNotFoundError

router = APIRouter(prefix="/hod-analytics", tags=["HOD Analytics"])


@router.get("/dashboard/{department_id}")
async def get_department_dashboard(
    department_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get comprehensive department analytics dashboard
    
    **Returns**:
    - Department overview (students, faculty, batches, averages)
    - Batch comparison
    - Faculty performance
    - Top performing subjects
    - Weak areas needing attention
    
    **Permissions**: HOD (own dept), Admin, Principal
    """
    if current_user.role not in ["hod", "admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Admin, or Principal can view department analytics"
        )
    
    try:
        service = HODAnalyticsService(db)
        dashboard = await service.get_department_dashboard(department_id, academic_year_id)
        return dashboard
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/batch-comparison/{department_id}")
async def get_batch_comparison(
    department_id: int,
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Compare performance across different batches
    
    **Returns**: Batch-wise statistics
    """
    if current_user.role not in ["hod", "admin", "principal"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        service = HODAnalyticsService(db)
        batches = await service.get_batch_comparison(department_id, academic_year_id)
        return {"batches": batches}
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/faculty-performance/{department_id}")
async def get_faculty_performance(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get faculty performance metrics
    
    **Returns**: Faculty-wise stats
    """
    if current_user.role not in ["hod", "admin", "principal"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        service = HODAnalyticsService(db)
        faculty = await service.get_faculty_performance(department_id)
        return {"faculty": faculty}
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/top-subjects/{department_id}")
async def get_top_subjects(
    department_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get top performing subjects
    
    **Returns**: Subjects with highest averages
    """
    if current_user.role not in ["hod", "admin", "principal"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        service = HODAnalyticsService(db)
        subjects = await service.get_top_performing_subjects(department_id, limit)
        return {"subjects": subjects}
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/weak-areas/{department_id}")
async def get_weak_areas(
    department_id: int,
    threshold: float = Query(50.0, ge=0.0, le=100.0),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Identify weak areas in department
    
    **Returns**: Subjects/areas needing improvement
    """
    if current_user.role not in ["hod", "admin", "principal"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        service = HODAnalyticsService(db)
        weak = await service.get_weak_areas(department_id, threshold)
        return {"weak_areas": weak}
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
