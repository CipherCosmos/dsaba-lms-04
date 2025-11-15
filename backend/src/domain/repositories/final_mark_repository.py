"""
Final Mark Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.final_mark import FinalMark


class IFinalMarkRepository(IRepository[FinalMark]):
    """
    Final Mark repository interface
    
    Defines operations specific to FinalMark entity
    """
    
    @abstractmethod
    async def get_by_student_semester(
        self,
        student_id: int,
        semester_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[FinalMark]:
        """
        Get all final marks for a student in a semester
        
        Args:
            student_id: Student ID
            semester_id: Semester ID
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of final marks
        """
        pass
    
    @abstractmethod
    async def get_by_student_subject(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int
    ) -> Optional[FinalMark]:
        """
        Get final mark for a student in a subject for a semester
        
        Args:
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
        
        Returns:
            Final mark if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_semester(
        self,
        semester_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[FinalMark]:
        """
        Get all final marks for a semester
        
        Args:
            semester_id: Semester ID
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of final marks
        """
        pass

