"""
Mark Repository Tests
Tests for MarkRepository implementation
"""
import pytest
from decimal import Decimal
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.domain.entities.mark import Mark
from src.domain.exceptions import EntityNotFoundError


@pytest.mark.integration
@pytest.mark.repository
class TestMarkRepository:
    """Tests for MarkRepository"""
    
    async def test_create_mark(self, test_db_session, exam, student_user, question):
        """Test creating a mark"""
        from src.infrastructure.database.models import StudentModel
        repo = MarkRepository(test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        mark = Mark(
            id=None,
            exam_id=exam.id,
            student_id=student_profile.id,
            question_id=question.id,
            marks_obtained=Decimal("8.5")
        )
        
        created = await repo.create(mark)
        assert created.id is not None
        assert created.marks_obtained == Decimal("8.5")
    
    async def test_get_by_id(self, test_db_session, mark):
        """Test getting mark by ID"""
        repo = MarkRepository(test_db_session)
        
        found = await repo.get_by_id(mark.id)
        assert found is not None
        assert found.id == mark.id
        assert found.marks_obtained == mark.marks_obtained
    
    async def test_get_by_exam(self, test_db_session, exam, mark):
        """Test getting marks by exam"""
        repo = MarkRepository(test_db_session)
        
        marks = await repo.get_by_exam(exam.id)
        assert len(marks) > 0
        assert all(m.exam_id == exam.id for m in marks)
    
    async def test_get_by_student(self, test_db_session, student_user, mark):
        """Test getting marks by student"""
        from src.infrastructure.database.models import StudentModel
        repo = MarkRepository(test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        marks = await repo.get_by_student(student_profile.id)
        assert len(marks) > 0
        assert all(m.student_id == student_profile.id for m in marks)
    
    async def test_get_by_student_and_exam(self, test_db_session, exam, student_user, mark):
        """Test getting marks by student and exam"""
        from src.infrastructure.database.models import StudentModel
        repo = MarkRepository(test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        marks = await repo.get_by_exam_and_student(exam.id, student_profile.id)
        assert len(marks) > 0
        assert all(m.student_id == student_profile.id and m.exam_id == exam.id for m in marks)
    
    async def test_update_mark(self, test_db_session, mark):
        """Test updating a mark"""
        repo = MarkRepository(test_db_session)
        
        mark.marks_obtained = Decimal("9.0")
        
        updated = await repo.update(mark)
        assert updated.marks_obtained == Decimal("9.0")
    
    async def test_delete_mark(self, test_db_session, mark):
        """Test deleting a mark"""
        from src.domain.exceptions import EntityNotFoundError
        repo = MarkRepository(test_db_session)
        
        mark_id = mark.id
        result = await repo.delete(mark_id)
        assert result is True
        
        # Should raise EntityNotFoundError when trying to get deleted mark
        with pytest.raises(EntityNotFoundError):
            await repo.get_by_id(mark_id)
    
    async def test_exists(self, test_db_session, mark):
        """Test checking if mark exists"""
        repo = MarkRepository(test_db_session)
        
        assert await repo.exists(mark.id) is True
        assert await repo.exists(99999) is False

