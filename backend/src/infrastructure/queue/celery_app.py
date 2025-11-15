"""
Celery Application Configuration
Background task processing infrastructure
"""

from celery import Celery
from celery.schedules import crontab

from src.config import settings


def create_celery_app() -> Celery:
    """
    Create and configure Celery application
    
    Returns:
        Configured Celery app
    """
    celery_app = Celery(
        "dsaba_lms",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
        include=[
            "src.infrastructure.queue.tasks.report_tasks",
            "src.infrastructure.queue.tasks.analytics_tasks",
            "src.infrastructure.queue.tasks.email_tasks",
        ],
        task_routes={
            "publish_semester_async": {"queue": "publishing"},
            "generate_report_async": {"queue": "reports"},
        }
    )
    
    # Celery configuration
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=30 * 60,  # 30 minutes
        task_soft_time_limit=25 * 60,  # 25 minutes
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        broker_connection_retry_on_startup=True,  # Fix deprecation warning
    )
    
    # Periodic tasks (beat schedule)
    celery_app.conf.beat_schedule = {
        "calculate-analytics-nightly": {
            "task": "src.infrastructure.queue.tasks.analytics_tasks.calculate_nightly_analytics",
            "schedule": crontab(hour=2, minute=0),  # 2 AM daily
        },
        "cleanup-old-reports": {
            "task": "src.infrastructure.queue.tasks.report_tasks.cleanup_old_reports",
            "schedule": crontab(hour=3, minute=0, day_of_week=0),  # 3 AM every Sunday
        },
    }
    
    return celery_app


# Create Celery app instance
celery_app = create_celery_app()


def get_celery_app() -> Celery:
    """Get Celery app instance"""
    return celery_app

