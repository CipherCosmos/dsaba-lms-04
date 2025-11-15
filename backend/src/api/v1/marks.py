"""
Marks Management API Endpoints
Marks entry, update, and calculation operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Dict, Any

from src.application.services.marks_service import MarksService
from src.application.dto.mark_dto import (
    MarkCreateRequest,
    MarkUpdateRequest,
    BulkMarkCreateRequest,
    MarkResponse,
    MarkListResponse,
    StudentTotalMarksResponse,
    BestInternalResponse
)
from src.api.dependencies import (
    get_exam_repository,
    get_mark_repository,
    get_current_user
)
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import (
    EntityNotFoundError,
    BusinessRuleViolationError,
    ValidationError
)
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository


def get_marks_service(
    mark_repo: MarkRepository = Depends(get_mark_repository),
    exam_repo: ExamRepository = Depends(get_exam_repository)
) -> MarksService:
    """Get marks service instance"""
    return MarksService(mark_repo, exam_repo)


# Create router
router = APIRouter(
    prefix="/marks",
    tags=["Marks"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=MarkResponse, status_code=status.HTTP_201_CREATED)
async def enter_mark(
    request: MarkCreateRequest,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Enter a single mark
    
    Requires teacher or admin permissions
    """
    # Check if user has teacher or admin role
    if UserRole.TEACHER not in current_user.roles and UserRole.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and administrators can enter marks"
        )
    try:
        mark = await marks_service.enter_mark(
            exam_id=request.exam_id,
            student_id=request.student_id,
            question_id=request.question_id,
            marks_obtained=request.marks_obtained,
            entered_by=current_user.id,
            sub_question_id=request.sub_question_id
        )
        return MarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post("/bulk", response_model=List[MarkResponse], status_code=status.HTTP_201_CREATED)
async def bulk_enter_marks(
    request: BulkMarkCreateRequest,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Enter marks for multiple students/questions at once
    
    Requires teacher or admin permissions
    """
    try:
        marks = await marks_service.bulk_enter_marks(
            exam_id=request.exam_id,
            marks_data=request.marks,
            entered_by=current_user.id
        )
        return [MarkResponse(**mark.to_dict()) for mark in marks]
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.put("/{mark_id}", response_model=MarkResponse)
async def update_mark(
    mark_id: int,
    request: MarkUpdateRequest,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update a mark with 7-day edit window enforcement
    
    - **can_override**: Set to true if you have permission to override edit window (admin/HOD)
    - **reason**: Required if can_override is true
    """
    # Check if user can override (admin or HOD)
    can_override = request.can_override and (
        UserRole.ADMIN in current_user.roles or
        UserRole.HOD in current_user.roles
    )
    
    try:
        mark = await marks_service.update_mark(
            mark_id=mark_id,
            new_marks=request.marks_obtained,
            updated_by=current_user.id,
            can_override=can_override,
            reason=request.reason
        )
        return MarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/exam/{exam_id}", response_model=MarkListResponse)
async def get_exam_marks(
    exam_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all marks for an exam
    """
    marks = await marks_service.get_exam_marks(
        exam_id=exam_id,
        skip=skip,
        limit=limit
    )
    
    return MarkListResponse(
        items=[MarkResponse(**mark.to_dict()) for mark in marks],
        total=len(marks),
        skip=skip,
        limit=limit
    )


@router.get("/student/{student_id}/exam/{exam_id}", response_model=List[MarkResponse])
async def get_student_exam_marks(
    student_id: int,
    exam_id: int,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all marks for a student in an exam
    """
    marks = await marks_service.get_student_exam_marks(
        exam_id=exam_id,
        student_id=student_id
    )
    
    return [MarkResponse(**mark.to_dict()) for mark in marks]


@router.post("/student/{student_id}/exam/{exam_id}/calculate", response_model=StudentTotalMarksResponse)
async def calculate_student_total(
    student_id: int,
    exam_id: int,
    question_max_marks: Dict[int, float],
    optional_questions: Optional[List[int]] = None,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate total marks for a student with smart calculation
    
    Handles optional questions:
    - Optional questions are included only if student answered them
    - Required questions are always included
    """
    try:
        result = await marks_service.calculate_student_total(
            exam_id=exam_id,
            student_id=student_id,
            question_max_marks=question_max_marks,
            optional_questions=optional_questions
        )
        return StudentTotalMarksResponse(**result)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/best-internal", response_model=BestInternalResponse)
async def calculate_best_internal(
    subject_assignment_id: int,
    student_id: int,
    internal_1_marks: Optional[float] = None,
    internal_2_marks: Optional[float] = None,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate best internal marks
    
    Uses the method specified in settings (best, avg, weighted)
    """
    result = await marks_service.calculate_best_internal(
        subject_assignment_id=subject_assignment_id,
        student_id=student_id,
        internal_1_marks=internal_1_marks,
        internal_2_marks=internal_2_marks
    )
    return BestInternalResponse(**result)


@router.delete("/{mark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mark(
    mark_id: int,
    marks_service: MarksService = Depends(get_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a mark
    
    Requires teacher or admin permissions
    """
    deleted = await marks_service.delete_mark(mark_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mark with ID {mark_id} not found"
        )

