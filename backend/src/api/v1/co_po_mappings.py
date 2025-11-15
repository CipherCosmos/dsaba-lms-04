"""
CO-PO Mapping API Endpoints
CRUD operations for CO-PO mappings
"""

from fastapi import APIRouter, Depends, HTTPException, status

from src.application.services.co_po_mapping_service import COPOMappingService
from src.application.dto.co_po_mapping_dto import (
    CreateCOPOMappingRequest,
    UpdateCOPOMappingRequest,
    COPOMappingResponse,
    COPOMappingListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError
from src.infrastructure.database.repositories.co_po_mapping_repository_impl import COPOMappingRepository
from src.infrastructure.database.repositories.course_outcome_repository_impl import CourseOutcomeRepository
from src.infrastructure.database.repositories.program_outcome_repository_impl import ProgramOutcomeRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_mapping_service(
    db: Session = Depends(get_db)
) -> COPOMappingService:
    """Get CO-PO mapping service instance"""
    mapping_repo = COPOMappingRepository(db)
    co_repo = CourseOutcomeRepository(db)
    po_repo = ProgramOutcomeRepository(db)
    return COPOMappingService(mapping_repo, co_repo, po_repo)


# Create router
router = APIRouter(
    prefix="/co-po-mappings",
    tags=["CO-PO Mappings"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=COPOMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_mapping(
    request: CreateCOPOMappingRequest,
    service: COPOMappingService = Depends(get_mapping_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new CO-PO mapping
    
    - **co_id**: Course Outcome ID
    - **po_id**: Program Outcome ID
    - **strength**: Mapping strength (1=Low, 2=Medium, 3=High)
    """
    try:
        mapping = await service.create_mapping(
            co_id=request.co_id,
            po_id=request.po_id,
            strength=request.strength
        )
        
        return COPOMappingResponse(
            id=mapping.id,
            co_id=mapping.co_id,
            po_id=mapping.po_id,
            strength=mapping.strength,
            created_at=mapping.created_at,
            updated_at=mapping.updated_at
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


@router.get("/{mapping_id}", response_model=COPOMappingResponse)
async def get_mapping(
    mapping_id: int,
    service: COPOMappingService = Depends(get_mapping_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get CO-PO mapping by ID
    
    - **mapping_id**: Mapping ID
    """
    try:
        mapping = await service.get_mapping(mapping_id)
        
        return COPOMappingResponse(
            id=mapping.id,
            co_id=mapping.co_id,
            po_id=mapping.po_id,
            strength=mapping.strength,
            created_at=mapping.created_at,
            updated_at=mapping.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/co/{co_id}", response_model=COPOMappingListResponse)
async def get_mappings_by_co(
    co_id: int,
    service: COPOMappingService = Depends(get_mapping_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all PO mappings for a CO
    
    - **co_id**: Course Outcome ID
    """
    try:
        mappings = await service.get_mappings_by_co(co_id)
        
        items = [
            COPOMappingResponse(
                id=m.id,
                co_id=m.co_id,
                po_id=m.po_id,
                strength=m.strength,
                created_at=m.created_at,
                updated_at=m.updated_at
            )
            for m in mappings
        ]
        
        return COPOMappingListResponse(
            items=items,
            total=len(items)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/po/{po_id}", response_model=COPOMappingListResponse)
async def get_mappings_by_po(
    po_id: int,
    service: COPOMappingService = Depends(get_mapping_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all CO mappings for a PO
    
    - **po_id**: Program Outcome ID
    """
    try:
        mappings = await service.get_mappings_by_po(po_id)
        
        items = [
            COPOMappingResponse(
                id=m.id,
                co_id=m.co_id,
                po_id=m.po_id,
                strength=m.strength,
                created_at=m.created_at,
                updated_at=m.updated_at
            )
            for m in mappings
        ]
        
        return COPOMappingListResponse(
            items=items,
            total=len(items)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{mapping_id}", response_model=COPOMappingResponse)
async def update_mapping(
    mapping_id: int,
    request: UpdateCOPOMappingRequest,
    service: COPOMappingService = Depends(get_mapping_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update CO-PO mapping strength
    
    - **mapping_id**: Mapping ID
    - **strength**: New strength value (1=Low, 2=Medium, 3=High)
    """
    try:
        mapping = await service.update_mapping_strength(
            mapping_id=mapping_id,
            strength=request.strength
        )
        
        return COPOMappingResponse(
            id=mapping.id,
            co_id=mapping.co_id,
            po_id=mapping.po_id,
            strength=mapping.strength,
            created_at=mapping.created_at,
            updated_at=mapping.updated_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: int,
    service: COPOMappingService = Depends(get_mapping_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete CO-PO mapping
    
    - **mapping_id**: Mapping ID
    """
    try:
        await service.delete_mapping(mapping_id)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

