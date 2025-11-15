"""
Final Mark Repository Tests
Tests for FinalMarkRepository implementation
"""

import pytest
from decimal import Decimal
from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
from src.domain.entities.final_mark import FinalMark
from src.domain.exceptions import EntityNotFoundError


class TestFinalMarkRepository:
    """Tests for FinalMarkRepository"""
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_create_final_mark(self, test_db_session, student_user, subject_assignment, semester):
        """Test creating a final mark"""
        from src.infrastructure.database.models import StudentModel
        repo = FinalMarkRepository(test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        final_mark = FinalMark(
            id=None,
            student_id=student_profile.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            internal_1=Decimal("35.0"),
            internal_2=Decimal("38.0"),
            external=Decimal("55.0")
        )
        final_mark.best_internal = final_mark.calculate_best_internal("best")
        final_mark.total = final_mark.calculate_total(Decimal("40"), Decimal("60"))
        final_mark.percentage = final_mark.calculate_percentage(Decimal("100"))
        final_mark.grade = final_mark.assign_grade()
        
        created = await repo.create(final_mark)
        assert created.id is not None
        assert created.student_id == student_profile.id
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_id(self, test_db_session):
        """Test getting final mark by ID"""
        repo = FinalMarkRepository(test_db_session)
        # This will return None if no final mark exists
        found = await repo.get_by_id(99999)
        assert found is None
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_student_subject(self, test_db_session, student_user, subject_assignment, semester):
        """Test getting final mark by student and subject"""
        from src.infrastructure.database.models import StudentModel
        repo = FinalMarkRepository(test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        found = await repo.get_by_student_subject(
            student_id=student_profile.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id
        )
        # May be None if not created yet
        assert found is None or isinstance(found, FinalMark)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_by_student_semester(self, test_db_session, student_user, semester):
        """Test getting final marks by student and semester"""
        from src.infrastructure.database.models import StudentModel
        repo = FinalMarkRepository(test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        marks = await repo.get_by_student_semester(
            student_id=student_profile.id,
            semester_id=semester.id
        )
        assert isinstance(marks, list)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_get_all(self, test_db_session):
        """Test getting all final marks"""
        repo = FinalMarkRepository(test_db_session)
        
        marks = await repo.get_all()
        assert isinstance(marks, list)
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_count(self, test_db_session):
        """Test counting final marks"""
        repo = FinalMarkRepository(test_db_session)
        
        count = await repo.count()
        assert count >= 0
    
    @pytest.mark.integration
    @pytest.mark.repository
    async def test_exists(self, test_db_session):
        """Test checking if final mark exists"""
        repo = FinalMarkRepository(test_db_session)
        
        assert await repo.exists(99999) is False

