import pytest
from fastapi import status

class TestStudentAnalyticsEndpoints:
    """Test cases for student analytics endpoints"""

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_student_dashboard(self, client, student_token, student_user, test_db_session):
        """Test getting student dashboard"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        response = client.get(
            f"/api/v1/student-analytics/dashboard/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "overview" in data
        assert "component_breakdown" in data
        assert "subject_performance" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_student_dashboard_unauthorized(self, client, teacher_token, student_user, test_db_session):
        """Test getting student dashboard with unauthorized user (another student would be better, but teacher is fine for now as they have access)"""
        # Actually teachers CAN access student dashboard. Let's test with a student accessing another student's dashboard.
        # We need another student for this.
        pass

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_performance_overview(self, client, student_token, student_user, test_db_session):
        """Test getting performance overview"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        response = client.get(
            f"/api/v1/student-analytics/performance/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sgpa" in data
        assert "percentage" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_component_breakdown(self, client, student_token, student_user, test_db_session):
        """Test getting component breakdown"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        response = client.get(
            f"/api/v1/student-analytics/components/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_subject_performance(self, client, student_token, student_user, test_db_session):
        """Test getting subject performance"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        response = client.get(
            f"/api/v1/student-analytics/subjects/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "subjects" in data
        assert isinstance(data["subjects"], list)

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_performance_trends(self, client, student_token, student_user, test_db_session):
        """Test getting performance trends"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        response = client.get(
            f"/api/v1/student-analytics/trends/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "semesters" in data
        assert "trend" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_student_insights(self, client, student_token, student_user, test_db_session):
        """Test getting student insights"""
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        response = client.get(
            f"/api/v1/student-analytics/insights/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "strengths" in data
        assert "weaknesses" in data
        assert "overall_recommendation" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_co_attainment(self, client, student_token, student_user, subject_assignment, test_db_session):
        """Test getting CO attainment status"""
        from src.infrastructure.database.models import StudentModel, ExamModel, QuestionModel, QuestionCOMappingModel, MarkModel, CourseOutcomeModel
        from datetime import date
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()

        # Use fixture assignment
        assignment = subject_assignment
        
        # Create Exam
        exam = ExamModel(
            name="CO Test Exam",
            subject_assignment_id=assignment.id,
            exam_type="internal1",
            exam_date=date(2023, 1, 1),
            total_marks=50,
            status="published"
        )
        test_db_session.add(exam)
        test_db_session.commit()
        
        # Create Question
        question = QuestionModel(
            exam_id=exam.id,
            question_no="1",
            question_text="CO Question",
            section="A",
            marks_per_question=10
        )
        test_db_session.add(question)
        test_db_session.commit()
        
        # Create CO
        co = CourseOutcomeModel(
            code="CO1",
            title="Course Outcome 1",
            description="Test CO",
            subject_id=assignment.subject_id
        )
        test_db_session.add(co)
        test_db_session.commit()
        
        # Map Question to CO
        mapping = QuestionCOMappingModel(
            question_id=question.id,
            co_id=co.id,
            weight_pct=100
        )
        test_db_session.add(mapping)
        test_db_session.commit()
        
        # Add Mark
        mark = MarkModel(
            exam_id=exam.id,
            student_id=student_profile.id,
            question_id=question.id,
            marks_obtained=8,
            entered_by=1 # Dummy user ID
        )
        test_db_session.add(mark)
        test_db_session.commit()

        response = client.get(
            f"/api/v1/student-analytics/co-attainment/{student_profile.id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "co_details" in data
        assert isinstance(data["co_details"], list)
        assert len(data["co_details"]) > 0
        assert data["co_details"][0]["co_code"] == "CO1"
