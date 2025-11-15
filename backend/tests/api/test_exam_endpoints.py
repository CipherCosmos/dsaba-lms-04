"""
Exam API Tests
Tests for exam management endpoints
"""

import pytest
from datetime import datetime, timedelta
from tests.utils.auth_helpers import get_auth_headers


class TestExamEndpoints:
    """Tests for exam API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_exam(self, client, teacher_token, subject_assignment):
        """Test creating an exam"""
        exam_data = {
            "subject_assignment_id": subject_assignment.id,
            "name": "Midterm Exam",
            "exam_type": "internal1",
            "exam_date": (datetime.utcnow() + timedelta(days=7)).date().isoformat(),
            "total_marks": 100.0,
            "duration_minutes": 120,
            "status": "draft"
        }
        
        response = client.post(
            "/api/v1/exams",
            headers=get_auth_headers(teacher_token),
            json=exam_data
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == "Midterm Exam"
        assert data["exam_type"] == "internal1"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_exams(self, client, teacher_token, exam):
        """Test getting list of exams"""
        response = client.get(
            "/api/v1/exams",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or "items" in data or "exams" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_exam_by_id(self, client, teacher_token, exam):
        """Test getting exam by ID"""
        response = client.get(
            f"/api/v1/exams/{exam.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == exam.id
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_update_exam(self, client, teacher_token, exam):
        """Test updating an exam"""
        update_data = {
            "name": "Updated Exam Name",
            "total_marks": 150.0
        }
        
        response = client.put(
            f"/api/v1/exams/{exam.id}",
            headers=get_auth_headers(teacher_token),
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Exam Name"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_delete_exam(self, client, teacher_token, exam):
        """Test deleting an exam"""
        response = client.delete(
            f"/api/v1/exams/{exam.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code in [200, 204]
        
        # Verify exam is deleted
        get_response = client.get(
            f"/api/v1/exams/{exam.id}",
            headers=get_auth_headers(teacher_token)
        )
        assert get_response.status_code == 404

