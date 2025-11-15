"""
Internal Marks API Endpoints Tests
Tests for internal marks workflow endpoints
"""

import pytest
from src.infrastructure.database.models import MarksWorkflowState, MarkComponentType


class TestInternalMarksEndpoints:
    """Tests for internal marks API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_internal_mark(self, client, teacher_token, student_user, subject_assignment, semester, academic_year):
        """Test creating an internal mark"""
        response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_user.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "component_type": "ia1",
                "marks_obtained": 85.0,
                "max_marks": 100.0,
                "notes": "Good performance"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["marks_obtained"] == 85.0
        assert data["workflow_state"] == MarksWorkflowState.DRAFT.value
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_submit_internal_mark(self, client, teacher_token, student_user, subject_assignment, semester, academic_year):
        """Test submitting an internal mark for approval"""
        # Create mark first
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_user.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "component_type": "ia1",
                "marks_obtained": 85.0,
                "max_marks": 100.0
            }
        )
        mark_id = create_response.json()["id"]
        
        # Submit mark
        response = client.post(
            f"/api/v1/internal-marks/{mark_id}/submit",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_state"] == MarksWorkflowState.SUBMITTED.value
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_approve_internal_mark(self, client, hod_token, teacher_token, student_user, subject_assignment, semester, academic_year):
        """Test approving an internal mark"""
        # Create and submit mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_user.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "component_type": "ia1",
                "marks_obtained": 85.0,
                "max_marks": 100.0
            }
        )
        mark_id = create_response.json()["id"]
        
        # Submit
        client.post(
            f"/api/v1/internal-marks/{mark_id}/submit",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        # Approve
        response = client.post(
            f"/api/v1/internal-marks/{mark_id}/approve",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_state"] == MarksWorkflowState.APPROVED.value
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_submitted_marks(self, client, hod_token, teacher_token, student_user, subject_assignment, semester, academic_year):
        """Test getting submitted marks for approval"""
        # Create and submit mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_user.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "component_type": "ia1",
                "marks_obtained": 85.0,
                "max_marks": 100.0
            }
        )
        mark_id = create_response.json()["id"]
        
        client.post(
            f"/api/v1/internal-marks/{mark_id}/submit",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        # Get submitted marks
        response = client.get(
            "/api/v1/internal-marks/submitted/list",
            headers={"Authorization": f"Bearer {hod_token}"},
            params={"skip": 0, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 0

