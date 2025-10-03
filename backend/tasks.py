from celery import shared_task
from database import SessionLocal
from reports import generate_report, generate_student_performance_report, generate_co_po_report, generate_teacher_performance_report, generate_class_analysis_report, generate_nba_compliance_report, generate_department_summary_report
from schemas import ReportGenerateRequest
import json
from datetime import datetime
from s3_utils import upload_report_to_s3, generate_presigned_url
from typing import Optional

@shared_task
def generate_async_report(report_type: str, filters: dict, format_type: str = 'pdf'):
    """
    Async task for generating reports to avoid blocking the main API.
    """
    db = SessionLocal()
    try:
        if report_type == 'student_performance':
            report_data = generate_student_performance_report(db, filters, format_type)
        elif report_type == 'co_po':
            report_data = generate_co_po_report(db, filters, format_type)
        elif report_type == 'teacher_performance':
            report_data = generate_teacher_performance_report(db, filters, format_type)
        elif report_type == 'class_analysis':
            report_data = generate_class_analysis_report(db, filters, format_type)
        elif report_type == 'nba_compliance':
            report_data = generate_nba_compliance_report(db, filters, format_type)
        elif report_type == 'department_summary':
            report_data = generate_department_summary_report(db, filters, format_type)
        else:
            report_data = generate_report(db, report_type, filters, format_type)
        
        # Upload to S3
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        s3_url = upload_report_to_s3(report_data, report_type, timestamp, format_type)
        presigned_url = generate_presigned_url(f"reports/{report_type}/{timestamp}.{format_type}")
        
        return {
            'status': 'completed',
            'report_type': report_type,
            'format': format_type,
            's3_url': s3_url,
            'download_url': presigned_url
        }
    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e)
        }
    finally:
        db.close()

@shared_task
def perform_advanced_analytics(student_id: int, subject_id: Optional[int] = None):
    """
    Async task for advanced analytics calculations.
    """
    from advanced_analytics import get_advanced_student_analytics
    db = SessionLocal()
    try:
        analytics = get_advanced_student_analytics(db, student_id, subject_id)
        return {
            'status': 'completed',
            'analytics': analytics
        }
    except Exception as e:
        return {
            'status': 'failed',
            'error': str(e)
        }
    finally:
        db.close()