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
    SubjectListResponse,
    BulkSubjectCreateRequest,
    BulkSubjectCreateResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError,
    BusinessRuleViolationError
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


@router.get("", response_model=SubjectListResponse)
async def list_subjects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    department_id: Optional[int] = Query(None, gt=0),
    is_active: Optional[bool] = Query(None),
    code: Optional[str] = Query(None, min_length=1, max_length=20),
    name: Optional[str] = Query(None, min_length=1, max_length=100),
    semester_id: Optional[int] = Query(None, gt=0),
    academic_year_id: Optional[int] = Query(None, gt=0),
    min_credits: Optional[float] = Query(None, ge=0),
    max_credits: Optional[float] = Query(None, ge=0),
    sort_by: str = Query("created_at", pattern="^(code|name|credits|created_at|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    List subjects with advanced pagination and filtering

    - **skip**: Number of records to skip
    - **limit**: Maximum number of records (1-200)
    - **department_id**: Filter by department
    - **is_active**: Filter by active status
    - **code**: Filter by subject code (partial match)
    - **name**: Filter by subject name (partial match)
    - **semester_id**: Filter by semester
    - **academic_year_id**: Filter by academic year
    - **min_credits**: Minimum credits filter
    - **max_credits**: Maximum credits filter
    - **sort_by**: Sort field (code, name, credits, created_at, updated_at)
    - **sort_order**: Sort order (asc, desc)
    """
    # Build filters dict
    filters = {}
    if department_id:
        filters['department_id'] = department_id
    if is_active is not None:
        filters['is_active'] = is_active
    if code:
        filters['code'] = code
    if name:
        filters['name'] = name
    if semester_id:
        filters['semester_id'] = semester_id
    if academic_year_id:
        filters['academic_year_id'] = academic_year_id
    if min_credits is not None:
        filters['min_credits'] = min_credits
    if max_credits is not None:
        filters['max_credits'] = max_credits
    if sort_by:
        filters['sort_by'] = sort_by
    if sort_order:
        filters['sort_order'] = sort_order

    subjects = await subject_service.list_subjects(
        skip=skip,
        limit=limit,
        **filters
    )
    total = await subject_service.count_subjects(**filters)

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
    subject = await subject_service.get_subject(subject_id)
    return SubjectResponse(**subject.to_dict())


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
    subject = await subject_service.update_subject(
        subject_id=subject_id,
        name=request.name,
        credits=request.credits
    )
    return SubjectResponse(**subject.to_dict())


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
    subject = await subject_service.update_marks_distribution(
        subject_id=subject_id,
        max_internal=request.max_internal,
        max_external=request.max_external
    )
    return SubjectResponse(**subject.to_dict())


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
    subject = await subject_service.activate_subject(subject_id)
    return SubjectResponse(**subject.to_dict())


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
    subject = await subject_service.deactivate_subject(subject_id)
    return SubjectResponse(**subject.to_dict())


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


@router.post("/bulk", response_model=BulkSubjectCreateResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_subjects(
    request: BulkSubjectCreateRequest,
    subject_service: SubjectService = Depends(get_subject_service),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk create subjects from a list

    Requires admin or HOD permissions.
    Maximum 1000 subjects per request.

    - **subjects**: List of subject creation requests
    """
    import logging
    logger = logging.getLogger(__name__)

    # Check permissions (admin or HOD)
    from src.domain.enums.user_role import UserRole
    if UserRole.ADMIN not in current_user.roles and UserRole.HOD not in current_user.roles:
        raise BusinessRuleViolationError("Only administrators or HODs can bulk create subjects")

    # Validate request size
    if len(request.subjects) > 1000:
        raise ValidationError("Maximum 1000 subjects per bulk request", field="subjects")

    if len(request.subjects) == 0:
        raise ValidationError("At least one subject is required", field="subjects")

    try:
        # Convert request to list of dicts
        subjects_data = []
        for subject_req in request.subjects:
            subjects_data.append({
                'code': subject_req.code,
                'name': subject_req.name,
                'department_id': subject_req.department_id,
                'credits': subject_req.credits,
                'max_internal': subject_req.max_internal,
                'max_external': subject_req.max_external,
                'semester_id': subject_req.semester_id,
                'academic_year_id': subject_req.academic_year_id
            })

        # Bulk create
        result = await subject_service.bulk_create_subjects(subjects_data)

        # Convert created subjects to response format
        subject_responses = []
        for subject in result['subjects']:
            try:
                subject_responses.append(SubjectResponse(**subject.to_dict()))
            except Exception as e:
                logger.warning(f"Error converting subject to response format: {str(e)}")
                # Continue with other subjects even if one fails to convert

        return BulkSubjectCreateResponse(
            created=result['created'],
            failed=result['failed'],
            errors=result['errors'],
            subjects=subject_responses
        )

    except ValidationError as e:
        logger.error(f"Validation error in bulk create: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in bulk create: {str(e)}", exc_info=True)
        raise BusinessRuleViolationError(f"An error occurred while bulk creating subjects: {str(e)}")


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
        raise EntityNotFoundError("Subject", subject_id)

