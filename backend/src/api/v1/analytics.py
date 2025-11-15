"""
Analytics API Endpoints
Analytics and CO/PO attainment calculations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.analytics_service import AnalyticsService
from src.application.dto.analytics_dto import (
    StudentAnalyticsResponse,
    TeacherAnalyticsResponse,
    ClassAnalyticsResponse,
    SubjectAnalyticsResponse,
    HODAnalyticsResponse,
    COAttainmentResponse,
    POAttainmentResponse
)
from src.api.dependencies import (
    get_current_user,
    get_mark_repository,
    get_exam_repository,
    get_user_repository
)
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from src.infrastructure.cache.redis_client import get_cache_service
from sqlalchemy.orm import Session


def get_analytics_service(
    db: Session = Depends(get_db),
    mark_repo: MarkRepository = Depends(get_mark_repository),
    exam_repo: ExamRepository = Depends(get_exam_repository),
    user_repo: UserRepository = Depends(get_user_repository)
) -> AnalyticsService:
    """Get analytics service instance"""
    subject_repo = SubjectRepository(db)
    cache_service = get_cache_service()
    return AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)


# Create router
router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/student/{student_id}", response_model=StudentAnalyticsResponse)
async def get_student_analytics(
    student_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get student analytics
    
    - **student_id**: Student ID
    - **subject_id**: Optional subject filter
    """
    try:
        analytics = await analytics_service.get_student_analytics(
            student_id=student_id,
            subject_id=subject_id
        )
        return StudentAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/teacher/{teacher_id}", response_model=TeacherAnalyticsResponse)
async def get_teacher_analytics(
    teacher_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get teacher analytics
    
    - **teacher_id**: Teacher ID
    - **subject_id**: Optional subject filter
    """
    try:
        analytics = await analytics_service.get_teacher_analytics(
            teacher_id=teacher_id,
            subject_id=subject_id
        )
        return TeacherAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/class/{class_id}", response_model=ClassAnalyticsResponse)
async def get_class_analytics(
    class_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get class analytics
    
    - **class_id**: Class ID
    - **subject_id**: Optional subject filter
    """
    try:
        analytics = await analytics_service.get_class_analytics(
            class_id=class_id,
            subject_id=subject_id
        )
        return ClassAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/subject/{subject_id}", response_model=SubjectAnalyticsResponse)
async def get_subject_analytics(
    subject_id: int,
    class_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get subject analytics
    
    - **subject_id**: Subject ID
    - **class_id**: Optional class filter
    """
    try:
        analytics = await analytics_service.get_subject_analytics(
            subject_id=subject_id,
            class_id=class_id
        )
        return SubjectAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/hod/department/{department_id}", response_model=HODAnalyticsResponse)
async def get_hod_analytics(
    department_id: int,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get HOD analytics (department-wide)
    
    - **department_id**: Department ID
    """
    try:
        analytics = await analytics_service.get_hod_analytics(
            department_id=department_id
        )
        return HODAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/co-attainment/subject/{subject_id}", response_model=COAttainmentResponse)
async def get_co_attainment(
    subject_id: int,
    exam_type: Optional[str] = Query(None, pattern="^(internal1|internal2|external|all)$"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate CO (Course Outcome) attainment for a subject
    
    - **subject_id**: Subject ID
    - **exam_type**: Optional exam type filter (internal1, internal2, external, all)
    """
    try:
        attainment = await analytics_service.calculate_co_attainment(
            subject_id=subject_id,
            exam_type=exam_type
        )
        return COAttainmentResponse(**attainment)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/po-attainment/department/{department_id}", response_model=POAttainmentResponse)
async def get_po_attainment(
    department_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate PO (Program Outcome) attainment for a department
    
    - **department_id**: Department ID
    - **subject_id**: Optional subject filter
    """
    try:
        attainment = await analytics_service.calculate_po_attainment(
            department_id=department_id,
            subject_id=subject_id
        )
        return POAttainmentResponse(**attainment)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

