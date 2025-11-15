"""
Sub-Question Entity
Domain entity for Sub-Questions (parts of main questions)
"""

from datetime import datetime
from typing import Optional
from decimal import Decimal

from .base import Entity


class SubQuestion(Entity):
    """
    Sub-Question entity
    
    Represents a sub-question (part) of a main question
    """
    
    def __init__(
        self,
        id: Optional[int],
        question_id: int,
        sub_no: str,
        sub_text: Optional[str],
        marks: Decimal,
        created_at: Optional[datetime] = None
    ):
        """
        Initialize Sub-Question
        
        Args:
            id: Sub-question ID (None for new)
            question_id: Parent question ID
            sub_no: Sub-question number (e.g., "a", "b", "i", "ii")
            sub_text: Sub-question text/content
            marks: Marks for this sub-question
            created_at: Creation timestamp
        """
        super().__init__(id)
        self._created_at = created_at
        self.question_id = question_id
        self.sub_no = sub_no.strip()
        self.sub_text = sub_text.strip() if sub_text else None
        self.marks = marks
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate sub-question data"""
        if not self.sub_no:
            raise ValueError("Sub-question number is required")
        
        if float(self.marks) <= 0:
            raise ValueError("Marks must be greater than 0")
    
    def update(
        self,
        sub_text: Optional[str] = None,
        marks: Optional[Decimal] = None
    ) -> None:
        """
        Update sub-question attributes
        
        Args:
            sub_text: New sub-question text
            marks: New marks
        """
        if sub_text is not None:
            self.sub_text = sub_text.strip() if sub_text else None
        
        if marks is not None:
            self.marks = marks
        
        self._validate()
        self.updated_at = datetime.utcnow()

