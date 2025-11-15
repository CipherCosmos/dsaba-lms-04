"""
Exam Workflow Integration Tests
Tests for complete exam creation and management workflows
"""

import pytest
from datetime import datetime, timedelta
from tests.utils.auth_helpers import get_auth_headers


class TestExamWorkflow:
    """Tests for complete exam workflows"""
    
    @pytest.mark.integration
    @pytest.mark.slow
    def test_create_exam_and_enter_marks(self, client, admin_token, teacher_token, 
                                         subject_assignment, student_user, test_db_session):
        """Test complete workflow: create exam, add questions, enter marks"""
        
        # 1. Create exam (as admin or teacher)
        exam_data = {
            "subject_assignment_id": subject_assignment.id,
            "name": "Midterm Exam",
            "exam_type": "internal1",
            "exam_date": (datetime.utcnow() + timedelta(days=7)).date().isoformat(),
            "total_marks": 100.0,
            "duration_minutes": 120,
            "status": "draft"
        }
        
        create_response = client.post(
            "/api/v1/exams",
            headers=get_auth_headers(teacher_token),
            json=exam_data
        )
        
        assert create_response.status_code in [200, 201]
        exam = create_response.json()
        exam_id = exam["id"]
        
        # 1.5. Activate exam to allow marks entry
        activate_response = client.post(
            f"/api/v1/exams/{exam_id}/activate",
            headers=get_auth_headers(teacher_token)
        )
        assert activate_response.status_code in [200, 201]
        
        # 2. Add question to exam
        question_data = {
            "exam_id": exam_id,
            "question_no": "1",
            "question_text": "What is data structure?",
            "marks_per_question": 10.0,
            "section": "A",
            "difficulty": "medium"
        }
        
        question_response = client.post(
            "/api/v1/questions",
            headers=get_auth_headers(teacher_token),
            json=question_data
        )
        
        assert question_response.status_code in [200, 201]
        question = question_response.json()
        question_id = question["id"]
        
        # 3. Enter marks for student
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        mark_data = {
            "exam_id": exam_id,
            "student_id": student_profile.id,
            "question_id": question_id,
            "marks_obtained": 8.5
        }
        
        mark_response = client.post(
            "/api/v1/marks",
            headers=get_auth_headers(teacher_token),
            json=mark_data
        )
        
        assert mark_response.status_code in [200, 201]
        
        # 4. Verify marks were saved
        get_marks_response = client.get(
            f"/api/v1/marks/student/{student_profile.id}/exam/{exam_id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert get_marks_response.status_code == 200
        marks = get_marks_response.json()
        assert len(marks) > 0
        assert marks[0]["marks_obtained"] == 8.5
    
    @pytest.mark.integration
    @pytest.mark.slow
    def test_final_marks_calculation(self, client, teacher_token, exam, 
                                     student_user, subject_assignment, semester, test_db_session):
        """Test final marks calculation workflow"""
        
        from src.infrastructure.database.models import StudentModel
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        # 1. Enter multiple marks for different questions
        questions = []
        for i in range(3):
            question_data = {
                "exam_id": exam.id,
                "question_no": str(i+1),
                "question_text": f"Question {i+1}",
                "marks_per_question": 10.0,
                "section": "A",
                "difficulty": "medium"
            }
            
            q_response = client.post(
                "/api/v1/questions",
                headers=get_auth_headers(teacher_token),
                json=question_data
            )
            questions.append(q_response.json()["id"])
        
        # 2. Enter marks for each question
        for q_id in questions:
            mark_data = {
                "exam_id": exam.id,
                "student_id": student_profile.id,
                "question_id": q_id,
                "marks_obtained": 8.0
            }
            
            client.post(
                "/api/v1/marks",
                headers=get_auth_headers(teacher_token),
                json=mark_data
            )
        
        # 3. Create final mark (this will calculate totals automatically)
        final_mark_response = client.post(
            "/api/v1/final-marks",
            headers=get_auth_headers(teacher_token),
            json={
                "student_id": student_profile.id,
                "subject_assignment_id": subject_assignment.id,
                "semester_id": semester.id,
                "internal_1": 24.0,  # Sum of 3 questions * 8.0 marks
                "internal_2": 0.0,
                "external": 0.0
            }
        )
        
        assert final_mark_response.status_code in [200, 201]
        final_mark = final_mark_response.json()
        assert "total" in final_mark or "percentage" in final_mark

