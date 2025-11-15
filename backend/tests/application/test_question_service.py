"""
Question Service Tests
Tests for QuestionService
"""

import pytest
from decimal import Decimal
from src.application.services.question_service import QuestionService
from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.domain.exceptions import EntityNotFoundError, ValidationError


class TestQuestionService:
    """Tests for QuestionService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_question(self, test_db_session, exam):
        """Test creating a question"""
        question_repo = QuestionRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = QuestionService(question_repo, exam_repo)
        
        question = await service.create_question(
            exam_id=exam.id,
            question_no="1",
            question_text="What is data structure?",
            section="A",
            marks_per_question=Decimal("10.0")
        )
        
        assert question.id is not None
        assert question.question_no == "1"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_question(self, test_db_session, question):
        """Test getting a question"""
        question_repo = QuestionRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = QuestionService(question_repo, exam_repo)
        
        found = await service.get_question(question.id)
        assert found.id == question.id
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_questions_by_exam(self, test_db_session, exam, question):
        """Test getting questions by exam"""
        question_repo = QuestionRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = QuestionService(question_repo, exam_repo)
        
        questions = await service.get_questions_by_exam(exam.id)
        assert len(questions) > 0
        assert all(q.exam_id == exam.id for q in questions)
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_update_question(self, test_db_session, question):
        """Test updating a question"""
        question_repo = QuestionRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = QuestionService(question_repo, exam_repo)
        
        updated = await service.update_question(
            question_id=question.id,
            question_text="Updated question text"
        )
        
        assert updated.question_text == "Updated question text"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_delete_question(self, test_db_session, question):
        """Test deleting a question"""
        question_repo = QuestionRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = QuestionService(question_repo, exam_repo)
        
        deleted = await service.delete_question(question.id)
        assert deleted is True

