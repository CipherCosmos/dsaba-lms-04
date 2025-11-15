"""
Student Enrollment Domain Entity
Represents a student's enrollment in a semester for a specific academic year
"""

from typing import Optional
from datetime import date, datetime
from src.domain.entities.base import Entity, AggregateRoot


class StudentEnrollment(AggregateRoot):
    """
    Student Enrollment entity
    
    Links a student to a semester within a specific academic year.
    Tracks enrollment status, roll number, and promotion information.
    """
    
    def __init__(
        self,
        id: Optional[int],
        student_id: int,
        semester_id: int,
        academic_year_id: int,
        roll_no: str,
        enrollment_date: date,
        is_active: bool = True,
        promotion_status: str = 'pending',
        next_semester_id: Optional[int] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize Student Enrollment
        
        Args:
            id: Enrollment ID (None for new)
            student_id: Student ID
            semester_id: Semester ID
            academic_year_id: Academic Year ID
            roll_no: Roll number for this semester
            enrollment_date: Enrollment date
            is_active: Whether enrollment is active
            promotion_status: Promotion status (pending, promoted, retained, failed)
            next_semester_id: Next semester ID after promotion
            created_at: Creation timestamp
            updated_at: Last update timestamp
        """
        super().__init__(id)
        if created_at:
            self._created_at = created_at
        if updated_at:
            self._updated_at = updated_at
        
        self._student_id = student_id
        self._semester_id = semester_id
        self._academic_year_id = academic_year_id
        self._roll_no = roll_no
        self._enrollment_date = enrollment_date
        self._is_active = is_active
        self._promotion_status = promotion_status
        self._next_semester_id = next_semester_id
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate enrollment data"""
        if not self._roll_no:
            raise ValueError("Roll number is required")
        
        if len(self._roll_no) > 20:
            raise ValueError("Roll number must be 20 characters or less")
        
        if self._promotion_status not in ['pending', 'promoted', 'retained', 'failed']:
            raise ValueError("Invalid promotion status")
    
    @property
    def student_id(self) -> int:
        return self._student_id
    
    @property
    def semester_id(self) -> int:
        return self._semester_id
    
    @property
    def academic_year_id(self) -> int:
        return self._academic_year_id
    
    @property
    def roll_no(self) -> str:
        return self._roll_no
    
    @property
    def enrollment_date(self) -> date:
        return self._enrollment_date
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    @property
    def promotion_status(self) -> str:
        return self._promotion_status
    
    @property
    def next_semester_id(self) -> Optional[int]:
        return self._next_semester_id
    
    def promote(self, next_semester_id: int) -> None:
        """Promote student to next semester"""
        self._promotion_status = 'promoted'
        self._next_semester_id = next_semester_id
        self._is_active = False  # Current enrollment becomes inactive
    
    def retain(self) -> None:
        """Retain student in current semester"""
        self._promotion_status = 'retained'
    
    def mark_failed(self) -> None:
        """Mark student as failed"""
        self._promotion_status = 'failed'
    
    def deactivate(self) -> None:
        """Deactivate enrollment"""
        self._is_active = False
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "student_id": self._student_id,
            "semester_id": self._semester_id,
            "academic_year_id": self._academic_year_id,
            "roll_no": self._roll_no,
            "enrollment_date": self._enrollment_date.isoformat(),
            "is_active": self._is_active,
            "promotion_status": self._promotion_status,
            "next_semester_id": self._next_semester_id,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
    
    def __repr__(self) -> str:
        return f"StudentEnrollment(id={self.id}, student_id={self._student_id}, semester_id={self._semester_id})"

