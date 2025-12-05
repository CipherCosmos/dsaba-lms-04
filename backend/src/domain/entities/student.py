"""
Student Entity
Represents a student profile linked to a user account
"""

from typing import Optional, List
from datetime import date, datetime
from .base import AggregateRoot
from .user import User
from .academic_structure import BatchInstance, Section, Semester
from ..exceptions import ValidationError

class Student(AggregateRoot):
    """
    Student Aggregate Root
    
    Represents a student in the system, linked to a User for authentication.
    Contains academic details like roll number, batch, section, etc.
    """
    
    def __init__(
        self,
        user_id: int,
        roll_no: str,
        id: Optional[int] = None,
        batch_instance_id: Optional[int] = None,
        section_id: Optional[int] = None,
        current_semester_id: Optional[int] = None,
        department_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        admission_date: Optional[date] = None,
        current_year_level: int = 1,
        expected_graduation_year: Optional[int] = None,
        is_detained: bool = False,
        backlog_count: int = 0,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        user: Optional[User] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_roll_no(roll_no)
        
        # Set attributes
        self._user_id = user_id
        self._roll_no = roll_no
        self._batch_instance_id = batch_instance_id
        self._section_id = section_id
        self._current_semester_id = current_semester_id
        self._department_id = department_id
        self._academic_year_id = academic_year_id
        self._admission_date = admission_date
        self._current_year_level = current_year_level
        self._expected_graduation_year = expected_graduation_year
        self._is_detained = is_detained
        self._backlog_count = backlog_count
        self._created_at = created_at
        self._updated_at = updated_at
        
        # Relationships
        self._user = user
        
    # Properties
    @property
    def user_id(self) -> int:
        return self._user_id
    
    @property
    def roll_no(self) -> str:
        return self._roll_no
    
    @property
    def batch_instance_id(self) -> Optional[int]:
        return self._batch_instance_id
    
    @property
    def section_id(self) -> Optional[int]:
        return self._section_id
    
    @property
    def current_semester_id(self) -> Optional[int]:
        return self._current_semester_id
        
    @property
    def department_id(self) -> Optional[int]:
        return self._department_id
        
    @property
    def academic_year_id(self) -> Optional[int]:
        return self._academic_year_id
    
    @property
    def admission_date(self) -> Optional[date]:
        return self._admission_date
    
    @property
    def current_year_level(self) -> int:
        return self._current_year_level
    
    @property
    def expected_graduation_year(self) -> Optional[int]:
        return self._expected_graduation_year
    
    @property
    def is_detained(self) -> bool:
        return self._is_detained
    
    @property
    def backlog_count(self) -> int:
        return self._backlog_count
        
    @property
    def user(self) -> Optional[User]:
        return self._user
    
    # Validation
    def _validate_roll_no(self, roll_no: str) -> None:
        if not roll_no or len(roll_no.strip()) == 0:
            raise ValidationError(
                "Roll number is required",
                field="roll_no",
                value=roll_no
            )
        
        if len(roll_no) > 20:
            raise ValidationError(
                "Roll number must not exceed 20 characters",
                field="roll_no",
                value=roll_no
            )

    # Business Methods
    def update_academic_status(
        self, 
        current_semester_id: Optional[int] = None,
        current_year_level: Optional[int] = None,
        is_detained: Optional[bool] = None,
        backlog_count: Optional[int] = None
    ) -> None:
        """Update student's academic status"""
        if current_semester_id is not None:
            self._current_semester_id = current_semester_id
            
        if current_year_level is not None:
            self._current_year_level = current_year_level
            
        if is_detained is not None:
            self._is_detained = is_detained
            
        if backlog_count is not None:
            self._backlog_count = backlog_count
            
        from datetime import datetime
        self._updated_at = datetime.utcnow()

    def to_dict(self) -> dict:
        data = {
            **super().to_dict(),
            "user_id": self._user_id,
            "roll_no": self._roll_no,
            "batch_instance_id": self._batch_instance_id,
            "section_id": self._section_id,
            "current_semester_id": self._current_semester_id,
            "department_id": self._department_id,
            "academic_year_id": self._academic_year_id,
            "admission_date": self._admission_date.isoformat() if self._admission_date else None,
            "current_year_level": self._current_year_level,
            "expected_graduation_year": self._expected_graduation_year,
            "is_detained": self._is_detained,
            "backlog_count": self._backlog_count,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
        
        if self._user:
            data["user"] = self._user.to_dict()
            
        return data
