"""
Question Entity
Domain entity for Exam Questions
"""

from datetime import datetime
from typing import Optional
from decimal import Decimal

from .base import Entity


class Question(Entity):
    """
    Question entity
    
    Represents a question in an exam
    Supports sections (A, B, C), optional questions, and sub-questions
    """
    
    def __init__(
        self,
        id: Optional[int],
        exam_id: int,
        question_no: str,
        question_text: str,
        section: str,
        marks_per_question: Decimal,
        required_count: int = 1,
        optional_count: int = 0,
        blooms_level: Optional[str] = None,
        difficulty: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        """
        Initialize Question
        
        Args:
            id: Question ID (None for new)
            exam_id: Exam this question belongs to
            question_no: Question number (e.g., "1", "2a", "3")
            question_text: Question text/content
            section: Section (A, B, or C)
            marks_per_question: Marks for this question
            required_count: Number of required answers (default 1)
            optional_count: Number of optional answers (default 0)
            blooms_level: Bloom's taxonomy level (L1-L6)
            difficulty: Difficulty level (easy, medium, hard)
            created_at: Creation timestamp
        """
        super().__init__(id)
        self.exam_id = exam_id
        self.question_no = question_no.strip()
        self.question_text = question_text.strip()
        self.section = section.upper().strip()
        self.marks_per_question = marks_per_question
        self.required_count = required_count
        self.optional_count = optional_count
        self.blooms_level = blooms_level.upper() if blooms_level else None
        self.difficulty = difficulty.lower() if difficulty else None
        # Set timestamps if provided
        if created_at:
            self._created_at = created_at
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate question data"""
        if not self.question_no:
            raise ValueError("Question number is required")
        
        if not self.question_text:
            raise ValueError("Question text is required")
        
        if len(self.question_text) < 10:
            raise ValueError("Question text must be at least 10 characters")
        
        if self.section not in ["A", "B", "C"]:
            raise ValueError("Section must be A, B, or C")
        
        if float(self.marks_per_question) <= 0:
            raise ValueError("Marks per question must be greater than 0")
        
        if self.required_count < 1:
            raise ValueError("Required count must be at least 1")
        
        if self.optional_count < 0:
            raise ValueError("Optional count cannot be negative")
        
        if self.blooms_level and not self.blooms_level.startswith("L") and len(self.blooms_level) == 2:
            # Allow L1-L6 format
            if self.blooms_level[1] not in ["1", "2", "3", "4", "5", "6"]:
                raise ValueError("Bloom's level must be L1-L6")
        
        if self.difficulty and self.difficulty not in ["easy", "medium", "hard"]:
            raise ValueError("Difficulty must be easy, medium, or hard")
    
    def update(
        self,
        question_text: Optional[str] = None,
        section: Optional[str] = None,
        marks_per_question: Optional[Decimal] = None,
        required_count: Optional[int] = None,
        optional_count: Optional[int] = None,
        blooms_level: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> None:
        """
        Update question attributes
        
        Args:
            question_text: New question text
            section: New section
            marks_per_question: New marks
            required_count: New required count
            optional_count: New optional count
            blooms_level: New Bloom's level
            difficulty: New difficulty
        """
        if question_text is not None:
            self.question_text = question_text.strip()
        
        if section is not None:
            self.section = section.upper().strip()
        
        if marks_per_question is not None:
            self.marks_per_question = marks_per_question
        
        if required_count is not None:
            self.required_count = required_count
        
        if optional_count is not None:
            self.optional_count = optional_count
        
        if blooms_level is not None:
            self.blooms_level = blooms_level.upper()
        
        if difficulty is not None:
            self.difficulty = difficulty.lower()
        
        self._validate()
        self._updated_at = datetime.utcnow()
    
    def is_optional(self) -> bool:
        """Check if question has optional answers"""
        return self.optional_count > 0
    
    def total_questions(self) -> int:
        """Get total number of questions (required + optional)"""
        return self.required_count + self.optional_count

