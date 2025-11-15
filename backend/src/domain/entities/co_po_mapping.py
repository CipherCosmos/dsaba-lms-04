"""
CO-PO Mapping Entity
Domain entity for mapping Course Outcomes to Program Outcomes
"""

from datetime import datetime
from typing import Optional

from .base import Entity


class COPOMapping(Entity):
    """
    CO-PO Mapping entity
    
    Represents the mapping between a Course Outcome (CO) and a Program Outcome (PO)
    with a strength indicator (1-3)
    """
    
    def __init__(
        self,
        id: Optional[int],
        co_id: int,
        po_id: int,
        strength: int,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize CO-PO Mapping
        
        Args:
            id: Mapping ID (None for new)
            co_id: Course Outcome ID
            po_id: Program Outcome ID
            strength: Mapping strength (1=Low, 2=Medium, 3=High)
            created_at: Creation timestamp
            updated_at: Last update timestamp
        """
        super().__init__(id)
        self._created_at = created_at
        self._updated_at = updated_at
        self.co_id = co_id
        self.po_id = po_id
        self.strength = strength
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate mapping data"""
        if not (1 <= self.strength <= 3):
            raise ValueError("Strength must be between 1 and 3 (1=Low, 2=Medium, 3=High)")
    
    def update_strength(self, strength: int) -> None:
        """
        Update mapping strength
        
        Args:
            strength: New strength value (1-3)
        """
        if not (1 <= strength <= 3):
            raise ValueError("Strength must be between 1 and 3")
        
        self.strength = strength
        self._updated_at = datetime.utcnow()

