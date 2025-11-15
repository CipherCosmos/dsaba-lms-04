"""
Program Outcome Service
Business logic for Program Outcome management
"""

from typing import List, Optional
from decimal import Decimal

from src.domain.repositories.program_outcome_repository import IProgramOutcomeRepository
from src.domain.repositories.department_repository import IDepartmentRepository
from src.domain.entities.program_outcome import ProgramOutcome
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError


class ProgramOutcomeService:
    """
    Program Outcome service
    
    Handles business logic for Program Outcome operations
    """
    
    def __init__(
        self,
        po_repository: IProgramOutcomeRepository,
        department_repository: IDepartmentRepository
    ):
        self.po_repository = po_repository
        self.department_repository = department_repository
    
    async def create_po(
        self,
        department_id: int,
        code: str,
        type: str,
        title: str,
        description: Optional[str] = None,
        target_attainment: Decimal = Decimal("70.0")
    ) -> ProgramOutcome:
        """
        Create a new Program Outcome
        
        Args:
            department_id: Department ID
            code: PO code (e.g., "PO1", "PSO1")
            type: PO type ("PO" or "PSO")
            title: PO title
            description: PO description
            target_attainment: Target attainment percentage
        
        Returns:
            Created Program Outcome
        
        Raises:
            EntityNotFoundError: If department doesn't exist
            EntityAlreadyExistsError: If PO code already exists
        """
        # Verify department exists
        department = await self.department_repository.get_by_id(department_id)
        if not department:
            raise EntityNotFoundError("Department", department_id)
        
        # Check if code already exists
        if await self.po_repository.code_exists(department_id, code):
            raise EntityAlreadyExistsError("ProgramOutcome", "code", code)
        
        # Create PO entity
        po = ProgramOutcome(
            id=None,
            department_id=department_id,
            code=code,
            type=type,
            title=title,
            description=description,
            target_attainment=target_attainment
        )
        
        return await self.po_repository.create(po)
    
    async def get_po(self, po_id: int) -> ProgramOutcome:
        """
        Get Program Outcome by ID
        
        Args:
            po_id: PO ID
        
        Returns:
            Program Outcome
        
        Raises:
            EntityNotFoundError: If PO doesn't exist
        """
        po = await self.po_repository.get_by_id(po_id)
        if not po:
            raise EntityNotFoundError("ProgramOutcome", po_id)
        
        return po
    
    async def get_pos_by_department(
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
            List of Program Outcomes
        """
        return await self.po_repository.get_by_department(department_id, po_type, skip, limit)
    
    async def update_po(
        self,
        po_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        target_attainment: Optional[Decimal] = None
    ) -> ProgramOutcome:
        """
        Update Program Outcome
        
        Args:
            po_id: PO ID
            title: New title
            description: New description
            target_attainment: New target attainment
        
        Returns:
            Updated Program Outcome
        
        Raises:
            EntityNotFoundError: If PO doesn't exist
        """
        po = await self.get_po(po_id)
        
        # Update fields
        po.update(
            title=title,
            description=description,
            target_attainment=target_attainment
        )
        
        return await self.po_repository.update(po)
    
    async def delete_po(self, po_id: int) -> bool:
        """
        Delete Program Outcome
        
        Args:
            po_id: PO ID
        
        Returns:
            True if deleted, False otherwise
        
        Raises:
            EntityNotFoundError: If PO doesn't exist
        """
        po = await self.get_po(po_id)
        return await self.po_repository.delete(po.id)

