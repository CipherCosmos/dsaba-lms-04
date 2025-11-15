"""
Subject Management API Endpoints
CRUD operations for subjects
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.subject_service import SubjectService
from src.application.dto.subject_dto import (
    SubjectCreateRequest,
    SubjectUpdateRequest,
    SubjectUpdateMarksRequest,
    SubjectResponse,
    SubjectListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError
)
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_subject_service(
    db: Session = Depends(get_db)
) -> SubjectService:
    """Get subject service instance"""
    subject_repo = SubjectRepository(db)
    return SubjectService(subject_repo)


# Create router
router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    request: SubjectCreateRequest,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new subject
    
    Requires admin or HOD permissions
    """
    try:
        subject = await subject_service.create_subject(
            code=request.code,
            name=request.name,
            department_id=request.department_id,
            credits=request.credits,
            max_internal=request.max_internal,
            max_external=request.max_external,
            semester_id=request.semester_id,
            academic_year_id=request.academic_year_id
        )
        return SubjectResponse(**subject.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("", response_model=SubjectListResponse)
async def list_subjects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    department_id: Optional[int] = Query(None, gt=0),
    is_active: Optional[bool] = Query(None),
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    List subjects with pagination and filtering
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records (1-200)
    - **department_id**: Filter by department
    - **is_active**: Filter by active status
    """
    subjects = await subject_service.list_subjects(
        skip=skip,
        limit=limit,
        department_id=department_id,
        is_active=is_active
    )
    total = await subject_service.count_subjects(
        department_id=department_id,
        is_active=is_active
    )
    
    return SubjectListResponse(
        items=[SubjectResponse(**subject.to_dict()) for subject in subjects],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: int,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get subject by ID
    
    - **subject_id**: Subject ID
    """
    try:
        subject = await subject_service.get_subject(subject_id)
        return SubjectResponse(**subject.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found"
        )


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: int,
    request: SubjectUpdateRequest,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update subject information
    
    - **subject_id**: Subject ID
    """
    try:
        subject = await subject_service.update_subject(
            subject_id=subject_id,
            name=request.name,
            credits=request.credits
        )
        return SubjectResponse(**subject.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found"
        )


@router.put("/{subject_id}/marks", response_model=SubjectResponse)
async def update_subject_marks(
    subject_id: int,
    request: SubjectUpdateMarksRequest,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update subject marks distribution
    
    - **subject_id**: Subject ID
    - **max_internal**: Maximum internal marks
    - **max_external**: Maximum external marks
    - Note: max_internal + max_external must equal 100
    """
    try:
        subject = await subject_service.update_marks_distribution(
            subject_id=subject_id,
            max_internal=request.max_internal,
            max_external=request.max_external
        )
        return SubjectResponse(**subject.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found"
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post("/{subject_id}/activate", response_model=SubjectResponse)
async def activate_subject(
    subject_id: int,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Activate subject
    
    - **subject_id**: Subject ID
    """
    try:
        subject = await subject_service.activate_subject(subject_id)
        return SubjectResponse(**subject.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found"
        )


@router.post("/{subject_id}/deactivate", response_model=SubjectResponse)
async def deactivate_subject(
    subject_id: int,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Deactivate subject
    
    - **subject_id**: Subject ID
    """
    try:
        subject = await subject_service.deactivate_subject(subject_id)
        return SubjectResponse(**subject.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found"
        )


@router.get("/department/{department_id}", response_model=SubjectListResponse)
async def get_subjects_by_department(
    department_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all subjects in a department
    
    - **department_id**: Department ID
    """
    subjects = await subject_service.get_subjects_by_department(
        department_id=department_id,
        skip=skip,
        limit=limit
    )
    
    return SubjectListResponse(
        items=[SubjectResponse(**subject.to_dict()) for subject in subjects],
        total=len(subjects),
        skip=skip,
        limit=limit
    )


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete subject
    
    - **subject_id**: Subject ID
    
    Note: Should check for dependencies before deletion
    """
    deleted = await subject_service.delete_subject(subject_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found"
        )

