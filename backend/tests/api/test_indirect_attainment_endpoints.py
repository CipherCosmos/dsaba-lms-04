
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta

from src.infrastructure.database.models import (
    SurveyModel, 
    SurveyQuestionModel,
    ExitExamModel, 
    DepartmentModel, 
    AcademicYearModel,
    UserModel,
    RoleModel,
    UserRoleModel
)
from src.domain.enums.user_role import UserRole

class TestIndirectAttainmentEndpoints:
    
    @pytest.fixture
    def indirect_data(self, test_db_session: Session, department, academic_year, teacher_user):
        """Setup data for indirect attainment tests"""
        # Create a survey
        survey = SurveyModel(
            title="Course End Survey",
            description="Feedback for the course",
            department_id=department.id,
            academic_year_id=academic_year.id,
            created_by=teacher_user.id,
            status="active"
        )
        test_db_session.add(survey)
        test_db_session.flush()

        # Add questions
        q1 = SurveyQuestionModel(
            survey_id=survey.id,
            question_text="How was the course?",
            question_type="rating",
            options=[],
            required=True,
            order_index=1
        )
        q2 = SurveyQuestionModel(
            survey_id=survey.id,
            question_text="Any comments?",
            question_type="text",
            options=[],
            required=False,
            order_index=2
        )
        test_db_session.add_all([q1, q2])
        
        # Create an exit exam
        exit_exam = ExitExamModel(
            title="Program Exit Exam",
            description="Final assessment",
            department_id=department.id,
            academic_year_id=academic_year.id,
            created_by=teacher_user.id,
            status="active",
            total_questions=50,
            passing_score=40.0,
            exam_date=date.today()
        )
        test_db_session.add(exit_exam)
        
        test_db_session.commit()
        test_db_session.refresh(survey)
        test_db_session.refresh(exit_exam)
        
        return {
            "survey": survey,
            "exit_exam": exit_exam,
            "department": department,
            "academic_year": academic_year,
            "teacher": teacher_user
        }

    @pytest.fixture
    def teacher_auth_headers(self, teacher_token):
        return {"Authorization": f"Bearer {teacher_token}"}

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_surveys(self, client: TestClient, indirect_data, teacher_auth_headers):
        """Test getting surveys"""
        response = client.get(
            "/api/v1/indirect-attainment/surveys",
            headers=teacher_auth_headers,
            params={"department_id": indirect_data["department"].id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["title"] == "Course End Survey"
        assert data[0]["department_id"] == indirect_data["department"].id

    @pytest.mark.api
    @pytest.mark.integration
    def test_create_survey(self, client: TestClient, indirect_data, teacher_auth_headers):
        """Test creating a new survey"""
        payload = {
            "title": "New Survey",
            "description": "New Survey Description",
            "department_id": indirect_data["department"].id,
            "academic_year_id": indirect_data["academic_year"].id,
            "status": "active",
            "questions": [
                {"id": 1, "question_text": "Question 1", "question_type": "rating", "options": []}
            ]
        }
        
        response = client.post(
            "/api/v1/indirect-attainment/surveys",
            headers=teacher_auth_headers,
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["department_id"] == payload["department_id"]
        assert len(data["questions"]) == 1

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_exit_exams(self, client: TestClient, indirect_data, teacher_auth_headers):
        """Test getting exit exams"""
        response = client.get(
            "/api/v1/indirect-attainment/exit-exams",
            headers=teacher_auth_headers,
            params={"department_id": indirect_data["department"].id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["title"] == "Program Exit Exam"

    @pytest.mark.api
    @pytest.mark.integration
    def test_create_exit_exam(self, client: TestClient, indirect_data, teacher_auth_headers):
        """Test creating a new exit exam"""
        payload = {
            "title": "New Exit Exam",
            "description": "Description",
            "department_id": indirect_data["department"].id,
            "academic_year_id": indirect_data["academic_year"].id,
            "status": "active",
            "total_questions": 50,
            "passing_score": 20.0,
            "exam_date": str(date.today())
        }
        
        response = client.post(
            "/api/v1/indirect-attainment/exit-exams",
            headers=teacher_auth_headers,
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["total_questions"] == 50

    @pytest.mark.api
    @pytest.mark.integration
    def test_calculate_indirect_attainment(self, client: TestClient, indirect_data, teacher_auth_headers):
        """Test calculating indirect attainment"""
        # This endpoint might return empty if no responses, but should return 200
        response = client.get(
            f"/api/v1/indirect-attainment/attainment/{indirect_data['department'].id}",
            headers=teacher_auth_headers,
            params={"academic_year_id": indirect_data["academic_year"].id}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Structure depends on implementation, but checking for 200 is a good start
        assert isinstance(data, dict)
