"""
Department Management API Endpoints
CRUD operations for departments
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.department_service import DepartmentService
from src.application.dto.department_dto import (
    DepartmentCreateRequest,
    DepartmentUpdateRequest,
    DepartmentResponse,
    DepartmentListResponse,
    AssignHODRequest
)
from src.api.dependencies import (
    get_user_repository,
    get_department_repository,
    get_current_user,
    get_db
)
from sqlalchemy.orm import Session
from src.domain.entities.user import User
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError
)
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.repositories.department_repository_impl import DepartmentRepository


def get_department_service(
    db: Session = Depends(get_db),
    dept_repo = Depends(get_department_repository),
    user_repo: UserRepository = Depends(get_user_repository)
) -> DepartmentService:
    """Get department service instance"""
    return DepartmentService(dept_repo, user_repo, db=db)


# Create router
router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    request: DepartmentCreateRequest,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new department
    
    Requires admin permissions
    """
    try:
        department = await department_service.create_department(
            name=request.name,
            code=request.code,
            hod_id=request.hod_id
        )
        return DepartmentResponse(**department.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
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


@router.get("", response_model=DepartmentListResponse)
async def list_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    has_hod: Optional[bool] = Query(None),
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    List departments with pagination and filtering
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records (1-200)
    - **is_active**: Filter by active status
    - **has_hod**: Filter by HOD assignment
    """
    filters = {}
    if is_active is not None:
        filters['is_active'] = is_active
    if has_hod is not None:
        filters['has_hod'] = has_hod
    
    departments = await department_service.list_departments(
        skip=skip,
        limit=limit,
        filters=filters
    )
    total = await department_service.count_departments(filters=filters)
    
    return DepartmentListResponse(
        items=[DepartmentResponse(**dept.to_dict()) for dept in departments],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get department by ID
    
    - **department_id**: Department ID
    """
    try:
        department = await department_service.get_department(department_id)
        return DepartmentResponse(**department.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found"
        )


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    request: DepartmentUpdateRequest,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update department information
    
    - **department_id**: Department ID
    """
    try:
        department = await department_service.update_department(
            department_id=department_id,
            name=request.name,
            code=request.code
        )
        return DepartmentResponse(**department.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found"
        )
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.post("/{department_id}/hod", response_model=DepartmentResponse)
async def assign_hod(
    department_id: int,
    request: AssignHODRequest,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Assign HOD to department
    
    - **department_id**: Department ID
    """
    try:
        department = await department_service.assign_hod(
            department_id=department_id,
            hod_id=request.hod_id
        )
        return DepartmentResponse(**department.to_dict())
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


@router.delete("/{department_id}/hod", response_model=DepartmentResponse)
async def remove_hod(
    department_id: int,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Remove HOD from department
    
    - **department_id**: Department ID
    """
    try:
        department = await department_service.remove_hod(department_id)
        return DepartmentResponse(**department.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{department_id}/activate", response_model=DepartmentResponse)
async def activate_department(
    department_id: int,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Activate department
    
    - **department_id**: Department ID
    """
    try:
        department = await department_service.activate_department(department_id)
        return DepartmentResponse(**department.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found"
        )


@router.post("/{department_id}/deactivate", response_model=DepartmentResponse)
async def deactivate_department(
    department_id: int,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Deactivate department
    
    - **department_id**: Department ID
    """
    try:
        department = await department_service.deactivate_department(department_id)
        return DepartmentResponse(**department.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found"
        )


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    department_service: DepartmentService = Depends(get_department_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete department
    
    - **department_id**: Department ID
    
    Note: This should check for dependencies before deletion
    """
    deleted = await department_service.delete_department(department_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found"
        )

