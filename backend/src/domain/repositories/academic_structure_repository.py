"""
Academic Structure Repository Interfaces
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.academic_structure import Batch, BatchYear, Semester, BatchInstance, Section


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
    
    @abstractmethod
    async def get_by_batch_instance(self, batch_instance_id: int) -> List[Semester]:
        """Get all semesters for a batch instance"""
        pass
    
    @abstractmethod
    async def get_by_batch_instance_and_number(
        self,
        batch_instance_id: int,
        semester_no: int
    ) -> Optional[Semester]:
        """Get semester by batch instance and number"""
        pass


class IBatchInstanceRepository(IRepository[BatchInstance]):
    """
    Batch Instance repository interface
    """
    
    @abstractmethod
    async def get_by_academic_year_and_department(
        self,
        academic_year_id: int,
        department_id: int
    ) -> List[BatchInstance]:
        """Get all batch instances for an academic year and department"""
        pass
    
    @abstractmethod
    async def get_by_academic_year(
        self,
        academic_year_id: int
    ) -> List[BatchInstance]:
        """Get all batch instances for an academic year"""
        pass
    
    @abstractmethod
    async def get_by_department(
        self,
        department_id: int
    ) -> List[BatchInstance]:
        """Get all batch instances for a department"""
        pass
    
    @abstractmethod
    async def get_unique(
        self,
        academic_year_id: int,
        department_id: int,
        batch_id: int
    ) -> Optional[BatchInstance]:
        """Get batch instance by unique combination (academic_year_id, department_id, batch_id)"""
        pass
    
    @abstractmethod
    async def exists_unique(
        self,
        academic_year_id: int,
        department_id: int,
        batch_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if batch instance exists with unique combination"""
        pass


class IBatchYearRepository(IRepository[BatchYear]):
    """
    BatchYear repository interface - Legacy interface for backward compatibility
    """

    @abstractmethod
    async def get_by_batch(self, batch_id: int) -> List[BatchYear]:
        """Get all batch years for a batch"""
        pass

    @abstractmethod
    async def get_current(self) -> Optional[BatchYear]:
        """Get current batch year"""
        pass


class ISectionRepository(IRepository[Section]):
    """
    Section repository interface
    """
    
    @abstractmethod
    async def get_by_batch_instance(self, batch_instance_id: int) -> List[Section]:
        """Get all sections for a batch instance"""
        pass
    
    @abstractmethod
    async def get_by_batch_instance_and_name(
        self,
        batch_instance_id: int,
        section_name: str
    ) -> Optional[Section]:
        """Get section by batch instance and name"""
        pass
    
    @abstractmethod
    async def exists_in_batch(
        self,
        batch_instance_id: int,
        section_name: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if section name exists in batch instance"""
        pass

