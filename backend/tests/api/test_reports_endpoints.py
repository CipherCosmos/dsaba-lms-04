"""
Reports API Tests
Tests for reports endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestReportsEndpoints:
    """Tests for reports API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_generate_student_report(self, client, teacher_token, student_user, test_db_session):
        """Test generating student report"""
        from src.infrastructure.database.models import StudentModel
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        response = client.get(
            f"/api/v1/reports/student/{student_profile.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code in [200, 201, 202]
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_generate_class_report(self, client, teacher_token, class_obj):
        """Test generating class report"""
        response = client.get(
            f"/api/v1/reports/class/{class_obj.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code in [200, 201, 202]

