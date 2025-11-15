"""
Course Outcome API Endpoints
CRUD operations for Course Outcomes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.course_outcome_service import CourseOutcomeService
from src.application.dto.course_outcome_dto import (
    CreateCORequest,
    UpdateCORequest,
    COResponse,
    COListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError
from src.infrastructure.database.repositories.course_outcome_repository_impl import CourseOutcomeRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_co_service(
    db: Session = Depends(get_db)
) -> CourseOutcomeService:
    """Get course outcome service instance"""
    co_repo = CourseOutcomeRepository(db)
    subject_repo = SubjectRepository(db)
    return CourseOutcomeService(co_repo, subject_repo)


# Create router
router = APIRouter(
    prefix="/course-outcomes",
    tags=["Course Outcomes"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=COResponse, status_code=status.HTTP_201_CREATED)
async def create_co(
    request: CreateCORequest,
    service: CourseOutcomeService = Depends(get_co_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new Course Outcome
    
    - **subject_id**: Subject ID
    - **code**: CO code (e.g., "CO1")
    - **title**: CO title (min 10 chars)
    - **description**: CO description (optional, min 50 chars if provided)
    - **target_attainment**: Target attainment percentage (0-100)
    - **l1_threshold**: Level 1 threshold (0-100)
    - **l2_threshold**: Level 2 threshold (0-100)
    - **l3_threshold**: Level 3 threshold (0-100)
    """
    try:
        co = await service.create_co(
            subject_id=request.subject_id,
            code=request.code,
            title=request.title,
            description=request.description,
            target_attainment=request.target_attainment,
            l1_threshold=request.l1_threshold,
            l2_threshold=request.l2_threshold,
            l3_threshold=request.l3_threshold
        )
        
        return COResponse(
            id=co.id,
            subject_id=co.subject_id,
            code=co.code,
            title=co.title,
            description=co.description,
            target_attainment=float(co.target_attainment),
            l1_threshold=float(co.l1_threshold),
            l2_threshold=float(co.l2_threshold),
            l3_threshold=float(co.l3_threshold),
            created_at=co.created_at,
            updated_at=co.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.get("/{co_id}", response_model=COResponse)
async def get_co(
    co_id: int,
    service: CourseOutcomeService = Depends(get_co_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get Course Outcome by ID
    
    - **co_id**: Course Outcome ID
    """
    try:
        co = await service.get_co(co_id)
        
        return COResponse(
            id=co.id,
            subject_id=co.subject_id,
            code=co.code,
            title=co.title,
            description=co.description,
            target_attainment=float(co.target_attainment),
            l1_threshold=float(co.l1_threshold),
            l2_threshold=float(co.l2_threshold),
            l3_threshold=float(co.l3_threshold),
            created_at=co.created_at,
            updated_at=co.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/subject/{subject_id}", response_model=COListResponse)
async def get_cos_by_subject(
    subject_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    service: CourseOutcomeService = Depends(get_co_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all Course Outcomes for a subject
    
    - **subject_id**: Subject ID
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    """
    try:
        cos = await service.get_cos_by_subject(subject_id, skip, limit)
        
        items = [
            COResponse(
                id=co.id,
                subject_id=co.subject_id,
                code=co.code,
                title=co.title,
                description=co.description,
                target_attainment=float(co.target_attainment),
                l1_threshold=float(co.l1_threshold),
                l2_threshold=float(co.l2_threshold),
                l3_threshold=float(co.l3_threshold),
                created_at=co.created_at,
                updated_at=co.updated_at
            )
            for co in cos
        ]
        
        return COListResponse(
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


@router.put("/{co_id}", response_model=COResponse)
async def update_co(
    co_id: int,
    request: UpdateCORequest,
    service: CourseOutcomeService = Depends(get_co_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update Course Outcome
    
    - **co_id**: Course Outcome ID
    - **title**: New title (optional)
    - **description**: New description (optional)
    - **target_attainment**: New target attainment (optional)
    - **l1_threshold**: New L1 threshold (optional)
    - **l2_threshold**: New L2 threshold (optional)
    - **l3_threshold**: New L3 threshold (optional)
    """
    try:
        co = await service.update_co(
            co_id=co_id,
            title=request.title,
            description=request.description,
            target_attainment=request.target_attainment,
            l1_threshold=request.l1_threshold,
            l2_threshold=request.l2_threshold,
            l3_threshold=request.l3_threshold
        )
        
        return COResponse(
            id=co.id,
            subject_id=co.subject_id,
            code=co.code,
            title=co.title,
            description=co.description,
            target_attainment=float(co.target_attainment),
            l1_threshold=float(co.l1_threshold),
            l2_threshold=float(co.l2_threshold),
            l3_threshold=float(co.l3_threshold),
            created_at=co.created_at,
            updated_at=co.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{co_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_co(
    co_id: int,
    service: CourseOutcomeService = Depends(get_co_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete Course Outcome
    
    - **co_id**: Course Outcome ID
    """
    try:
        await service.delete_co(co_id)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

