"""
Batch Instance Management API Endpoints
CRUD operations for batch instances, sections, and batch promotion
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from src.application.services.batch_instance_service import BatchInstanceService
from src.application.services.batch_promotion_service import BatchPromotionService
from src.application.dto.academic_structure_dto import (
    BatchInstanceCreateRequest,
    BatchInstanceResponse,
    BatchInstanceListResponse,
    SectionCreateRequest,
    SectionUpdateRequest,
    SectionResponse,
    SectionListResponse,
    BatchPromotionRequest,
    BatchPromotionResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError
)
from src.infrastructure.database.repositories.academic_structure_repository_impl import (
    BatchInstanceRepository,
    SectionRepository,
    SemesterRepository
)
from src.infrastructure.database.repositories.student_enrollment_repository_impl import StudentEnrollmentRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_batch_instance_service(
    db: Session = Depends(get_db)
) -> BatchInstanceService:
    """Get batch instance service instance"""
    batch_instance_repo = BatchInstanceRepository(db)
    section_repo = SectionRepository(db)
    semester_repo = SemesterRepository(db)
    return BatchInstanceService(batch_instance_repo, section_repo, semester_repo)


def get_batch_promotion_service(
    db: Session = Depends(get_db)
) -> BatchPromotionService:
    """Get batch promotion service instance"""
    batch_instance_repo = BatchInstanceRepository(db)
    semester_repo = SemesterRepository(db)
    enrollment_repo = StudentEnrollmentRepository(db)
    return BatchPromotionService(batch_instance_repo, semester_repo, enrollment_repo, db)


# Create router
router = APIRouter(
    prefix="/batch-instances",
    tags=["Batch Instances"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


# Batch Instance endpoints
@router.post("", response_model=BatchInstanceResponse, status_code=status.HTTP_201_CREATED)
async def create_batch_instance(
    request: BatchInstanceCreateRequest,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new batch instance
    
    Only Principal, HOD, and Admin can create batch instances.
    """
    # Check permissions
    if current_user.role.value not in ['principal', 'hod', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal, HOD, and Admin can create batch instances"
        )
    
    try:
        batch_instance = await service.create_batch_instance(
            academic_year_id=request.academic_year_id,
            department_id=request.department_id,
            batch_id=request.batch_id,
            admission_year=request.admission_year,
            sections=request.sections
        )
        return BatchInstanceResponse(**batch_instance.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=BatchInstanceListResponse)
async def list_batch_instances(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    academic_year_id: Optional[int] = Query(None, gt=0),
    department_id: Optional[int] = Query(None, gt=0),
    batch_id: Optional[int] = Query(None, gt=0),
    is_active: Optional[bool] = Query(None),
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """List batch instances with optional filters"""
    batch_instances = await service.list_batch_instances(
        skip=skip,
        limit=limit,
        academic_year_id=academic_year_id,
        department_id=department_id,
        batch_id=batch_id,
        is_active=is_active
    )
    return BatchInstanceListResponse(
        items=[BatchInstanceResponse(**bi.to_dict()) for bi in batch_instances],
        total=len(batch_instances),
        skip=skip,
        limit=limit
    )


@router.get("/{batch_instance_id}", response_model=BatchInstanceResponse)
async def get_batch_instance(
    batch_instance_id: int,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """Get batch instance by ID"""
    try:
        batch_instance = await service.get_batch_instance(batch_instance_id)
        return BatchInstanceResponse(**batch_instance.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{batch_instance_id}/activate", response_model=BatchInstanceResponse)
async def activate_batch_instance(
    batch_instance_id: int,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """Activate batch instance"""
    if current_user.role.value not in ['principal', 'hod', 'admin']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        batch_instance = await service.activate_batch_instance(batch_instance_id)
        return BatchInstanceResponse(**batch_instance.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{batch_instance_id}/deactivate", response_model=BatchInstanceResponse)
async def deactivate_batch_instance(
    batch_instance_id: int,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """Deactivate batch instance"""
    if current_user.role.value not in ['principal', 'hod', 'admin']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        batch_instance = await service.deactivate_batch_instance(batch_instance_id)
        return BatchInstanceResponse(**batch_instance.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Section endpoints
@router.post("/{batch_instance_id}/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    batch_instance_id: int,
    request: SectionCreateRequest,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """Create a section for a batch instance"""
    if current_user.role.value not in ['principal', 'hod', 'admin']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        section = await service.add_section(
            batch_instance_id=batch_instance_id,
            section_name=request.section_name,
            capacity=request.capacity
        )
        return SectionResponse(**section.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/{batch_instance_id}/sections", response_model=SectionListResponse)
async def list_sections(
    batch_instance_id: int,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """List all sections for a batch instance"""
    try:
        sections = await service.get_sections(batch_instance_id)
        return SectionListResponse(
            items=[SectionResponse(**s.to_dict()) for s in sections],
            total=len(sections)
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/sections/{section_id}", response_model=SectionResponse)
async def get_section(
    section_id: int,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """Get section by ID"""
    try:
        section = await service.get_section(section_id)
        return SectionResponse(**section.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/sections/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: int,
    request: SectionUpdateRequest,
    service: BatchInstanceService = Depends(get_batch_instance_service),
    current_user: User = Depends(get_current_user)
):
    """Update section"""
    if current_user.role.value not in ['principal', 'hod', 'admin']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        section = await service.update_section(
            section_id=section_id,
            section_name=request.section_name,
            capacity=request.capacity,
            is_active=request.is_active
        )
        return SectionResponse(**section.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


# Batch Promotion endpoint
@router.post("/{batch_instance_id}/promote", response_model=BatchPromotionResponse, status_code=status.HTTP_200_OK)
async def promote_batch(
    batch_instance_id: int,
    request: BatchPromotionRequest,
    promotion_service: BatchPromotionService = Depends(get_batch_promotion_service),
    current_user: User = Depends(get_current_user)
):
    """
    Promote all students in a batch to the next semester
    
    Only Principal, HOD, and Admin can promote batches.
    """
    if current_user.role.value not in ['principal', 'hod', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal, HOD, and Admin can promote batches"
        )
    
    try:
        result = await promotion_service.promote_batch(
            batch_instance_id=batch_instance_id,
            promoted_by=current_user.id,
            notes=request.notes
        )
        return BatchPromotionResponse(**result)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

