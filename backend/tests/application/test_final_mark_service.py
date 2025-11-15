"""
Final Mark Service Tests
Tests for FinalMarkService
"""

import pytest
from decimal import Decimal
from src.application.services.final_mark_service import FinalMarkService
from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository


class TestFinalMarkService:
    """Tests for FinalMarkService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_final_mark(self, test_db_session, student_user, subject_assignment, semester):
        """Test creating a final mark"""
        from src.infrastructure.database.models import StudentModel
        repo = FinalMarkRepository(test_db_session)
        service = FinalMarkService(repo)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        final_mark = await service.create_or_update_final_mark(
            student_id=student_profile.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            internal_1=Decimal("35.0"),
            internal_2=Decimal("38.0"),
            external=Decimal("55.0")
        )
        
        assert final_mark.id is not None
        assert final_mark.student_id == student_profile.id
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_final_mark(self, test_db_session):
        """Test getting a final mark"""
        repo = FinalMarkRepository(test_db_session)
        service = FinalMarkService(repo)
        
        with pytest.raises(Exception):  # EntityNotFoundError
            await service.get_final_mark(99999)
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_final_marks_by_student_semester(self, test_db_session, student_user, semester):
        """Test getting final marks by student and semester"""
        from src.infrastructure.database.models import StudentModel
        repo = FinalMarkRepository(test_db_session)
        service = FinalMarkService(repo)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        marks = await service.get_final_marks_by_student_semester(
            student_id=student_profile.id,
            semester_id=semester.id
        )
        assert isinstance(marks, list)

