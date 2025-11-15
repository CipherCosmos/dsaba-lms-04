"""
Academic Structure Entities - Batch, BatchYear, Semester
These entities define the academic structure of the institution
"""

from typing import Optional
from datetime import datetime, date
from .base import Entity, AggregateRoot
from ..exceptions import ValidationError, BusinessRuleViolationError, InvalidRangeError


class Batch(AggregateRoot):
    """
    Batch entity
    
    Represents a program/batch (e.g., B.Tech, MBA, M.Tech)
    """
    
    def __init__(
        self,
        name: str,
        duration_years: int,
        id: Optional[int] = None,
        is_active: bool = True,
        created_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_name(name)
        self._validate_duration(duration_years)
        
        # Set attributes
        self._name = name.strip()
        self._duration_years = duration_years
        self._is_active = is_active
        self._created_at = created_at
    
    # Properties
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def duration_years(self) -> int:
        return self._duration_years
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    # Validation
    def _validate_name(self, name: str) -> None:
        if not name or len(name.strip()) < 2:
            raise ValidationError(
                "Batch name must be at least 2 characters",
                field="name",
                value=name
            )
        
        if len(name) > 50:
            raise ValidationError(
                "Batch name must not exceed 50 characters",
                field="name",
                value=name
            )
    
    def _validate_duration(self, duration: int) -> None:
        if duration < 1 or duration > 6:
            raise InvalidRangeError(
                field="duration_years",
                value=duration,
                min_value=1,
                max_value=6
            )
    
    # Business methods
    def activate(self) -> None:
        if self._is_active:
            raise BusinessRuleViolationError("batch_activation", "Batch is already active")
        self._is_active = True
    
    def deactivate(self) -> None:
        if not self._is_active:
            raise BusinessRuleViolationError("batch_deactivation", "Batch is already inactive")
        self._is_active = False
    
    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "name": self._name,
            "duration_years": self._duration_years,
            "is_active": self._is_active,
        }
    
    def __repr__(self) -> str:
        return f"Batch(id={self.id}, name={self._name}, duration={self._duration_years})"


class BatchYear(Entity):
    """
    BatchYear entity
    
    Represents a specific admission year for a batch (e.g., 2023-2027, 2024-2028)
    """
    
    def __init__(
        self,
        batch_id: int,
        start_year: int,
        end_year: int,
        id: Optional[int] = None,
        is_current: bool = False,
        created_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_years(start_year, end_year)
        
        # Set attributes
        self._batch_id = batch_id
        self._start_year = start_year
        self._end_year = end_year
        self._is_current = is_current
        self._created_at = created_at
    
    # Properties
    @property
    def batch_id(self) -> int:
        return self._batch_id
    
    @property
    def start_year(self) -> int:
        return self._start_year
    
    @property
    def end_year(self) -> int:
        return self._end_year
    
    @property
    def is_current(self) -> bool:
        return self._is_current
    
    @property
    def display_name(self) -> str:
        return f"{self._start_year}-{self._end_year}"
    
    # Validation
    def _validate_years(self, start_year: int, end_year: int) -> None:
        current_year = datetime.now().year
        
        if start_year < 2000 or start_year > current_year + 1:
            raise ValidationError(
                f"Start year must be between 2000 and {current_year + 1}",
                field="start_year",
                value=start_year
            )
        
        if end_year <= start_year:
            raise ValidationError(
                "End year must be after start year",
                field="end_year",
                value=end_year
            )
        
        if (end_year - start_year) > 6:
            raise ValidationError(
                "Batch duration cannot exceed 6 years",
                field="end_year",
                value=end_year
            )
    
    # Business methods
    def mark_as_current(self) -> None:
        """Mark this batch year as current"""
        self._is_current = True
    
    def unmark_as_current(self) -> None:
        """Unmark this batch year as current"""
        self._is_current = False
    
    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "batch_id": self._batch_id,
            "start_year": self._start_year,
            "end_year": self._end_year,
            "display_name": self.display_name,
            "is_current": self._is_current,
        }
    
    def __repr__(self) -> str:
        return f"BatchYear(id={self.id}, {self.display_name}, current={self._is_current})"


class Semester(Entity):
    """
    Semester entity
    
    Represents a semester within a batch year
    """
    
    def __init__(
        self,
        batch_year_id: int,
        semester_no: int,
        id: Optional[int] = None,
        is_current: bool = False,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        created_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_semester_no(semester_no)
        if start_date and end_date:
            self._validate_dates(start_date, end_date)
        
        # Set attributes
        self._batch_year_id = batch_year_id
        self._semester_no = semester_no
        self._is_current = is_current
        self._start_date = start_date
        self._end_date = end_date
        self._created_at = created_at
    
    # Properties
    @property
    def batch_year_id(self) -> int:
        return self._batch_year_id
    
    @property
    def semester_no(self) -> int:
        return self._semester_no
    
    @property
    def is_current(self) -> bool:
        return self._is_current
    
    @property
    def start_date(self) -> Optional[date]:
        return self._start_date
    
    @property
    def end_date(self) -> Optional[date]:
        return self._end_date
    
    @property
    def display_name(self) -> str:
        return f"Semester {self._semester_no}"
    
    # Validation
    def _validate_semester_no(self, semester_no: int) -> None:
        if semester_no < 1 or semester_no > 12:
            raise InvalidRangeError(
                field="semester_no",
                value=semester_no,
                min_value=1,
                max_value=12
            )
    
    def _validate_dates(self, start: date, end: date) -> None:
        if end <= start:
            raise ValidationError(
                "End date must be after start date",
                field="end_date",
                value=end
            )
    
    # Business methods
    def mark_as_current(self) -> None:
        """Mark this semester as current"""
        self._is_current = True
    
    def unmark_as_current(self) -> None:
        """Unmark this semester as current"""
        self._is_current = False
    
    def set_dates(self, start_date: date, end_date: date) -> None:
        """Set semester start and end dates"""
        self._validate_dates(start_date, end_date)
        self._start_date = start_date
        self._end_date = end_date
    
    def is_active_on(self, check_date: date) -> bool:
        """Check if semester is active on a given date"""
        if not self._start_date or not self._end_date:
            return False
        return self._start_date <= check_date <= self._end_date
    
    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "batch_year_id": self._batch_year_id,
            "semester_no": self._semester_no,
            "display_name": self.display_name,
            "is_current": self._is_current,
            "start_date": self._start_date.isoformat() if self._start_date else None,
            "end_date": self._end_date.isoformat() if self._end_date else None,
        }
    
    def __repr__(self) -> str:
        return f"Semester(id={self.id}, semester_no={self._semester_no}, current={self._is_current})"

