"""
Exam Service Tests
Tests for ExamService
"""

import pytest
from datetime import date, timedelta
from src.application.services.exam_service import ExamService
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.domain.enums.exam_type import ExamType, ExamStatus
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


class TestExamService:
    """Tests for ExamService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_exam(self, test_db_session, subject_assignment):
        """Test creating an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        exam = await service.create_exam(
            name="Test Exam",
            subject_assignment_id=subject_assignment.id,
            exam_type=ExamType.INTERNAL_1,
            exam_date=date.today() + timedelta(days=7),
            total_marks=100.0,
            created_by=1
        )
        
        assert exam.id is not None
        assert exam.name == "Test Exam"
        assert exam.status == ExamStatus.DRAFT
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_exam(self, test_db_session, exam):
        """Test getting an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        found = await service.get_exam(exam.id)
        assert found.id == exam.id
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_activate_exam(self, test_db_session, subject_assignment):
        """Test activating an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        # Create a new draft exam
        exam = await service.create_exam(
            name="Draft Exam",
            subject_assignment_id=subject_assignment.id,
            exam_type=ExamType.INTERNAL_1,
            exam_date=date.today() + timedelta(days=7),
            total_marks=100.0,
            created_by=1
        )
        
        activated = await service.activate_exam(exam.id)
        assert activated.status == ExamStatus.ACTIVE
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_lock_exam(self, test_db_session, subject_assignment):
        """Test locking an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        # Create and activate exam
        exam = await service.create_exam(
            name="Test Exam",
            subject_assignment_id=subject_assignment.id,
            exam_type=ExamType.INTERNAL_1,
            exam_date=date.today() + timedelta(days=7),
            total_marks=100.0,
            created_by=1
        )
        exam = await service.activate_exam(exam.id)
        
        locked = await service.lock_exam(exam.id)
        assert locked.status == ExamStatus.LOCKED
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_publish_exam(self, test_db_session, subject_assignment):
        """Test publishing an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        # Create, activate, and lock exam
        exam = await service.create_exam(
            name="Test Exam",
            subject_assignment_id=subject_assignment.id,
            exam_type=ExamType.INTERNAL_1,
            exam_date=date.today() + timedelta(days=7),
            total_marks=100.0,
            created_by=1
        )
        exam = await service.activate_exam(exam.id)
        exam = await service.lock_exam(exam.id)
        
        published = await service.publish_exam(exam.id)
        assert published.status == ExamStatus.PUBLISHED
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_update_exam(self, test_db_session, exam):
        """Test updating an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        updated = await service.update_exam(
            exam_id=exam.id,
            name="Updated Exam Name"
        )
        
        assert updated.name == "Updated Exam Name"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_delete_exam(self, test_db_session, exam):
        """Test deleting an exam"""
        repo = ExamRepository(test_db_session)
        service = ExamService(repo)
        
        deleted = await service.delete_exam(exam.id)
        assert deleted is True

