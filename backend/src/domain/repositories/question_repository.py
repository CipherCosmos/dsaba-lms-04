"""
Question Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.question import Question


class IQuestionRepository(IRepository[Question]):
    """
    Question repository interface
    
    Defines operations specific to Question entity
    """
    
    @abstractmethod
    async def get_by_exam(
        self,
        exam_id: int,
        section: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Get all questions for an exam
        
        Args:
            exam_id: Exam ID
            section: Optional section filter (A, B, C)
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of questions
        """
        pass
    
    @abstractmethod
    async def get_by_question_no(
        self,
        exam_id: int,
        question_no: str
    ) -> Optional[Question]:
        """
        Get question by question number for an exam
        
        Args:
            exam_id: Exam ID
            question_no: Question number
        
        Returns:
            Question if found, None otherwise
        """
        pass

