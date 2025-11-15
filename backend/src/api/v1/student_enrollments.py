"""
Student Enrollment API Endpoints
CRUD operations for Student Enrollments
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from src.application.services.student_enrollment_service import StudentEnrollmentService
from src.application.dto.student_enrollment_dto import (
    StudentEnrollmentCreateRequest,
    BulkEnrollmentRequest,
    StudentEnrollmentResponse,
    StudentEnrollmentListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError
from src.infrastructure.database.repositories.student_enrollment_repository_impl import StudentEnrollmentRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_student_enrollment_service(
    db: Session = Depends(get_db)
) -> StudentEnrollmentService:
    """Get student enrollment service instance"""
    repo = StudentEnrollmentRepository(db)
    return StudentEnrollmentService(repo)


# Create router
router = APIRouter(
    prefix="/student-enrollments",
    tags=["Student Enrollments"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=StudentEnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    request: StudentEnrollmentCreateRequest,
    service: StudentEnrollmentService = Depends(get_student_enrollment_service),
    current_user: User = Depends(get_current_user)
):
    """
    Enroll a student in a semester for an academic year
    
    - **student_id**: Student ID
    - **semester_id**: Semester ID
    - **academic_year_id**: Academic Year ID
    - **roll_no**: Roll number for this semester
    - **enrollment_date**: Enrollment date
    
    Only HOD, Principal, and Admin can enroll students.
    """
    # Check permissions
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can enroll students"
        )
    
    try:
        enrollment = await service.enroll_student(
            student_id=request.student_id,
            semester_id=request.semester_id,
            academic_year_id=request.academic_year_id,
            roll_no=request.roll_no,
            enrollment_date=request.enrollment_date
        )
        
        return StudentEnrollmentResponse(**enrollment.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.post("/bulk", response_model=dict, status_code=status.HTTP_201_CREATED)
async def bulk_enroll_students(
    request: BulkEnrollmentRequest,
    service: StudentEnrollmentService = Depends(get_student_enrollment_service),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk enroll students in a semester
    
    Only HOD, Principal, and Admin can bulk enroll students.
    """
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can bulk enroll students"
        )
    
    from datetime import date
    
    enrollments = []
    for e in request.enrollments:
        enrollments.append({
            'student_id': e['student_id'],
            'roll_no': e['roll_no'],
            'enrollment_date': e.get('enrollment_date', date.today())
        })
    
    results = await service.bulk_enroll_students(
        semester_id=request.semester_id,
        academic_year_id=request.academic_year_id,
        enrollments=enrollments
    )
    
    return {
        "enrolled": len(results),
        "enrollments": [StudentEnrollmentResponse(**e.to_dict()) for e in results]
    }


@router.get("", response_model=StudentEnrollmentListResponse)
async def list_enrollments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    student_id: Optional[int] = Query(None, gt=0),
    semester_id: Optional[int] = Query(None, gt=0),
    academic_year_id: Optional[int] = Query(None, gt=0),
    service: StudentEnrollmentService = Depends(get_student_enrollment_service),
    current_user: User = Depends(get_current_user)
):
    """
    List student enrollments with optional filters
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    - **student_id**: Filter by student ID
    - **semester_id**: Filter by semester ID
    - **academic_year_id**: Filter by academic year ID
    """
    if student_id:
        enrollments = await service.get_student_enrollments(
            student_id=student_id,
            academic_year_id=academic_year_id
        )
    elif semester_id:
        enrollments = await service.get_semester_enrollments(
            semester_id=semester_id,
            academic_year_id=academic_year_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either student_id or semester_id must be provided"
        )
    
    # Get total count for pagination
    from src.infrastructure.database.models import StudentEnrollmentModel
    from src.infrastructure.database.session import get_db
    db = next(get_db())
    try:
        count_query = db.query(StudentEnrollmentModel)
        if student_id:
            count_query = count_query.filter(StudentEnrollmentModel.student_id == student_id)
        if semester_id:
            count_query = count_query.filter(StudentEnrollmentModel.semester_id == semester_id)
        if academic_year_id:
            count_query = count_query.filter(StudentEnrollmentModel.academic_year_id == academic_year_id)
        total = count_query.count()
    finally:
        db.close()
    
    # Service should handle pagination, but if it doesn't, apply it here
    # Note: Service should be updated to accept skip/limit parameters
    paginated = enrollments[skip:skip + limit] if len(enrollments) > skip + limit else enrollments[skip:]
    
    return StudentEnrollmentListResponse(
        items=[StudentEnrollmentResponse(**e.to_dict()) for e in paginated],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{enrollment_id}", response_model=StudentEnrollmentResponse)
async def get_enrollment(
    enrollment_id: int,
    service: StudentEnrollmentService = Depends(get_student_enrollment_service),
    current_user: User = Depends(get_current_user)
):
    """Get enrollment by ID"""
    try:
        enrollment = await service.get_enrollment(enrollment_id)
        return StudentEnrollmentResponse(**enrollment.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{enrollment_id}/promote", response_model=StudentEnrollmentResponse)
async def promote_student(
    enrollment_id: int,
    next_semester_id: int = Query(..., gt=0),
    service: StudentEnrollmentService = Depends(get_student_enrollment_service),
    current_user: User = Depends(get_current_user)
):
    """
    Promote student to next semester
    
    Only HOD, Principal, and Admin can promote students.
    """
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can promote students"
        )
    
    try:
        enrollment = await service.promote_student(enrollment_id, next_semester_id)
        return StudentEnrollmentResponse(**enrollment.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

