"""
Analytics Background Tasks
Celery tasks for async analytics calculation
"""

from typing import Dict, Any, List
from datetime import datetime

from src.infrastructure.queue.celery_app import celery_app
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.cache.redis_client import get_cache_service
from src.shared.constants import CACHE_KEYS


@celery_app.task(name="calculate_nightly_analytics")
def calculate_nightly_analytics() -> Dict[str, Any]:
    """
    Calculate analytics for all departments/classes nightly
    Pre-computes analytics to improve response times
    
    Returns:
        Calculation result
    """
    import asyncio
    db = SessionLocal()
    try:
        cache_service = get_cache_service()
        
        # Get all departments
        from src.infrastructure.database.models import DepartmentModel
        departments = db.query(DepartmentModel).all()
        
        # Import analytics service and repositories
        from src.application.services.analytics_service import AnalyticsService
        from src.application.services.co_po_attainment_service import COPOAttainmentService
        from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
        from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
        from src.infrastructure.database.repositories.user_repository_impl import UserRepository
        from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
        
        # Initialize repositories
        mark_repo = MarkRepository(db)
        exam_repo = ExamRepository(db)
        user_repo = UserRepository(db)
        subject_repo = SubjectRepository(db)
        
        # Initialize analytics service with cache
        analytics_service = AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)

        # Initialize CO-PO attainment service
        co_po_service = COPOAttainmentService(db)
        
        async def _process_departments():
            results = []
            for dept in departments:
                try:
                    # Calculate HOD analytics for department
                    hod_analytics = await analytics_service.get_hod_analytics(
                        department_id=dept.id
                    )

                    # Cache the result
                    cache_key = cache_service.get_cache_key(
                        CACHE_KEYS["analytics"],
                        type="hod",
                        department_id=dept.id
                    )
                    await cache_service.set(cache_key, hod_analytics, ttl=3600)  # 1 hour

                    # Calculate and cache PO attainment for the department
                    try:
                        po_attainment = co_po_service.calculate_po_attainment(
                            department_id=dept.id
                        )

                        po_cache_key = cache_service.get_cache_key(
                            CACHE_KEYS["analytics"],
                            type="po_attainment",
                            department_id=dept.id
                        )
                        await cache_service.set(po_cache_key, po_attainment, ttl=3600)  # 1 hour

                        results.append({
                            "department_id": dept.id,
                            "status": "cached",
                            "analytics_keys": len(hod_analytics) if isinstance(hod_analytics, dict) else 0,
                            "po_attainment_cached": len(po_attainment) if isinstance(po_attainment, dict) else 0
                        })
                    except Exception as e:
                        results.append({
                            "department_id": dept.id,
                            "status": "hod_cached_po_failed",
                            "analytics_keys": len(hod_analytics) if isinstance(hod_analytics, dict) else 0,
                            "po_error": str(e)
                        })
                except Exception as e:
                    results.append({
                        "department_id": dept.id,
                        "status": "failed",
                        "error": str(e)
                    })
            return results
        
        results = asyncio.run(_process_departments())
        
        return {
            "status": "completed",
            "departments_processed": len(results),
            "processed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "failed",
            "error": str(e)
        }
    finally:
        db.close()


@celery_app.task(name="invalidate_analytics_cache")
def invalidate_analytics_cache(
    cache_pattern: str = "analytics:*"
) -> Dict[str, Any]:
    """
    Invalidate analytics cache

    Args:
        cache_pattern: Cache key pattern to invalidate

    Returns:
        Invalidation result
    """
    try:
        cache_service = get_cache_service()
        deleted_count = cache_service.delete_pattern(cache_pattern)

        return {
            "status": "completed",
            "keys_deleted": deleted_count,
            "pattern": cache_pattern
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


@celery_app.task(bind=True, name="cache_warming_task")
def cache_warming_task(self) -> Dict[str, Any]:
    """
    Warm up frequently accessed cache entries

    Returns:
        Cache warming result
    """
    import asyncio
    db = SessionLocal()
    try:
        cache_service = get_cache_service()

        # Get all departments for cache warming
        from src.infrastructure.database.models import DepartmentModel
        departments = db.query(DepartmentModel).all()

        # Initialize services
        from src.application.services.analytics_service import AnalyticsService
        from src.application.services.co_po_attainment_service import COPOAttainmentService
        from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
        from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
        from src.infrastructure.database.repositories.user_repository_impl import UserRepository
        from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository

        mark_repo = MarkRepository(db)
        exam_repo = ExamRepository(db)
        user_repo = UserRepository(db)
        subject_repo = SubjectRepository(db)

        analytics_service = AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)
        co_po_service = COPOAttainmentService(db)

        async def _warm_cache():
            warmed_keys = 0
            for i, dept in enumerate(departments):
                try:
                    # Update progress
                    self.update_state(
                        state="PROGRESS",
                        meta={"progress": (i / len(departments)) * 100}
                    )

                    # Warm analytics cache
                    hod_analytics = await analytics_service.get_hod_analytics(department_id=dept.id)
                    if hod_analytics:
                        cache_key = cache_service.get_cache_key(
                            CACHE_KEYS["analytics"], type="hod", department_id=dept.id
                        )
                        await cache_service.set(cache_key, hod_analytics, ttl=3600)
                        warmed_keys += 1

                    # Warm PO attainment cache
                    try:
                        po_attainment = co_po_service.calculate_po_attainment(department_id=dept.id)
                        if po_attainment:
                            po_cache_key = cache_service.get_cache_key(
                                CACHE_KEYS["analytics"], type="po_attainment", department_id=dept.id
                            )
                            await cache_service.set(po_cache_key, po_attainment, ttl=3600)
                            warmed_keys += 1
                    except Exception:
                        # PO attainment might fail for some departments
                        pass

                except Exception as e:
                    # Log but continue with other departments
                    pass

            return warmed_keys

        warmed_keys = asyncio.run(_warm_cache())

        return {
            "status": "completed",
            "keys_warmed": warmed_keys,
            "departments_processed": len(departments)
        }

    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
    finally:
        db.close()

