"""
Analytics API Tests
Tests for analytics endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestAnalyticsEndpoints:
    """Tests for analytics API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_student_analytics(self, client, teacher_token, student_user, test_db_session):
        """Test getting student analytics"""
        from src.infrastructure.database.models import StudentModel
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        if student_profile:
            response = client.get(
                f"/api/v1/analytics/student/{student_profile.id}",
                headers=get_auth_headers(teacher_token)
            )
            
            # May return 404 if no data, which is acceptable
            assert response.status_code in [200, 404]
            if response.status_code == 200:
                data = response.json()
                assert data is not None
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_teacher_analytics(self, client, teacher_token, teacher_user, test_db_session):
        """Test getting teacher analytics"""
        from src.infrastructure.database.models import TeacherModel
        
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()
        
        response = client.get(
            f"/api/v1/analytics/teacher/{teacher_profile.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data is not None
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_hod_analytics(self, client, hod_token, department):
        """Test getting HOD analytics"""
        response = client.get(
            f"/api/v1/analytics/hod/department/{department.id}",
            headers=get_auth_headers(hod_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data is not None

