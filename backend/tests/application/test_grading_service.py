"""
Grading Service Tests
Tests for GradingService
"""

import pytest
from decimal import Decimal
from src.application.services.grading_service import GradingService
from src.infrastructure.database.repositories.final_mark_repository_impl import FinalMarkRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.repositories.subject_assignment_repository_impl import SubjectAssignmentRepository


class TestGradingService:
    """Tests for GradingService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_calculate_sgpa(self, test_db_session, student_user, semester, subject_assignment):
        """Test calculating SGPA"""
        from src.infrastructure.database.models import StudentModel, FinalMarkModel
        from decimal import Decimal
        from src.domain.exceptions import EntityNotFoundError
        
        final_mark_repo = FinalMarkRepository(test_db_session)
        subject_repo = SubjectRepository(test_db_session)
        subject_assignment_repo = SubjectAssignmentRepository(test_db_session)
        service = GradingService(final_mark_repo, subject_repo, subject_assignment_repo, test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        # Create a final mark for the student
        final_mark = FinalMarkModel(
            student_id=student_profile.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            internal_1=Decimal("35.0"),
            internal_2=Decimal("38.0"),
            best_internal=Decimal("38.0"),
            external=Decimal("55.0"),
            total=Decimal("93.0"),
            percentage=Decimal("93.0"),
            grade="A+",
            status="published"
        )
        test_db_session.add(final_mark)
        test_db_session.commit()
        test_db_session.refresh(final_mark)
        
        # Now calculate SGPA
        sgpa = service.smart_marks_service.calculate_sgpa(
            student_id=student_profile.id,
            semester_id=semester.id
        )
        
        assert sgpa >= 0
        assert sgpa <= 10.0
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_calculate_cgpa(self, test_db_session, student_user):
        """Test calculating CGPA"""
        from src.infrastructure.database.models import StudentModel
        final_mark_repo = FinalMarkRepository(test_db_session)
        subject_repo = SubjectRepository(test_db_session)
        subject_assignment_repo = SubjectAssignmentRepository(test_db_session)
        service = GradingService(final_mark_repo, subject_repo, subject_assignment_repo, test_db_session)
        
        student_profile = test_db_session.query(StudentModel).filter(
            StudentModel.user_id == student_user.id
        ).first()
        
        cgpa = service.smart_marks_service.calculate_cgpa(student_id=student_profile.id)
        
        assert cgpa >= 0
        assert cgpa <= 10.0

