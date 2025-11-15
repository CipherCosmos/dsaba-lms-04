"""
Exam Repository Tests
Tests for ExamRepository implementation
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.domain.entities.exam import Exam
from src.domain.exceptions import EntityNotFoundError


@pytest.mark.integration
@pytest.mark.repository
class TestExamRepository:
    """Tests for ExamRepository"""
    
    async def test_create_exam(self, test_db_session, subject_assignment):
        """Test creating an exam"""
        from src.domain.enums.exam_type import ExamType, ExamStatus
        from src.domain.exceptions import EntityAlreadyExistsError
        repo = ExamRepository(test_db_session)
        
        # Try to create an exam with a different type to avoid duplicate
        exam = Exam(
            id=None,
            subject_assignment_id=subject_assignment.id,
            name="Final Exam",
            exam_type=ExamType.EXTERNAL,  # Use EXTERNAL to avoid conflict with fixture
            exam_date=date.today() + timedelta(days=30),
            total_marks=100.0,
            duration_minutes=180,
            status=ExamStatus.ACTIVE
        )
        
        created = await repo.create(exam)
        assert created.id is not None
        assert created.name == "Final Exam"
        assert created.exam_type == ExamType.EXTERNAL
    
    async def test_get_by_id(self, test_db_session, exam):
        """Test getting exam by ID"""
        repo = ExamRepository(test_db_session)
        
        found = await repo.get_by_id(exam.id)
        assert found is not None
        assert found.id == exam.id
        assert found.name == exam.name
    
    async def test_get_by_id_not_found(self, test_db_session):
        """Test getting non-existent exam"""
        repo = ExamRepository(test_db_session)
        
        found = await repo.get_by_id(99999)
        assert found is None
    
    async def test_get_by_subject_assignment(self, test_db_session, subject_assignment, exam):
        """Test getting exams by subject assignment"""
        repo = ExamRepository(test_db_session)
        
        exams = await repo.get_by_subject_assignment(subject_assignment.id)
        assert len(exams) > 0
        assert all(e.subject_assignment_id == subject_assignment.id for e in exams)
    
    async def test_get_by_type(self, test_db_session, exam):
        """Test getting exams by type"""
        from src.domain.enums.exam_type import ExamType
        repo = ExamRepository(test_db_session)
        
        # Get the exam type from the fixture
        exam_entity = await repo.get_by_id(exam.id)
        exam_type = exam_entity.exam_type
        
        # Use get_all with filters for that type
        exams = await repo.get_all(filters={"exam_type": exam_type})
        # Should find at least the exam from fixture
        assert len(exams) > 0
        # Verify they're all of the same type
        assert all(e.exam_type == exam_type for e in exams)
    
    async def test_update_exam(self, test_db_session, exam):
        """Test updating an exam"""
        repo = ExamRepository(test_db_session)
        
        # Get the exam entity first
        exam_entity = await repo.get_by_id(exam.id)
        exam_entity.update_info(
            name="Updated Exam Name",
            total_marks=150.0
        )
        
        updated = await repo.update(exam_entity)
        assert updated.name == "Updated Exam Name"
        assert updated.total_marks == 150.0
    
    async def test_delete_exam(self, test_db_session, exam):
        """Test deleting an exam"""
        repo = ExamRepository(test_db_session)
        
        exam_id = exam.id
        await repo.delete(exam_id)
        
        found = await repo.get_by_id(exam_id)
        assert found is None
    
    async def test_exists(self, test_db_session, exam):
        """Test checking if exam exists"""
        repo = ExamRepository(test_db_session)
        
        assert await repo.exists(exam.id) is True
        assert await repo.exists(99999) is False

