import pytest
from datetime import date
from decimal import Decimal
from src.infrastructure.database.models import (
    StudentModel,
    TeacherModel,
    SubjectModel,
    SubjectAssignmentModel,
    InternalMarkModel,
    FinalMarkModel,
    ExamModel,
    MarkModel,
    QuestionModel,
    StudentEnrollmentModel
)


class TestSmartMarksEndpoints:
    
    @pytest.fixture
    def marks_data(self, test_db_session, student_user, teacher_user, subject_assignment, semester, academic_year):
        """Setup comprehensive marks data for testing"""
        # Get student and teacher profiles
        student = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        teacher = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()
        
        # Create IA1 marks
        ia1_mark = InternalMarkModel(
            student_id=student.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type="ia1",
            marks_obtained=35,
            max_marks=40,
            workflow_state="published",
            entered_by=teacher_user.id
        )
        test_db_session.add(ia1_mark)
        
        # Create IA2 marks
        ia2_mark = InternalMarkModel(
            student_id=student.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type="ia2",
            marks_obtained=38,
            max_marks=40,
            workflow_state="published",
            entered_by=teacher_user.id
        )
        test_db_session.add(ia2_mark)
        
        # Create external exam
        external_exam = ExamModel(
            subject_assignment_id=subject_assignment.id,
            name="External Exam",
            exam_type="external",
            exam_date=date(2024, 5, 1),
            total_marks=60,
            status="published"
        )
        test_db_session.add(external_exam)
        test_db_session.commit()
        
        # Create question for external exam
        question = QuestionModel(
            exam_id=external_exam.id,
            question_no="1",
            question_text="External Question",
            marks_per_question=60,
            section="A"
        )
        test_db_session.add(question)
        test_db_session.commit()
        
        # Create external marks
        external_mark = MarkModel(
            exam_id=external_exam.id,
            student_id=student.id,
            question_id=question.id,
            marks_obtained=48
        )
        test_db_session.add(external_mark)
        
        # Create student enrollment
        enrollment = StudentEnrollmentModel(
            student_id=student.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            roll_no=student.roll_no,
            enrollment_date=date(2024, 1, 1),
            is_active=True
        )
        test_db_session.add(enrollment)
        test_db_session.commit()
        
        return {
            "student": student,
            "teacher": teacher,
            "subject_assignment": subject_assignment,
            "semester": semester,
            "academic_year": academic_year,
            "ia1_mark": ia1_mark,
            "ia2_mark": ia2_mark,
            "external_exam": external_exam,
            "external_mark": external_mark
        }

    @pytest.mark.api
    @pytest.mark.integration
    def test_calculate_best_of_two(self, client, student_token, marks_data):
        """Test best-of-two internal marks calculation"""
        response = client.get(
            "/api/v1/smart-marks/best-of-two",
            params={
                "student_id": marks_data["student"].id,
                "subject_assignment_id": marks_data["subject_assignment"].id,
                "semester_id": marks_data["semester"].id,
                "academic_year_id": marks_data["academic_year"].id
            },
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "internal_1" in data
        assert "internal_2" in data
        assert "best_internal" in data
        assert data["internal_1"] == 35
        assert data["internal_2"] == 38
        assert data["best_internal"] == 38  # Higher of the two
        assert data["selected"] == "IA2"

    @pytest.mark.api
    @pytest.mark.integration
    def test_calculate_final_marks(self, client, student_token, marks_data):
        """Test complete final marks calculation"""
        response = client.get(
            "/api/v1/smart-marks/final-marks",
            params={
                "student_id": marks_data["student"].id,
                "subject_assignment_id": marks_data["subject_assignment"].id,
                "semester_id": marks_data["semester"].id,
                "academic_year_id": marks_data["academic_year"].id
            },
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "internal_marks" in data
        assert "external_marks" in data
        assert "total_marks" in data
        assert "percentage" in data
        assert "grade" in data
        assert "grade_point" in data
        assert "status" in data
        assert data["external_marks"] == 48
        assert data["status"] in ["pass", "fail"]

    @pytest.mark.api
    @pytest.mark.integration
    def test_save_final_marks(self, client, teacher_token, marks_data):
        """Test saving final marks to database"""
        response = client.post(
            "/api/v1/smart-marks/save-final-marks",
            json={
                "student_id": marks_data["student"].id,
                "subject_assignment_id": marks_data["subject_assignment"].id,
                "semester_id": marks_data["semester"].id
            },
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["student_id"] == marks_data["student"].id
        assert "internal_1" in data
        assert "internal_2" in data
        assert "best_internal" in data
        assert "external" in data
        assert "total" in data
        assert "percentage" in data
        assert "grade" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_save_final_marks_requires_teacher_permission(self, client, student_token, marks_data):
        """Test that students cannot save final marks"""
        response = client.post(
            "/api/v1/smart-marks/save-final-marks",
            json={
                "student_id": marks_data["student"].id,
                "subject_assignment_id": marks_data["subject_assignment"].id,
                "semester_id": marks_data["semester"].id
            },
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 403

    @pytest.mark.api
    @pytest.mark.integration
    def test_calculate_sgpa(self, client, teacher_token, marks_data, test_db_session):
        """Test SGPA calculation"""
        # First save final marks
        final_mark = FinalMarkModel(
            student_id=marks_data["student"].id,
            subject_assignment_id=marks_data["subject_assignment"].id,
            semester_id=marks_data["semester"].id,
            internal_1=Decimal("35"),
            internal_2=Decimal("38"),
            best_internal=Decimal("38"),
            external=Decimal("48"),
            total=Decimal("86"),
            percentage=Decimal("86.00"),
            grade="A",
            status="published"
        )
        test_db_session.add(final_mark)
        test_db_session.commit()
        
        response = client.get(
            "/api/v1/smart-marks/sgpa",
            params={
                "student_id": marks_data["student"].id,
                "semester_id": marks_data["semester"].id
            },
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "student_id" in data
        assert "semester_id" in data
        assert "sgpa" in data
        assert data["student_id"] == marks_data["student"].id
        assert isinstance(data["sgpa"], (int, float))

    @pytest.mark.api
    @pytest.mark.integration
    def test_calculate_cgpa(self, client, teacher_token, marks_data, test_db_session):
        """Test CGPA calculation"""
        # Create final marks for calculation
        final_mark = FinalMarkModel(
            student_id=marks_data["student"].id,
            subject_assignment_id=marks_data["subject_assignment"].id,
            semester_id=marks_data["semester"].id,
            internal_1=Decimal("35"),
            internal_2=Decimal("38"),
            best_internal=Decimal("38"),
            external=Decimal("48"),
            total=Decimal("86"),
            percentage=Decimal("86.00"),
            grade="A",
            status="published"
        )
        test_db_session.add(final_mark)
        test_db_session.commit()
        
        response = client.get(
            "/api/v1/smart-marks/cgpa",
            params={"student_id": marks_data["student"].id},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "student_id" in data
        assert "cgpa" in data
        assert data["student_id"] == marks_data["student"].id
        assert isinstance(data["cgpa"], (int, float))

    @pytest.mark.api
    @pytest.mark.integration
    def test_recalculate_marks(self, client, hod_token, marks_data):
        """Test bulk recalculation of marks"""
        response = client.post(
            "/api/v1/smart-marks/recalculate",
            json={
                "semester_id": marks_data["semester"].id,
                "subject_assignment_id": marks_data["subject_assignment"].id
            },
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "recalculated_count" in data
        assert "errors" in data
        assert "message" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_recalculate_requires_hod_permission(self, client, teacher_token, marks_data):
        """Test that teachers cannot recalculate marks"""
        response = client.post(
            "/api/v1/smart-marks/recalculate",
            json={
                "semester_id": marks_data["semester"].id
            },
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 403

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_grading_scale(self, client, student_token):
        """Test getting grading scale configuration"""
        response = client.get(
            "/api/v1/smart-marks/grading-scale",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "grading_scale" in data
        assert "description" in data
        
        # Verify grading scale structure
        scale = data["grading_scale"]
        assert "A+" in scale
        assert "A" in scale
        assert "F" in scale
        
        # Verify each grade has required fields
        for grade, criteria in scale.items():
            assert "min" in criteria
            assert "max" in criteria
            assert "grade_point" in criteria
