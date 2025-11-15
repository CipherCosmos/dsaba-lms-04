"""
Program Outcome API Endpoints
CRUD operations for Program Outcomes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.program_outcome_service import ProgramOutcomeService
from src.application.dto.program_outcome_dto import (
    CreatePORequest,
    UpdatePORequest,
    POResponse,
    POListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError
from src.infrastructure.database.repositories.program_outcome_repository_impl import ProgramOutcomeRepository
from src.infrastructure.database.repositories.department_repository_impl import DepartmentRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_po_service(
    db: Session = Depends(get_db)
) -> ProgramOutcomeService:
    """Get program outcome service instance"""
    po_repo = ProgramOutcomeRepository(db)
    dept_repo = DepartmentRepository(db)
    return ProgramOutcomeService(po_repo, dept_repo)


# Create router
router = APIRouter(
    prefix="/program-outcomes",
    tags=["Program Outcomes"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=POResponse, status_code=status.HTTP_201_CREATED)
async def create_po(
    request: CreatePORequest,
    service: ProgramOutcomeService = Depends(get_po_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new Program Outcome
    
    - **department_id**: Department ID
    - **code**: PO code (e.g., "PO1", "PSO1")
    - **type**: PO type ("PO" or "PSO")
    - **title**: PO title (min 10 chars)
    - **description**: PO description (optional, min 50 chars if provided)
    - **target_attainment**: Target attainment percentage (0-100)
    """
    try:
        po = await service.create_po(
            department_id=request.department_id,
            code=request.code,
            type=request.type,
            title=request.title,
            description=request.description,
            target_attainment=request.target_attainment
        )
        
        return POResponse(
            id=po.id,
            department_id=po.department_id,
            code=po.code,
            type=po.type,
            title=po.title,
            description=po.description,
            target_attainment=float(po.target_attainment),
            created_at=po.created_at
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


@router.get("/{po_id}", response_model=POResponse)
async def get_po(
    po_id: int,
    service: ProgramOutcomeService = Depends(get_po_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get Program Outcome by ID
    
    - **po_id**: Program Outcome ID
    """
    try:
        po = await service.get_po(po_id)
        
        return POResponse(
            id=po.id,
            department_id=po.department_id,
            code=po.code,
            type=po.type,
            title=po.title,
            description=po.description,
            target_attainment=float(po.target_attainment),
            created_at=po.created_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/department/{department_id}", response_model=POListResponse)
async def get_pos_by_department(
    department_id: int,
    po_type: Optional[str] = Query(None, pattern="^(PO|PSO)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    service: ProgramOutcomeService = Depends(get_po_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all Program Outcomes for a department
    
    - **department_id**: Department ID
    - **po_type**: Optional PO type filter ("PO" or "PSO")
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    """
    try:
        pos = await service.get_pos_by_department(department_id, po_type, skip, limit)
        
        items = [
            POResponse(
                id=po.id,
                department_id=po.department_id,
                code=po.code,
                type=po.type,
                title=po.title,
                description=po.description,
                target_attainment=float(po.target_attainment),
                created_at=po.created_at
            )
            for po in pos
        ]
        
        return POListResponse(
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


@router.put("/{po_id}", response_model=POResponse)
async def update_po(
    po_id: int,
    request: UpdatePORequest,
    service: ProgramOutcomeService = Depends(get_po_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update Program Outcome
    
    - **po_id**: Program Outcome ID
    - **title**: New title (optional)
    - **description**: New description (optional)
    - **target_attainment**: New target attainment (optional)
    """
    try:
        po = await service.update_po(
            po_id=po_id,
            title=request.title,
            description=request.description,
            target_attainment=request.target_attainment
        )
        
        return POResponse(
            id=po.id,
            department_id=po.department_id,
            code=po.code,
            type=po.type,
            title=po.title,
            description=po.description,
            target_attainment=float(po.target_attainment),
            created_at=po.created_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_po(
    po_id: int,
    service: ProgramOutcomeService = Depends(get_po_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete Program Outcome
    
    - **po_id**: Program Outcome ID
    """
    try:
        await service.delete_po(po_id)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

