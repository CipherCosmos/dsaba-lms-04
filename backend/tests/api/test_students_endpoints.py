"""
Student API Tests
Tests for student endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers
from src.infrastructure.database.models import UserModel
from src.domain.enums.user_role import UserRole

class TestStudentEndpoints:
    """Tests for student API endpoints"""
    
    @pytest.fixture
    def new_user(self, test_db_session, password_hasher):
        """Create a new user without student profile"""
        user = UserModel(
            username="new_student_candidate",
            email="student_candidate@test.com",
            first_name="Candidate",
            last_name="Student",
            hashed_password=password_hasher.hash("password123"),
            is_active=True,
            email_verified=True
        )
        test_db_session.add(user)
        test_db_session.commit()
        test_db_session.refresh(user)
        return user

    @pytest.mark.api
    @pytest.mark.integration
    def test_create_student_profile(self, client, admin_token, new_user, batch_instance, department, academic_year):
        """Test creating a student profile"""
        response = client.post(
            "/api/v1/students",
            headers=get_auth_headers(admin_token),
            json={
                "user_id": new_user.id,
                "roll_no": "CS2024999",
                "batch_instance_id": batch_instance.id,
                "department_id": department.id,
                "academic_year_id": academic_year.id,
                "current_year_level": 1,
                "admission_date": "2024-08-01"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == new_user.id
        assert data["roll_no"] == "CS2024999"
        assert data["batch_instance_id"] == batch_instance.id
        
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_student_profile_unauthorized(self, client, student_token, new_user, batch_instance):
        """Test creating student profile without admin rights"""
        response = client.post(
            "/api/v1/students",
            headers=get_auth_headers(student_token),
            json={
                "user_id": new_user.id,
                "roll_no": "FAIL001",
                "batch_instance_id": batch_instance.id
            }
        )
        
        assert response.status_code == 403

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_student_semesters(self, client, student_token, student_user, semester):
        """Test getting semesters for current student"""
        # The student_user fixture already creates a student profile linked to a batch_instance
        # The semester fixture creates a semester linked to that batch_instance
        
        response = client.get(
            "/api/v1/students/semesters",
            headers=get_auth_headers(student_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any(item["id"] == semester.id for item in data["items"])
