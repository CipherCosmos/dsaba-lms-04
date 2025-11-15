"""
Academic Year Domain Entity
Represents an academic cycle (e.g., 2024-2025)
"""

from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from src.domain.entities.base import Entity, AggregateRoot
from src.infrastructure.database.models import AcademicYearStatus


class AcademicYear(AggregateRoot):
    """
    Academic Year entity
    
    Represents an academic cycle that repeats each year.
    All semesters, enrollments, and marks are tied to an academic year.
    """
    
    def __init__(
        self,
        id: Optional[int],
        start_year: int,
        end_year: int,
        display_name: str,
        is_current: bool = False,
        status: AcademicYearStatus = AcademicYearStatus.PLANNED,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        archived_at: Optional[datetime] = None,
        created_at: Optional[datetime] = None
    ):
        """
        Initialize Academic Year
        
        Args:
            id: Academic year ID (None for new)
            start_year: Start year (e.g., 2024)
            end_year: End year (e.g., 2025)
            display_name: Display name (e.g., "2024-2025")
            is_current: Whether this is the current academic year
            status: Status (PLANNED, ACTIVE, ARCHIVED)
            start_date: Academic year start date
            end_date: Academic year end date
            archived_at: Archive timestamp
            created_at: Creation timestamp
        """
        super().__init__(id)
        if created_at:
            self._created_at = created_at
        
        self._start_year = start_year
        self._end_year = end_year
        self._display_name = display_name
        self._is_current = is_current
        self._status = status
        self._start_date = start_date
        self._end_date = end_date
        self._archived_at = archived_at
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate academic year data"""
        if self._end_year <= self._start_year:
            raise ValueError("End year must be greater than start year")
        
        if self._start_year < 2000 or self._start_year > 2100:
            raise ValueError("Start year must be between 2000 and 2100")
        
        if self._end_year < 2000 or self._end_year > 2100:
            raise ValueError("End year must be between 2000 and 2100")
        
        if not self._display_name:
            raise ValueError("Display name is required")
    
    @property
    def start_year(self) -> int:
        return self._start_year
    
    @property
    def end_year(self) -> int:
        return self._end_year
    
    @property
    def display_name(self) -> str:
        return self._display_name
    
    @property
    def is_current(self) -> bool:
        return self._is_current
    
    @property
    def status(self) -> AcademicYearStatus:
        return self._status
    
    @property
    def start_date(self) -> Optional[date]:
        return self._start_date
    
    @property
    def end_date(self) -> Optional[date]:
        return self._end_date
    
    @property
    def archived_at(self) -> Optional[datetime]:
        return self._archived_at
    
    def activate(self) -> None:
        """Activate this academic year"""
        if self._status == AcademicYearStatus.ARCHIVED:
            raise ValueError("Cannot activate archived academic year")
        self._status = AcademicYearStatus.ACTIVE
        self._is_current = True
    
    def archive(self) -> None:
        """Archive this academic year"""
        if self._status == AcademicYearStatus.PLANNED:
            raise ValueError("Cannot archive planned academic year")
        self._status = AcademicYearStatus.ARCHIVED
        self._is_current = False
        self._archived_at = datetime.utcnow()
    
    def set_current(self, is_current: bool) -> None:
        """Set current status"""
        if is_current and self._status != AcademicYearStatus.ACTIVE:
            raise ValueError("Only active academic years can be set as current")
        self._is_current = is_current
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "start_year": self._start_year,
            "end_year": self._end_year,
            "display_name": self._display_name,
            "is_current": self._is_current,
            "status": self._status.value if isinstance(self._status, AcademicYearStatus) else self._status,
            "start_date": self._start_date.isoformat() if self._start_date else None,
            "end_date": self._end_date.isoformat() if self._end_date else None,
            "archived_at": self._archived_at.isoformat() if self._archived_at else None,
            "created_at": self._created_at.isoformat() if self._created_at else None,
        }
    
    def __repr__(self) -> str:
        return f"AcademicYear(id={self.id}, {self._display_name}, status={self._status.value})"

