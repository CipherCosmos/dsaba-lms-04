"""
Bulk Upload API Endpoints
Bulk upload operations for questions and marks
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import Response
from typing import Optional

from src.application.services.bulk_upload_service import BulkUploadService
from src.application.dto.bulk_upload_dto import BulkUploadResponse
from src.api.dependencies import get_current_user, get_exam_repository
from src.api.decorators import require_permission_dependency
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole, Permission
from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.session import get_db
from src.api.dependencies import get_user_repository
from sqlalchemy.orm import Session


def get_bulk_upload_service(
    db: Session = Depends(get_db),
    exam_repo: ExamRepository = Depends(get_exam_repository),
    user_repo: UserRepository = Depends(get_user_repository)
) -> BulkUploadService:
    """Get bulk upload service instance"""
    question_repo = QuestionRepository(db)
    mark_repo = MarkRepository(db)
    return BulkUploadService(question_repo, exam_repo, mark_repo, user_repo)


# Create router
router = APIRouter(
    prefix="/bulk-uploads",
    tags=["Bulk Uploads"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        422: {"description": "Validation Error"},
    }
)


@router.post("/questions/{exam_id}", response_model=BulkUploadResponse)
async def upload_questions(
    exam_id: int,
    file: UploadFile = File(..., description="Excel or CSV file with questions"),
    service: BulkUploadService = Depends(get_bulk_upload_service),
    current_user: User = Depends(require_permission_dependency(Permission.EXAM_CREATE))
):
    """
    Upload questions in bulk from Excel/CSV file
    
    **Required columns**: question_no, question_text, section, marks_per_question
    **Optional columns**: required_count, optional_count, blooms_level, difficulty
    
    - **exam_id**: Exam ID
    - **file**: Excel (.xlsx, .xls) or CSV file
    """
    try:
        result = await service.upload_questions_from_excel(exam_id, file)
        return BulkUploadResponse(**result)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post("/marks/{exam_id}", response_model=BulkUploadResponse)
async def upload_marks(
    exam_id: int,
    file: UploadFile = File(..., description="Excel or CSV file with marks"),
    service: BulkUploadService = Depends(get_bulk_upload_service),
    current_user: User = Depends(require_permission_dependency(Permission.MARKS_ENTER))
):
    """
    Upload marks in bulk from Excel/CSV file
    
    **Required columns**: student_id, question_no, marks_obtained
    **Optional columns**: sub_question_id
    
    - **exam_id**: Exam ID
    - **file**: Excel (.xlsx, .xls) or CSV file
    """
    try:
        result = await service.upload_marks_from_excel(exam_id, file)
        return BulkUploadResponse(**result)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/template/{upload_type}")
async def get_upload_template(
    upload_type: str,
    exam_id: Optional[int] = None,
    service: BulkUploadService = Depends(get_bulk_upload_service),
    current_user: User = Depends(get_current_user)
):
    """
    Download upload template file
    
    - **upload_type**: Type of upload ("questions" or "marks")
    - **exam_id**: Optional exam ID for exam-specific marks template
    
    Returns Excel template file
    """
    try:
        template_bytes = await service.get_upload_template(upload_type, exam_id=exam_id)
        
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if exam_id and upload_type == "marks":
            filename = f"marks_template_exam_{exam_id}.xlsx"
        else:
            filename = f"{upload_type}_upload_template.xlsx"
        
        return Response(
            content=template_bytes,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

