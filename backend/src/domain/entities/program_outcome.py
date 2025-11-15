"""
Program Outcome Entity
Domain entity for Program Outcomes (PO/PSO)
"""

from datetime import datetime
from typing import Optional
from decimal import Decimal

from .base import Entity


class ProgramOutcome(Entity):
    """
    Program Outcome entity
    
    Represents a Program Outcome (PO) or Program Specific Outcome (PSO) for a department
    Used in OBE (Outcome-Based Education) framework
    """
    
    def __init__(
        self,
        id: Optional[int],
        department_id: int,
        code: str,
        type: str,
        title: str,
        description: Optional[str] = None,
        target_attainment: Decimal = Decimal("70.0"),
        created_at: Optional[datetime] = None
    ):
        """
        Initialize Program Outcome
        
        Args:
            id: PO ID (None for new)
            department_id: Department this PO belongs to
            code: PO code (e.g., "PO1", "PO2", "PSO1")
            type: PO type ("PO" or "PSO")
            title: PO title
            description: PO description
            target_attainment: Target attainment percentage (default 70%)
            created_at: Creation timestamp
        """
        super().__init__(id)
        self._created_at = created_at
        self.department_id = department_id
        self.code = code.upper().strip()
        self.type = type.upper().strip()
        self.title = title.strip()
        self.description = description.strip() if description else None
        self.target_attainment = target_attainment
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate PO data"""
        if not self.code:
            raise ValueError("PO code is required")
        
        if self.type not in ["PO", "PSO"]:
            raise ValueError("PO type must be 'PO' or 'PSO'")
        
        if self.type == "PO" and not self.code.startswith("PO"):
            raise ValueError("PO code must start with 'PO'")
        
        if self.type == "PSO" and not self.code.startswith("PSO"):
            raise ValueError("PSO code must start with 'PSO'")
        
        if not self.title:
            raise ValueError("PO title is required")
        
        if len(self.title) < 10:
            raise ValueError("PO title must be at least 10 characters")
        
        if self.description and len(self.description) < 50:
            raise ValueError("PO description must be at least 50 characters if provided")
        
        if not (0 <= float(self.target_attainment) <= 100):
            raise ValueError("Target attainment must be between 0 and 100")
    
    def update(
        self,
        title: Optional[str] = None,
        description: Optional[str] = None,
        target_attainment: Optional[Decimal] = None
    ) -> None:
        """
        Update PO attributes
        
        Args:
            title: New title
            description: New description
            target_attainment: New target attainment
        """
        if title is not None:
            self.title = title.strip()
        
        if description is not None:
            self.description = description.strip() if description else None
        
        if target_attainment is not None:
            self.target_attainment = target_attainment
        
        self._validate()

