"""
Department Repository Interface
"""

from abc import abstractmethod
from typing import Optional
from .base_repository import IRepository
from ..entities.department import Department


class IDepartmentRepository(IRepository[Department]):
    """
    Department repository interface
    
    Defines operations specific to Department entity
    """
    
    @abstractmethod
    async def get_by_code(self, code: str) -> Optional[Department]:
        """
        Get department by code
        
        Args:
            code: Department code
        
        Returns:
            Department if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def code_exists(self, code: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if department code already exists
        
        Args:
            code: Department code to check
            exclude_id: Optional ID to exclude from check (for updates)
        
        Returns:
            True if exists, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_hod(self, hod_id: int) -> Optional[Department]:
        """
        Get department by HOD
        
        Args:
            hod_id: HOD user ID
        
        Returns:
            Department if found, None otherwise
        """
        pass

