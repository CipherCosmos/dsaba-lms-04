"""
Subject Assignments API Router
Handles subject assignment endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from sqlalchemy.orm import Session

from ...infrastructure.database.session import get_db
from ...infrastructure.database.models import SubjectAssignmentModel
from ...application.dto.subject_assignment_dto import SubjectAssignmentResponse
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
        class_id=assignment.class_id,
        semester_id=assignment.semester_id,
        academic_year=assignment.academic_year,
        created_at=assignment.created_at
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
        class_id=assignment.class_id,
        semester_id=assignment.semester_id,
        academic_year=assignment.academic_year,
        created_at=assignment.created_at
    )

