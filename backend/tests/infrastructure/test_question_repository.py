"""
Question Repository Tests
Tests for QuestionRepository implementation
"""

import pytest
from decimal import Decimal
from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
from src.domain.entities.question import Question
from src.domain.exceptions import EntityNotFoundError


class TestQuestionRepository:
    """Tests for QuestionRepository"""
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_create_question(self, test_db_session, exam):
        """Test creating a question"""
        repo = QuestionRepository(test_db_session)
        
        question = Question(
            id=None,
            exam_id=exam.id,
            question_no="1",
            question_text="What is data structure?",
            section="A",
            marks_per_question=Decimal("10.0"),
            required_count=1,
            optional_count=0,
            difficulty="medium"
        )
        
        created = await repo.create(question)
        assert created.id is not None
        assert created.question_no == "1"
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_id(self, test_db_session, question):
        """Test getting question by ID"""
        repo = QuestionRepository(test_db_session)
        
        found = await repo.get_by_id(question.id)
        assert found is not None
        assert found.id == question.id
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_exam(self, test_db_session, exam, question):
        """Test getting questions by exam"""
        repo = QuestionRepository(test_db_session)
        
        questions = await repo.get_by_exam(exam.id)
        assert len(questions) > 0
        assert all(q.exam_id == exam.id for q in questions)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_exam_with_section(self, test_db_session, exam, question):
        """Test getting questions by exam and section"""
        repo = QuestionRepository(test_db_session)
        
        questions = await repo.get_by_exam(exam.id, section="A")
        assert len(questions) > 0
        assert all(q.section == "A" for q in questions)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_update_question(self, test_db_session, exam):
        """Test updating a question"""
        repo = QuestionRepository(test_db_session)
        
        # Create a question first
        question = Question(
            id=None,
            exam_id=exam.id,
            question_no="1",
            question_text="Original question",
            section="A",
            marks_per_question=Decimal("10.0"),
            required_count=1,
            optional_count=0,
            difficulty="medium"
        )
        created = await repo.create(question)
        
        # Update it
        created.update(
            question_text="Updated question text",
            marks_per_question=Decimal("15.0")
        )
        
        updated = await repo.update(created)
        assert updated.question_text == "Updated question text"
        assert updated.marks_per_question == Decimal("15.0")
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_delete_question(self, test_db_session, question):
        """Test deleting a question"""
        repo = QuestionRepository(test_db_session)
        
        deleted = await repo.delete(question.id)
        assert deleted is True
        
        found = await repo.get_by_id(question.id)
        assert found is None
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_all(self, test_db_session, question):
        """Test getting all questions"""
        repo = QuestionRepository(test_db_session)
        
        questions = await repo.get_all()
        assert len(questions) > 0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_count(self, test_db_session, question):
        """Test counting questions"""
        repo = QuestionRepository(test_db_session)
        
        count = await repo.count()
        assert count > 0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_exists(self, test_db_session, question):
        """Test checking if question exists"""
        repo = QuestionRepository(test_db_session)
        
        assert await repo.exists(question.id) is True
        assert await repo.exists(99999) is False

