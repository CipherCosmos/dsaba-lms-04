"""
Academic Year API Endpoints
CRUD operations for Academic Years
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.academic_year_service import AcademicYearService
from src.application.dto.academic_year_dto import (
    AcademicYearCreateRequest,
    AcademicYearUpdateRequest,
    AcademicYearResponse,
    AcademicYearListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError, BusinessRuleViolationError
from src.infrastructure.database.repositories.academic_year_repository_impl import AcademicYearRepository
from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import AcademicYearStatus
from sqlalchemy.orm import Session


def get_academic_year_service(
    db: Session = Depends(get_db)
) -> AcademicYearService:
    """Get academic year service instance"""
    repo = AcademicYearRepository(db)
    return AcademicYearService(repo)


# Create router
router = APIRouter(
    prefix="/academic-years",
    tags=["Academic Years"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    request: AcademicYearCreateRequest,
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new Academic Year
    
    - **start_year**: Start year (e.g., 2024)
    - **end_year**: End year (e.g., 2025)
    - **start_date**: Academic year start date (optional)
    - **end_date**: Academic year end date (optional)
    
    Only Principal and Admin can create academic years.
    """
    # Check permissions
    if current_user.role.value not in ['principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal and Admin can create academic years"
        )
    
    try:
        academic_year = await service.create_academic_year(
            start_year=request.start_year,
            end_year=request.end_year,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        return AcademicYearResponse(**academic_year.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=AcademicYearListResponse)
async def list_academic_years(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    status: Optional[str] = Query(None, pattern="^(active|archived|planned)$"),
    is_current: Optional[bool] = Query(None),
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """
    List all academic years with optional filters
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    - **status**: Filter by status (active, archived, planned)
    - **is_current**: Filter by current status
    """
    status_enum = None
    if status:
        status_enum = AcademicYearStatus(status)
    
    academic_years = await service.list_academic_years(
        skip=skip,
        limit=limit,
        status=status_enum,
        is_current=is_current
    )
    
    return AcademicYearListResponse(
        items=[AcademicYearResponse(**ay.to_dict()) for ay in academic_years],
        total=len(academic_years),
        skip=skip,
        limit=limit
    )


@router.get("/current", response_model=AcademicYearResponse)
async def get_current_academic_year(
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """Get current active academic year"""
    academic_year = await service.get_current_academic_year()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current academic year found"
        )
    return AcademicYearResponse(**academic_year.to_dict())


@router.get("/{academic_year_id}", response_model=AcademicYearResponse)
async def get_academic_year(
    academic_year_id: int,
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """Get academic year by ID"""
    try:
        academic_year = await service.get_academic_year(academic_year_id)
        return AcademicYearResponse(**academic_year.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{academic_year_id}", response_model=AcademicYearResponse)
async def update_academic_year(
    academic_year_id: int,
    request: AcademicYearUpdateRequest,
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update academic year dates
    
    Only Principal and Admin can update academic years.
    """
    if current_user.role.value not in ['principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal and Admin can update academic years"
        )
    
    try:
        academic_year = await service.update_academic_year(
            academic_year_id=academic_year_id,
            start_date=request.start_date,
            end_date=request.end_date
        )
        return AcademicYearResponse(**academic_year.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{academic_year_id}/activate", response_model=AcademicYearResponse)
async def activate_academic_year(
    academic_year_id: int,
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """
    Activate an academic year
    
    This will:
    - Deactivate the current academic year (if any)
    - Activate the specified academic year
    
    Only Principal and Admin can activate academic years.
    """
    if current_user.role.value not in ['principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal and Admin can activate academic years"
        )
    
    try:
        academic_year = await service.activate_academic_year(academic_year_id)
        return AcademicYearResponse(**academic_year.to_dict())
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


@router.post("/{academic_year_id}/archive", response_model=AcademicYearResponse)
async def archive_academic_year(
    academic_year_id: int,
    service: AcademicYearService = Depends(get_academic_year_service),
    current_user: User = Depends(get_current_user)
):
    """
    Archive an academic year
    
    Only Principal and Admin can archive academic years.
    """
    if current_user.role.value not in ['principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal and Admin can archive academic years"
        )
    
    try:
        academic_year = await service.archive_academic_year(academic_year_id)
        return AcademicYearResponse(**academic_year.to_dict())
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

