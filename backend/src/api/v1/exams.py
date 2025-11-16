"""
Exam Management API Endpoints
CRUD operations for exams
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.exam_service import ExamService
from src.application.dto.exam_dto import (
    ExamCreateRequest,
    ExamUpdateRequest,
    ExamResponse,
    ExamListResponse
)
from src.api.dependencies import (
    get_exam_repository,
    get_current_user
)
from src.domain.entities.user import User
from src.domain.enums.exam_type import ExamType, ExamStatus
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError,
    ValidationError
)
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import (
    ExamModel, SubjectAssignmentModel, StudentModel, UserModel, StudentEnrollmentModel, SemesterModel
)
from sqlalchemy.orm import Session
from fastapi.responses import Response


def get_exam_service(
    exam_repo: ExamRepository = Depends(get_exam_repository)
) -> ExamService:
    """Get exam service instance"""
    return ExamService(exam_repo)


# Create router
router = APIRouter(
    prefix="/exams",
    tags=["Exams"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    request: ExamCreateRequest,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new exam
    
    Requires teacher or admin permissions
    """
    try:
        exam_type = ExamType(request.exam_type)
        exam = await exam_service.create_exam(
            name=request.name,
            subject_assignment_id=request.subject_assignment_id,
            exam_type=exam_type,
            exam_date=request.exam_date,
            total_marks=request.total_marks,
            created_by=current_user.id,
            duration_minutes=request.duration_minutes,
            instructions=request.instructions,
            question_paper_url=str(request.question_paper_url) if request.question_paper_url else None
        )
        return ExamResponse(**exam.to_dict())
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
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error creating exam: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the exam: {str(e)}"
        )


@router.get("", response_model=ExamListResponse)
async def list_exams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    status: Optional[str] = Query(None, pattern="^(draft|active|locked|published)$"),
    exam_type: Optional[str] = Query(None, pattern="^(internal1|internal2|external)$"),
    subject_assignment_id: Optional[int] = Query(None, gt=0),
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    List exams with pagination and filtering
    """
    filters = {}
    if status:
        filters['status'] = ExamStatus(status)
    if exam_type:
        filters['exam_type'] = ExamType(exam_type)
    if subject_assignment_id:
        filters['subject_assignment_id'] = subject_assignment_id
    
    exams = await exam_service.list_exams(skip=skip, limit=limit, filters=filters)
    total = await exam_service.count_exams(filters=filters)
    
    return ExamListResponse(
        items=[ExamResponse(**exam.to_dict()) for exam in exams],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get exam by ID
    """
    try:
        exam = await exam_service.get_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    request: ExamUpdateRequest,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update exam information
    """
    try:
        exam = await exam_service.update_exam(
            exam_id=exam_id,
            name=request.name,
            exam_date=request.exam_date,
            total_marks=request.total_marks,
            duration_minutes=request.duration_minutes,
            instructions=request.instructions
        )
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exam_id}/activate", response_model=ExamResponse)
async def activate_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Activate exam (make it available for marks entry)
    """
    try:
        exam = await exam_service.activate_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exam_id}/lock", response_model=ExamResponse)
async def lock_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lock exam (prevent further marks entry)
    """
    try:
        exam = await exam_service.lock_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Publish exam (make results visible to students)
    """
    try:
        exam = await exam_service.publish_exam(exam_id)
        return ExamResponse(**exam.to_dict())
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{exam_id}/students")
async def get_exam_students(
    exam_id: int,
    db: Session = Depends(get_db),
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get students for an exam (for marks entry)
    
    Returns list of students enrolled in the class associated with the exam's subject assignment
    """
    try:
        # Get exam
        exam = await exam_service.get_exam(exam_id)
        
        # Get subject assignment
        assignment = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == exam.subject_assignment_id
        ).first()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject assignment for exam {exam_id} not found"
            )
        
        # Get semester from assignment
        semester_id = assignment.semester_id
        if not semester_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Semester not found for exam {exam_id}"
            )
        
        # Get students enrolled in this semester
        # Join StudentEnrollmentModel to get students, then join UserModel
        students = db.query(StudentModel).join(
            StudentEnrollmentModel, StudentModel.id == StudentEnrollmentModel.student_id
        ).join(
            UserModel, StudentModel.user_id == UserModel.id
        ).filter(
            StudentEnrollmentModel.semester_id == semester_id,
            StudentEnrollmentModel.is_active == True,
            UserModel.is_active == True
        ).distinct().all()
        
        # Format response
        student_list = []
        for student in students:
            user = db.query(UserModel).filter(UserModel.id == student.user_id).first()
            if user:
                student_list.append({
                    "id": student.id,
                    "user_id": student.user_id,
                    "roll_no": student.roll_no,
                    "batch_instance_id": student.batch_instance_id,
                    "semester_id": semester_id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "full_name": f"{user.first_name} {user.last_name}"
                })
        
        return {"students": student_list, "total": len(student_list)}
    except EntityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )


@router.get("/{exam_id}/paper")
async def get_exam_paper(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate question paper PDF (alias for /pdf/question-paper/{exam_id})
    
    - **exam_id**: Exam ID
    
    Returns PDF file
    """
    from src.application.services.pdf_generation_service import PDFGenerationService
    from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
    from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
    from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
    
    try:
        exam_repo = ExamRepository(db)
        question_repo = QuestionRepository(db)
        final_mark_repo = FinalMarkRepository(db)
        pdf_service = PDFGenerationService(exam_repo, question_repo, final_mark_repo)
        
        pdf_bytes = await pdf_service.generate_question_paper_pdf(exam_id)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="question_paper_{exam_id}.pdf"'}
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    exam_service: ExamService = Depends(get_exam_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete exam
    """
    deleted = await exam_service.delete_exam(exam_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with ID {exam_id} not found"
        )

