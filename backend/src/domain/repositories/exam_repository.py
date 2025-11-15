"""
Exam Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List, Dict, Any
from .base_repository import IRepository
from ..entities.exam import Exam
from ..enums.exam_type import ExamType, ExamStatus


class IExamRepository(IRepository[Exam]):
    """
    Exam repository interface
    
    Defines operations specific to Exam entity
    """
    
    @abstractmethod
    async def get_by_subject_assignment(
        self,
        subject_assignment_id: int,
        exam_type: Optional[ExamType] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Exam]:
        """
        Get exams by subject assignment with pagination
        
        Args:
            subject_assignment_id: Subject assignment ID
            exam_type: Optional exam type filter
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of exams
        """
        pass
    
    @abstractmethod
    async def get_by_status(
        self,
        status: ExamStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Exam]:
        """
        Get exams by status
        
        Args:
            status: Exam status
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of exams
        """
        pass
    
    @abstractmethod
    async def exists_for_subject_assignment(
        self,
        subject_assignment_id: int,
        exam_type: ExamType
    ) -> bool:
        """
        Check if exam exists for subject assignment and type
        
        Args:
            subject_assignment_id: Subject assignment ID
            exam_type: Exam type
        
        Returns:
            True if exists, False otherwise
        """
        pass

