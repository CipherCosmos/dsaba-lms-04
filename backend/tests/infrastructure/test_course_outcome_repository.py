"""
Course Outcome Repository Tests
Tests for CourseOutcomeRepository implementation
"""
import pytest
from decimal import Decimal
from src.infrastructure.database.repositories.course_outcome_repository_impl import CourseOutcomeRepository
from src.domain.entities.course_outcome import CourseOutcome
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


@pytest.mark.integration
@pytest.mark.repository
class TestCourseOutcomeRepository:
    """Tests for CourseOutcomeRepository"""
    
    async def test_create_co(self, test_db_session, subject):
        """Test creating a course outcome"""
        repo = CourseOutcomeRepository(test_db_session)
        
        co = CourseOutcome(
            id=None,
            subject_id=subject.id,
            code="CO1",
            title="Understand fundamental concepts",
            description="Students will understand the fundamental concepts of the subject",
            target_attainment=Decimal("70.0"),
            l1_threshold=Decimal("60.0"),
            l2_threshold=Decimal("70.0"),
            l3_threshold=Decimal("80.0")
        )
        
        created = await repo.create(co)
        assert created.id is not None
        assert created.code == "CO1"
        assert created.subject_id == subject.id
    
    async def test_get_by_id(self, test_db_session, course_outcome):
        """Test getting course outcome by ID"""
        repo = CourseOutcomeRepository(test_db_session)
        
        found = await repo.get_by_id(course_outcome.id)
        assert found is not None
        assert found.id == course_outcome.id
        assert found.code == course_outcome.code
    
    async def test_get_by_subject(self, test_db_session, subject, course_outcome):
        """Test getting course outcomes by subject"""
        repo = CourseOutcomeRepository(test_db_session)
        
        cos = await repo.get_by_subject(subject.id)
        assert len(cos) > 0
        assert all(co.subject_id == subject.id for co in cos)
    
    async def test_get_by_code(self, test_db_session, subject, course_outcome):
        """Test getting course outcome by code"""
        repo = CourseOutcomeRepository(test_db_session)
        
        found = await repo.get_by_code(subject.id, course_outcome.code)
        assert found is not None
        assert found.code == course_outcome.code
    
    async def test_code_exists(self, test_db_session, course_outcome):
        """Test checking if code exists"""
        repo = CourseOutcomeRepository(test_db_session)
        
        assert await repo.code_exists(course_outcome.subject_id, course_outcome.code) is True
        assert await repo.code_exists(course_outcome.subject_id, "NONEXISTENT") is False
    
    async def test_update_co(self, test_db_session, course_outcome):
        """Test updating a course outcome"""
        repo = CourseOutcomeRepository(test_db_session)
        
        course_outcome.title = "Updated Title"
        course_outcome.target_attainment = Decimal("75.0")
        
        updated = await repo.update(course_outcome)
        assert updated.title == "Updated Title"
        assert updated.target_attainment == Decimal("75.0")
    
    async def test_delete_co(self, test_db_session, course_outcome):
        """Test deleting a course outcome"""
        repo = CourseOutcomeRepository(test_db_session)
        
        co_id = course_outcome.id
        await repo.delete(co_id)
        
        found = await repo.get_by_id(co_id)
        assert found is None

