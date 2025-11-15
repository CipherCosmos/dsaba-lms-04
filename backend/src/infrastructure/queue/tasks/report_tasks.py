"""
Report Generation Background Tasks
Celery tasks for async report generation
"""

from typing import Dict, Any, Optional
from celery import Task
from datetime import datetime

from src.infrastructure.queue.celery_app import celery_app
from src.application.services.reports_service import ReportsService
from src.infrastructure.database.session import get_db
from src.infrastructure.cache.redis_client import get_cache_service
from sqlalchemy.orm import Session


@celery_app.task(bind=True, name="generate_report_async")
async def generate_report_async(
    self: Task,
    report_type: str,
    filters: Dict[str, Any],
    format_type: str = "pdf",
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generate report asynchronously
    
    Args:
        report_type: Type of report
        filters: Report filters
        format_type: Output format (pdf, excel, json)
        user_id: User ID requesting the report
    
    Returns:
        Report generation result
    """
    try:
        # Get database session
        db = next(get_db())
        
        # Get reports service with proper dependency injection
        from src.application.services.analytics_service import AnalyticsService
        from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
        from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
        from src.infrastructure.database.repositories.user_repository_impl import UserRepository
        from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
        from src.infrastructure.cache.redis_client import get_cache_service
        
        # Initialize repositories
        mark_repo = MarkRepository(db)
        exam_repo = ExamRepository(db)
        user_repo = UserRepository(db)
        subject_repo = SubjectRepository(db)
        
        # Initialize services with cache
        cache_service = get_cache_service()
        analytics_service = AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)
        reports_service = ReportsService(db, analytics_service, cache_service)
        
        # Generate report based on type
        if report_type == "student_performance":
            report = await reports_service.generate_student_performance_report(
                student_id=filters.get("student_id"),
                subject_id=filters.get("subject_id"),
                format_type=format_type
            )
        elif report_type == "class_analysis":
            report = await reports_service.generate_class_analysis_report(
                class_id=filters.get("class_id"),
                subject_id=filters.get("subject_id"),
                format_type=format_type
            )
        elif report_type == "co_po_attainment":
            report = await reports_service.generate_co_po_attainment_report(
                subject_id=filters.get("subject_id"),
                exam_type=filters.get("exam_type"),
                format_type=format_type
            )
        elif report_type == "teacher_performance":
            report = await reports_service.generate_teacher_performance_report(
                teacher_id=filters.get("teacher_id"),
                subject_id=filters.get("subject_id"),
                format_type=format_type
            )
        elif report_type == "department_summary":
            report = await reports_service.generate_department_summary_report(
                department_id=filters.get("department_id"),
                format_type=format_type
            )
        else:
            # Unknown report type
            raise ValueError(f"Unknown report type: {report_type}")
        
        # Store result (in production, would upload to S3)
        result = {
            "status": "completed",
            "report_type": report_type,
            "format": format_type,
            "generated_at": datetime.utcnow().isoformat(),
            "data": report
        }
        
        return result
        
    except Exception as e:
        # Update task state
        self.update_state(
            state="FAILURE",
            meta={"error": str(e)}
        )
        raise


@celery_app.task(name="cleanup_old_reports")
def cleanup_old_reports() -> Dict[str, Any]:
    """
    Cleanup old reports (older than 30 days)
    
    Returns:
        Cleanup result
    """
    try:
        # This would clean up old report files from storage
        # Implementation depends on storage backend (S3, local, etc.)
        return {
            "status": "completed",
            "cleaned_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }

