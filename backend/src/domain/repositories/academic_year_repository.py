"""
Academic Year Repository Interface
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.entities.academic_year import AcademicYear
from src.infrastructure.database.models import AcademicYearStatus


class IAcademicYearRepository(ABC):
    """Academic Year repository interface"""
    
    @abstractmethod
    async def create(self, academic_year: AcademicYear) -> AcademicYear:
        """Create a new academic year"""
        pass
    
    @abstractmethod
    async def get_by_id(self, academic_year_id: int) -> Optional[AcademicYear]:
        """Get academic year by ID"""
        pass
    
    @abstractmethod
    async def get_current(self) -> Optional[AcademicYear]:
        """Get current academic year"""
        pass
    
    @abstractmethod
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[AcademicYearStatus] = None,
        is_current: Optional[bool] = None
    ) -> List[AcademicYear]:
        """Get all academic years with optional filters"""
        pass
    
    @abstractmethod
    async def update(self, academic_year: AcademicYear) -> AcademicYear:
        """Update academic year"""
        pass
    
    @abstractmethod
    async def delete(self, academic_year_id: int) -> bool:
        """Delete academic year"""
        pass
    
    @abstractmethod
    async def get_by_years(self, start_year: int, end_year: int) -> Optional[AcademicYear]:
        """Get academic year by start and end years"""
        pass

