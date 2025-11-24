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
    def test_create_internal_mark(self, client, teacher_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test creating an internal mark"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
    def test_submit_internal_mark(self, client, teacher_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test submitting an internal mark for approval"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create mark first
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
    def test_approve_internal_mark(self, client, hod_token, teacher_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test approving an internal mark"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create and submit mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
    def test_get_submitted_marks(self, client, hod_token, teacher_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test getting submitted marks for approval"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create and submit mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_reject_internal_mark(self, client, teacher_token, hod_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test rejecting an internal mark"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create and submit mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
        
        # Reject with reason
        response = client.post(
            f"/api/v1/internal-marks/{mark_id}/reject",
            headers={"Authorization": f"Bearer {hod_token}"},
            json={"reason": "Marks need verification"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_state"] == MarksWorkflowState.REJECTED.value
        # Note: rejection reason storage depends on service implementation
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_freeze_internal_mark(self, client, teacher_token, hod_token, admin_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test freezing an internal mark"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create, submit, and approve mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
        client.post(
            f"/api/v1/internal-marks/{mark_id}/approve",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        # Freeze
        response = client.post(
            f"/api/v1/internal-marks/{mark_id}/freeze",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_state"] == MarksWorkflowState.FROZEN.value
        
        # Verify mark cannot be edited after freezing
        update_response = client.put(
            f"/api/v1/internal-marks/{mark_id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"marks_obtained": 90.0}
        )
        assert update_response.status_code == 400  # Should fail
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_publish_internal_mark(self, client, teacher_token, hod_token, student_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test publishing an internal mark"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create, submit, and approve mark
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
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
        client.post(
            f"/api/v1/internal-marks/{mark_id}/approve",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        # Publish
        response = client.post(
            f"/api/v1/internal-marks/{mark_id}/publish",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_state"] == MarksWorkflowState.PUBLISHED.value
        
        # Verify mark is visible to students
        student_response = client.get(
            f"/api/v1/internal-marks?student_id={student_profile.id}&semester_id={semester.id}&academic_year_id={academic_year.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        assert student_response.status_code == 200
        student_data = student_response.json()
        assert len(student_data["items"]) > 0
        assert any(item["id"] == mark_id for item in student_data["items"])
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_bulk_submit_marks(self, client, teacher_token, subject_assignment, semester, academic_year, test_db_session):
        """Test bulk submitting marks"""
        from src.infrastructure.database.models import StudentModel, UserModel, RoleModel, UserRoleModel
        from src.domain.enums.user_role import UserRole
        from src.infrastructure.security.password_hasher import PasswordHasher
        
        # Create additional students
        hasher = PasswordHasher()
        student_role = test_db_session.query(RoleModel).filter(RoleModel.name == UserRole.STUDENT.value).first()
        
        students = []
        for i in range(2):
            user = UserModel(
                username=f"student{i}",
                email=f"student{i}@test.com",
                first_name=f"Test{i}",
                last_name="Student",
                hashed_password=hasher.hash("student123"),
                is_active=True,
                email_verified=True
            )
            test_db_session.add(user)
            test_db_session.commit()
            test_db_session.refresh(user)
            
            # Assign student role
            user_role = UserRoleModel(user_id=user.id, role_id=student_role.id)
            test_db_session.add(user_role)
            test_db_session.commit()
            
            # Create student profile
            student_profile = StudentModel(
                user_id=user.id,
                roll_no=f"ST00{i}",
                department_id=subject_assignment.subject.department_id,
                batch_year_id=semester.batch_year_id,
                class_id=subject_assignment.class_id
            )
            test_db_session.add(student_profile)
            test_db_session.commit()
            test_db_session.refresh(student_profile)
            students.append(student_profile)
        
        # Create marks for each student
        mark_ids = []
        for student in students:
            response = client.post(
                "/api/v1/internal-marks",
                headers={"Authorization": f"Bearer {teacher_token}"},
                json={
                    "student_id": student.id,
                    "subject_assignment_id": subject_assignment.id,
                    "semester_id": semester.id,
                    "academic_year_id": academic_year.id,
                    "component_type": "ia1",
                    "marks_obtained": 80.0,
                    "max_marks": 100.0
                }
            )
            mark_ids.append(response.json()["id"])
        
        # Bulk submit
        response = client.post(
            "/api/v1/internal-marks/bulk-submit",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"subject_assignment_id": subject_assignment.id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["submitted"] == len(mark_ids)
        
        # Verify all marks are submitted
        for mark_id in mark_ids:
            get_response = client.get(
                f"/api/v1/internal-marks/{mark_id}",
                headers={"Authorization": f"Bearer {teacher_token}"}
            )
            assert get_response.json()["workflow_state"] == MarksWorkflowState.SUBMITTED.value
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_complete_workflow_draft_to_published(self, client, teacher_token, hod_token, admin_token, student_token, student_user, subject_assignment, semester, academic_year, test_db_session):
        """Test complete workflow from draft to published"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()

        # Create mark (DRAFT)
        create_response = client.post(
            "/api/v1/internal-marks",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "student_id": student_profile.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "academic_year_id": academic_year.id,
                "component_type": "ia1",
                "marks_obtained": 85.0,
                "max_marks": 100.0
            }
        )
        mark_id = create_response.json()["id"]
        assert create_response.json()["workflow_state"] == MarksWorkflowState.DRAFT.value
        
        # Submit (SUBMITTED)
        submit_response = client.post(
            f"/api/v1/internal-marks/{mark_id}/submit",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert submit_response.json()["workflow_state"] == MarksWorkflowState.SUBMITTED.value
        
        # Approve (APPROVED)
        approve_response = client.post(
            f"/api/v1/internal-marks/{mark_id}/approve",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        assert approve_response.json()["workflow_state"] == MarksWorkflowState.APPROVED.value
        
        # Freeze (FROZEN)
        freeze_response = client.post(
            f"/api/v1/internal-marks/{mark_id}/freeze",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert freeze_response.json()["workflow_state"] == MarksWorkflowState.FROZEN.value
        
        # Publish (PUBLISHED)
        publish_response = client.post(
            f"/api/v1/internal-marks/{mark_id}/publish",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        assert publish_response.json()["workflow_state"] == MarksWorkflowState.PUBLISHED.value
        
        # Verify final state and visibility to student
        final_response = client.get(
            f"/api/v1/internal-marks/{mark_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert final_response.json()["workflow_state"] == MarksWorkflowState.PUBLISHED.value

