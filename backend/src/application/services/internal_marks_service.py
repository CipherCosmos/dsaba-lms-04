"""
Internal Marks Service
Business logic for internal marks workflow management
"""

from typing import List, Optional, Dict, Any, Callable
from decimal import Decimal
from datetime import datetime
from src.domain.entities.internal_mark import InternalMark
from src.domain.repositories.internal_mark_repository import IInternalMarkRepository
from src.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError
from src.infrastructure.database.models import (
    MarksWorkflowState,
    MarkComponentType,
    MarksWorkflowAuditModel,
    SubjectAssignmentModel,
    AcademicYearModel,
    SemesterModel,
    InternalMarkModel,
)


class InternalMarksService:
    """Internal Marks service with workflow management"""
    
    def __init__(self, repository: IInternalMarkRepository, db=None):
        self.repository = repository
        self.db = db  # For audit logging
    
    async def _validate_mark_data(
        self,
        marks_obtained: Decimal,
        max_marks: Decimal,
        component_type: MarkComponentType,
        academic_year_id: int,
        semester_id: int,
        subject_assignment_id: int,
        entered_by: int
    ) -> None:
        """Validate mark data against business rules"""
        if marks_obtained > max_marks:
            raise BusinessRuleViolationError("Marks obtained cannot exceed maximum marks")
        if marks_obtained < 0:
            raise BusinessRuleViolationError("Marks obtained cannot be negative")
        if max_marks <= 0:
            raise BusinessRuleViolationError("Maximum marks must be positive")

        # Validate component_type is valid enum value
        if component_type not in [e for e in MarkComponentType]:
            raise BusinessRuleViolationError(f"Invalid component type: {component_type}")

        # Check academic year and semester are active
        if self.db:
            academic_year = self.db.query(AcademicYearModel).filter(
                AcademicYearModel.id == academic_year_id,
                AcademicYearModel.is_active == True
            ).first()
            if not academic_year:
                raise BusinessRuleViolationError("Academic year is not active")

            semester = self.db.query(SemesterModel).filter(
                SemesterModel.id == semester_id,
                SemesterModel.is_active == True
            ).first()
            if not semester:
                raise BusinessRuleViolationError("Semester is not active")

            # Verify teacher owns the subject assignment
            subject_assignment = self.db.query(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.id == subject_assignment_id
            ).first()
            if not subject_assignment or subject_assignment.teacher_id != entered_by:
                raise BusinessRuleViolationError("User does not own this subject assignment")

    async def create_internal_mark(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int,
        academic_year_id: int,
        component_type: MarkComponentType,
        marks_obtained: Decimal,
        max_marks: Decimal,
        entered_by: int,
        notes: Optional[str] = None
    ) -> InternalMark:
        """
        Create a new internal mark

        Args:
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
            academic_year_id: Academic Year ID
            component_type: Component type (IA1, IA2, etc.)
            marks_obtained: Marks obtained
            max_marks: Maximum marks
            entered_by: User ID who entered the marks
            notes: Additional notes

        Returns:
            Created InternalMark
        """
        # Validate mark data
        await self._validate_mark_data(
            marks_obtained, max_marks, component_type, academic_year_id, semester_id, subject_assignment_id, entered_by
        )

        # Check if mark already exists
        existing = await self.repository.get_by_student_subject(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            component_type=component_type
        )

        if existing:
            raise BusinessRuleViolationError(
                f"Mark already exists for student {student_id}, subject {subject_assignment_id}, component {component_type.value}"
            )

        internal_mark = InternalMark(
            id=None,
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id,
            component_type=component_type,
            marks_obtained=marks_obtained,
            max_marks=max_marks,
            workflow_state=MarksWorkflowState.DRAFT,
            entered_by=entered_by,
            notes=notes
        )

        return await self.repository.create(internal_mark)
    
    async def get_internal_mark(self, mark_id: int) -> InternalMark:
        """Get internal mark by ID"""
        mark = await self.repository.get_by_id(mark_id)
        if not mark:
            raise EntityNotFoundError("InternalMark", mark_id)
        return mark

    async def update_internal_mark(
        self,
        mark_id: int,
        marks_obtained: Decimal,
        notes: Optional[str] = None
    ) -> InternalMark:
        """Update internal mark marks and notes"""
        mark = await self.get_internal_mark(mark_id)

        # Validate workflow state allows update
        if mark.workflow_state not in [MarksWorkflowState.DRAFT, MarksWorkflowState.REJECTED]:
            raise BusinessRuleViolationError(f"Cannot update mark in {mark.workflow_state.value} state")

        # Validate marks
        if marks_obtained > mark.max_marks:
            raise BusinessRuleViolationError("Marks obtained cannot exceed maximum marks")
        if marks_obtained < 0:
            raise BusinessRuleViolationError("Marks obtained cannot be negative")

        mark.update_marks(marks_obtained)
        if notes is not None:
            mark.notes = notes
        return await self.repository.update(mark)
    
    async def get_student_marks(
        self,
        student_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all internal marks for a student with pagination"""
        return await self.repository.get_by_student(
            student_id=student_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id,
            skip=skip,
            limit=limit
        )
    
    async def get_subject_marks(
        self,
        subject_assignment_id: int,
        workflow_state: Optional[MarksWorkflowState] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all internal marks for a subject assignment with pagination"""
        return await self.repository.get_by_subject_assignment(
            subject_assignment_id=subject_assignment_id,
            workflow_state=workflow_state,
            skip=skip,
            limit=limit
        )
    
    async def submit_marks(
        self,
        mark_id: int,
        submitted_by: int
    ) -> InternalMark:
        """Submit marks for HOD approval"""
        mark = await self.get_internal_mark(mark_id)
        if mark.workflow_state not in [MarksWorkflowState.DRAFT, MarksWorkflowState.REJECTED]:
            raise BusinessRuleViolationError(f"Cannot submit mark in {mark.workflow_state.value} state")
        old_state = mark.workflow_state
        mark.submit(submitted_by)
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, MarksWorkflowState.SUBMITTED, submitted_by)
        return updated
    
    async def approve_marks(
        self,
        mark_id: int,
        approved_by: int
    ) -> InternalMark:
        """Approve marks (HOD)"""
        mark = await self.get_internal_mark(mark_id)
        if mark.workflow_state != MarksWorkflowState.SUBMITTED:
            raise BusinessRuleViolationError(f"Cannot approve mark in {mark.workflow_state.value} state")
        old_state = mark.workflow_state
        mark.approve(approved_by)
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, MarksWorkflowState.APPROVED, approved_by)
        return updated
    
    async def reject_marks(
        self,
        mark_id: int,
        rejected_by: int,
        reason: str
    ) -> InternalMark:
        """Reject marks (HOD)"""
        mark = await self.get_internal_mark(mark_id)
        if mark.workflow_state != MarksWorkflowState.SUBMITTED:
            raise BusinessRuleViolationError(f"Cannot reject mark in {mark.workflow_state.value} state")
        old_state = mark.workflow_state
        mark.reject(rejected_by, reason)
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, MarksWorkflowState.REJECTED, rejected_by, reason)
        return updated
    
    async def freeze_marks(
        self,
        mark_id: int,
        frozen_by: int
    ) -> InternalMark:
        """Freeze marks (Principal)"""
        mark = await self.get_internal_mark(mark_id)
        if mark.workflow_state != MarksWorkflowState.APPROVED:
            raise BusinessRuleViolationError(f"Cannot freeze mark in {mark.workflow_state.value} state")
        old_state = mark.workflow_state
        mark.freeze(frozen_by)
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, MarksWorkflowState.FROZEN, frozen_by)
        return updated
    
    async def publish_marks(
        self,
        mark_id: int
    ) -> InternalMark:
        """Publish marks (HOD/Principal)"""
        mark = await self.get_internal_mark(mark_id)
        if mark.workflow_state not in [MarksWorkflowState.APPROVED, MarksWorkflowState.FROZEN]:
            raise BusinessRuleViolationError(f"Cannot publish mark in {mark.workflow_state.value} state")
        old_state = mark.workflow_state
        mark.publish()
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, MarksWorkflowState.PUBLISHED, None)
        return updated
    
    async def bulk_submit_marks(
        self,
        subject_assignment_id: int,
        submitted_by: int,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> Dict[str, Any]:
        """Bulk submit all marks for a subject assignment with optimized batch processing, validation, and progress tracking"""
        marks = await self.repository.get_by_subject_assignment(
            subject_assignment_id=subject_assignment_id,
            workflow_state=MarksWorkflowState.DRAFT,
            skip=0,
            limit=10000  # Large limit for bulk operations
        )

        if not marks:
            return {
                "submitted": 0,
                "errors": [],
                "marks": []
            }

        # Pre-validate all marks to fail fast
        submitted = []
        errors = []
        for mark in marks:
            try:
                if mark.workflow_state != MarksWorkflowState.DRAFT:
                    raise BusinessRuleViolationError(f"Mark {mark.id} is not in DRAFT state")
                submitted.append(mark)
            except Exception as e:
                errors.append(f"Mark {mark.id}: {str(e)}")

        if not submitted:
            return {
                "submitted": 0,
                "errors": errors,
                "marks": []
            }

        # Bulk update using SQLAlchemy bulk operations for efficiency
        submit_time = datetime.utcnow()
        total = len(submitted)
        batch_size = 500  # Optimized batch size for bulk operations

        for i in range(0, total, batch_size):
            batch = submitted[i:i + batch_size]
            # Prepare bulk update data
            update_mappings = []
            for mark in batch:
                mark.submit(submitted_by)
                update_mappings.append({
                    'id': mark.id,
                    'workflow_state': mark.workflow_state,
                    'submitted_at': mark._submitted_at,
                    'submitted_by': mark._submitted_by
                })

            # Perform bulk update using direct model reference
            self.db.bulk_update_mappings(
                InternalMarkModel,
                update_mappings
            )

            # Log workflow changes in parallel batches
            audit_logs = []
            for mark in batch:
                audit_logs.append(MarksWorkflowAuditModel(
                    internal_mark_id=mark.id,
                    old_state=MarksWorkflowState.DRAFT.value,
                    new_state=MarksWorkflowState.SUBMITTED.value,
                    changed_by=submitted_by
                ))
            self.db.add_all(audit_logs)
            self.db.commit()

            # Report progress
            if progress_callback:
                progress_callback(min(i + batch_size, total), total)

        return {
            "submitted": len(submitted),
            "errors": errors,
            "marks": submitted
        }
    
    async def get_submitted_marks(
        self,
        department_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all submitted marks awaiting approval"""
        return await self.repository.get_by_workflow_state(
            workflow_state=MarksWorkflowState.SUBMITTED,
            department_id=department_id,
            skip=skip,
            limit=limit
        )
    
    async def get_audit_trail(self, mark_id: int) -> List[Dict[str, Any]]:
        """Get comprehensive audit trail for a mark with rollback capability"""
        if not self.db:
            return []

        audit_logs = self.db.query(MarksWorkflowAuditModel).filter(
            MarksWorkflowAuditModel.internal_mark_id == mark_id
        ).order_by(MarksWorkflowAuditModel.changed_at).all()

        return [
            {
                "old_state": log.old_state,
                "new_state": log.new_state,
                "changed_by": log.changed_by,
                "changed_at": log.changed_at.isoformat() if log.changed_at else None,
                "reason": log.reason
            } for log in audit_logs
        ]

    async def rollback_mark_state(self, mark_id: int, target_state: MarksWorkflowState, rolled_back_by: int) -> InternalMark:
        """Rollback mark to a previous state (admin operation with audit)"""
        mark = await self.get_internal_mark(mark_id)
        audit_trail = await self.get_audit_trail(mark_id)

        # Find the most recent transition to target_state
        previous_transition = None
        for log in reversed(audit_trail):
            if log['new_state'] == target_state.value:
                previous_transition = log
                break

        if not previous_transition:
            raise BusinessRuleViolationError(f"No previous transition to {target_state.value} found")

        old_state = mark.workflow_state
        # Reset timestamps and users based on target state
        if target_state == MarksWorkflowState.DRAFT:
            mark.workflow_state = target_state
            mark._submitted_at = None
            mark._submitted_by = None
            mark._approved_at = None
            mark._approved_by = None
            mark._rejected_at = None
            mark._rejected_by = None
            mark._rejection_reason = None
            mark._frozen_at = None
            mark._frozen_by = None
            mark._published_at = None
        # Add similar resets for other states as needed

        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, target_state, rolled_back_by, "Rollback operation")
        return updated

    async def _log_workflow_change(
        self,
        mark_id: int,
        old_state: MarksWorkflowState,
        new_state: MarksWorkflowState,
        changed_by: Optional[int],
        reason: Optional[str] = None
    ) -> None:
        """Log workflow state change with timestamp and metadata"""
        if not self.db:
            return

        audit_log = MarksWorkflowAuditModel(
            internal_mark_id=mark_id,
            old_state=old_state.value if old_state else None,
            new_state=new_state.value,
            changed_by=changed_by or 0,
            reason=reason,
            changed_at=datetime.utcnow()  # Explicit timestamp
        )
        self.db.add(audit_log)
        self.db.commit()

