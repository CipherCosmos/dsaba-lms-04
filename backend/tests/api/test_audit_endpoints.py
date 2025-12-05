
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from src.infrastructure.database.models import MarkAuditLogModel, AuditLogModel, UserModel, MarkModel, ExamModel, StudentModel
from src.domain.enums.user_role import UserRole
from tests.utils.auth_helpers import get_auth_headers

class TestAuditEndpoints:
    
    @pytest.fixture
    def audit_data(self, test_db_session: Session, teacher_user):
        """Create test data for audit logs"""
        # Create system audit log
        system_log = AuditLogModel(
            user_id=teacher_user.id,
            action="LOGIN",
            resource="AUTH",
            details={"ip": "127.0.0.1"},
            created_at=datetime.now()
        )
        test_db_session.add(system_log)
        
        test_db_session.commit()
        return {"user": teacher_user, "system_log": system_log}

    def test_get_system_audit_logs_admin(self, client: TestClient, admin_token, audit_data):
        """Test getting system audit logs as admin"""
        headers = get_auth_headers(admin_token)
        response = client.get("/api/v1/audit/system", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) > 0
        
    def test_get_system_audit_logs_unauthorized(self, client: TestClient, student_token):
        """Test getting system audit logs as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        response = client.get("/api/v1/audit/system", headers=headers)
        assert response.status_code == 403

    def test_get_mark_audit_logs_admin(self, client: TestClient, admin_token):
        """Test getting mark audit logs as admin"""
        headers = get_auth_headers(admin_token)
        # Even if empty, should return 200
        response = client.get("/api/v1/audit/marks", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    def test_get_mark_audit_logs_unauthorized(self, client: TestClient, student_token):
        """Test getting mark audit logs as student (unauthorized)"""
        headers = get_auth_headers(student_token)
        response = client.get("/api/v1/audit/marks", headers=headers)
        assert response.status_code == 403
