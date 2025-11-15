"""
Final Mark API Endpoints
CRUD operations for Final Marks and Grading
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.final_mark_service import FinalMarkService
from src.application.services.grading_service import GradingService
from src.application.dto.final_mark_dto import (
    CreateFinalMarkRequest,
    UpdateFinalMarkRequest,
    FinalMarkResponse,
    FinalMarkListResponse,
    CalculateSGPARequest,
    CalculateCGPARequest,
    GPAResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_final_mark_service(
    db: Session = Depends(get_db)
) -> FinalMarkService:
    """Get final mark service instance"""
    final_mark_repo = FinalMarkRepository(db)
    return FinalMarkService(final_mark_repo)


def get_grading_service(
    db: Session = Depends(get_db)
) -> GradingService:
    """Get grading service instance"""
    final_mark_repo = FinalMarkRepository(db)
    subject_repo = SubjectRepository(db)
    return GradingService(final_mark_repo, subject_repo)


# Create router
router = APIRouter(
    prefix="/final-marks",
    tags=["Final Marks"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=FinalMarkResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_final_mark(
    request: CreateFinalMarkRequest,
    service: FinalMarkService = Depends(get_final_mark_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create or update final mark
    
    - **student_id**: Student ID
    - **subject_assignment_id**: Subject assignment ID
    - **semester_id**: Semester ID
    - **internal_1**: Internal 1 marks
    - **internal_2**: Internal 2 marks
    - **external**: External marks
    - **best_internal_method**: Method for best internal (best, avg, weighted)
    - **max_internal**: Maximum internal marks (default 40)
    - **max_external**: Maximum external marks (default 60)
    """
    try:
        from decimal import Decimal
        final_mark = await service.create_or_update_final_mark(
            student_id=request.student_id,
            subject_assignment_id=request.subject_assignment_id,
            semester_id=request.semester_id,
            internal_1=Decimal(str(request.internal_1)) if request.internal_1 is not None else None,
            internal_2=Decimal(str(request.internal_2)) if request.internal_2 is not None else None,
            external=Decimal(str(request.external)) if request.external is not None else None,
            best_internal_method=request.best_internal_method,
            max_internal=request.max_internal,
            max_external=request.max_external
        )
        
        return FinalMarkResponse(
            id=final_mark.id,
            student_id=final_mark.student_id,
            subject_assignment_id=final_mark.subject_assignment_id,
            semester_id=final_mark.semester_id,
            internal_1=float(final_mark.internal_1),
            internal_2=float(final_mark.internal_2),
            best_internal=float(final_mark.best_internal),
            external=float(final_mark.external),
            total=float(final_mark.total),
            percentage=float(final_mark.percentage),
            grade=final_mark.grade,
            sgpa=float(final_mark.sgpa) if final_mark.sgpa else None,
            cgpa=float(final_mark.cgpa) if final_mark.cgpa else None,
            co_attainment=final_mark.co_attainment,
            status=final_mark.status,
            is_published=final_mark.is_published,
            published_at=final_mark.published_at,
            editable_until=final_mark.editable_until,
            created_at=final_mark.created_at,
            updated_at=final_mark.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/{final_mark_id}", response_model=FinalMarkResponse)
async def get_final_mark(
    final_mark_id: int,
    service: FinalMarkService = Depends(get_final_mark_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get final mark by ID
    
    - **final_mark_id**: Final mark ID
    """
    try:
        final_mark = await service.get_final_mark(final_mark_id)
        
        return FinalMarkResponse(
            id=final_mark.id,
            student_id=final_mark.student_id,
            subject_assignment_id=final_mark.subject_assignment_id,
            semester_id=final_mark.semester_id,
            internal_1=float(final_mark.internal_1),
            internal_2=float(final_mark.internal_2),
            best_internal=float(final_mark.best_internal),
            external=float(final_mark.external),
            total=float(final_mark.total),
            percentage=float(final_mark.percentage),
            grade=final_mark.grade,
            sgpa=float(final_mark.sgpa) if final_mark.sgpa else None,
            cgpa=float(final_mark.cgpa) if final_mark.cgpa else None,
            co_attainment=final_mark.co_attainment,
            status=final_mark.status,
            is_published=final_mark.is_published,
            published_at=final_mark.published_at,
            editable_until=final_mark.editable_until,
            created_at=final_mark.created_at,
            updated_at=final_mark.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/student/{student_id}/semester/{semester_id}", response_model=FinalMarkListResponse)
async def get_final_marks_by_student_semester(
    student_id: int,
    semester_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    service: FinalMarkService = Depends(get_final_mark_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all final marks for a student in a semester
    
    - **student_id**: Student ID
    - **semester_id**: Semester ID
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    """
    try:
        final_marks = await service.get_final_marks_by_student_semester(
            student_id=student_id,
            semester_id=semester_id,
            skip=skip,
            limit=limit
        )
        
        items = [
            FinalMarkResponse(
                id=fm.id,
                student_id=fm.student_id,
                subject_assignment_id=fm.subject_assignment_id,
                semester_id=fm.semester_id,
                internal_1=float(fm.internal_1),
                internal_2=float(fm.internal_2),
                best_internal=float(fm.best_internal),
                external=float(fm.external),
                total=float(fm.total),
                percentage=float(fm.percentage),
                grade=fm.grade,
                sgpa=float(fm.sgpa) if fm.sgpa else None,
                cgpa=float(fm.cgpa) if fm.cgpa else None,
                co_attainment=fm.co_attainment,
                status=fm.status,
                is_published=fm.is_published,
                published_at=fm.published_at,
                editable_until=fm.editable_until,
                created_at=fm.created_at,
                updated_at=fm.updated_at
            )
            for fm in final_marks
        ]
        
        return FinalMarkListResponse(
            items=items,
            total=len(items),
            skip=skip,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{final_mark_id}/publish", response_model=FinalMarkResponse)
async def publish_final_mark(
    final_mark_id: int,
    service: FinalMarkService = Depends(get_final_mark_service),
    current_user: User = Depends(get_current_user)
):
    """
    Publish final mark
    
    - **final_mark_id**: Final mark ID
    """
    try:
        final_mark = await service.publish_final_mark(final_mark_id)
        
        return FinalMarkResponse(
            id=final_mark.id,
            student_id=final_mark.student_id,
            subject_assignment_id=final_mark.subject_assignment_id,
            semester_id=final_mark.semester_id,
            internal_1=float(final_mark.internal_1),
            internal_2=float(final_mark.internal_2),
            best_internal=float(final_mark.best_internal),
            external=float(final_mark.external),
            total=float(final_mark.total),
            percentage=float(final_mark.percentage),
            grade=final_mark.grade,
            sgpa=float(final_mark.sgpa) if final_mark.sgpa else None,
            cgpa=float(final_mark.cgpa) if final_mark.cgpa else None,
            co_attainment=final_mark.co_attainment,
            status=final_mark.status,
            is_published=final_mark.is_published,
            published_at=final_mark.published_at,
            editable_until=final_mark.editable_until,
            created_at=final_mark.created_at,
            updated_at=final_mark.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{final_mark_id}/lock", response_model=FinalMarkResponse)
async def lock_final_mark(
    final_mark_id: int,
    service: FinalMarkService = Depends(get_final_mark_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lock final mark (no further edits)
    
    - **final_mark_id**: Final mark ID
    """
    try:
        final_mark = await service.lock_final_mark(final_mark_id)
        
        return FinalMarkResponse(
            id=final_mark.id,
            student_id=final_mark.student_id,
            subject_assignment_id=final_mark.subject_assignment_id,
            semester_id=final_mark.semester_id,
            internal_1=float(final_mark.internal_1),
            internal_2=float(final_mark.internal_2),
            best_internal=float(final_mark.best_internal),
            external=float(final_mark.external),
            total=float(final_mark.total),
            percentage=float(final_mark.percentage),
            grade=final_mark.grade,
            sgpa=float(final_mark.sgpa) if final_mark.sgpa else None,
            cgpa=float(final_mark.cgpa) if final_mark.cgpa else None,
            co_attainment=final_mark.co_attainment,
            status=final_mark.status,
            is_published=final_mark.is_published,
            published_at=final_mark.published_at,
            editable_until=final_mark.editable_until,
            created_at=final_mark.created_at,
            updated_at=final_mark.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/calculate-sgpa", response_model=GPAResponse)
async def calculate_sgpa(
    request: CalculateSGPARequest,
    grading_service: GradingService = Depends(get_grading_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Semester GPA (SGPA) for a student
    
    - **student_id**: Student ID
    - **semester_id**: Semester ID
    """
    try:
        sgpa = await grading_service.calculate_sgpa(
            student_id=request.student_id,
            semester_id=request.semester_id
        )
        
        # Update SGPA in all final marks
        await grading_service.update_sgpa_for_semester(
            student_id=request.student_id,
            semester_id=request.semester_id
        )
        
        return GPAResponse(
            student_id=request.student_id,
            semester_id=request.semester_id,
            gpa=float(sgpa),
            type="SGPA"
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/calculate-cgpa", response_model=GPAResponse)
async def calculate_cgpa(
    request: CalculateCGPARequest,
    grading_service: GradingService = Depends(get_grading_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate Cumulative GPA (CGPA) for a student
    
    - **student_id**: Student ID
    - **up_to_semester_id**: Optional semester ID to calculate up to
    """
    try:
        cgpa = await grading_service.calculate_cgpa(
            student_id=request.student_id,
            up_to_semester_id=request.up_to_semester_id
        )
        
        # Update CGPA in all final marks
        await grading_service.update_cgpa_for_student(
            student_id=request.student_id
        )
        
        return GPAResponse(
            student_id=request.student_id,
            semester_id=request.up_to_semester_id,
            gpa=float(cgpa),
            type="CGPA"
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

