"""
Student API Endpoints
Student-specific endpoints for viewing marks and reports
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.infrastructure.database.session import get_db
from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
from src.application.services.final_mark_service import FinalMarkService
from src.application.dto.final_mark_dto import FinalMarkListResponse, FinalMarkResponse
from src.application.services.academic_structure_service import AcademicStructureService
from src.application.dto.academic_structure_dto import SemesterListResponse, SemesterResponse
from src.infrastructure.database.repositories.academic_structure_repository_impl import (
    BatchRepository,
    BatchYearRepository,
    SemesterRepository
)
from sqlalchemy.orm import Session


def get_final_mark_service(
    db: Session = Depends(get_db)
) -> FinalMarkService:
    """Get final mark service instance"""
    final_mark_repo = FinalMarkRepository(db)
    return FinalMarkService(final_mark_repo)


# Create router
router = APIRouter(
    prefix="/student",
    tags=["Student"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/marks/sem/{semester_id}")
async def get_student_marks_by_semester(
    semester_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    service: FinalMarkService = Depends(get_final_mark_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get student's marks for a semester (alias for /final-marks/student/{student_id}/semester/{semester_id})
    
    - **semester_id**: Semester ID
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    
    Returns final marks with CO-PO attainment data
    """
    from src.infrastructure.database.models import StudentModel
    
    # Get student profile for current user
    student = db.query(StudentModel).filter(
        StudentModel.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user"
        )
    
    # Get final marks
    final_marks = await service.get_final_marks_by_student_semester(
        student_id=student.id,
        semester_id=semester_id,
        skip=skip,
        limit=limit
    )
    
    items = [
        FinalMarkResponse(
            id=fm.id,
            student_id=fm.student_id,
            subject_assignment_id=fm.subject_assignment_id,
            semester_id=fm.semester_id,
            internal_1=float(fm.internal_1),
            internal_2=float(fm.internal_2),
            best_internal=float(fm.best_internal),
            external=float(fm.external),
            total=float(fm.total),
            percentage=float(fm.percentage),
            grade=fm.grade,
            sgpa=float(fm.sgpa) if fm.sgpa else None,
            cgpa=float(fm.cgpa) if fm.cgpa else None,
            co_attainment=fm.co_attainment,
            status=fm.status,
            is_published=fm.is_published,
            published_at=fm.published_at,
            editable_until=fm.editable_until,
            created_at=fm.created_at,
            updated_at=fm.updated_at
        )
        for fm in final_marks
    ]
    
    return FinalMarkListResponse(
        items=items,
        total=len(items),
        skip=skip,
        limit=limit
    )


@router.get("/semesters", response_model=SemesterListResponse)
async def get_student_semesters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get semesters for the current student (based on their batch_year)
    
    Returns all semesters for the student's batch year
    """
    from src.infrastructure.database.models import StudentModel
    
    # Get student profile for current user
    student = db.query(StudentModel).filter(
        StudentModel.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user"
        )
    
    if not student.batch_year_id:
        # Return empty list if student has no batch_year
        return SemesterListResponse(
            items=[],
            total=0,
            skip=skip,
            limit=limit
        )
    
    # Get academic structure service
    batch_repo = BatchRepository(db)
    batch_year_repo = BatchYearRepository(db)
    semester_repo = SemesterRepository(db)
    service = AcademicStructureService(batch_repo, batch_year_repo, semester_repo)
    
    # Get semesters for student's batch year
    semesters = await service.get_semesters_by_batch_year(student.batch_year_id)
    
    items = [SemesterResponse(**s.to_dict()) for s in semesters]
    
    return SemesterListResponse(
        items=items,
        total=len(items),
        skip=skip,
        limit=limit
    )


@router.get("/report/pdf")
async def get_student_report_pdf(
    semester_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get student report card PDF (alias for /pdf/report-card/student/{student_id}/semester/{semester_id})
    
    - **semester_id**: Semester ID
    
    Returns PDF file stream
    """
    from src.infrastructure.database.models import StudentModel
    from src.application.services.pdf_generation_service import PDFGenerationService
    from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
    from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
    from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
    from fastapi.responses import Response
    from src.domain.exceptions import EntityNotFoundError
    
    # Get student profile
    student = db.query(StudentModel).filter(
        StudentModel.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user"
        )
    
    # Generate PDF
    exam_repo = ExamRepository(db)
    question_repo = QuestionRepository(db)
    final_mark_repo = FinalMarkRepository(db)
    pdf_service = PDFGenerationService(exam_repo, question_repo, final_mark_repo)
    
    try:
        pdf_bytes = await pdf_service.generate_student_report_card_pdf(student.id, semester_id)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="report_card_{student.id}_sem{semester_id}.pdf"'}
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

