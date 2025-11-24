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


class Semester(Entity):
    """
    Semester entity
    
    Represents a semester within a batch instance (primary) or batch year (legacy)
    """
    
    def __init__(
        self,
        semester_no: int,
        id: Optional[int] = None,
        batch_instance_id: Optional[int] = None,  # Primary link (new structure)
        batch_year_id: Optional[int] = None,  # Legacy link
        academic_year_id: Optional[int] = None,  # Denormalized
        department_id: Optional[int] = None,  # Denormalized
        is_current: bool = False,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: str = 'active',
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_semester_no(semester_no)
        if start_date and end_date:
            self._validate_dates(start_date, end_date)
        
        # At least one of batch_instance_id or batch_year_id must be provided
        if not batch_instance_id and not batch_year_id:
            raise ValidationError(
                "Either batch_instance_id or batch_year_id must be provided",
                field="batch_instance_id",
                value=None
            )
        
        # Set attributes
        self._batch_instance_id = batch_instance_id
        self._batch_year_id = batch_year_id
        self._academic_year_id = academic_year_id
        self._department_id = department_id
        self._semester_no = semester_no
        self._is_current = is_current
        self._start_date = start_date
        self._end_date = end_date
        self._status = status
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def batch_instance_id(self) -> Optional[int]:
        return self._batch_instance_id
    
    @property
    def batch_year_id(self) -> Optional[int]:
        return self._batch_year_id
    
    @property
    def academic_year_id(self) -> Optional[int]:
        return self._academic_year_id
    
    @property
    def department_id(self) -> Optional[int]:
        return self._department_id
    
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
    def status(self) -> str:
        return self._status
    
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
            "batch_instance_id": self._batch_instance_id,
            "batch_year_id": self._batch_year_id,
            "academic_year_id": self._academic_year_id,
            "department_id": self._department_id,
            "semester_no": self._semester_no,
            "display_name": self.display_name,
            "is_current": self._is_current,
            "status": self._status,
            "start_date": self._start_date.isoformat() if self._start_date else None,
            "end_date": self._end_date.isoformat() if self._end_date else None,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
    
    def __repr__(self) -> str:
        return f"Semester(id={self.id}, semester_no={self._semester_no}, batch_instance={self._batch_instance_id}, current={self._is_current})"


class BatchInstance(AggregateRoot):
    """
    Batch Instance entity
    
    Represents students admitted in an Academic Year for a specific Department and Program.
    This is the core entity that links Academic Year + Department + Program (Batch).
    """
    
    def __init__(
        self,
        academic_year_id: int,
        department_id: int,
        batch_id: int,
        admission_year: int,
        id: Optional[int] = None,
        current_semester: int = 1,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_admission_year(admission_year)
        self._validate_current_semester(current_semester)
        
        # Set attributes
        self._academic_year_id = academic_year_id
        self._department_id = department_id
        self._batch_id = batch_id
        self._admission_year = admission_year
        self._current_semester = current_semester
        self._is_active = is_active
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def academic_year_id(self) -> int:
        return self._academic_year_id
    
    @property
    def department_id(self) -> int:
        return self._department_id
    
    @property
    def batch_id(self) -> int:
        return self._batch_id
    
    @property
    def admission_year(self) -> int:
        return self._admission_year
    
    @property
    def current_semester(self) -> int:
        return self._current_semester
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    # Validation
    def _validate_admission_year(self, year: int) -> None:
        current_year = datetime.now().year
        if year < 2000 or year > current_year + 1:
            raise ValidationError(
                f"Admission year must be between 2000 and {current_year + 1}",
                field="admission_year",
                value=year
            )
    
    def _validate_current_semester(self, semester: int) -> None:
        if semester < 1 or semester > 12:
            raise InvalidRangeError(
                field="current_semester",
                value=semester,
                min_value=1,
                max_value=12
            )
    
    # Business methods
    def promote_to_next_semester(self) -> None:
        """Promote batch to next semester"""
        if self._current_semester >= 12:
            raise BusinessRuleViolationError(
                "batch_promotion",
                "Batch is already at maximum semester (12)"
            )
        self._current_semester += 1
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def set_current_semester(self, semester: int) -> None:
        """Set current semester (with validation)"""
        self._validate_current_semester(semester)
        self._current_semester = semester
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def activate(self) -> None:
        """Activate batch instance"""
        if self._is_active:
            raise BusinessRuleViolationError("batch_activation", "Batch instance is already active")
        self._is_active = True
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        """Deactivate batch instance"""
        if not self._is_active:
            raise BusinessRuleViolationError("batch_deactivation", "Batch instance is already inactive")
        self._is_active = False
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "academic_year_id": self._academic_year_id,
            "department_id": self._department_id,
            "batch_id": self._batch_id,
            "admission_year": self._admission_year,
            "current_semester": self._current_semester,
            "is_active": self._is_active,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
    
    def __repr__(self) -> str:
        return f"BatchInstance(id={self.id}, AY={self._academic_year_id}, Dept={self._department_id}, Batch={self._batch_id}, Sem={self._current_semester})"


class BatchYear(Entity):
    """
    BatchYear entity - Legacy entity for backward compatibility

    This entity is kept for backward compatibility during the transition
    to BatchInstance. It represents a year instance of a batch.
    """

    def __init__(
        self,
        batch_id: int,
        start_year: int,
        end_year: int,
        id: Optional[int] = None,
        is_current: bool = False,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
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
        self._updated_at = updated_at

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

    # Validation
    def _validate_years(self, start: int, end: int) -> None:
        if end <= start:
            raise ValidationError(
                "End year must be greater than start year",
                field="end_year",
                value=end
            )

        current_year = datetime.now().year
        if start < 2000 or start > current_year + 1:
            raise ValidationError(
                f"Start year must be between 2000 and {current_year + 1}",
                field="start_year",
                value=start
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
            "is_current": self._is_current,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }

    def __repr__(self) -> str:
        return f"BatchYear(id={self.id}, batch_id={self._batch_id}, {self._start_year}-{self._end_year}, current={self._is_current})"


class Section(Entity):
    """
    Section entity
    
    Represents a subdivision of a batch (A, B, C, etc.)
    """
    
    def __init__(
        self,
        batch_instance_id: int,
        section_name: str,
        id: Optional[int] = None,
        capacity: Optional[int] = None,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_section_name(section_name)
        if capacity is not None:
            self._validate_capacity(capacity)
        
        # Set attributes
        self._batch_instance_id = batch_instance_id
        self._section_name = section_name.strip().upper()
        self._capacity = capacity
        self._is_active = is_active
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def batch_instance_id(self) -> int:
        return self._batch_instance_id
    
    @property
    def section_name(self) -> str:
        return self._section_name
    
    @property
    def capacity(self) -> Optional[int]:
        return self._capacity
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    # Validation
    def _validate_section_name(self, name: str) -> None:
        if not name or len(name.strip()) == 0:
            raise ValidationError(
                "Section name is required",
                field="section_name",
                value=name
            )
        
        if len(name.strip()) > 10:
            raise ValidationError(
                "Section name must not exceed 10 characters",
                field="section_name",
                value=name
            )
        
        # Validate format: single letter (A-Z) or alphanumeric
        import re
        if not re.match(r'^[A-Z]$', name.strip().upper()):
            raise ValidationError(
                "Section name must be a single letter (A-Z)",
                field="section_name",
                value=name
            )
    
    def _validate_capacity(self, capacity: int) -> None:
        if capacity < 1:
            raise ValidationError(
                "Capacity must be at least 1",
                field="capacity",
                value=capacity
            )
    
    # Business methods
    def activate(self) -> None:
        """Activate section"""
        if self._is_active:
            raise BusinessRuleViolationError("section_activation", "Section is already active")
        self._is_active = True
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        """Deactivate section"""
        if not self._is_active:
            raise BusinessRuleViolationError("section_deactivation", "Section is already inactive")
        self._is_active = False
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def set_capacity(self, capacity: int) -> None:
        """Set section capacity"""
        self._validate_capacity(capacity)
        self._capacity = capacity
        from datetime import datetime
        self._updated_at = datetime.utcnow()
    
    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "batch_instance_id": self._batch_instance_id,
            "section_name": self._section_name,
            "capacity": self._capacity,
            "is_active": self._is_active,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "updated_at": self._updated_at.isoformat() if self._updated_at else None,
        }
    
    def __repr__(self) -> str:
        return f"Section(id={self.id}, batch_instance_id={self._batch_instance_id}, name={self._section_name})"

