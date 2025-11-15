"""
Program Outcome Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.program_outcome import ProgramOutcome


class IProgramOutcomeRepository(IRepository[ProgramOutcome]):
    """
    Program Outcome repository interface
    
    Defines operations specific to ProgramOutcome entity
    """
    
    @abstractmethod
    async def get_by_department(
        self,
        department_id: int,
        po_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProgramOutcome]:
        """
        Get all POs for a department
        
        Args:
            department_id: Department ID
            po_type: Optional PO type filter ("PO" or "PSO")
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of program outcomes
        """
        pass
    
    @abstractmethod
    async def get_by_code(
        self,
        department_id: int,
        code: str
    ) -> Optional[ProgramOutcome]:
        """
        Get PO by code for a department
        
        Args:
            department_id: Department ID
            code: PO code (e.g., "PO1", "PSO1")
        
        Returns:
            Program outcome if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def code_exists(
        self,
        department_id: int,
        code: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if PO code already exists for a department
        
        Args:
            department_id: Department ID
            code: PO code to check
            exclude_id: Optional ID to exclude from check (for updates)
        
        Returns:
            True if exists, False otherwise
        """
        pass

