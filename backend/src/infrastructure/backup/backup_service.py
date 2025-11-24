"""
Backup Service
Handles database backups and recovery procedures
"""

import os
import logging
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import json
import gzip
import shutil

from sqlalchemy.orm import Session
from sqlalchemy import text

from src.config import settings
from src.infrastructure.database.session import get_db
from src.application.services.audit_service import get_audit_service

logger = logging.getLogger(__name__)


class BackupService:
    """Service for managing database backups and recovery"""

    def __init__(self):
        self.backup_dir = Path(settings.BACKUP_DIR) if hasattr(settings, 'BACKUP_DIR') else Path("backups")
        self.backup_dir.mkdir(exist_ok=True)

        # Ensure backup directory has proper permissions
        self.backup_dir.chmod(0o755)

    def create_full_backup(self, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Create a full database backup

        Args:
            db: Database session
            user_id: ID of user initiating backup

        Returns:
            Backup metadata
        """
        timestamp = datetime.utcnow()
        backup_id = f"full_{timestamp.strftime('%Y%m%d_%H%M%S')}"

        try:
            logger.info(f"Starting full database backup: {backup_id}")

            # Create backup directory
            backup_path = self.backup_dir / backup_id
            backup_path.mkdir(exist_ok=True)

            # Backup metadata
            metadata = {
                "backup_id": backup_id,
                "type": "full",
                "timestamp": timestamp.isoformat(),
                "user_id": user_id,
                "database_url": self._mask_database_url(str(settings.DATABASE_URL)),
                "version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT
            }

            # Save metadata
            with open(backup_path / "metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)

            # Create PostgreSQL dump if using PostgreSQL
            if "postgresql" in str(settings.DATABASE_URL):
                success = self._create_postgres_backup(backup_path, backup_id)
            else:
                # For other databases, use SQLAlchemy reflection
                success = self._create_sql_backup(db, backup_path, backup_id)

            if success:
                # Compress backup
                self._compress_backup(backup_path, backup_id)

                # Log successful backup
                audit_service = get_audit_service(db)
                audit_service.log_system_event(
                    action="backup_created",
                    user_id=user_id,
                    resource="database",
                    details={
                        "backup_id": backup_id,
                        "backup_type": "full",
                        "backup_path": str(backup_path),
                        "compressed_size": self._get_directory_size(backup_path)
                    }
                )

                logger.info(f"Full database backup completed: {backup_id}")
                return {
                    "success": True,
                    "backup_id": backup_id,
                    "path": str(backup_path),
                    "size": self._get_directory_size(backup_path),
                    "timestamp": timestamp.isoformat()
                }
            else:
                raise Exception("Backup creation failed")

        except Exception as e:
            logger.error(f"Full backup failed: {e}")

            # Log failed backup
            try:
                audit_service = get_audit_service(db)
                audit_service.log_system_event(
                    action="backup_failed",
                    user_id=user_id,
                    resource="database",
                    details={
                        "backup_id": backup_id,
                        "error": str(e),
                        "backup_type": "full"
                    }
                )
            except Exception:
                pass

            # Cleanup failed backup
            if backup_path.exists():
                shutil.rmtree(backup_path)

            raise

    def create_incremental_backup(self, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Create an incremental backup (changes since last backup)

        Args:
            db: Database session
            user_id: ID of user initiating backup

        Returns:
            Backup metadata
        """
        timestamp = datetime.utcnow()
        backup_id = f"incr_{timestamp.strftime('%Y%m%d_%H%M%S')}"

        try:
            logger.info(f"Starting incremental database backup: {backup_id}")

            # Find last full backup
            last_full_backup = self._find_last_full_backup()
            if not last_full_backup:
                logger.info("No previous full backup found, creating full backup instead")
                return self.create_full_backup(db, user_id)

            # Create backup directory
            backup_path = self.backup_dir / backup_id
            backup_path.mkdir(exist_ok=True)

            # Get changes since last backup
            changes = self._get_changes_since_backup(db, last_full_backup)

            metadata = {
                "backup_id": backup_id,
                "type": "incremental",
                "timestamp": timestamp.isoformat(),
                "user_id": user_id,
                "base_backup": last_full_backup,
                "changes_count": len(changes),
                "database_url": self._mask_database_url(str(settings.DATABASE_URL)),
                "version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT
            }

            # Save metadata
            with open(backup_path / "metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)

            # Save changes
            with open(backup_path / "changes.json", 'w') as f:
                json.dump(changes, f, indent=2)

            # Compress backup
            self._compress_backup(backup_path, backup_id)

            # Log successful backup
            audit_service = get_audit_service(db)
            audit_service.log_system_event(
                action="backup_created",
                user_id=user_id,
                resource="database",
                details={
                    "backup_id": backup_id,
                    "backup_type": "incremental",
                    "base_backup": last_full_backup,
                    "changes_count": len(changes),
                    "backup_path": str(backup_path)
                }
            )

            logger.info(f"Incremental database backup completed: {backup_id}")
            return {
                "success": True,
                "backup_id": backup_id,
                "path": str(backup_path),
                "changes_count": len(changes),
                "timestamp": timestamp.isoformat()
            }

        except Exception as e:
            logger.error(f"Incremental backup failed: {e}")
            raise

    def restore_backup(self, backup_id: str, db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Restore database from backup

        Args:
            backup_id: ID of backup to restore
            db: Database session
            user_id: ID of user initiating restore

        Returns:
            Restore result
        """
        try:
            logger.warning(f"Starting database restore from backup: {backup_id}")

            backup_path = self.backup_dir / backup_id
            if not backup_path.exists():
                raise FileNotFoundError(f"Backup {backup_id} not found")

            # Load metadata
            with open(backup_path / "metadata.json", 'r') as f:
                metadata = json.load(f)

            # Create pre-restore backup
            pre_restore_backup = self.create_full_backup(db, user_id)
            logger.info(f"Created pre-restore backup: {pre_restore_backup['backup_id']}")

            # Perform restore based on backup type
            if metadata["type"] == "full":
                success = self._restore_full_backup(backup_path, db)
            elif metadata["type"] == "incremental":
                success = self._restore_incremental_backup(backup_path, db)
            else:
                raise ValueError(f"Unknown backup type: {metadata['type']}")

            if success:
                # Log successful restore
                audit_service = get_audit_service(db)
                audit_service.log_system_event(
                    action="backup_restored",
                    user_id=user_id,
                    resource="database",
                    details={
                        "backup_id": backup_id,
                        "backup_type": metadata["type"],
                        "pre_restore_backup": pre_restore_backup["backup_id"],
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )

                logger.info(f"Database restore completed from backup: {backup_id}")
                return {
                    "success": True,
                    "backup_id": backup_id,
                    "pre_restore_backup": pre_restore_backup["backup_id"],
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                raise Exception("Restore failed")

        except Exception as e:
            logger.error(f"Database restore failed: {e}")

            # Log failed restore
            try:
                audit_service = get_audit_service(db)
                audit_service.log_system_event(
                    action="restore_failed",
                    user_id=user_id,
                    resource="database",
                    details={
                        "backup_id": backup_id,
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
            except Exception:
                pass

            raise

    def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups"""
        backups = []

        for backup_dir in self.backup_dir.iterdir():
            if backup_dir.is_dir() and (backup_dir / "metadata.json").exists():
                try:
                    with open(backup_dir / "metadata.json", 'r') as f:
                        metadata = json.load(f)

                    backups.append({
                        "backup_id": metadata["backup_id"],
                        "type": metadata["type"],
                        "timestamp": metadata["timestamp"],
                        "user_id": metadata.get("user_id"),
                        "size": self._get_directory_size(backup_dir),
                        "path": str(backup_dir)
                    })
                except Exception as e:
                    logger.warning(f"Failed to read backup metadata for {backup_dir}: {e}")

        # Sort by timestamp descending
        backups.sort(key=lambda x: x["timestamp"], reverse=True)
        return backups

    def cleanup_old_backups(self, retention_days: int = 30) -> Dict[str, Any]:
        """
        Clean up backups older than retention period

        Args:
            retention_days: Number of days to retain backups

        Returns:
            Cleanup summary
        """
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        deleted_backups = []
        total_space_freed = 0

        for backup in self.list_backups():
            backup_date = datetime.fromisoformat(backup["timestamp"])

            if backup_date < cutoff_date:
                try:
                    backup_path = Path(backup["path"])
                    size = self._get_directory_size(backup_path)

                    shutil.rmtree(backup_path)
                    deleted_backups.append(backup["backup_id"])
                    total_space_freed += size

                    logger.info(f"Deleted old backup: {backup['backup_id']}")

                except Exception as e:
                    logger.error(f"Failed to delete backup {backup['backup_id']}: {e}")

        return {
            "deleted_backups": deleted_backups,
            "total_space_freed": total_space_freed,
            "retention_days": retention_days
        }

    def _create_postgres_backup(self, backup_path: Path, backup_id: str) -> bool:
        """Create PostgreSQL dump backup"""
        try:
            # Extract connection details from DATABASE_URL
            # This is a simplified version - in production, use proper URL parsing
            db_url = str(settings.DATABASE_URL)
            if "postgresql://" in db_url:
                # Use pg_dump for PostgreSQL
                dump_file = backup_path / f"{backup_id}.sql"

                # Build pg_dump command
                cmd = [
                    "pg_dump",
                    "--no-owner",
                    "--no-privileges",
                    "--clean",
                    "--if-exists",
                    "--dbname", db_url,
                    "--file", str(dump_file)
                ]

                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode == 0:
                    logger.info(f"PostgreSQL dump created: {dump_file}")
                    return True
                else:
                    logger.error(f"pg_dump failed: {result.stderr}")
                    return False
            else:
                return False

        except Exception as e:
            logger.error(f"PostgreSQL backup failed: {e}")
            return False

    def _create_sql_backup(self, db: Session, backup_path: Path, backup_id: str) -> bool:
        """Create SQL-based backup for other databases"""
        try:
            # Get all table names
            from sqlalchemy import inspect
            inspector = inspect(db.bind)

            tables = inspector.get_table_names()
            backup_data = {}

            for table in tables:
                # Get table data
                result = db.execute(text(f"SELECT * FROM {table}"))
                columns = result.keys()
                rows = result.fetchall()

                backup_data[table] = {
                    "columns": list(columns),
                    "rows": [list(row) for row in rows]
                }

            # Save backup data
            with open(backup_path / f"{backup_id}.json", 'w') as f:
                json.dump(backup_data, f, indent=2, default=str)

            return True

        except Exception as e:
            logger.error(f"SQL backup failed: {e}")
            return False

    def _restore_full_backup(self, backup_path: Path, db: Session) -> bool:
        """Restore from full backup"""
        try:
            # For PostgreSQL dumps
            dump_file = backup_path / f"{backup_path.name}.sql"
            if dump_file.exists():
                # Use psql to restore
                cmd = [
                    "psql",
                    "--dbname", str(settings.DATABASE_URL),
                    "--file", str(dump_file)
                ]

                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode == 0:
                    logger.info("PostgreSQL restore completed")
                    return True
                else:
                    logger.error(f"psql restore failed: {result.stderr}")
                    return False

            # For JSON backups
            json_file = backup_path / f"{backup_path.name}.json"
            if json_file.exists():
                with open(json_file, 'r') as f:
                    backup_data = json.load(f)

                # Restore each table
                for table, data in backup_data.items():
                    # Clear table
                    db.execute(text(f"DELETE FROM {table}"))

                    # Insert data
                    if data["rows"]:
                        columns = data["columns"]
                        placeholders = ", ".join(["?" for _ in columns])
                        columns_str = ", ".join(columns)

                        for row in data["rows"]:
                            values = tuple(row)
                            db.execute(text(f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"), values)

                db.commit()
                return True

            return False

        except Exception as e:
            logger.error(f"Full backup restore failed: {e}")
            db.rollback()
            return False

    def _restore_incremental_backup(self, backup_path: Path, db: Session) -> bool:
        """Restore from incremental backup"""
        try:
            # Load changes
            with open(backup_path / "changes.json", 'r') as f:
                changes = json.load(f)

            # Apply changes
            for change in changes:
                table = change["table"]
                operation = change["operation"]

                if operation == "INSERT":
                    columns = change["columns"]
                    values = change["values"]
                    columns_str = ", ".join(columns)
                    placeholders = ", ".join(["?" for _ in columns])

                    db.execute(text(f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})"), tuple(values))

                elif operation == "UPDATE":
                    set_clause = ", ".join([f"{col} = ?" for col in change["columns"]])
                    where_clause = " AND ".join([f"{col} = ?" for col in change["where_columns"]])

                    values = change["values"] + change["where_values"]
                    db.execute(text(f"UPDATE {table} SET {set_clause} WHERE {where_clause}"), tuple(values))

                elif operation == "DELETE":
                    where_clause = " AND ".join([f"{col} = ?" for col in change["where_columns"]])
                    db.execute(text(f"DELETE FROM {table} WHERE {where_clause}"), tuple(change["where_values"]))

            db.commit()
            return True

        except Exception as e:
            logger.error(f"Incremental backup restore failed: {e}")
            db.rollback()
            return False

    def _get_changes_since_backup(self, db: Session, last_backup_id: str) -> List[Dict[str, Any]]:
        """Get database changes since last backup (simplified version)"""
        # This is a simplified implementation
        # In production, you'd use database transaction logs or change tracking
        changes = []

        try:
            # Get audit logs since last backup
            from src.infrastructure.database.models import AuditLogModel

            # Find timestamp of last backup
            last_backup_metadata = self._load_backup_metadata(last_backup_id)
            last_backup_time = datetime.fromisoformat(last_backup_metadata["timestamp"])

            # Get audit logs since then
            audit_logs = db.query(AuditLogModel).filter(
                AuditLogModel.created_at > last_backup_time
            ).all()

            # Convert to changes (simplified)
            for log in audit_logs:
                changes.append({
                    "table": "audit_logs",
                    "operation": "INSERT",
                    "columns": ["user_id", "action", "resource", "resource_id", "details", "ip_address", "user_agent", "created_at"],
                    "values": [log.user_id, log.action, log.resource, log.resource_id, log.details, str(log.ip_address), log.user_agent, log.created_at]
                })

        except Exception as e:
            logger.warning(f"Failed to get changes since backup: {e}")

        return changes

    def _find_last_full_backup(self) -> Optional[str]:
        """Find the most recent full backup"""
        backups = self.list_backups()

        for backup in backups:
            if backup["type"] == "full":
                return backup["backup_id"]

        return None

    def _load_backup_metadata(self, backup_id: str) -> Dict[str, Any]:
        """Load backup metadata"""
        metadata_file = self.backup_dir / backup_id / "metadata.json"

        with open(metadata_file, 'r') as f:
            return json.load(f)

    def _compress_backup(self, backup_path: Path, backup_id: str) -> None:
        """Compress backup directory"""
        try:
            archive_path = self.backup_dir / f"{backup_id}.tar.gz"

            # Create compressed archive
            shutil.make_archive(
                str(archive_path.with_suffix("")),
                'gztar',
                backup_path
            )

            # Remove uncompressed directory
            shutil.rmtree(backup_path)

            logger.info(f"Backup compressed: {archive_path}")

        except Exception as e:
            logger.warning(f"Failed to compress backup {backup_id}: {e}")

    def _get_directory_size(self, path: Path) -> int:
        """Get total size of directory in bytes"""
        total_size = 0

        try:
            if path.is_file():
                return path.stat().st_size

            for file_path in path.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size

        except Exception:
            pass

        return total_size

    def _mask_database_url(self, url: str) -> str:
        """Mask sensitive information in database URL"""
        # Simple masking - replace password
        if "://" in url:
            protocol, rest = url.split("://", 1)
            if "@" in rest:
                # Has credentials
                credentials, host = rest.split("@", 1)
                if ":" in credentials:
                    user, _ = credentials.split(":", 1)
                    return f"{protocol}://{user}:***@{host}"
                else:
                    return f"{protocol}://***@{host}"

        return url


# Global backup service instance
backup_service = BackupService()


def get_backup_service() -> BackupService:
    """Get backup service instance"""
    return backup_service