"""
Question API Tests
Tests for question management endpoints
"""

import pytest
from tests.utils.auth_helpers import get_auth_headers


class TestQuestionEndpoints:
    """Tests for question API endpoints"""
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_create_question(self, client, teacher_token, exam):
        """Test creating a question"""
        response = client.post(
            "/api/v1/questions",
            headers=get_auth_headers(teacher_token),
            json={
                "exam_id": exam.id,
                "question_no": "1",
                "question_text": "What is data structure?",
                "section": "A",
                "marks_per_question": 10.0
            }
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["question_no"] == "1"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_questions_by_exam(self, client, teacher_token, exam, question):
        """Test getting questions by exam"""
        response = client.get(
            f"/api/v1/questions/exam/{exam.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0
        assert "total" in data
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_get_question_by_id(self, client, teacher_token, question):
        """Test getting question by ID"""
        response = client.get(
            f"/api/v1/questions/{question.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == question.id
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_update_question(self, client, teacher_token, question):
        """Test updating a question"""
        response = client.put(
            f"/api/v1/questions/{question.id}",
            headers=get_auth_headers(teacher_token),
            json={
                "question_text": "Updated question text"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["question_text"] == "Updated question text"
    
    @pytest.mark.api
    @pytest.mark.integration
    def test_delete_question(self, client, teacher_token, question):
        """Test deleting a question"""
        response = client.delete(
            f"/api/v1/questions/{question.id}",
            headers=get_auth_headers(teacher_token)
        )
        
        assert response.status_code in [200, 204]

