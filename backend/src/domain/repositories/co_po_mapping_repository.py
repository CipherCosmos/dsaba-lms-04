"""
CO-PO Mapping Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.co_po_mapping import COPOMapping


class ICOPOMappingRepository(IRepository[COPOMapping]):
    """
    CO-PO Mapping repository interface
    
    Defines operations specific to COPOMapping entity
    """
    
    @abstractmethod
    async def get_by_co(
        self,
        co_id: int
    ) -> List[COPOMapping]:
        """
        Get all PO mappings for a CO
        
        Args:
            co_id: Course Outcome ID
        
        Returns:
            List of CO-PO mappings
        """
        pass
    
    @abstractmethod
    async def get_by_po(
        self,
        po_id: int
    ) -> List[COPOMapping]:
        """
        Get all CO mappings for a PO
        
        Args:
            po_id: Program Outcome ID
        
        Returns:
            List of CO-PO mappings
        """
        pass
    
    @abstractmethod
    async def get_mapping(
        self,
        co_id: int,
        po_id: int
    ) -> Optional[COPOMapping]:
        """
        Get specific CO-PO mapping
        
        Args:
            co_id: Course Outcome ID
            po_id: Program Outcome ID
        
        Returns:
            Mapping if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def mapping_exists(
        self,
        co_id: int,
        po_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if CO-PO mapping already exists
        
        Args:
            co_id: Course Outcome ID
            po_id: Program Outcome ID
            exclude_id: Optional ID to exclude from check (for updates)
        
        Returns:
            True if exists, False otherwise
        """
        pass

