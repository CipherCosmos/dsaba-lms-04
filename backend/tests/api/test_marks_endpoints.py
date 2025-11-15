"""
Marks API Tests
Tests for marks entry and management endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestMarksEndpoints:
    """Tests for marks API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_mark(self, client, teacher_token, exam, student_user, question, test_db_session):
        """Test creating a mark entry"""
        from src.infrastructure.database.models import StudentModel
        # Get student profile ID
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        mark_data = {
            "exam_id": exam.id,
            "student_id": student_profile.id,
            "question_id": question.id,
            "marks_obtained": 8.5
        }
        
        response = client.post(
            "/api/v1/marks",
            headers=get_auth_headers(teacher_token),
            json=mark_data
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["marks_obtained"] == 8.5
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_marks_by_exam(self, client, teacher_token, exam):
        """Test getting marks for an exam"""
        response = client.get(
            f"/api/v1/marks/exam/{exam.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or ("marks" in data and isinstance(data["marks"], list))
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_marks_by_student(self, client, teacher_token, exam, student_user, test_db_session):
        """Test getting marks for a student"""
        from src.infrastructure.database.models import StudentModel
        # Get student profile ID
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        response = client.get(
            f"/api/v1/marks/student/{student_profile.id}/exam/{exam.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_update_mark(self, client, teacher_token, mark):
        """Test updating a mark"""
        update_data = {
            "marks_obtained": 9.0
        }
        
        response = client.put(
            f"/api/v1/marks/{mark.id}",
            headers=get_auth_headers(teacher_token),
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["marks_obtained"] == 9.0
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_student_cannot_create_mark(self, client, student_token, exam, student_user, question, test_db_session):
        """Test student cannot create marks"""
        from src.infrastructure.database.models import StudentModel
        # Get student profile ID
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        mark_data = {
            "exam_id": exam.id,
            "student_id": student_profile.id,
            "question_id": question.id,  # Use valid question_id from fixture
            "marks_obtained": 10.0
        }
        
        response = client.post(
            "/api/v1/marks",
            headers=get_auth_headers(student_token),
            json=mark_data
        )
        
        assert response.status_code == 403

