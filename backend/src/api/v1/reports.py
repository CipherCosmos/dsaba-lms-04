"""
Reports API Endpoints
Report generation operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.reports_service import ReportsService
from src.application.services.analytics_service import AnalyticsService
from src.application.dto.reports_dto import (
    GenerateReportRequest,
    ReportResponse,
    ReportTypesListResponse,
    ReportTypeResponse
)
from src.api.dependencies import (
    get_current_user,
    get_mark_repository,
    get_exam_repository,
    get_user_repository
)
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from src.infrastructure.cache.redis_client import get_cache_service
from sqlalchemy.orm import Session


def get_reports_service(
    db: Session = Depends(get_db),
    mark_repo: MarkRepository = Depends(get_mark_repository),
    exam_repo: ExamRepository = Depends(get_exam_repository),
    user_repo: UserRepository = Depends(get_user_repository)
) -> ReportsService:
    """Get reports service instance"""
    subject_repo = SubjectRepository(db)
    cache_service = get_cache_service()
    analytics_service = AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)
    return ReportsService(db, analytics_service, cache_service)


# Create router
router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/types", response_model=ReportTypesListResponse)
async def get_report_types(
    reports_service: ReportsService = Depends(get_reports_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of available report types
    
    Returns all available report templates with their filters
    """
    report_types = await reports_service.get_available_report_types()
    return ReportTypesListResponse(
        report_types=[ReportTypeResponse(**rt) for rt in report_types]
    )


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: GenerateReportRequest,
    reports_service: ReportsService = Depends(get_reports_service),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a report
    
    - **report_type**: Type of report to generate
    - **format**: Output format (json, pdf, excel)
    - **filters**: Report-specific filters
    """
    try:
        filters = request.filters
        
        if request.report_type == "student_performance":
            if "student_id" not in filters:
                raise ValidationError("student_id is required", field="filters.student_id")
            report = await reports_service.generate_student_performance_report(
                student_id=filters["student_id"],
                subject_id=filters.get("subject_id"),
                format_type=request.format
            )
        elif request.report_type == "class_analysis":
            if "class_id" not in filters:
                raise ValidationError("class_id is required", field="filters.class_id")
            report = await reports_service.generate_class_analysis_report(
                class_id=filters["class_id"],
                subject_id=filters.get("subject_id"),
                format_type=request.format
            )
        elif request.report_type == "co_po_attainment":
            if "subject_id" not in filters:
                raise ValidationError("subject_id is required", field="filters.subject_id")
            report = await reports_service.generate_co_po_attainment_report(
                subject_id=filters["subject_id"],
                exam_type=filters.get("exam_type"),
                format_type=request.format
            )
        elif request.report_type == "teacher_performance":
            if "teacher_id" not in filters:
                raise ValidationError("teacher_id is required", field="filters.teacher_id")
            report = await reports_service.generate_teacher_performance_report(
                teacher_id=filters["teacher_id"],
                subject_id=filters.get("subject_id"),
                format_type=request.format
            )
        elif request.report_type == "department_summary":
            if "department_id" not in filters:
                raise ValidationError("department_id is required", field="filters.department_id")
            report = await reports_service.generate_department_summary_report(
                department_id=filters["department_id"],
                format_type=request.format
            )
        else:
            raise ValidationError(f"Unknown report type: {request.report_type}", field="report_type")
        
        return ReportResponse(**report)
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


@router.get("/student/{student_id}", response_model=ReportResponse)
async def generate_student_report(
    student_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    format: str = Query("json", pattern="^(json|pdf|excel)$"),
    reports_service: ReportsService = Depends(get_reports_service),
    current_user: User = Depends(get_current_user)
):
    """
    Generate student performance report
    
    - **student_id**: Student ID
    - **subject_id**: Optional subject filter
    - **format**: Output format (json, pdf, excel)
    """
    try:
        report = await reports_service.generate_student_performance_report(
            student_id=student_id,
            subject_id=subject_id,
            format_type=format
        )
        return ReportResponse(**report)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/class/{class_id}", response_model=ReportResponse)
async def generate_class_report(
    class_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    format: str = Query("json", pattern="^(json|pdf|excel)$"),
    reports_service: ReportsService = Depends(get_reports_service),
    current_user: User = Depends(get_current_user)
):
    """
    Generate class analysis report
    
    - **class_id**: Class ID
    - **subject_id**: Optional subject filter
    - **format**: Output format (json, pdf, excel)
    """
    try:
        report = await reports_service.generate_class_analysis_report(
            class_id=class_id,
            subject_id=subject_id,
            format_type=format
        )
        return ReportResponse(**report)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/co-po/{subject_id}", response_model=ReportResponse)
async def generate_co_po_report(
    subject_id: int,
    exam_type: Optional[str] = Query(None, pattern="^(internal1|internal2|external|all)$"),
    format: str = Query("json", pattern="^(json|pdf|excel)$"),
    reports_service: ReportsService = Depends(get_reports_service),
    current_user: User = Depends(get_current_user)
):
    """
    Generate CO/PO attainment report
    
    - **subject_id**: Subject ID
    - **exam_type**: Optional exam type filter
    - **format**: Output format (json, pdf, excel)
    """
    try:
        report = await reports_service.generate_co_po_attainment_report(
            subject_id=subject_id,
            exam_type=exam_type,
            format_type=format
        )
        return ReportResponse(**report)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

