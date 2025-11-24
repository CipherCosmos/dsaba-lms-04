"""
Internal Mark Domain Entity
Represents internal marks with workflow states
"""

from typing import Optional
from datetime import datetime
from decimal import Decimal
from src.domain.entities.base import Entity, AggregateRoot
from src.infrastructure.database.models import MarksWorkflowState, MarkComponentType
from src.domain.services.marks_validation_service import MarksValidationService


class InternalMark(AggregateRoot):
    """
    Internal Mark entity
    
    Represents internal assessment marks (IA1, IA2, Assignment, etc.)
    with complete workflow state management.
    """
    
    def __init__(
        self,
        id: Optional[int],
        student_id: int,
        subject_assignment_id: int,
        semester_id: int,
        academic_year_id: int,
        component_type: MarkComponentType,
        marks_obtained: Decimal,
        max_marks: Decimal,
        workflow_state: MarksWorkflowState = MarksWorkflowState.DRAFT,
        entered_by: int = 0,
        submitted_at: Optional[datetime] = None,
        submitted_by: Optional[int] = None,
        approved_at: Optional[datetime] = None,
        approved_by: Optional[int] = None,
        rejected_at: Optional[datetime] = None,
        rejected_by: Optional[int] = None,
        rejection_reason: Optional[str] = None,
        frozen_at: Optional[datetime] = None,
        frozen_by: Optional[int] = None,
        published_at: Optional[datetime] = None,
        notes: Optional[str] = None,
        entered_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize Internal Mark
        
        Args:
            id: Mark ID (None for new)
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
            academic_year_id: Academic Year ID
            component_type: Component type (IA1, IA2, etc.)
            marks_obtained: Marks obtained
            max_marks: Maximum marks
            workflow_state: Current workflow state
            entered_by: User ID who entered the marks
            submitted_at: Submission timestamp
            submitted_by: User ID who submitted
            approved_at: Approval timestamp
            approved_by: User ID who approved
            rejected_at: Rejection timestamp
            rejected_by: User ID who rejected
            rejection_reason: Reason for rejection
            frozen_at: Freeze timestamp
            frozen_by: User ID who froze
            published_at: Publication timestamp
            notes: Additional notes
            entered_at: Entry timestamp
            updated_at: Last update timestamp
        """
        super().__init__(id)
        if entered_at:
            self._entered_at = entered_at
        if updated_at:
            self._updated_at = updated_at
        
        self._student_id = student_id
        self._subject_assignment_id = subject_assignment_id
        self._semester_id = semester_id
        self._academic_year_id = academic_year_id
        self._component_type = component_type
        self._marks_obtained = marks_obtained
        self._max_marks = max_marks
        self._workflow_state = workflow_state
        self._entered_by = entered_by
        self._submitted_at = submitted_at
        self._submitted_by = submitted_by
        self._approved_at = approved_at
        self._approved_by = approved_by
        self._rejected_at = rejected_at
        self._rejected_by = rejected_by
        self._rejection_reason = rejection_reason
        self._frozen_at = frozen_at
        self._frozen_by = frozen_by
        self._published_at = published_at
        self._notes = notes
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate internal mark data"""
        MarksValidationService.validate_mark_obtained(
            float(self._marks_obtained),
            float(self._max_marks)
        )
        MarksValidationService.validate_max_marks(float(self._max_marks))
    
    @property
    def student_id(self) -> int:
        return self._student_id
    
    @property
    def subject_assignment_id(self) -> int:
        return self._subject_assignment_id
    
    @property
    def semester_id(self) -> int:
        return self._semester_id
    
    @property
    def academic_year_id(self) -> int:
        return self._academic_year_id
    
    @property
    def component_type(self) -> MarkComponentType:
        return self._component_type
    
    @property
    def marks_obtained(self) -> Decimal:
        return self._marks_obtained
    
    @property
    def max_marks(self) -> Decimal:
        return self._max_marks
    
    @property
    def workflow_state(self) -> MarksWorkflowState:
        return self._workflow_state
    
    def submit(self, submitted_by: int) -> None:
        """Submit marks for HOD approval"""
        MarksValidationService.validate_workflow_state_transition(
            self._workflow_state.value,
            MarksWorkflowState.SUBMITTED.value,
            "submit"
        )
        self._workflow_state = MarksWorkflowState.SUBMITTED
        self._submitted_at = datetime.utcnow()
        self._submitted_by = submitted_by
    
    def approve(self, approved_by: int) -> None:
        """Approve marks (HOD)"""
        MarksValidationService.validate_workflow_state_transition(
            self._workflow_state.value,
            MarksWorkflowState.APPROVED.value,
            "approve"
        )
        self._workflow_state = MarksWorkflowState.APPROVED
        self._approved_at = datetime.utcnow()
        self._approved_by = approved_by
    
    def reject(self, rejected_by: int, reason: str) -> None:
        """Reject marks (HOD)"""
        MarksValidationService.validate_workflow_state_transition(
            self._workflow_state.value,
            MarksWorkflowState.REJECTED.value,
            "reject"
        )
        self._workflow_state = MarksWorkflowState.REJECTED
        self._rejected_at = datetime.utcnow()
        self._rejected_by = rejected_by
        self._rejection_reason = reason
    
    def reset_to_draft(self) -> None:
        """Reset rejected marks to draft"""
        MarksValidationService.validate_workflow_state_transition(
            self._workflow_state.value,
            MarksWorkflowState.DRAFT.value,
            "reset"
        )
        self._workflow_state = MarksWorkflowState.DRAFT
        self._rejected_at = None
        self._rejected_by = None
        self._rejection_reason = None
    
    def freeze(self, frozen_by: int) -> None:
        """Freeze marks (Principal)"""
        MarksValidationService.validate_workflow_state_transition(
            self._workflow_state.value,
            MarksWorkflowState.FROZEN.value,
            "freeze"
        )
        self._workflow_state = MarksWorkflowState.FROZEN
        self._frozen_at = datetime.utcnow()
        self._frozen_by = frozen_by
    
    def publish(self) -> None:
        """Publish marks (HOD/Principal)"""
        # Allow publishing from approved or frozen states
        if self._workflow_state not in [MarksWorkflowState.APPROVED, MarksWorkflowState.FROZEN]:
            MarksValidationService.validate_workflow_state_transition(
                self._workflow_state.value,
                MarksWorkflowState.PUBLISHED.value,
                "publish"
            )
        self._workflow_state = MarksWorkflowState.PUBLISHED
        self._published_at = datetime.utcnow()
    
    def update_marks(self, marks_obtained: Decimal) -> None:
        """Update marks (only in DRAFT or REJECTED state)"""
        MarksValidationService.validate_marks_update_permission(self._workflow_state.value)
        MarksValidationService.validate_mark_obtained(
            float(marks_obtained),
            float(self._max_marks)
        )
        self._marks_obtained = marks_obtained
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "student_id": self._student_id,
            "subject_assignment_id": self._subject_assignment_id,
            "semester_id": self._semester_id,
            "academic_year_id": self._academic_year_id,
            "component_type": self._component_type.value if isinstance(self._component_type, MarkComponentType) else self._component_type,
            "marks_obtained": float(self._marks_obtained),
            "max_marks": float(self._max_marks),
            "workflow_state": self._workflow_state.value if isinstance(self._workflow_state, MarksWorkflowState) else self._workflow_state,
            "entered_by": self._entered_by,
            "submitted_at": self._submitted_at.isoformat() if self._submitted_at else None,
            "submitted_by": self._submitted_by,
            "approved_at": self._approved_at.isoformat() if self._approved_at else None,
            "approved_by": self._approved_by,
            "rejected_at": self._rejected_at.isoformat() if self._rejected_at else None,
            "rejected_by": self._rejected_by,
            "rejection_reason": self._rejection_reason,
            "frozen_at": self._frozen_at.isoformat() if self._frozen_at else None,
            "frozen_by": self._frozen_by,
            "published_at": self._published_at.isoformat() if self._published_at else None,
            "notes": self._notes,
            "entered_at": self._entered_at.isoformat() if self._entered_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
    
    def __repr__(self) -> str:
        return f"InternalMark(id={self.id}, student_id={self._student_id}, component={self._component_type.value}, state={self._workflow_state.value})"

