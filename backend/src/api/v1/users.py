"""
User Management API Endpoints
CRUD operations for users
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from src.application.services.user_service import UserService
from src.application.dto.user_dto import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
    UserListResponse,
    ChangePasswordRequest,
    ResetPasswordRequest,
    AssignRoleRequest,
    RemoveRoleRequest
)
from src.api.dependencies import (
    get_user_repository,
    get_current_user,
    get_auth_service
)
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError
)
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.application.services.auth_service import AuthService

# Create router
router = APIRouter(
    prefix="/users",
    tags=["Users"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository)
) -> UserService:
    """Get user service instance"""
    from src.application.services.user_service import UserService
    return UserService(user_repo)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: UserCreateRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user
    
    Requires admin permissions
    """
    # Check if user has admin role
    if UserRole.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users"
        )
    try:
        # Convert role strings to enums
        roles = [UserRole(role) for role in request.roles]
        
        user = await user_service.create_user(
            username=request.username,
            email=request.email,
            first_name=request.first_name,
            last_name=request.last_name,
            password=request.password,
            roles=roles,
            department_ids=request.department_ids
        )
        
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return UserResponse(**user_dict)
        
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


@router.get("", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    email_verified: Optional[bool] = Query(None),
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    List users with pagination and filtering
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records (1-200)
    - **is_active**: Filter by active status
    - **email_verified**: Filter by email verification status
    """
    filters = {}
    if is_active is not None:
        filters['is_active'] = is_active
    if email_verified is not None:
        filters['email_verified'] = email_verified
    
    users = await user_service.list_users(skip=skip, limit=limit, filters=filters)
    total = await user_service.count_users(filters=filters)
    
    # Convert users to response format with role field
    user_responses = []
    for user in users:
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        user_responses.append(UserResponse(**user_dict))
    
    return UserListResponse(
        items=user_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get user by ID
    
    - **user_id**: User ID
    """
    try:
        user = await user_service.get_user(user_id)
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return UserResponse(**user_dict)
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update user information
    
    - **user_id**: User ID
    """
    try:
        user = await user_service.update_user(
            user_id=user_id,
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            is_active=request.is_active
        )
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return UserResponse(**user_dict)
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete user
    
    - **user_id**: User ID
    """
    deleted = await user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )


@router.post("/{user_id}/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    user_id: int,
    request: ChangePasswordRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Change user password (requires old password)
    
    - **user_id**: User ID
    """
    # Only allow users to change their own password, or admins
    if current_user.id != user_id and UserRole.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password"
        )
    
    try:
        await user_service.change_password(
            user_id=user_id,
            old_password=request.old_password,
            new_password=request.new_password
        )
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    user_id: int,
    request: ResetPasswordRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Reset user password (admin only, no old password required)
    
    - **user_id**: User ID
    """
    # Only admins can reset passwords
    if UserRole.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reset passwords"
        )
    
    try:
        await user_service.reset_password(
            user_id=user_id,
            new_password=request.new_password
        )
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )


@router.post("/{user_id}/roles", response_model=UserResponse)
async def assign_role(
    user_id: int,
    request: AssignRoleRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Assign role to user
    
    - **user_id**: User ID
    """
    try:
        role = UserRole(request.role)
        user = await user_service.assign_role(
            user_id=user_id,
            role=role,
            department_id=request.department_id
        )
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return UserResponse(**user_dict)
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role: {request.role}"
        )


@router.delete("/{user_id}/roles", response_model=UserResponse)
async def remove_role(
    user_id: int,
    request: RemoveRoleRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Remove role from user
    
    - **user_id**: User ID
    """
    try:
        role = UserRole(request.role)
        user = await user_service.remove_role(
            user_id=user_id,
            role=role,
            department_id=request.department_id
        )
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return UserResponse(**user_dict)
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role: {request.role}"
        )

