"""
Course Outcome Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.course_outcome import CourseOutcome


class ICourseOutcomeRepository(IRepository[CourseOutcome]):
    """
    Course Outcome repository interface
    
    Defines operations specific to CourseOutcome entity
    """
    
    @abstractmethod
    async def get_by_subject(
        self,
        subject_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[CourseOutcome]:
        """
        Get all COs for a subject
        
        Args:
            subject_id: Subject ID
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of course outcomes
        """
        pass
    
    @abstractmethod
    async def get_by_code(
        self,
        subject_id: int,
        code: str
    ) -> Optional[CourseOutcome]:
        """
        Get CO by code for a subject
        
        Args:
            subject_id: Subject ID
            code: CO code (e.g., "CO1")
        
        Returns:
            Course outcome if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def code_exists(
        self,
        subject_id: int,
        code: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if CO code already exists for a subject
        
        Args:
            subject_id: Subject ID
            code: CO code to check
            exclude_id: Optional ID to exclude from check (for updates)
        
        Returns:
            True if exists, False otherwise
        """
        pass

