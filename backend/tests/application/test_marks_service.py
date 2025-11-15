"""
Marks Service Tests
Tests for MarksService
"""

import pytest
from src.application.services.marks_service import MarksService
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.domain.enums.exam_type import ExamStatus
from src.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError


class TestMarksService:
    """Tests for MarksService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_enter_mark(self, test_db_session, exam, student_user, question):
        """Test entering a mark"""
        from src.infrastructure.database.models import StudentModel
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = MarksService(mark_repo, exam_repo)
        
        # Ensure exam is active
        if exam.status != "active":
            from src.application.services.exam_service import ExamService
            exam_service = ExamService(exam_repo)
            exam_entity = await exam_service.get_exam(exam.id)
            exam_entity.activate()
            await exam_repo.update(exam_entity)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        mark = await service.enter_mark(
            exam_id=exam.id,
            student_id=student_profile.id,
            question_id=question.id,
            marks_obtained=8.5,
            entered_by=1
        )
        
        assert mark.id is not None
        assert mark.marks_obtained == 8.5
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_exam_marks(self, test_db_session, exam, mark):
        """Test getting marks for an exam"""
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = MarksService(mark_repo, exam_repo)
        
        marks = await service.get_exam_marks(exam.id)
        assert len(marks) > 0
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_student_exam_marks(self, test_db_session, exam, student_user, mark):
        """Test getting marks for a student in an exam"""
        from src.infrastructure.database.models import StudentModel
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = MarksService(mark_repo, exam_repo)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        marks = await service.get_student_exam_marks(
            exam_id=exam.id,
            student_id=student_profile.id
        )
        assert len(marks) > 0
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_update_mark(self, test_db_session, mark):
        """Test updating a mark"""
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = MarksService(mark_repo, exam_repo)
        
        updated = await service.update_mark(
            mark_id=mark.id,
            new_marks=9.0,
            updated_by=1
        )
        
        assert updated.marks_obtained == 9.0
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_delete_mark(self, test_db_session, mark):
        """Test deleting a mark"""
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        service = MarksService(mark_repo, exam_repo)
        
        deleted = await service.delete_mark(mark.id)
        assert deleted is True

