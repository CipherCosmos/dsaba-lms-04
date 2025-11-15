"""
Subject Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.subject import Subject


class ISubjectRepository(IRepository[Subject]):
    """
    Subject repository interface
    
    Defines operations specific to Subject entity
    """
    
    @abstractmethod
    async def get_by_code(self, code: str) -> Optional[Subject]:
        """
        Get subject by code
        
        Args:
            code: Subject code
        
        Returns:
            Subject if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_department(
        self,
        department_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Subject]:
        """
        Get all subjects in a department
        
        Args:
            department_id: Department ID
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of subjects
        """
        pass
    
    @abstractmethod
    async def code_exists(self, code: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if subject code already exists
        
        Args:
            code: Subject code to check
            exclude_id: Optional ID to exclude from check (for updates)
        
        Returns:
            True if exists, False otherwise
        """
        pass

