"""
Analytics Service Tests
Tests for AnalyticsService
"""

import pytest
from src.application.services.analytics.analytics_service import AnalyticsService
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.repositories.user_repository_impl import UserRepository


class TestAnalyticsService:
    """Tests for AnalyticsService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_student_analytics(self, test_db_session, student_user, exam, mark):
        """Test getting student analytics"""
        from src.infrastructure.database.models import StudentModel
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        subject_repo = SubjectRepository(test_db_session)
        user_repo = UserRepository(test_db_session)
        
        service = AnalyticsService(
            db=test_db_session,
            mark_repository=mark_repo,
            exam_repository=exam_repo,
            subject_repository=subject_repo,
            user_repository=user_repo
        )
        
        analytics = await service.get_student_analytics(student_id=student_profile.id)
        
        assert analytics is not None
        assert "total_marks" in analytics or "average_marks" in analytics
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_teacher_analytics(self, test_db_session, teacher_user):
        """Test getting teacher analytics"""
        from src.infrastructure.database.models import TeacherModel
        
        teacher_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == teacher_user.id
        ).first()
        
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        subject_repo = SubjectRepository(test_db_session)
        user_repo = UserRepository(test_db_session)
        
        service = AnalyticsService(
            db=test_db_session,
            mark_repository=mark_repo,
            exam_repository=exam_repo,
            subject_repository=subject_repo,
            user_repository=user_repo
        )
        
        analytics = await service.get_teacher_analytics(teacher_id=teacher_profile.id)
        
        assert analytics is not None
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_hod_analytics(self, test_db_session, hod_user, department):
        """Test getting HOD analytics"""
        from src.infrastructure.database.models import TeacherModel
        
        hod_profile = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == hod_user.id
        ).first()
        
        mark_repo = MarkRepository(test_db_session)
        exam_repo = ExamRepository(test_db_session)
        subject_repo = SubjectRepository(test_db_session)
        user_repo = UserRepository(test_db_session)
        
        service = AnalyticsService(
            db=test_db_session,
            mark_repository=mark_repo,
            exam_repository=exam_repo,
            subject_repository=subject_repo,
            user_repository=user_repo
        )
        
        analytics = await service.get_hod_analytics(department_id=department.id)
        
        assert analytics is not None

