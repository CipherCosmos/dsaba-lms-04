"""
Exam Entity - Represents an examination
"""

from typing import Optional, List
from datetime import datetime, date
from .base import AggregateRoot
from ..enums.exam_type import ExamType, ExamStatus
from ..exceptions import ValidationError, BusinessRuleViolationError


class Exam(AggregateRoot):
    """
    Exam aggregate root
    
    Represents an examination (Internal 1, Internal 2, or External)
    """
    
    def __init__(
        self,
        name: str,
        subject_assignment_id: int,
        exam_type: ExamType,
        exam_date: date,
        total_marks: float,
        id: Optional[int] = None,
        duration_minutes: Optional[int] = None,
        instructions: Optional[str] = None,
        status: ExamStatus = ExamStatus.DRAFT,
        question_paper_url: Optional[str] = None,
        created_by: Optional[int] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_name(name)
        self._validate_total_marks(total_marks)
        self._validate_exam_date(exam_date)
        
        # Set attributes
        self._name = name.strip()
        self._subject_assignment_id = subject_assignment_id
        self._exam_type = exam_type
        self._exam_date = exam_date
        self._total_marks = total_marks
        self._duration_minutes = duration_minutes
        self._instructions = instructions
        self._status = status
        self._question_paper_url = question_paper_url
        self._created_by = created_by
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def subject_assignment_id(self) -> int:
        return self._subject_assignment_id
    
    @property
    def exam_type(self) -> ExamType:
        return self._exam_type
    
    @property
    def exam_date(self) -> date:
        return self._exam_date
    
    @property
    def total_marks(self) -> float:
        return self._total_marks
    
    @property
    def duration_minutes(self) -> Optional[int]:
        return self._duration_minutes
    
    @property
    def instructions(self) -> Optional[str]:
        return self._instructions
    
    @property
    def status(self) -> ExamStatus:
        return self._status
    
    @property
    def question_paper_url(self) -> Optional[str]:
        return self._question_paper_url
    
    @property
    def created_by(self) -> Optional[int]:
        return self._created_by
    
    # Validation methods
    def _validate_name(self, name: str) -> None:
        if not name or len(name.strip()) < 3:
            raise ValidationError(
                "Exam name must be at least 3 characters",
                field="name",
                value=name
            )
        if len(name) > 100:
            raise ValidationError(
                "Exam name must not exceed 100 characters",
                field="name",
                value=name
            )
    
    def _validate_total_marks(self, total_marks: float) -> None:
        if total_marks <= 0:
            raise ValidationError(
                "Total marks must be greater than 0",
                field="total_marks",
                value=total_marks
            )
        if total_marks > 1000:
            raise ValidationError(
                "Total marks must not exceed 1000",
                field="total_marks",
                value=total_marks
            )
    
    def _validate_exam_date(self, exam_date: date) -> None:
        if exam_date < date.today():
            # Allow past dates for historical data, but warn
            pass
    
    # Business methods
    def activate(self) -> None:
        """Activate the exam (make it available for marks entry)"""
        if self._status != ExamStatus.DRAFT:
            raise BusinessRuleViolationError(
                rule="exam_activation",
                message=f"Cannot activate exam in {self._status.value} status"
            )
        self._status = ExamStatus.ACTIVE
        self.add_domain_event({
            "event": "ExamActivated",
            "exam_id": self.id
        })
    
    def lock(self) -> None:
        """Lock the exam (prevent further marks entry)"""
        if self._status != ExamStatus.ACTIVE:
            raise BusinessRuleViolationError(
                rule="exam_locking",
                message=f"Cannot lock exam in {self._status.value} status"
            )
        self._status = ExamStatus.LOCKED
        self.add_domain_event({
            "event": "ExamLocked",
            "exam_id": self.id
        })
    
    def publish(self) -> None:
        """Publish the exam (make results visible to students)"""
        if self._status != ExamStatus.LOCKED:
            raise BusinessRuleViolationError(
                rule="exam_publishing",
                message=f"Cannot publish exam in {self._status.value} status"
            )
        self._status = ExamStatus.PUBLISHED
        self.add_domain_event({
            "event": "ExamPublished",
            "exam_id": self.id
        })
    
    def update_info(
        self,
        name: Optional[str] = None,
        exam_date: Optional[date] = None,
        total_marks: Optional[float] = None,
        duration_minutes: Optional[int] = None,
        instructions: Optional[str] = None
    ) -> None:
        """Update exam information"""
        if self._status == ExamStatus.PUBLISHED:
            raise BusinessRuleViolationError(
                rule="exam_update",
                message="Cannot update published exam"
            )
        
        if name:
            self._validate_name(name)
            self._name = name.strip()
        
        if exam_date:
            self._validate_exam_date(exam_date)
            self._exam_date = exam_date
        
        if total_marks:
            self._validate_total_marks(total_marks)
            self._total_marks = total_marks
        
        if duration_minutes is not None:
            self._duration_minutes = duration_minutes
        
        if instructions is not None:
            self._instructions = instructions
        
        self.add_domain_event({
            "event": "ExamUpdated",
            "exam_id": self.id
        })
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            "name": self._name,
            "subject_assignment_id": self._subject_assignment_id,
            "exam_type": self._exam_type.value,
            "exam_date": self._exam_date.isoformat() if self._exam_date else None,
            "total_marks": self._total_marks,
            "duration_minutes": self._duration_minutes,
            "instructions": self._instructions,
            "status": self._status.value,
            "question_paper_url": self._question_paper_url,
            "created_by": self._created_by,
        }
    
    def __repr__(self) -> str:
        return f"Exam(id={self.id}, name={self._name}, type={self._exam_type.value}, status={self._status.value})"

