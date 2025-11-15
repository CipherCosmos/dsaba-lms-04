"""
Exam Management API Endpoints
CRUD operations for exams
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.exam_service import ExamService
from src.application.dto.exam_dto import (
    ExamCreateRequest,
    ExamUpdateRequest,
    ExamResponse,
    ExamListResponse
)
from src.api.dependencies import (
    get_exam_repository,
    get_current_user
)
from src.domain.entities.user import User
from src.domain.enums.exam_type import ExamType, ExamStatus
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError,
    ValidationError
)
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository


def get_exam_service(
    exam_repo: ExamRepository = Depends(get_exam_repository)
) -> ExamService:
    """Get exam service instance"""
    return ExamService(exam_repo)


# Create router
router = APIRouter(
    prefix="/exams",
    tags=["Exams"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    request: ExamCreateRequest,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new exam
    
    Requires teacher or admin permissions
    """
    try:
        exam_type = ExamType(request.exam_type)
        exam = await exam_service.create_exam(
            name=request.name,
            subject_assignment_id=request.subject_assignment_id,
            exam_type=exam_type,
            exam_date=request.exam_date,
            total_marks=request.total_marks,
            created_by=current_user.id,
            duration_minutes=request.duration_minutes,
            instructions=request.instructions,
            question_paper_url=str(request.question_paper_url) if request.question_paper_url else None
        )
        return ExamResponse(**exam.to_dict())
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


@router.get("", response_model=ExamListResponse)
async def list_exams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    status: Optional[str] = Query(None, pattern="^(draft|active|locked|published)$"),
    exam_type: Optional[str] = Query(None, pattern="^(internal1|internal2|external)$"),
    subject_assignment_id: Optional[int] = Query(None, gt=0),
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    List exams with pagination and filtering
    """
    filters = {}
    if status:
        filters['status'] = ExamStatus(status)
    if exam_type:
        filters['exam_type'] = ExamType(exam_type)
    if subject_assignment_id:
        filters['subject_assignment_id'] = subject_assignment_id
    
    exams = await exam_service.list_exams(skip=skip, limit=limit, filters=filters)
    total = await exam_service.count_exams(filters=filters)
    
    return ExamListResponse(
        exams=[ExamResponse(**exam.to_dict()) for exam in exams],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get exam by ID
    """
    try:
        exam = await exam_service.get_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    request: ExamUpdateRequest,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update exam information
    """
    try:
        exam = await exam_service.update_exam(
            exam_id=exam_id,
            name=request.name,
            exam_date=request.exam_date,
            total_marks=request.total_marks,
            duration_minutes=request.duration_minutes,
            instructions=request.instructions
        )
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exam_id}/activate", response_model=ExamResponse)
async def activate_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Activate exam (make it available for marks entry)
    """
    try:
        exam = await exam_service.activate_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exam_id}/lock", response_model=ExamResponse)
async def lock_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lock exam (prevent further marks entry)
    """
    try:
        exam = await exam_service.lock_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Publish exam (make results visible to students)
    """
    try:
        exam = await exam_service.publish_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete exam
    """
    deleted = await exam_service.delete_exam(exam_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )

