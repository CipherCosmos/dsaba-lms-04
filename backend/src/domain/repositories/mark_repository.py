"""
Mark Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List, Dict, Any
from .base_repository import IRepository
from ..entities.mark import Mark


class IMarkRepository(IRepository[Mark]):
    """
    Mark repository interface
    
    Defines operations specific to Mark entity
    """
    
    @abstractmethod
    async def get_by_exam_and_student(
        self,
        exam_id: int,
        student_id: int
    ) -> List[Mark]:
        """
        Get all marks for a student in an exam
        
        Args:
            exam_id: Exam ID
            student_id: Student ID
        
        Returns:
            List of marks
        """
        pass
    
    @abstractmethod
    async def get_by_exam(
        self,
        exam_id: int,
        skip: int = 0,
        limit: int = 1000
    ) -> List[Mark]:
        """
        Get all marks for an exam
        
        Args:
            exam_id: Exam ID
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of marks
        """
        pass
    
    @abstractmethod
    async def get_by_student(
        self,
        student_id: int,
        skip: int = 0,
        limit: int = 1000
    ) -> List[Mark]:
        """
        Get all marks for a student
        
        Args:
            student_id: Student ID
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of marks
        """
        pass
    
    @abstractmethod
    async def get_by_question(
        self,
        question_id: int
    ) -> List[Mark]:
        """
        Get all marks for a question
        
        Args:
            question_id: Question ID
        
        Returns:
            List of marks
        """
        pass
    
    @abstractmethod
    async def bulk_create(
        self,
        marks: List[Mark]
    ) -> List[Mark]:
        """
        Create multiple marks at once
        
        Args:
            marks: List of mark entities
        
        Returns:
            List of created marks
        """
        pass
    
    @abstractmethod
    async def bulk_update(
        self,
        marks: List[Mark]
    ) -> List[Mark]:
        """
        Update multiple marks at once
        
        Args:
            marks: List of mark entities to update
        
        Returns:
            List of updated marks
        """
        pass

