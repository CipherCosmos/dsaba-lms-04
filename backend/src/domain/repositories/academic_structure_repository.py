"""
Academic Structure Repository Interfaces
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.academic_structure import Batch, BatchYear, Semester


class IBatchRepository(IRepository[Batch]):
    """
    Batch repository interface
    """
    
    @abstractmethod
    async def get_by_name(self, name: str) -> Optional[Batch]:
        """Get batch by name"""
        pass
    
    @abstractmethod
    async def name_exists(self, name: str, exclude_id: Optional[int] = None) -> bool:
        """Check if batch name exists"""
        pass


class IBatchYearRepository(IRepository[BatchYear]):
    """
    BatchYear repository interface
    """
    
    @abstractmethod
    async def get_by_batch(self, batch_id: int) -> List[BatchYear]:
        """Get all batch years for a batch"""
        pass
    
    @abstractmethod
    async def get_current(self) -> Optional[BatchYear]:
        """Get current batch year"""
        pass
    
    @abstractmethod
    async def get_by_years(self, start_year: int, end_year: int) -> Optional[BatchYear]:
        """Get batch year by start and end years"""
        pass


class ISemesterRepository(IRepository[Semester]):
    """
    Semester repository interface
    """
    
    @abstractmethod
    async def get_by_batch_year(self, batch_year_id: int) -> List[Semester]:
        """Get all semesters for a batch year"""
        pass
    
    @abstractmethod
    async def get_current(self) -> Optional[Semester]:
        """Get current semester"""
        pass
    
    @abstractmethod
    async def get_by_number(
        self,
        batch_year_id: int,
        semester_no: int
    ) -> Optional[Semester]:
        """Get semester by batch year and number"""
        pass

