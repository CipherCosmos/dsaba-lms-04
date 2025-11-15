"""
Final Marks API Tests
Tests for final marks endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestFinalMarksEndpoints:
    """Tests for final marks API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_final_mark(self, client, teacher_token, student_user, subject_assignment, semester, test_db_session):
        """Test creating a final mark"""
        from src.infrastructure.database.models import StudentModel
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        response = client.post(
            "/api/v1/final-marks",
            headers=get_auth_headers(teacher_token),
            json={
                "student_id": student_profile.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "internal_1": 35.0,
                "internal_2": 38.0,
                "external": 55.0
            }
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "total" in data or "percentage" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_final_marks_by_student(self, client, teacher_token, student_user, test_db_session):
        """Test getting final marks for a student"""
        from src.infrastructure.database.models import StudentModel
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        # Need semester_id for this endpoint
        from src.infrastructure.database.models import SemesterModel
        semester = test_db_session.query(SemesterModel).first()
        
        if semester:
            response = client.get(
                f"/api/v1/final-marks/student/{student_profile.id}/semester/{semester.id}",
                headers=get_auth_headers(teacher_token)
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, dict) or "items" in data

