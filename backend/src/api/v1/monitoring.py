"""
Comprehensive System Monitoring API
Health checks, performance monitoring, and system diagnostics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging
import psutil
import os
from datetime import datetime, timedelta
import time

from src.infrastructure.database.session import get_db, get_database_performance_stats, log_performance_report
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.config import settings
from src.infrastructure.backup.backup_service import get_backup_service
from src.application.services.audit_service import get_audit_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/database/stats", response_model=Dict[str, Any])
async def get_database_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get database performance statistics

    Requires admin privileges
    """
    # Check if user has admin privileges (you may want to implement proper role checking)
    if not current_user or current_user.username not in ['admin']:  # TODO: Implement proper admin check
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        stats = get_database_performance_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database statistics")


@router.post("/database/log-report")
async def trigger_performance_report(
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Trigger a performance report log

    Requires admin privileges
    """
    # Check if user has admin privileges
    if not current_user or current_user.username not in ['admin']:  # TODO: Implement proper admin check
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        log_performance_report()
        return {"message": "Performance report logged successfully"}
    except Exception as e:
        logger.error(f"Error logging performance report: {e}")
        raise HTTPException(status_code=500, detail="Failed to log performance report")


@router.get("/health")
async def comprehensive_health_check(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Comprehensive system health check

    Returns overall system health status
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }

    # Database health
    try:
        from sqlalchemy import text
        start_time = time.time()
        result = db.execute(text("SELECT 1 as health_check")).fetchone()
        db_response_time = time.time() - start_time

        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_seconds": round(db_response_time, 3),
            "connection": "ok"
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "unhealthy"

    # Redis health (if available)
    try:
        from src.infrastructure.cache.redis_client import get_cache_service
        cache_service = get_cache_service()
        if cache_service.is_enabled:
            redis_health = await cache_service.health_check()
            health_status["checks"]["redis"] = redis_health
            if not redis_health.get("healthy", True):
                health_status["status"] = "degraded"
        else:
            health_status["checks"]["redis"] = {
                "status": "disabled",
                "message": "Redis caching is disabled"
            }
    except Exception as e:
        health_status["checks"]["redis"] = {
            "status": "error",
            "error": str(e)
        }
        health_status["status"] = "degraded"

    # System resources
    try:
        system_health = get_system_health()
        health_status["checks"]["system"] = system_health
        if system_health["status"] == "critical":
            health_status["status"] = "unhealthy"
        elif system_health["status"] == "warning" and health_status["status"] == "healthy":
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["system"] = {
            "status": "error",
            "error": str(e)
        }

    # Backup status
    try:
        backup_service = get_backup_service()
        backups = backup_service.list_backups()
        recent_backups = [b for b in backups if b["type"] == "full"]

        if recent_backups:
            last_backup = recent_backups[0]
            backup_age_hours = (datetime.utcnow() - datetime.fromisoformat(last_backup["timestamp"])).total_seconds() / 3600

            health_status["checks"]["backup"] = {
                "status": "healthy" if backup_age_hours < 48 else "warning",
                "last_backup": last_backup["timestamp"],
                "backup_age_hours": round(backup_age_hours, 1),
                "total_backups": len(backups)
            }
        else:
            health_status["checks"]["backup"] = {
                "status": "warning",
                "message": "No backups found"
            }
    except Exception as e:
        health_status["checks"]["backup"] = {
            "status": "error",
            "error": str(e)
        }

    return health_status


@router.get("/health/database")
async def database_health_check(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Detailed database health check

    Returns connection status and performance metrics
    """
    try:
        from sqlalchemy import text

        # Connection test
        start_time = time.time()
        result = db.execute(text("SELECT 1 as health_check")).fetchone()
        connection_time = time.time() - start_time

        # Get database size
        db_size_query = text("""
            SELECT
                pg_size_pretty(pg_database_size(current_database())) as size,
                pg_database_size(current_database()) as size_bytes
        """)

        try:
            size_result = db.execute(db_size_query).fetchone()
            db_size = size_result[0] if size_result else "Unknown"
            db_size_bytes = size_result[1] if size_result else 0
        except Exception:
            db_size = "Unknown"
            db_size_bytes = 0

        # Get active connections
        connections_query = text("""
            SELECT count(*) as active_connections
            FROM pg_stat_activity
            WHERE state = 'active'
        """)

        try:
            connections_result = db.execute(connections_query).fetchone()
            active_connections = connections_result[0] if connections_result else 0
        except Exception:
            active_connections = 0

        # Get table counts
        table_counts = {}
        try:
            tables_query = text("""
                SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
                FROM pg_stat_user_tables
                ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
                LIMIT 10
            """)
            table_stats = db.execute(tables_query).fetchall()
            table_counts = {
                f"{row[0]}.{row[1]}": {
                    "inserts": row[2],
                    "updates": row[3],
                    "deletes": row[4]
                }
                for row in table_stats
            }
        except Exception:
            pass

        return {
            "status": "healthy",
            "database_connection": "ok",
            "connection_time_seconds": round(connection_time, 3),
            "database_size": db_size,
            "database_size_bytes": db_size_bytes,
            "active_connections": active_connections,
            "top_tables_activity": table_counts,
            "query_test": result[0] if result else None
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "database_connection": "failed",
            "error": str(e)
        }


@router.get("/health/system")
async def system_health_check() -> Dict[str, Any]:
    """
    System resource health check

    Returns CPU, memory, disk usage and other system metrics
    """
    try:
        return get_system_health()
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/metrics")
async def get_system_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive system metrics

    Requires admin privileges
    """
    # Check admin access
    if not current_user or current_user.username not in ['admin']:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # System metrics
        system_metrics = get_detailed_system_metrics()

        # Database metrics
        db_metrics = get_database_performance_stats()

        # Application metrics
        app_metrics = await get_application_metrics(db)

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": system_metrics,
            "database": db_metrics,
            "application": app_metrics
        }

    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.get("/alerts")
async def get_system_alerts(
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get system alerts and warnings

    Requires admin privileges
    """
    # Check admin access
    if not current_user or current_user.username not in ['admin']:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        alerts = []
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Check for recent security events
        audit_service = get_audit_service(db)
        security_events = audit_service.get_audit_trail(
            action="security_%",
            start_date=cutoff_time
        )

        for event in security_events:
            if "rate_limit" in event["action"] or "blocked" in event["action"]:
                alerts.append({
                    "type": "security",
                    "severity": event["details"].get("severity", "warning"),
                    "message": f"Security event: {event['action']}",
                    "timestamp": event["created_at"],
                    "details": event["details"]
                })

        # Check system health
        system_health = get_system_health()
        if system_health["status"] in ["warning", "critical"]:
            alerts.append({
                "type": "system",
                "severity": system_health["status"],
                "message": "System resource usage is high",
                "timestamp": datetime.utcnow().isoformat(),
                "details": system_health
            })

        # Check backup status
        backup_service = get_backup_service()
        backups = backup_service.list_backups()
        recent_backups = [b for b in backups if b["type"] == "full"]

        if not recent_backups:
            alerts.append({
                "type": "backup",
                "severity": "critical",
                "message": "No recent full backups found",
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            last_backup = recent_backups[0]
            backup_age = datetime.utcnow() - datetime.fromisoformat(last_backup["timestamp"])
            if backup_age.days > 7:
                alerts.append({
                    "type": "backup",
                    "severity": "warning",
                    "message": f"Last backup is {backup_age.days} days old",
                    "timestamp": last_backup["timestamp"]
                })

        return alerts

    except Exception as e:
        logger.error(f"Failed to get system alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")


def get_system_health() -> Dict[str, Any]:
    """Get basic system health metrics"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)

        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent

        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent

        # Determine overall status
        if cpu_percent > 90 or memory_percent > 90 or disk_percent > 95:
            status = "critical"
        elif cpu_percent > 80 or memory_percent > 80 or disk_percent > 90:
            status = "warning"
        else:
            status = "healthy"

        return {
            "status": status,
            "cpu_usage_percent": cpu_percent,
            "memory_usage_percent": memory_percent,
            "memory_used_gb": round(memory.used / (1024**3), 2),
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "disk_usage_percent": disk_percent,
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


def get_detailed_system_metrics() -> Dict[str, Any]:
    """Get detailed system metrics"""
    try:
        return {
            "cpu": {
                "percent": psutil.cpu_percent(interval=1),
                "count": psutil.cpu_count(),
                "count_logical": psutil.cpu_count(logical=True),
                "freq_current": psutil.cpu_freq().current if psutil.cpu_freq() else None,
                "freq_max": psutil.cpu_freq().max if psutil.cpu_freq() else None
            },
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent,
                "used": psutil.virtual_memory().used,
                "free": psutil.virtual_memory().free
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "used": psutil.disk_usage('/').used,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            },
            "network": {
                "bytes_sent": psutil.net_io_counters().bytes_sent,
                "bytes_recv": psutil.net_io_counters().bytes_recv,
                "packets_sent": psutil.net_io_counters().packets_sent,
                "packets_recv": psutil.net_io_counters().packets_recv
            },
            "process": {
                "pid": os.getpid(),
                "cpu_percent": psutil.Process().cpu_percent(),
                "memory_percent": psutil.Process().memory_percent(),
                "memory_info": psutil.Process().memory_info()._asdict(),
                "num_threads": psutil.Process().num_threads(),
                "num_fds": psutil.Process().num_fds() if hasattr(psutil.Process(), 'num_fds') else None
            }
        }

    except Exception as e:
        return {"error": str(e)}


async def get_application_metrics(db: Session) -> Dict[str, Any]:
    """Get application-specific metrics"""
    try:
        metrics = {
            "uptime": "Unknown",  # Would need to track application start time
            "active_users_24h": 0,
            "total_users": 0,
            "total_students": 0,
            "total_exams": 0,
            "audit_events_24h": 0
        }

        # Get user counts
        from sqlalchemy import text

        try:
            user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
            metrics["total_users"] = user_count or 0
        except Exception:
            pass

        try:
            student_count = db.execute(text("SELECT COUNT(*) FROM students")).scalar()
            metrics["total_students"] = student_count or 0
        except Exception:
            pass

        try:
            exam_count = db.execute(text("SELECT COUNT(*) FROM exams")).scalar()
            metrics["total_exams"] = exam_count or 0
        except Exception:
            pass

        # Get recent audit events
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            audit_count = db.execute(
                text("SELECT COUNT(*) FROM audit_logs WHERE created_at > :cutoff"),
                {"cutoff": cutoff_time}
            ).scalar()
            metrics["audit_events_24h"] = audit_count or 0
        except Exception:
            pass

        return metrics

    except Exception as e:
        return {"error": str(e)}