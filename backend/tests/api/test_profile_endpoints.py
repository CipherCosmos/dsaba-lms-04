"""
Profile API Tests
Tests for profile endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers

class TestProfileEndpoints:
    """Tests for profile API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_my_profile_admin(self, client, admin_token, admin_user):
        """Test getting profile for admin"""
        response = client.get(
            "/api/v1/profile/me",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == admin_user.id
        assert data["username"] == admin_user.username
        assert "admin" in data["roles"]
        
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_my_profile_teacher(self, client, teacher_token, teacher_user):
        """Test getting profile for teacher"""
        response = client.get(
            "/api/v1/profile/me",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == teacher_user.id
        assert data["username"] == teacher_user.username
        assert "teacher" in data["roles"]
        # Verify teacher_id is present (it should be populated by the fixture)
        assert "teacher_id" in data
        assert data["teacher_id"] is not None
        
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_my_profile_student(self, client, student_token, student_user):
        """Test getting profile for student"""
        response = client.get(
            "/api/v1/profile/me",
            headers=get_auth_headers(student_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == student_user.id
        assert data["username"] == student_user.username
        assert "student" in data["roles"]
        # Verify student_id is present
        assert "student_id" in data
        assert data["student_id"] is not None

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_my_profile_unauthorized(self, client):
        """Test getting profile without token"""
        response = client.get("/api/v1/profile/me")
        assert response.status_code in [401, 403]
