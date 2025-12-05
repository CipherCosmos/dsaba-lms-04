
"""
Teacher Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import TeacherModel, UserModel
from src.application.dto.teacher_dto import TeacherCreateRequest, TeacherResponse
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole

router = APIRouter(
    prefix="/teachers",
    tags=["Teachers"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)

@router.post("", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    request: TeacherCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new teacher profile
    
    Requires admin permissions.
    """
    if UserRole.ADMIN not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create teacher profiles"
        )
    
    # Verify user exists
    user = db.query(UserModel).filter(UserModel.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {request.user_id} not found"
        )
    
    # Check if profile already exists
    existing = db.query(TeacherModel).filter(TeacherModel.user_id == request.user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Teacher profile already exists for user ID {request.user_id}"
        )
    
    # Create teacher profile
    teacher = TeacherModel(
        user_id=request.user_id,
        department_id=request.department_id,
        employee_id=request.employee_id,
        specialization=request.specialization,
        join_date=request.join_date
    )
    
    try:
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        return teacher
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create teacher profile: {str(e)}"
        )

@router.get("/{teacher_id}", response_model=TeacherResponse)
async def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get teacher profile by ID"""
    teacher = db.query(TeacherModel).filter(TeacherModel.id == teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found"
        )
    return teacher
