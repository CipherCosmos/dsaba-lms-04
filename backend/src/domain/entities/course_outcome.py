"""
Course Outcome Entity
Domain entity for Course Outcomes (CO)
"""

from datetime import datetime
from typing import Optional
from decimal import Decimal

from .base import Entity


class CourseOutcome(Entity):
    """
    Course Outcome entity
    
    Represents a Course Outcome (CO) for a subject
    Used in OBE (Outcome-Based Education) framework
    """
    
    def __init__(
        self,
        id: Optional[int],
        subject_id: int,
        code: str,
        title: str,
        description: Optional[str] = None,
        target_attainment: Decimal = Decimal("70.0"),
        l1_threshold: Decimal = Decimal("60.0"),
        l2_threshold: Decimal = Decimal("70.0"),
        l3_threshold: Decimal = Decimal("80.0"),
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize Course Outcome
        
        Args:
            id: CO ID (None for new)
            subject_id: Subject this CO belongs to
            code: CO code (e.g., "CO1", "CO2")
            title: CO title
            description: CO description
            target_attainment: Target attainment percentage (default 70%)
            l1_threshold: Level 1 threshold (default 60%)
            l2_threshold: Level 2 threshold (default 70%)
            l3_threshold: Level 3 threshold (default 80%)
            created_at: Creation timestamp
            updated_at: Last update timestamp
        """
        super().__init__(id)
        self._created_at = created_at
        self._updated_at = updated_at
        self.subject_id = subject_id
        self.code = code.upper().strip()
        self.title = title.strip()
        self.description = description.strip() if description else None
        self.target_attainment = target_attainment
        self.l1_threshold = l1_threshold
        self.l2_threshold = l2_threshold
        self.l3_threshold = l3_threshold
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate CO data"""
        if not self.code:
            raise ValueError("CO code is required")
        
        if not self.code.startswith("CO"):
            raise ValueError("CO code must start with 'CO'")
        
        if not self.title:
            raise ValueError("CO title is required")
        
        if len(self.title) < 10:
            raise ValueError("CO title must be at least 10 characters")
        
        if self.description and len(self.description) < 50:
            raise ValueError("CO description must be at least 50 characters if provided")
        
        if not (0 <= float(self.target_attainment) <= 100):
            raise ValueError("Target attainment must be between 0 and 100")
        
        if not (0 <= float(self.l1_threshold) <= 100):
            raise ValueError("L1 threshold must be between 0 and 100")
        
        if not (0 <= float(self.l2_threshold) <= 100):
            raise ValueError("L2 threshold must be between 0 and 100")
        
        if not (0 <= float(self.l3_threshold) <= 100):
            raise ValueError("L3 threshold must be between 0 and 100")
        
        # Ensure thresholds are in order
        if not (float(self.l1_threshold) <= float(self.l2_threshold) <= float(self.l3_threshold)):
            raise ValueError("Thresholds must be in order: L1 <= L2 <= L3")
    
    def update(
        self,
        title: Optional[str] = None,
        description: Optional[str] = None,
        target_attainment: Optional[Decimal] = None,
        l1_threshold: Optional[Decimal] = None,
        l2_threshold: Optional[Decimal] = None,
        l3_threshold: Optional[Decimal] = None
    ) -> None:
        """
        Update CO attributes
        
        Args:
            title: New title
            description: New description
            target_attainment: New target attainment
            l1_threshold: New L1 threshold
            l2_threshold: New L2 threshold
            l3_threshold: New L3 threshold
        """
        if title is not None:
            self.title = title.strip()
        
        if description is not None:
            self.description = description.strip() if description else None
        
        if target_attainment is not None:
            self.target_attainment = target_attainment
        
        if l1_threshold is not None:
            self.l1_threshold = l1_threshold
        
        if l2_threshold is not None:
            self.l2_threshold = l2_threshold
        
        if l3_threshold is not None:
            self.l3_threshold = l3_threshold
        
        self._validate()
        self._updated_at = datetime.utcnow()

