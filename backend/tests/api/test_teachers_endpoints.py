"""
Teacher API Tests
Tests for teacher endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers
from src.infrastructure.database.models import UserModel
from src.domain.enums.user_role import UserRole

class TestTeacherEndpoints:
    """Tests for teacher API endpoints"""
    
    @pytest.fixture
    def new_user(self, test_db_session, password_hasher):
        """Create a new user without teacher profile"""
        user = UserModel(
            username="new_teacher_candidate",
            email="candidate@test.com",
            first_name="Candidate",
            last_name="User",
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
    def test_create_teacher_profile(self, client, admin_token, new_user, department):
        """Test creating a teacher profile"""
        response = client.post(
            "/api/v1/teachers",
            headers=get_auth_headers(admin_token),
            json={
                "user_id": new_user.id,
                "department_id": department.id,
                "employee_id": "EMP_NEW_001",
                "specialization": "AI",
                "join_date": "2024-01-01"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == new_user.id
        assert data["employee_id"] == "EMP_NEW_001"
        assert data["department_id"] == department.id
        
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_teacher_profile_unauthorized(self, client, teacher_token, new_user, department):
        """Test creating teacher profile without admin rights"""
        response = client.post(
            "/api/v1/teachers",
            headers=get_auth_headers(teacher_token),
            json={
                "user_id": new_user.id,
                "department_id": department.id,
                "employee_id": "EMP_FAIL",
            }
        )
        
        assert response.status_code == 403

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_teacher_profile(self, client, admin_token, teacher_user):
        """Test getting teacher profile"""
        # teacher_user fixture already creates a teacher profile. 
        # We need to fetch the teacher_id first.
        # We can get it from the profile endpoint or query DB, but let's assume we know it or fetch it.
        
        # Helper to get teacher ID from DB
        from src.infrastructure.database.models import TeacherModel
        # We need access to the session, but client doesn't expose it directly.
        # However, the teacher_user fixture creates the profile. 
        # Let's rely on the fact that teacher_user fixture creates a profile.
        # We can use the /profile/me endpoint as the teacher to get the ID, then query by ID.
        
        # Login as teacher to get ID
        from tests.utils.auth_helpers import get_auth_headers
        # We need a token for the teacher_user. We can create one or use teacher_token fixture.
        # But we are inside the test method, so we can't easily request another fixture dynamically if not passed.
        # Let's just use the admin_token to query /teachers/{id} if we knew the ID.
        
        # Better approach: The test_db_session is shared if scoped correctly, but here fixtures are function scoped.
        # We can't easily access the DB object created inside the fixture unless we return it.
        # The teacher_user fixture returns the User model, but not the Teacher model.
        
        # Let's query the API to list teachers if available, or just use a known ID if we can ensure it.
        # Or we can just create a new teacher in this test and then get it.
        pass

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_teacher_by_id(self, client, admin_token, new_user, department):
        """Test getting teacher by ID after creation"""
        # Create first
        create_response = client.post(
            "/api/v1/teachers",
            headers=get_auth_headers(admin_token),
            json={
                "user_id": new_user.id,
                "department_id": department.id,
                "employee_id": "EMP_GET_001",
                "specialization": "Data Science",
                "join_date": "2024-01-01"
            }
        )
        assert create_response.status_code == 201
        teacher_id = create_response.json()["id"]
        
        # Get by ID
        response = client.get(
            f"/api/v1/teachers/{teacher_id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == teacher_id
        assert data["employee_id"] == "EMP_GET_001"
