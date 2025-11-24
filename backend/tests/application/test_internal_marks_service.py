"""
Internal Marks Service Tests
Tests for InternalMarksService
"""

import pytest
from datetime import datetime
from src.application.services.internal_marks_service import InternalMarksService
from src.infrastructure.database.repositories.internal_mark_repository_impl import InternalMarkRepository
from src.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError
from src.infrastructure.database.models import MarksWorkflowState, MarkComponentType


class TestInternalMarksService:
    """Tests for InternalMarksService"""
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_create_internal_mark(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test creating an internal mark"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        mark = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id,
            notes="Good performance"
        )
        
        assert mark is not None
        assert mark.student_id == student_user.id
        assert mark.subject_assignment_id == subject_assignment.id
        assert mark.component_type == MarkComponentType.IA1
        assert mark.marks_obtained == 85.0
        assert mark.max_marks == 100.0
        assert mark.workflow_state == MarksWorkflowState.DRAFT
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_internal_mark(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test getting an internal mark by ID"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        created = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        retrieved = await service.get_internal_mark(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.marks_obtained == 85.0
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_update_internal_mark(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test updating an internal mark"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        created = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        updated = await service.update_internal_mark(
            mark_id=created.id,
            marks_obtained=90.0,
            notes="Updated marks"
        )
        
        assert updated.marks_obtained == 90.0
        assert updated.notes == "Updated marks"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_submit_internal_mark(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test submitting an internal mark for approval"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        created = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        submitted = await service.submit_marks(created.id, teacher_user.id)

        assert submitted.workflow_state == MarksWorkflowState.SUBMITTED
        assert submitted._submitted_at is not None
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_submit_mark_not_draft(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test submitting a mark that's not in DRAFT state raises error"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        created = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        # Submit once
        await service.submit_marks(created.id, teacher_user.id)

        # Try to submit again (should fail)
        with pytest.raises(BusinessRuleViolationError):
            await service.submit_marks(created.id, teacher_user.id)
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_approve_internal_mark(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test approving an internal mark"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        created = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        # Submit first
        await service.submit_marks(created.id, teacher_user.id)

        # Approve
        approved = await service.approve_marks(created.id, teacher_user.id)

        assert approved.workflow_state == MarksWorkflowState.APPROVED
        assert approved._approved_at is not None
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_reject_internal_mark(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test rejecting an internal mark"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        created = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        # Submit first
        await service.submit_marks(created.id, teacher_user.id)

        # Reject
        rejected = await service.reject_marks(
            mark_id=created.id,
            rejected_by=teacher_user.id,
            reason="Marks seem incorrect, please verify"
        )

        assert rejected.workflow_state == MarksWorkflowState.REJECTED
        assert rejected._rejection_reason == "Marks seem incorrect, please verify"
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_bulk_submit_marks(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test bulk submitting marks"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        # Create multiple marks
        mark1 = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )

        mark2 = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA2,
            marks_obtained=90.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        # Bulk submit
        result = await service.bulk_submit_marks(
            subject_assignment_id=subject_assignment.id,
            submitted_by=teacher_user.id
        )
        
        assert result["submitted"] == 2
        
        # Verify both are submitted
        retrieved1 = await service.get_internal_mark(mark1.id)
        retrieved2 = await service.get_internal_mark(mark2.id)
        
        assert retrieved1.workflow_state == MarksWorkflowState.SUBMITTED
        assert retrieved2.workflow_state == MarksWorkflowState.SUBMITTED
    
    @pytest.mark.integration
    @pytest.mark.service
    async def test_get_submitted_marks(self, test_db_session, student_user, subject_assignment, semester, academic_year, teacher_user):
        """Test getting submitted marks for approval"""
        repo = InternalMarkRepository(test_db_session)
        service = InternalMarksService(repo)

        # Create and submit mark
        mark = await service.create_internal_mark(
            student_id=student_user.id,
            subject_assignment_id=subject_assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type=MarkComponentType.IA1,
            marks_obtained=85.0,
            max_marks=100.0,
            entered_by=teacher_user.id
        )
        
        await service.submit_marks(mark.id, teacher_user.id)
        
        # Get submitted marks (need to get department_id from subject)
        from src.infrastructure.database.models import SubjectModel
        subject = test_db_session.query(SubjectModel).filter(
            SubjectModel.id == subject_assignment.subject_id
        ).first()
        
        submitted = await service.get_submitted_marks(
            department_id=subject.department_id if subject else None,
            skip=0,
            limit=10
        )
        
        assert len(submitted) >= 1
        assert any(m.id == mark.id for m in submitted)

