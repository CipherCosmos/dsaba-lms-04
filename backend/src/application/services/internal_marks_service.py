"""
Internal Marks Service
Business logic for internal marks workflow management
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime
from src.domain.entities.internal_mark import InternalMark
from src.domain.repositories.internal_mark_repository import IInternalMarkRepository
from src.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError
from src.infrastructure.database.models import MarksWorkflowState, MarkComponentType
from src.infrastructure.database.models import MarksWorkflowAuditModel


class InternalMarksService:
    """Internal Marks service with workflow management"""
    
    def __init__(self, repository: IInternalMarkRepository, db=None):
        self.repository = repository
        self.db = db  # For audit logging
    
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
        # Check if mark already exists
        existing = await self.repository.get_by_student_subject(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            component_type=component_type
        )
        
        if existing:
            # Update existing mark if in DRAFT or REJECTED state
            if existing.workflow_state in [MarksWorkflowState.DRAFT, MarksWorkflowState.REJECTED]:
                existing.update_marks(marks_obtained)
                if notes:
                    existing._notes = notes
                return await self.repository.update(existing)
            else:
                raise BusinessRuleViolationError(
                    f"Cannot update mark in {existing.workflow_state.value} state"
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
        mark.submit(submitted_by)
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, mark.workflow_state, MarksWorkflowState.SUBMITTED, submitted_by)
        return updated
    
    async def approve_marks(
        self,
        mark_id: int,
        approved_by: int
    ) -> InternalMark:
        """Approve marks (HOD)"""
        mark = await self.get_internal_mark(mark_id)
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
        old_state = mark.workflow_state
        mark.publish()
        updated = await self.repository.update(mark)
        await self._log_workflow_change(mark_id, old_state, MarksWorkflowState.PUBLISHED, None)
        return updated
    
    async def bulk_submit_marks(
        self,
        subject_assignment_id: int,
        submitted_by: int
    ) -> Dict[str, Any]:
        """Bulk submit all marks for a subject assignment with optimized batch processing"""
        from datetime import datetime
        
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
        
        # Batch update all marks in a single transaction
        submitted = []
        errors = []
        submit_time = datetime.utcnow()
        
        # Update all marks in memory first
        for mark in marks:
            try:
                mark.submit(submitted_by)
                submitted.append(mark)
            except Exception as e:
                errors.append(f"Mark {mark.id}: {str(e)}")
        
        # Batch update in database
        if submitted:
            try:
                # Use repository's bulk update if available, otherwise update individually in batches
                batch_size = 100
                for i in range(0, len(submitted), batch_size):
                    batch = submitted[i:i + batch_size]
                    for mark in batch:
                        await self.repository.update(mark)
                        # Log workflow change
                        await self._log_workflow_change(
                            mark.id, 
                            MarksWorkflowState.DRAFT, 
                            MarksWorkflowState.SUBMITTED, 
                            submitted_by
                        )
            except Exception as e:
                errors.append(f"Batch update error: {str(e)}")
        
        return {
            "submitted": len(submitted),
            "errors": errors,
            "marks": submitted
        }
    
    async def get_submitted_marks(
        self,
        department_id: Optional[int] = None
    ) -> List[InternalMark]:
        """Get all submitted marks awaiting approval"""
        return await self.repository.get_by_workflow_state(
            workflow_state=MarksWorkflowState.SUBMITTED,
            department_id=department_id
        )
    
    async def _log_workflow_change(
        self,
        mark_id: int,
        old_state: MarksWorkflowState,
        new_state: MarksWorkflowState,
        changed_by: Optional[int],
        reason: Optional[str] = None
    ) -> None:
        """Log workflow state change"""
        if not self.db:
            return
        
        audit_log = MarksWorkflowAuditModel(
            internal_mark_id=mark_id,
            old_state=old_state.value if old_state else None,
            new_state=new_state.value,
            changed_by=changed_by or 0,
            reason=reason
        )
        self.db.add(audit_log)
        self.db.commit()

