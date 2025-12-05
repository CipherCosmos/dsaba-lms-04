
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from tests.utils.auth_helpers import get_auth_headers

class TestMonitoringEndpoints:
    
    @pytest.fixture
    def mock_db_stats(self):
        with patch("src.api.v1.monitoring.get_database_performance_stats") as mock:
            mock.return_value = {"active_connections": 5, "db_size": "10MB"}
            yield mock

    @pytest.fixture
    def mock_psutil(self):
        with patch("src.api.v1.monitoring.psutil") as mock:
            mock.cpu_percent.return_value = 50.0
            mock.virtual_memory.return_value.percent = 60.0
            mock.virtual_memory.return_value.used = 1024**3
            mock.virtual_memory.return_value.total = 2*1024**3
            mock.disk_usage.return_value.percent = 70.0
            mock.disk_usage.return_value.used = 10*1024**3
            mock.disk_usage.return_value.total = 100*1024**3
            yield mock

    def test_get_database_stats_admin(self, client: TestClient, admin_token, mock_db_stats):
        """Test getting database stats as admin"""
        headers = get_auth_headers(admin_token)
        response = client.get("/api/v1/monitoring/database/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["active_connections"] == 5

    def test_get_database_stats_unauthorized(self, client: TestClient, student_token):
        """Test getting database stats as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        response = client.get("/api/v1/monitoring/database/stats", headers=headers)
        assert response.status_code == 403

    def test_health_check(self, client: TestClient, mock_psutil):
        """Test health check endpoint"""
        # Mock DB execution for health check
        with patch("src.api.v1.monitoring.get_db") as mock_get_db:
             # This is harder to mock because get_db is a dependency that yields a session
             # But the test client uses override_get_db which uses test_db_session
             # So the session is already mocked/provided.
             # We just need to ensure the session.execute works.
             # The test_db_session fixture provides a real SQLAlchemy session connected to sqlite memory.
             # So simple queries like SELECT 1 should work.
             pass

        response = client.get("/api/v1/monitoring/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "checks" in data

    def test_get_metrics_admin(self, client: TestClient, admin_token, mock_db_stats, mock_psutil):
        """Test getting system metrics as admin"""
        headers = get_auth_headers(admin_token)
        response = client.get("/api/v1/monitoring/metrics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "system" in data
        assert "database" in data
        assert "application" in data

    def test_get_metrics_unauthorized(self, client: TestClient, student_token):
        """Test getting system metrics as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        response = client.get("/api/v1/monitoring/metrics", headers=headers)
        assert response.status_code == 403

    def test_get_alerts_admin(self, client: TestClient, admin_token, mock_psutil):
        """Test getting alerts as admin"""
        headers = get_auth_headers(admin_token)
        
        # Mock audit service and backup service
        with patch("src.api.v1.monitoring.get_audit_service") as mock_audit, \
             patch("src.api.v1.monitoring.get_backup_service") as mock_backup:
            
            mock_audit.return_value.get_audit_trail.return_value = []
            mock_backup.return_value.list_backups.return_value = []
            
            response = client.get("/api/v1/monitoring/alerts", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
