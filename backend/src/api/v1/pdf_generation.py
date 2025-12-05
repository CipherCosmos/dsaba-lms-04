"""
PDF Generation API Endpoints
PDF generation for question papers, report cards, and reports
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from typing import Optional

from src.application.services.pdf_generation_service import PDFGenerationService
from src.api.dependencies import get_current_user, get_exam_repository
from src.api.decorators import require_permission_dependency
from src.domain.entities.user import User
from src.domain.enums.user_role import Permission
from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session


def get_pdf_service(
    db: Session = Depends(get_db),
    exam_repo: ExamRepository = Depends(get_exam_repository)
) -> PDFGenerationService:
    """Get PDF generation service instance"""
    question_repo = QuestionRepository(db)
    final_mark_repo = FinalMarkRepository(db)
    return PDFGenerationService(exam_repo, question_repo, final_mark_repo)


# Create router
router = APIRouter(
    prefix="/pdf",
    tags=["PDF Generation"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/question-paper/{exam_id}")
async def generate_question_paper_pdf(
    exam_id: int,
    service: PDFGenerationService = Depends(get_pdf_service),
    current_user: User = Depends(require_permission_dependency(Permission.EXAM_READ))
):
    """
    Generate question paper PDF
    
    - **exam_id**: Exam ID
    
    Returns PDF file
    """
    try:
        pdf_bytes = await service.generate_question_paper_pdf(exam_id)
        
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


@router.get("/report-card/student/{student_id}/semester/{semester_id}")
async def generate_student_report_card_pdf(
    student_id: int,
    semester_id: int,
    service: PDFGenerationService = Depends(get_pdf_service),
    current_user: User = Depends(get_current_user)
):
    """
    Generate student report card PDF
    
    - **student_id**: Student ID
    - **semester_id**: Semester ID
    
    Returns PDF file
    
    Note: Students can only access their own report cards
    """
    try:
        # Check if student is accessing their own report card
        if current_user.role.value == "student":
            if current_user.id != student_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Students can only access their own report cards"
                )
        
        pdf_bytes = await service.generate_student_report_card_pdf(student_id, semester_id)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="report_card_{student_id}_sem{semester_id}.pdf"'}
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/co-po-report/subject/{subject_id}")
async def generate_co_po_report_pdf(
    subject_id: int,
    service: PDFGenerationService = Depends(get_pdf_service),
    current_user: User = Depends(require_permission_dependency(Permission.REPORT_EXPORT))
):
    """
    Generate CO-PO attainment report PDF
    
    - **subject_id**: Subject ID
    
    Returns PDF file
    
    Note: Requires analytics data - would need to call analytics service first
    """
    try:
        # Get CO attainment data from analytics service
        from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
        from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
        from src.infrastructure.database.repositories.user_repository_impl import UserRepository
        from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
        from src.infrastructure.database.session import get_db
        from src.infrastructure.cache.redis_client import get_cache_service
        from src.application.services.analytics import AnalyticsService
        
        # Use dependency injection for database session
        db_gen = get_db()
        db = next(db_gen)
        try:
            mark_repo = MarkRepository(db)
            exam_repo = ExamRepository(db)
            user_repo = UserRepository(db)
            subject_repo = SubjectRepository(db)
            cache_service = get_cache_service()
            analytics_service = AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)
            
            # Calculate CO attainment
            co_attainment_result = await analytics_service.calculate_co_attainment(
                subject_id=subject_id
            )
            
            # Structure data for PDF generation
            co_attainment_data = {
                "subject_id": subject_id,
                "co_attainment": co_attainment_result.get("co_attainment", {}) if isinstance(co_attainment_result, dict) else {}
            }
            
            pdf_bytes = await service.generate_co_po_report_pdf(subject_id, co_attainment_data)
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="co_po_report_{subject_id}.pdf"'}
            )
        finally:
            db.close()
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

