"""
Report Generation Background Tasks
Celery tasks for async report generation
"""

from typing import Dict, Any, Optional
from celery import Task
from datetime import datetime

from src.infrastructure.queue.celery_app import celery_app
from src.application.services.reports_service import ReportsService
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.cache.redis_client import get_cache_service
from sqlalchemy.orm import Session


@celery_app.task(bind=True, name="generate_report_async")
def generate_report_async(
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
    import asyncio
    db = SessionLocal()
    try:
        # Get reports service with proper dependency injection
        from src.application.services.analytics.analytics_service import AnalyticsService
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
        
        # Update task state
        self.update_state(state="PROGRESS", meta={"progress": 10})

        # Pre-load frequently accessed data into cache for better performance
        cache_service = get_cache_service()
        if cache_service.is_enabled:
            # Cache warming for related data
            if filters.get("department_id"):
                dept_cache_key = cache_service.get_cache_key(
                    CACHE_KEYS["department"], department_id=filters["department_id"]
                )
                # Department data is likely already cached, but ensure it's fresh
                pass

        # Run async report generation with optimized data loading
        async def _generate():
            self.update_state(state="PROGRESS", meta={"progress": 25})

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
                raise ValueError(f"Unknown report type: {report_type}")

            self.update_state(state="PROGRESS", meta={"progress": 75})
            return report

        report = asyncio.run(_generate())
        
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
        db.rollback()
        # Update task state
        self.update_state(
            state="FAILURE",
            meta={"error": str(e)}
        )
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="publish_semester_async")
def publish_semester_async(
    self: Task,
    semester_id: int,
    user_id: int
) -> Dict[str, Any]:
    """
    Publish semester results asynchronously
    
    Args:
        semester_id: Semester ID to publish
        user_id: User ID who initiated the publish
    
    Returns:
        Publish result
    """
    db = SessionLocal()
    try:
        from src.infrastructure.database.models import (
            SemesterModel, FinalMarkModel, ExamModel, SubjectAssignmentModel,
            StudentModel, UserModel
        )
        from src.application.services.final_mark_service import FinalMarkService
        from src.application.services.analytics.analytics_service import AnalyticsService
        from src.application.services.pdf_generation_service import PDFGenerationService
        from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
        from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
        from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
        from src.infrastructure.database.repositories.user_repository_impl import UserRepository
        from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
        from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
        from src.infrastructure.cache.redis_client import get_cache_service
        
        # Get semester
        semester = db.query(SemesterModel).filter(SemesterModel.id == semester_id).first()
        if not semester:
            raise ValueError(f"Semester {semester_id} not found")
        
        # Initialize services
        final_mark_repo = FinalMarkRepository(db)
        mark_repo = MarkRepository(db)
        exam_repo = ExamRepository(db)
        user_repo = UserRepository(db)
        subject_repo = SubjectRepository(db)
        question_repo = QuestionRepository(db)
        cache_service = get_cache_service()
        
        final_mark_service = FinalMarkService(final_mark_repo, db)
        analytics_service = AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)
        pdf_service = PDFGenerationService(exam_repo, question_repo, final_mark_repo)
        
        # Import GradingService for SGPA/CGPA calculation
        from src.application.services.grading_service import GradingService
        grading_service = GradingService(final_mark_repo, subject_repo)
        
        # Get all final marks for this semester
        final_marks = db.query(FinalMarkModel).filter(
            FinalMarkModel.semester_id == semester_id
        ).all()
        
        # Get unique student IDs for SGPA/CGPA calculation
        student_ids = list(set([fm.student_id for fm in final_marks]))
        
        import asyncio
        
        results = []
        for final_mark in final_marks:
            try:
                # Calculate CO attainment for this subject
                assignment = db.query(SubjectAssignmentModel).filter(
                    SubjectAssignmentModel.id == final_mark.subject_assignment_id
                ).first()
                
                if assignment:
                    co_attainment = asyncio.run(analytics_service.calculate_co_attainment(
                        subject_id=assignment.subject_id
                    ))
                    final_mark.co_attainment = co_attainment.get("co_attainment", {}) if isinstance(co_attainment, dict) else {}
                
                # Generate PDF report card
                student = db.query(StudentModel).filter(StudentModel.id == final_mark.student_id).first()
                if student:
                    pdf_bytes = asyncio.run(pdf_service.generate_student_report_card_pdf(
                        student.id, semester_id
                    ))
                    # In production, upload to S3 here
                    # s3_url = upload_to_s3(pdf_bytes, f"report_cards/{student.id}_{semester_id}.pdf")
                
                # Publish final mark
                final_mark.is_published = True
                final_mark.published_at = datetime.utcnow()
                
                results.append({
                    "student_id": student.id if student else None,
                    "status": "published"
                })
            except Exception as e:
                results.append({
                    "student_id": final_mark.student_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        # Commit all final mark updates
        db.commit()
        
        # Calculate SGPA and CGPA for all students in this semester
        for student_id in student_ids:
            try:
                # Calculate and update SGPA for this semester
                asyncio.run(grading_service.update_sgpa_for_semester(
                    student_id=student_id,
                    semester_id=semester_id
                ))
                
                # Calculate and update CGPA (across all semesters)
                asyncio.run(grading_service.update_cgpa_for_student(
                    student_id=student_id
                ))
                
                db.commit()
            except Exception as e:
                # Log error but continue with other students
                results.append({
                    "student_id": student_id,
                    "status": "sgpa_cgpa_calc_failed",
                    "error": str(e)
                })
        
        # Send email notifications after SGPA/CGPA calculation
        for final_mark in final_marks:
            try:
                student = db.query(StudentModel).filter(StudentModel.id == final_mark.student_id).first()
                if student:
                    user = db.query(UserModel).filter(UserModel.id == student.user_id).first()
                    if user:
                        from src.infrastructure.queue.tasks.email_tasks import send_email
                        send_email.delay(
                            to_email=user.email,
                            subject=f"Semester {semester.semester_no} Results Published",
                            body=f"Your results for semester {semester.semester_no} have been published.",
                            html_body=f"<h2>Semester {semester.semester_no} Results Published</h2><p>Your results are now available.</p>"
                        )
            except Exception as e:
                # Log error but continue
                pass
        
        return {
            "status": "completed",
            "semester_id": semester_id,
            "published_at": datetime.utcnow().isoformat(),
            "results": results
        }
    
    except Exception as e:
        db.rollback()
        self.update_state(
            state="FAILURE",
            meta={"error": str(e)}
        )
        raise
    finally:
        db.close()


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

