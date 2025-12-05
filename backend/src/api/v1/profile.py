"""
Profile Management API Endpoints
Profile CRUD operations with role-based access control
"""

from fastapi import APIRouter, Depends, HTTPException, status

from src.application.services.user_service import UserService
from src.application.dto.user_dto import (
    ProfileUpdateRequest,
    ProfileResponse
)
from src.api.dependencies import (
    get_user_service,
    get_current_user
)
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError
)
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session

# Create router
router = APIRouter(
    prefix="/profile",
    tags=["Profile"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile
    
    Returns the profile of the currently authenticated user.
    
    Requires:
        - Valid access token
    
    Returns:
        User profile information
    """
    user_dict = current_user.to_dict()
    # Add role field for backward compatibility
    if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
        user_dict["role"] = user_dict["roles"][0]
    
    # Populate teacher_id and student_id
    from src.infrastructure.database.models import TeacherModel, StudentModel
    import logging
    logger = logging.getLogger(__name__)
    
    if UserRole.TEACHER in current_user.roles:
        teacher = db.query(TeacherModel).filter(TeacherModel.user_id == current_user.id).first()
        if teacher:
            user_dict["teacher_id"] = teacher.id
            logger.info(f"Found Teacher Profile: ID={teacher.id} for UserID={current_user.id}")
        else:
            logger.warning(f"No Teacher Profile found for UserID={current_user.id}")
            
    if UserRole.STUDENT in current_user.roles:
        student = db.query(StudentModel).filter(StudentModel.user_id == current_user.id).first()
        if student:
            user_dict["student_id"] = student.id
            logger.info(f"Found Student Profile: ID={student.id} for UserID={current_user.id}")
        else:
            logger.warning(f"No Student Profile found for UserID={current_user.id}")
            
    return ProfileResponse(**user_dict)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    request: ProfileUpdateRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's profile
    
    Users can update their own profile information.
    
    Requires:
        - Valid access token
    
    Returns:
        Updated profile information
    """
    try:
        user = await user_service.update_user(
            user_id=current_user.id,
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            phone_number=request.phone_number,
            avatar_url=request.avatar_url,
            bio=request.bio
        )
        
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return ProfileResponse(**user_dict)
        
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


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: int,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get user profile by ID
    
    Access control:
    - Users can view their own profile
    - Admins and Principals can view any profile
    - HODs can view profiles of users in their departments
    - Teachers can view profiles of students in their classes
    - Students can only view their own profile
    
    Requires:
        - Valid access token
        - Appropriate permissions
    
    Returns:
        User profile information
    """
    # Check permissions
    can_view = False
    
    # Users can always view their own profile
    if current_user.id == user_id:
        can_view = True
    # Admins and Principals can view any profile
    elif current_user.has_any_role([UserRole.ADMIN, UserRole.PRINCIPAL]):
        can_view = True
    # HODs can view profiles in their departments
    elif current_user.has_role(UserRole.HOD):
        target_user = await user_service.get_user(user_id)
        if target_user:
            # Check if target user is in any of current user's departments
            for dept_id in current_user.department_ids:
                if dept_id in target_user.department_ids:
                    can_view = True
                    break
    # Teachers and Students can only view their own
    else:
        can_view = (current_user.id == user_id)
    
    if not can_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this profile"
        )
    
    try:
        user = await user_service.get_user(user_id)
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return ProfileResponse(**user_dict)
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )


@router.put("/{user_id}", response_model=ProfileResponse)
async def update_user_profile(
    user_id: int,
    request: ProfileUpdateRequest,
    user_service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update user profile by ID
    
    Access control:
    - Users can update their own profile (except roles and is_active)
    - Admins and Principals can update any profile
    - HODs can update profiles of users in their departments
    - Teachers and Students can only update their own profile
    
    Requires:
        - Valid access token
        - Appropriate permissions
    
    Returns:
        Updated profile information
    """
    # Check permissions
    can_update = False
    
    # Users can always update their own profile
    if current_user.id == user_id:
        can_update = True
    # Admins and Principals can update any profile
    elif current_user.has_any_role([UserRole.ADMIN, UserRole.PRINCIPAL]):
        can_update = True
    # HODs can update profiles in their departments
    elif current_user.has_role(UserRole.HOD):
        target_user = await user_service.get_user(user_id)
        if target_user:
            # Check if target user is in any of current user's departments
            for dept_id in current_user.department_ids:
                if dept_id in target_user.department_ids:
                    can_update = True
                    break
    # Teachers and Students can only update their own
    else:
        can_update = (current_user.id == user_id)
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this profile"
        )
    
    try:
        user = await user_service.update_user(
            user_id=user_id,
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            phone_number=request.phone_number,
            avatar_url=request.avatar_url,
            bio=request.bio
        )
        
        user_dict = user.to_dict()
        # Add role field for backward compatibility
        if "role" not in user_dict and "roles" in user_dict and len(user_dict["roles"]) > 0:
            user_dict["role"] = user_dict["roles"][0]
        return ProfileResponse(**user_dict)
        
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
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

