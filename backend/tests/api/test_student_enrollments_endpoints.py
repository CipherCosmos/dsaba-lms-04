"""
Student Enrollment API Tests
Tests for student enrollment endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers
from datetime import date

class TestStudentEnrollmentEndpoints:
    """Tests for student enrollment API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_enrollment(self, client, admin_token, student_user, semester, academic_year):
        """Test creating a student enrollment"""
        # Need student profile ID
        from src.infrastructure.database.models import StudentModel
        # We can't easily get the session here to query the ID.
        # But we know the student_user fixture creates a profile.
        # Let's assume we can get the student ID from the user ID via an endpoint or just assume it's created.
        # Actually, the create_enrollment endpoint takes student_id (profile ID), not user_id.
        # The student_user fixture returns the User model.
        # We need the StudentModel ID.
        
        # Let's use the /students endpoint to get the profile if we can, or just try to guess.
        # Better: create a student profile in this test so we have the ID.
        pass

    @pytest.fixture
    def student_profile(self, test_db_session, student_user, batch_instance, department):
        """Get or create student profile"""
        from src.infrastructure.database.models import StudentModel
        profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        return profile

    @pytest.mark.api
    @pytest.mark.integration
    def test_create_enrollment_flow(self, client, admin_token, student_profile, semester, academic_year):
        """Test creating a student enrollment"""
        response = client.post(
            "/api/v1/student-enrollments",
            headers=get_auth_headers(admin_token),
            json={
                "student_id": student_profile.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "roll_no": "CS2024001",
                "enrollment_date": str(date.today())
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["student_id"] == student_profile.id
        assert data["semester_id"] == semester.id
        assert data["roll_no"] == "CS2024001"
        assert data["is_active"] is True

    @pytest.mark.api
    @pytest.mark.integration
    def test_create_enrollment_unauthorized(self, client, student_token, student_profile, semester, academic_year):
        """Test creating enrollment without admin rights"""
        response = client.post(
            "/api/v1/student-enrollments",
            headers=get_auth_headers(student_token),
            json={
                "student_id": student_profile.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "roll_no": "CS2024001"
            }
        )
        
        assert response.status_code == 403

    @pytest.mark.api
    @pytest.mark.integration
    def test_list_enrollments(self, client, admin_token, student_profile, semester, academic_year):
        """Test listing enrollments"""
        # Create one first
        create_resp = client.post(
            "/api/v1/student-enrollments",
            headers=get_auth_headers(admin_token),
            json={
                "student_id": student_profile.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "roll_no": "CS2024002",
                "enrollment_date": str(date.today())
            }
        )
        assert create_resp.status_code == 201
        
        # List by student
        response = client.get(
            f"/api/v1/student-enrollments?student_id={student_profile.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        
        # List by semester
        response = client.get(
            f"/api/v1/student-enrollments?semester_id={semester.id}",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.api
    @pytest.mark.integration
    def test_promote_student(self, client, admin_token, student_profile, semester, academic_year, test_db_session, batch_instance, department):
        """Test promoting student"""
        # Create initial enrollment
        create_resp = client.post(
            "/api/v1/student-enrollments",
            headers=get_auth_headers(admin_token),
            json={
                "student_id": student_profile.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "roll_no": "CS2024003",
                "enrollment_date": str(date.today())
            }
        )
        print(f"Create response: {create_resp.status_code} {create_resp.text}")
        assert create_resp.status_code == 201
        enrollment_id = create_resp.json()["id"]
        
        # Create next semester
        from src.infrastructure.database.models import SemesterModel
        from datetime import timedelta
        next_semester = SemesterModel(
            batch_instance_id=batch_instance.id,
            semester_no=2,
            start_date=date.today() + timedelta(days=181),
            end_date=date.today() + timedelta(days=360),
            academic_year_id=academic_year.id,
            department_id=department.id
        )
        test_db_session.add(next_semester)
        test_db_session.commit()
        test_db_session.refresh(next_semester)
        
        # Promote
        response = client.post(
            f"/api/v1/student-enrollments/{enrollment_id}/promote?next_semester_id={next_semester.id}&promotion_type=regular",
            headers=get_auth_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        # Response is the NEW enrollment
        assert data["semester_id"] == next_semester.id
        assert data["promotion_status"] == "pending"
        
        # Verify old enrollment is updated
        old_enrollment_resp = client.get(
            f"/api/v1/student-enrollments/{enrollment_id}",
            headers=get_auth_headers(admin_token)
        )
        assert old_enrollment_resp.status_code == 200
        old_data = old_enrollment_resp.json()
        assert old_data["promotion_status"] == "promoted"
        assert old_data["next_semester_id"] == next_semester.id
        assert old_data["is_active"] is False
