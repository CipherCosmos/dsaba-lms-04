"""
Subject Assignments API Router
Handles subject assignment endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ...infrastructure.database.session import get_db
from ...infrastructure.database.models import SubjectAssignmentModel, TeacherModel
from ...application.dto.subject_assignment_dto import (
    SubjectAssignmentResponse,
    SubjectAssignmentCreateRequest,
    SubjectAssignmentListResponse
)
from ...api.v1.auth import get_current_user
from ...domain.entities.user import User
from ...domain.exceptions import EntityNotFoundError

router = APIRouter(
    prefix="/subject-assignments",
    tags=["Subject Assignments"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/{assignment_id}", response_model=SubjectAssignmentResponse)
async def get_subject_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get subject assignment by ID
    
    - **assignment_id**: Subject assignment ID
    """
    try:
        assignment = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject assignment with ID {assignment_id} not found"
            )
        
        return SubjectAssignmentResponse(
            id=assignment.id,
            subject_id=assignment.subject_id,
            teacher_id=assignment.teacher_id,
            class_id=None,
            semester_id=assignment.semester_id,
            academic_year=assignment.academic_year,
            created_at=assignment.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subject assignment: {str(e)}"
        )


@router.get("", response_model=SubjectAssignmentListResponse)
async def list_subject_assignments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    teacher_id: Optional[int] = Query(None, gt=0),
    user_id: Optional[int] = Query(None, gt=0),  # Filter by user_id (for teachers)
    subject_id: Optional[int] = Query(None, gt=0),
    class_id: Optional[int] = Query(None, gt=0),
    semester_id: Optional[int] = Query(None, gt=0),
    academic_year_id: Optional[int] = Query(None, gt=0),  # Filter by academic year
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List subject assignments with pagination and filtering
    
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records (1-200)
    - **teacher_id**: Filter by teacher
    - **subject_id**: Filter by subject
    - **class_id**: Filter by class
    - **semester_id**: Filter by semester
    - **academic_year_id**: Filter by academic year
    """
    try:
        query = db.query(SubjectAssignmentModel)
        
        # Apply filters
        filters = []
        if teacher_id:
            filters.append(SubjectAssignmentModel.teacher_id == teacher_id)
        elif user_id:
            # If user_id is provided, find the teacher profile first
            teacher = db.query(TeacherModel).filter(TeacherModel.user_id == user_id).first()
            if teacher:
                filters.append(SubjectAssignmentModel.teacher_id == teacher.id)
            else:
                # If no teacher profile found, return empty result
                return SubjectAssignmentListResponse(items=[], total=0, skip=skip, limit=limit)
        if subject_id:
            filters.append(SubjectAssignmentModel.subject_id == subject_id)
        if class_id:
            filters.append(SubjectAssignmentModel.class_id == class_id)
        if semester_id:
            filters.append(SubjectAssignmentModel.semester_id == semester_id)
        if academic_year_id:
            filters.append(SubjectAssignmentModel.academic_year_id == academic_year_id)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        assignments = query.offset(skip).limit(limit).all()
        
        return SubjectAssignmentListResponse(
            items=[
                SubjectAssignmentResponse(
                    id=assignment.id,
                    subject_id=assignment.subject_id,
                    teacher_id=assignment.teacher_id,
                    class_id=None,
                    semester_id=assignment.semester_id,
                    academic_year=assignment.academic_year,
                    created_at=assignment.created_at
                )
                for assignment in assignments
            ],
            total=total,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list subject assignments: {str(e)}"
        )


@router.post("", response_model=SubjectAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_subject_assignment(
    request: SubjectAssignmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new subject assignment
    
    - **subject_id**: Subject ID
    - **teacher_id**: Teacher ID
    - **class_id**: Class ID
    - **semester_id**: Semester ID
    - **academic_year**: Academic year
    """
    # Get semester to derive academic year if not provided
    from src.infrastructure.database.models import SemesterModel, AcademicYearModel
    semester = db.query(SemesterModel).filter(SemesterModel.id == request.semester_id).first()
    if not semester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Semester with ID {request.semester_id} not found"
        )
    
    # Get academic year ID from request
    academic_year_id = request.academic_year_id
    academic_year_value = None
    
    # Fetch academic year value
    academic_year_obj = db.query(AcademicYearModel).filter(
        AcademicYearModel.id == academic_year_id
    ).first()
    
    if academic_year_obj:
        academic_year_value = academic_year_obj.start_year
    else:
        # Fallback to semester's academic year if provided ID is invalid (though DTO validation ensures it's > 0)
        # Or raise error. Let's try to find it via semester.
        if semester.academic_year_id:
             academic_year_id = semester.academic_year_id
             ay = db.query(AcademicYearModel).filter(AcademicYearModel.id == academic_year_id).first()
             if ay:
                 academic_year_value = ay.start_year
        
        if not academic_year_value:
             # Fallback to current
             current_ay = db.query(AcademicYearModel).filter(AcademicYearModel.is_current == True).first()
             if current_ay:
                 academic_year_id = current_ay.id
                 academic_year_value = current_ay.start_year
             else:
                 raise HTTPException(
                     status_code=status.HTTP_400_BAD_REQUEST,
                     detail="Invalid Academic Year ID and no active academic year found."
                 )

    # Check if assignment already exists (unique constraint: subject + semester + teacher)
    # Note: class_id is optional, so we don't include it in the uniqueness check
    existing = db.query(SubjectAssignmentModel).filter(
        and_(
            SubjectAssignmentModel.subject_id == request.subject_id,
            SubjectAssignmentModel.teacher_id == request.teacher_id,
            SubjectAssignmentModel.semester_id == request.semester_id
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subject assignment already exists for this subject, teacher, and semester"
        )
    
    # Validate teacher is not over-assigned (check for conflicts)
    # Use the academic_year_id we determined above
    if academic_year_id:
        # Check if teacher already has assignments in same academic year + semester
        conflicting_count = db.query(SubjectAssignmentModel).filter(
            and_(
                SubjectAssignmentModel.teacher_id == request.teacher_id,
                SubjectAssignmentModel.semester_id == request.semester_id
            )
        ).count()
        
        # Warn if teacher has too many assignments (optional: can be configured)
        if conflicting_count >= 5:  # Configurable limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Teacher already has {conflicting_count} assignments in this semester. Maximum recommended: 5"
            )
    
    # Verify teacher exists and get teacher profile
    teacher = db.query(TeacherModel).filter(TeacherModel.id == request.teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {request.teacher_id} not found"
        )
    
    # Create assignment
    # Note: class_id is optional (deprecated). If not provided, it can be derived from semester.batch_instance_id if needed
    try:
        assignment = SubjectAssignmentModel(
            subject_id=request.subject_id,
            teacher_id=request.teacher_id,
            semester_id=request.semester_id,
            academic_year=academic_year_value,
            academic_year_id=academic_year_id
        )
        
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        
        return SubjectAssignmentResponse(
            id=assignment.id,
            subject_id=assignment.subject_id,
            teacher_id=assignment.teacher_id,
            class_id=None,
            semester_id=assignment.semester_id,
            academic_year=assignment.academic_year,
            created_at=assignment.created_at
        )
    except Exception as e:
        db.rollback()
        from sqlalchemy.exc import IntegrityError
        if isinstance(e, IntegrityError):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subject assignment already exists or violates database constraints"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subject assignment: {str(e)}"
        )


@router.get("/exam/{exam_id}", response_model=SubjectAssignmentResponse)
async def get_subject_assignment_by_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get subject assignment for an exam
    
    - **exam_id**: Exam ID
    """
    from ...infrastructure.database.models import ExamModel
    
    try:
        exam = db.query(ExamModel).filter(ExamModel.id == exam_id).first()
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exam with ID {exam_id} not found"
            )
        
        assignment = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == exam.subject_assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject assignment for exam {exam_id} not found"
            )
        
        return SubjectAssignmentResponse(
            id=assignment.id,
            subject_id=assignment.subject_id,
            teacher_id=assignment.teacher_id,
            class_id=None,
            semester_id=assignment.semester_id,
            academic_year=assignment.academic_year,
            created_at=assignment.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subject assignment for exam: {str(e)}"
        )

