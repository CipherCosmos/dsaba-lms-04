"""
Backup API Endpoints
Database backup and recovery operations
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pathlib import Path

from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.infrastructure.database.session import get_db
from src.infrastructure.backup.backup_service import get_backup_service

router = APIRouter(
    prefix="/backup",
    tags=["Backup"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
    }
)

logger = logging.getLogger(__name__)


@router.post("/full")
async def create_full_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a full database backup

    Requires admin privileges
    """
    # Only Admin can create backups
    if current_user.role.value not in ['admin', 'principal']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Principal can create database backups"
        )

    try:
        backup_service = get_backup_service()

        # Run backup in background for large databases
        background_tasks.add_task(
            _create_backup_task,
            backup_service,
            "full",
            db,
            current_user.id
        )

        return {
            "message": "Full backup initiated. Check status with GET /backup/status",
            "backup_type": "full",
            "initiated_by": current_user.id,
            "status": "running"
        }

    except Exception as e:
        logger.error(f"Failed to initiate full backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate backup: {str(e)}"
        )


@router.post("/incremental")
async def create_incremental_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create an incremental database backup

    Requires admin privileges
    """
    # Only Admin can create backups
    if current_user.role.value not in ['admin', 'principal']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Principal can create database backups"
        )

    try:
        backup_service = get_backup_service()

        # Run backup in background
        background_tasks.add_task(
            _create_backup_task,
            backup_service,
            "incremental",
            db,
            current_user.id
        )

        return {
            "message": "Incremental backup initiated. Check status with GET /backup/status",
            "backup_type": "incremental",
            "initiated_by": current_user.id,
            "status": "running"
        }

    except Exception as e:
        logger.error(f"Failed to initiate incremental backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate backup: {str(e)}"
        )


@router.get("/")
async def list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    List all available backups

    Requires admin privileges
    """
    # Only Admin and Principal can view backups
    if current_user.role.value not in ['admin', 'principal']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Principal can view backup information"
        )

    try:
        backup_service = get_backup_service()
        backups = backup_service.list_backups()

        return backups

    except Exception as e:
        logger.error(f"Failed to list backups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )


@router.post("/restore/{backup_id}")
async def restore_backup(
    backup_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Restore database from backup

    Requires admin privileges
    WARNING: This will overwrite current database data
    """
    # Only Admin can restore backups
    if current_user.role.value != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can restore database backups"
        )

    try:
        backup_service = get_backup_service()

        # Verify backup exists
        backups = backup_service.list_backups()
        backup_exists = any(b["backup_id"] == backup_id for b in backups)

        if not backup_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backup {backup_id} not found"
            )

        # Run restore in background
        background_tasks.add_task(
            _restore_backup_task,
            backup_service,
            backup_id,
            db,
            current_user.id
        )

        return {
            "message": f"Database restore initiated from backup {backup_id}. This may take several minutes.",
            "backup_id": backup_id,
            "initiated_by": current_user.id,
            "status": "running",
            "warning": "Current database will be backed up before restore"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to initiate restore: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate restore: {str(e)}"
        )


@router.delete("/cleanup")
async def cleanup_old_backups(
    retention_days: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clean up old backups beyond retention period

    Requires admin privileges
    """
    # Only Admin can cleanup backups
    if current_user.role.value != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can cleanup backups"
        )

    try:
        from src.config import settings

        retention = retention_days or settings.BACKUP_RETENTION_DAYS
        backup_service = get_backup_service()

        result = backup_service.cleanup_old_backups(retention)

        return {
            "message": f"Cleaned up {len(result['deleted_backups'])} old backups",
            "deleted_backups": result['deleted_backups'],
            "space_freed_bytes": result['total_space_freed'],
            "retention_days": retention
        }

    except Exception as e:
        logger.error(f"Failed to cleanup backups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup backups: {str(e)}"
        )


@router.get("/status")
async def get_backup_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get backup system status

    Requires admin privileges
    """
    # Only Admin and Principal can view backup status
    if current_user.role.value not in ['admin', 'principal']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Principal can view backup status"
        )

    try:
        import os
        from pathlib import Path
        from src.config import settings

        backup_service = get_backup_service()
        backups = backup_service.list_backups()

        # Calculate storage usage
        backup_dir = Path(settings.BACKUP_DIR)
        total_size = 0
        if backup_dir.exists():
            for backup in backups:
                total_size += backup.get("size", 0)

        # Get backup statistics
        full_backups = [b for b in backups if b["type"] == "full"]
        incremental_backups = [b for b in backups if b["type"] == "incremental"]

        return {
            "total_backups": len(backups),
            "full_backups": len(full_backups),
            "incremental_backups": len(incremental_backups),
            "total_size_bytes": total_size,
            "backup_directory": str(backup_dir),
            "retention_days": settings.BACKUP_RETENTION_DAYS,
            "schedule_enabled": settings.BACKUP_SCHEDULE_ENABLED,
            "last_full_backup": full_backups[0] if full_backups else None,
            "storage_available": self._get_available_space(backup_dir) if backup_dir.exists() else None
        }

    except Exception as e:
        logger.error(f"Failed to get backup status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup status: {str(e)}"
        )


def _create_backup_task(backup_service, backup_type: str, db: Session, user_id: int):
    """Background task to create backup"""
    try:
        logger.info(f"Starting background {backup_type} backup task")

        if backup_type == "full":
            result = backup_service.create_full_backup(db, user_id)
        elif backup_type == "incremental":
            result = backup_service.create_incremental_backup(db, user_id)
        else:
            raise ValueError(f"Unknown backup type: {backup_type}")

        logger.info(f"Background {backup_type} backup completed: {result['backup_id']}")

    except Exception as e:
        logger.error(f"Background {backup_type} backup failed: {e}")


def _restore_backup_task(backup_service, backup_id: str, db: Session, user_id: int):
    """Background task to restore backup"""
    try:
        logger.warning(f"Starting background restore task for backup: {backup_id}")

        result = backup_service.restore_backup(backup_id, db, user_id)

        logger.info(f"Background restore completed: {backup_id}")

    except Exception as e:
        logger.error(f"Background restore failed for {backup_id}: {e}")


def _get_available_space(path: Path) -> Optional[int]:
    """Get available disk space in bytes"""
    try:
        stat = os.statvfs(path)
        return stat.f_bavail * stat.f_frsize
    except Exception:
        return None