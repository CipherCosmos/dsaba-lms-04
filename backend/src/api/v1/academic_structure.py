"""
Academic Structure API Endpoints
Batch, BatchYear, and Semester management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from src.application.services.academic_structure_service import AcademicStructureService
from src.application.dto.academic_structure_dto import (
    BatchCreateRequest,
    BatchResponse,
    BatchListResponse,
    BatchYearCreateRequest,
    BatchYearResponse,
    BatchYearListResponse,
    SemesterCreateRequest,
    SemesterUpdateDatesRequest,
    SemesterResponse,
    SemesterListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError
)
from src.infrastructure.database.repositories.academic_structure_repository_impl import (
    BatchRepository,
    BatchYearRepository,
    SemesterRepository
)
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_academic_structure_service(
    db: Session = Depends(get_db)
) -> AcademicStructureService:
    """Get academic structure service instance"""
    batch_repo = BatchRepository(db)
    batch_year_repo = BatchYearRepository(db)
    semester_repo = SemesterRepository(db)
    return AcademicStructureService(batch_repo, batch_year_repo, semester_repo)


# Create router
router = APIRouter(
    prefix="/academic",
    tags=["Academic Structure"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


# Batch endpoints
@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    request: BatchCreateRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new batch"""
    try:
        batch = await service.create_batch(
            name=request.name,
            duration_years=request.duration_years
        )
        return BatchResponse(**batch.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/batches", response_model=BatchListResponse)
async def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """List batches"""
    batches = await service.list_batches(skip=skip, limit=limit, is_active=is_active)
    return BatchListResponse(
        batches=[BatchResponse(**b.to_dict()) for b in batches],
        total=len(batches),
        skip=skip,
        limit=limit
    )


@router.get("/batches/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Get batch by ID"""
    try:
        batch = await service.get_batch(batch_id)
        return BatchResponse(**batch.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")


@router.post("/batches/{batch_id}/activate", response_model=BatchResponse)
async def activate_batch(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Activate batch"""
    try:
        batch = await service.activate_batch(batch_id)
        return BatchResponse(**batch.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/batches/{batch_id}/deactivate", response_model=BatchResponse)
async def deactivate_batch(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Deactivate batch"""
    try:
        batch = await service.deactivate_batch(batch_id)
        return BatchResponse(**batch.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# BatchYear endpoints
@router.post("/batch-years", response_model=BatchYearResponse, status_code=status.HTTP_201_CREATED)
async def create_batch_year(
    request: BatchYearCreateRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new batch year"""
    try:
        batch_year = await service.create_batch_year(
            batch_id=request.batch_id,
            start_year=request.start_year,
            end_year=request.end_year,
            is_current=request.is_current
        )
        return BatchYearResponse(**batch_year.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/batches/{batch_id}/batch-years", response_model=List[BatchYearResponse])
async def get_batch_years(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Get all batch years for a batch"""
    batch_years = await service.get_batch_years_by_batch(batch_id)
    return [BatchYearResponse(**by.to_dict()) for by in batch_years]


@router.post("/batch-years/{batch_year_id}/mark-current", response_model=BatchYearResponse)
async def mark_batch_year_current(
    batch_year_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Mark batch year as current"""
    try:
        batch_year = await service.mark_batch_year_as_current(batch_year_id)
        return BatchYearResponse(**batch_year.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"BatchYear {batch_year_id} not found")


# Semester endpoints
@router.post("/semesters", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
async def create_semester(
    request: SemesterCreateRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new semester"""
    try:
        semester = await service.create_semester(
            batch_year_id=request.batch_year_id,
            semester_no=request.semester_no,
            start_date=request.start_date,
            end_date=request.end_date,
            is_current=request.is_current
        )
        return SemesterResponse(**semester.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/batch-years/{batch_year_id}/semesters", response_model=List[SemesterResponse])
async def get_semesters(
    batch_year_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Get all semesters for a batch year"""
    semesters = await service.get_semesters_by_batch_year(batch_year_id)
    return [SemesterResponse(**s.to_dict()) for s in semesters]


@router.post("/semesters/{semester_id}/mark-current", response_model=SemesterResponse)
async def mark_semester_current(
    semester_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Mark semester as current"""
    try:
        semester = await service.mark_semester_as_current(semester_id)
        return SemesterResponse(**semester.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Semester {semester_id} not found")


@router.put("/semesters/{semester_id}/dates", response_model=SemesterResponse)
async def update_semester_dates(
    semester_id: int,
    request: SemesterUpdateDatesRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Update semester dates"""
    try:
        semester = await service.update_semester_dates(
            semester_id=semester_id,
            start_date=request.start_date,
            end_date=request.end_date
        )
        return SemesterResponse(**semester.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Semester {semester_id} not found")
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

