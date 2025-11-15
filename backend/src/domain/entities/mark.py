"""
Mark Entity - Represents a mark entry for a student
"""

from typing import Optional
from datetime import datetime
from decimal import Decimal
from .base import Entity
from ..exceptions import ValidationError, BusinessRuleViolationError


class Mark(Entity):
    """
    Mark entity
    
    Represents a single mark entry for a student in an exam question
    """
    
    def __init__(
        self,
        exam_id: int,
        student_id: int,
        question_id: int,
        marks_obtained: float,
        id: Optional[int] = None,
        sub_question_id: Optional[int] = None,
        entered_by: Optional[int] = None,
        entered_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_marks(marks_obtained)
        
        # Set attributes
        self._exam_id = exam_id
        self._student_id = student_id
        self._question_id = question_id
        self._sub_question_id = sub_question_id
        self._marks_obtained = Decimal(str(marks_obtained))
        self._entered_by = entered_by
        self._entered_at = entered_at if entered_at else datetime.utcnow()
        self._updated_at = updated_at if updated_at else datetime.utcnow()
    
    # Properties
    @property
    def exam_id(self) -> int:
        return self._exam_id
    
    @property
    def student_id(self) -> int:
        return self._student_id
    
    @property
    def question_id(self) -> int:
        return self._question_id
    
    @property
    def sub_question_id(self) -> Optional[int]:
        return self._sub_question_id
    
    @property
    def marks_obtained(self) -> float:
        return float(self._marks_obtained)
    
    @property
    def entered_by(self) -> Optional[int]:
        return self._entered_by
    
    @property
    def entered_at(self) -> datetime:
        return self._entered_at
    
    # Validation methods
    def _validate_marks(self, marks: float) -> None:
        if marks < 0:
            raise ValidationError(
                "Marks cannot be negative",
                field="marks_obtained",
                value=marks
            )
        # Note: Max marks validation should be done at service layer
        # where we have access to question max marks
    
    # Business methods
    def update_marks(
        self,
        new_marks: float,
        updated_by: int,
        can_override: bool = False,
        reason: Optional[str] = None
    ) -> None:
        """
        Update marks
        
        Args:
            new_marks: New marks value
            updated_by: User ID making the update
            can_override: Whether user can override edit window restrictions
            reason: Reason for update (required if overriding)
        """
        self._validate_marks(new_marks)
        
        old_marks = self._marks_obtained
        self._marks_obtained = Decimal(str(new_marks))
        self._entered_by = updated_by
        self._updated_at = datetime.utcnow()
        
        # Note: Domain events for marks are handled at the service layer
        # since Mark is an Entity, not an AggregateRoot
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            "exam_id": self._exam_id,
            "student_id": self._student_id,
            "question_id": self._question_id,
            "sub_question_id": self._sub_question_id,
            "marks_obtained": float(self._marks_obtained),
            "entered_by": self._entered_by,
            "entered_at": self._entered_at.isoformat() if self._entered_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
    
    def __repr__(self) -> str:
        return f"Mark(id={self.id}, exam_id={self._exam_id}, student_id={self._student_id}, marks={self._marks_obtained})"

