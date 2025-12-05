
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from tests.utils.auth_helpers import get_auth_headers

class TestBackupEndpoints:
    
    @pytest.fixture
    def mock_backup_service(self):
        with patch("src.api.v1.backup.get_backup_service") as mock:
            service = MagicMock()
            mock.return_value = service
            yield service

    def test_create_full_backup_admin(self, client: TestClient, admin_token, mock_backup_service):
        """Test creating full backup as admin"""
        headers = get_auth_headers(admin_token)
        response = client.post("/api/v1/backup/full", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Full backup initiated. Check status with GET /backup/status"
        assert data["status"] == "running"

    def test_create_full_backup_unauthorized(self, client: TestClient, student_token):
        """Test creating full backup as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        response = client.post("/api/v1/backup/full", headers=headers)
        assert response.status_code == 403

    def test_list_backups_admin(self, client: TestClient, admin_token, mock_backup_service):
        """Test listing backups as admin"""
        mock_backup_service.list_backups.return_value = [
            {"backup_id": "backup_1", "type": "full", "created_at": "2024-01-01T00:00:00"}
        ]
        headers = get_auth_headers(admin_token)
        response = client.get("/api/v1/backup/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["backup_id"] == "backup_1"

    def test_get_backup_status_admin(self, client: TestClient, admin_token, mock_backup_service):
        """Test getting backup status as admin"""
        # Mock list_backups for status calculation
        mock_backup_service.list_backups.return_value = [
            {"backup_id": "backup_1", "type": "full", "size": 1024, "created_at": "2024-01-01T00:00:00"}
        ]
        
        # We need to patch os.statvfs and Path.exists inside the endpoint or service
        # But the endpoint imports them locally.
        # Let's try to patch them where they are used.
        # The endpoint uses:
        # from pathlib import Path
        # from src.config import settings
        # backup_dir = Path(settings.BACKUP_DIR)
        # if backup_dir.exists(): ...
        
        # Since we are mocking get_backup_service, the endpoint logic for status 
        # relies on list_backups from the service, but also does some local calculation.
        # We might encounter issues with Path(settings.BACKUP_DIR).exists() if the dir doesn't exist.
        
        headers = get_auth_headers(admin_token)
        with patch("src.api.v1.backup.Path") as mock_path:
            mock_path_obj = MagicMock()
            mock_path.return_value = mock_path_obj
            mock_path_obj.exists.return_value = True
            
            # Also patch _get_available_space if it's called on self? No, it's a method on the router class? 
            # Wait, the code showed `self._get_available_space(backup_dir)` but `_get_available_space` is a standalone function at the bottom.
            # And the endpoint calls `self._get_available_space`? 
            # Line 297: "storage_available": self._get_available_space(backup_dir) if backup_dir.exists() else None
            # But `get_backup_status` is a standalone async function, not a method of a class.
            # So `self` is not defined! This looks like a BUG in the source code.
            
            # Let's verify the source code again.
            
            response = client.get("/api/v1/backup/status", headers=headers)
            assert response.status_code == 200
