import pytest
from datetime import date
from decimal import Decimal
from src.infrastructure.database.models import (
    StudentModel,
    TeacherModel,
    SubjectModel,
    SubjectAssignmentModel,
    InternalMarkModel,
    ExamModel,
    MarkModel,
    QuestionModel,
    StudentEnrollmentModel,
    CourseOutcomeModel,
    ProgramOutcomeModel,
    COPOMappingModel,
    QuestionCOMappingModel
)
from src.domain.enums.user_role import UserRole

class TestCOPOAttainmentEndpoints:
    
    @pytest.fixture
    def attainment_data(self, test_db_session, student_user, teacher_user, department, subject, semester, academic_year, batch_instance):
        """Setup comprehensive data for CO-PO attainment testing"""
        
        # 1. Setup Teacher and Student
        teacher = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()
        
        student = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        # 2. Create Subject Assignment
        assignment = SubjectAssignmentModel(
            subject_id=subject.id,
            teacher_id=teacher.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            academic_year=2024
        )
        test_db_session.add(assignment)
        test_db_session.commit()
        
        # 3. Create COs (Course Outcomes)
        co1 = CourseOutcomeModel(
            subject_id=subject.id,
            code="CO1",
            title="Understand Basic Concepts",
            description="Understand the fundamental concepts of the subject",
            target_attainment=60.0
        )
        co2 = CourseOutcomeModel(
            subject_id=subject.id,
            code="CO2",
            title="Apply Knowledge",
            description="Apply the knowledge to solve problems",
            target_attainment=60.0
        )
        test_db_session.add_all([co1, co2])
        test_db_session.commit()
        
        # 4. Create POs (Program Outcomes)
        po1 = ProgramOutcomeModel(
            department_id=department.id,
            code="PO1",
            title="Engineering Knowledge",
            description="Apply knowledge of mathematics, science, and engineering"
        )
        po2 = ProgramOutcomeModel(
            department_id=department.id,
            code="PO2",
            title="Problem Analysis",
            description="Identify, formulate, and analyze complex engineering problems"
        )
        test_db_session.add_all([po1, po2])
        test_db_session.commit()
        
        # 5. Map COs to POs
        mapping1 = COPOMappingModel(
            co_id=co1.id,
            po_id=po1.id,
            strength=3  # High correlation
        )
        mapping2 = COPOMappingModel(
            co_id=co2.id,
            po_id=po2.id,
            strength=2  # Medium correlation
        )
        test_db_session.add_all([mapping1, mapping2])
        test_db_session.commit()
        
        # 6. Create Exam and Questions mapped to COs
        exam = ExamModel(
            subject_assignment_id=assignment.id,
            name="Internal Assessment 1",
            exam_type="internal1",
            exam_date=date(2024, 3, 1),
            total_marks=50,
            status="published"
        )
        test_db_session.add(exam)
        test_db_session.commit()
        
        q1 = QuestionModel(
            exam_id=exam.id,
            question_no="1",
            question_text="Define X",
            marks_per_question=10,
            blooms_level="L1",
            section="A"
        )
        q2 = QuestionModel(
            exam_id=exam.id,
            question_no="2",
            question_text="Solve Y",
            marks_per_question=10,
            blooms_level="L3",
            section="A"
        )
        test_db_session.add_all([q1, q2])
        test_db_session.commit()
        
        # Map Questions to COs
        q_co1 = QuestionCOMappingModel(
            question_id=q1.id,
            co_id=co1.id,
            weight_pct=100
        )
        q_co2 = QuestionCOMappingModel(
            question_id=q2.id,
            co_id=co2.id,
            weight_pct=100
        )
        test_db_session.add_all([q_co1, q_co2])
        test_db_session.commit()
        
        # 7. Enter Marks for Student
        m1 = MarkModel(
            exam_id=exam.id,
            student_id=student.id,
            question_id=q1.id,
            marks_obtained=8  # 80% attainment for CO1
        )
        m2 = MarkModel(
            exam_id=exam.id,
            student_id=student.id,
            question_id=q2.id,
            marks_obtained=9  # 90% attainment for CO2
        )
        test_db_session.add_all([m1, m2])
        test_db_session.commit()
        
        return {
            "department": department,
            "subject": subject,
            "academic_year": academic_year,
            "semester": semester,
            "co1": co1,
            "co2": co2,
            "po1": po1,
            "po2": po2
        }

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_co_attainment(self, client, teacher_token, attainment_data):
        """Test calculating CO attainment for a subject"""
        response = client.get(
            f"/api/v1/co-po-attainment/co/{attainment_data['subject'].id}",
            params={
                "academic_year_id": attainment_data["academic_year"].id,
                "semester_id": attainment_data["semester"].id
            },
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "co_attainment" in data
        assert len(data["co_attainment"]) >= 2
        
        # Verify CO1 attainment
        co1_data = next(item for item in data["co_attainment"].values() if item["co_code"] == "CO1")
        assert co1_data["actual_attainment"] > 0
        assert "attained" in co1_data

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_po_attainment(self, client, hod_token, attainment_data):
        """Test calculating PO attainment for a department"""
        response = client.get(
            f"/api/v1/co-po-attainment/po/{attainment_data['department'].id}",
            params={
                "academic_year_id": attainment_data["academic_year"].id
            },
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "po_attainment" in data
        assert len(data["po_attainment"]) >= 2
        
        # Verify PO1 attainment (linked to CO1)
        po1_data = next(item for item in data["po_attainment"].values() if item["po_code"] == "PO1")
        assert po1_data["actual_attainment"] > 0

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_co_po_summary(self, client, hod_token, attainment_data):
        """Test getting comprehensive CO-PO summary"""
        response = client.get(
            f"/api/v1/co-po-attainment/summary/{attainment_data['department'].id}",
            params={
                "academic_year_id": attainment_data["academic_year"].id
            },
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "co_attainment" in data
        assert "po_attainment" in data
        assert "summary" in data

    @pytest.mark.api
    @pytest.mark.integration
    def test_po_attainment_access_control(self, client, student_token, attainment_data):
        """Test that students cannot access PO attainment"""
        response = client.get(
            f"/api/v1/co-po-attainment/po/{attainment_data['department'].id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        # Should be forbidden or unauthorized depending on implementation
        assert response.status_code in [403, 401]

    @pytest.mark.api
    @pytest.mark.integration
    def test_invalid_subject_co_attainment(self, client, teacher_token):
        """Test CO attainment for non-existent subject"""
        response = client.get(
            "/api/v1/co-po-attainment/co/99999",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        
        assert response.status_code == 404
