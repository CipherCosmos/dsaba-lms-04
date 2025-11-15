"""
CO-PO Mapping Service
Business logic for CO-PO mapping management
"""

from typing import List

from src.domain.repositories.co_po_mapping_repository import ICOPOMappingRepository
from src.domain.repositories.course_outcome_repository import ICourseOutcomeRepository
from src.domain.repositories.program_outcome_repository import IProgramOutcomeRepository
from src.domain.entities.co_po_mapping import COPOMapping
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


class COPOMappingService:
    """
    CO-PO Mapping service
    
    Handles business logic for CO-PO mapping operations
    """
    
    def __init__(
        self,
        mapping_repository: ICOPOMappingRepository,
        co_repository: ICourseOutcomeRepository,
        po_repository: IProgramOutcomeRepository
    ):
        self.mapping_repository = mapping_repository
        self.co_repository = co_repository
        self.po_repository = po_repository
    
    async def create_mapping(
        self,
        co_id: int,
        po_id: int,
        strength: int
    ) -> COPOMapping:
        """
        Create a new CO-PO mapping
        
        Args:
            co_id: Course Outcome ID
            po_id: Program Outcome ID
            strength: Mapping strength (1=Low, 2=Medium, 3=High)
        
        Returns:
            Created CO-PO mapping
        
        Raises:
            EntityNotFoundError: If CO or PO doesn't exist
            EntityAlreadyExistsError: If mapping already exists
        """
        # Verify CO exists
        co = await self.co_repository.get_by_id(co_id)
        if not co:
            raise EntityNotFoundError("CourseOutcome", co_id)
        
        # Verify PO exists
        po = await self.po_repository.get_by_id(po_id)
        if not po:
            raise EntityNotFoundError("ProgramOutcome", po_id)
        
        # Check if mapping already exists
        if await self.mapping_repository.mapping_exists(co_id, po_id):
            raise EntityAlreadyExistsError(
                "COPOMapping",
                "co_id+po_id",
                f"{co_id}+{po_id}"
            )
        
        # Create mapping entity
        mapping = COPOMapping(
            id=None,
            co_id=co_id,
            po_id=po_id,
            strength=strength
        )
        
        return await self.mapping_repository.create(mapping)
    
    async def get_mapping(self, mapping_id: int) -> COPOMapping:
        """
        Get CO-PO mapping by ID
        
        Args:
            mapping_id: Mapping ID
        
        Returns:
            CO-PO mapping
        
        Raises:
            EntityNotFoundError: If mapping doesn't exist
        """
        mapping = await self.mapping_repository.get_by_id(mapping_id)
        if not mapping:
            raise EntityNotFoundError("COPOMapping", mapping_id)
        
        return mapping
    
    async def get_mappings_by_co(self, co_id: int) -> List[COPOMapping]:
        """
        Get all PO mappings for a CO
        
        Args:
            co_id: Course Outcome ID
        
        Returns:
            List of CO-PO mappings
        """
        return await self.mapping_repository.get_by_co(co_id)
    
    async def get_mappings_by_po(self, po_id: int) -> List[COPOMapping]:
        """
        Get all CO mappings for a PO
        
        Args:
            po_id: Program Outcome ID
        
        Returns:
            List of CO-PO mappings
        """
        return await self.mapping_repository.get_by_po(po_id)
    
    async def update_mapping_strength(
        self,
        mapping_id: int,
        strength: int
    ) -> COPOMapping:
        """
        Update mapping strength
        
        Args:
            mapping_id: Mapping ID
            strength: New strength value (1-3)
        
        Returns:
            Updated CO-PO mapping
        
        Raises:
            EntityNotFoundError: If mapping doesn't exist
        """
        mapping = await self.get_mapping(mapping_id)
        
        # Update strength
        mapping.update_strength(strength)
        
        return await self.mapping_repository.update(mapping)
    
    async def delete_mapping(self, mapping_id: int) -> bool:
        """
        Delete CO-PO mapping
        
        Args:
            mapping_id: Mapping ID
        
        Returns:
            True if deleted, False otherwise
        
        Raises:
            EntityNotFoundError: If mapping doesn't exist
        """
        mapping = await self.get_mapping(mapping_id)
        return await self.mapping_repository.delete(mapping.id)

