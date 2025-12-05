import pytest
from fastapi import status

class TestTeacherAnalyticsEndpoints:
    """Test cases for teacher analytics endpoints"""

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_teacher_dashboard(self, client, teacher_token, teacher_user, test_db_session):
        """Test getting teacher dashboard"""
        from src.infrastructure.database.models import TeacherModel
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()

        response = client.get(
            f"/api/v1/teacher-analytics/dashboard/{teacher_profile.id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "class_analytics" in data
        assert "at_risk_students" in data
        assert "overall_stats" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_class_performance(self, client, teacher_token, teacher_user, student_user, subject_assignment, test_db_session):
        """Test getting class performance"""
        # Ensure the assignment belongs to the teacher
        from src.infrastructure.database.models import TeacherModel
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()
        
        # Update assignment to belong to this teacher if not already
        if subject_assignment.teacher_id != teacher_profile.id:
            subject_assignment.teacher_id = teacher_profile.id
            test_db_session.commit()

        # Add some marks to get statistics
        from src.infrastructure.database.models import InternalMarkModel, StudentModel, ExamModel, QuestionModel
        from datetime import date
        
        # Get a student
        student = test_db_session.query(StudentModel).filter(StudentModel.user_id == student_user.id).first()
        
        # Enroll student in the semester
        from src.infrastructure.database.models import StudentEnrollmentModel
        enrollment = StudentEnrollmentModel(
            student_id=student.id,
            semester_id=subject_assignment.semester_id,
            academic_year_id=subject_assignment.academic_year_id if subject_assignment.academic_year_id else 1, # Fallback if not set
            roll_no=student.roll_no,
            enrollment_date=date(2023, 1, 1),
            is_active=True
        )
        test_db_session.add(enrollment)
        test_db_session.commit()
        if not student:
            # Should have been created by student_user fixture if used, but let's be safe
            pass 

        # Create an exam
        exam = ExamModel(
            name="Test Exam",
            subject_assignment_id=subject_assignment.id,
            exam_type="internal1",
            exam_date=date(2023, 1, 1),
            total_marks=50,
            status="published"
        )
        test_db_session.add(exam)
        test_db_session.commit()
        
        # Create a question
        question = QuestionModel(
            exam_id=exam.id,
            question_no="1",
            question_text="Test Question",
            section="A",
            marks_per_question=10
        )
        test_db_session.add(question)
        test_db_session.commit()

        # Add marks
        mark = InternalMarkModel(
            student_id=student.id,
            marks_obtained=8,
            max_marks=10,
            workflow_state="published",
            component_type="ia1",
            semester_id=subject_assignment.semester_id,
            subject_assignment_id=subject_assignment.id,
            academic_year_id=subject_assignment.academic_year_id if subject_assignment.academic_year_id else 1,
            entered_by=teacher_user.id
        )
        test_db_session.add(mark)
        test_db_session.commit()

        response = client.get(
            f"/api/v1/teacher-analytics/class-performance/{subject_assignment.id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "statistics" in data
        assert "average_percentage" in data["statistics"]
        assert "pass_percentage" in data["statistics"]

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_component_analysis(self, client, teacher_token, teacher_user, subject_assignment, test_db_session):
        """Test getting component analysis"""
        # Ensure the assignment belongs to the teacher
        from src.infrastructure.database.models import TeacherModel
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()
        
        if subject_assignment.teacher_id != teacher_profile.id:
            subject_assignment.teacher_id = teacher_profile.id
            test_db_session.commit()

        response = client.get(
            f"/api/v1/teacher-analytics/component-analysis/{subject_assignment.id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_at_risk_students(self, client, teacher_token, teacher_user, test_db_session):
        """Test getting at-risk students"""
        from src.infrastructure.database.models import TeacherModel
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()

        response = client.get(
            f"/api/v1/teacher-analytics/at-risk-students/{teacher_profile.id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "at_risk_students" in data
        assert isinstance(data["at_risk_students"], list)

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_teaching_stats(self, client, teacher_token, teacher_user, test_db_session):
        """Test getting teaching stats"""
        from src.infrastructure.database.models import TeacherModel
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()

        response = client.get(
            f"/api/v1/teacher-analytics/teaching-stats/{teacher_profile.id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_students" in data
        assert "total_classes" in data
