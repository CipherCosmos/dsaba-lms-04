"""
Internal Mark Repository Interface
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.entities.internal_mark import InternalMark
from src.infrastructure.database.models import MarksWorkflowState, MarkComponentType


class IInternalMarkRepository(ABC):
    """Internal Mark repository interface"""
    
    @abstractmethod
    async def create(self, internal_mark: InternalMark) -> InternalMark:
        """Create a new internal mark"""
        pass
    
    @abstractmethod
    async def get_by_id(self, mark_id: int) -> Optional[InternalMark]:
        """Get internal mark by ID"""
        pass
    
    @abstractmethod
    async def get_by_student_subject(
        self,
        student_id: int,
        subject_assignment_id: int,
        component_type: MarkComponentType
    ) -> Optional[InternalMark]:
        """Get internal mark by student, subject, and component"""
        pass
    
    @abstractmethod
    async def get_by_student(
        self,
        student_id: int,
        semester_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all internal marks for a student with pagination"""
        pass
    
    @abstractmethod
    async def get_by_subject_assignment(
        self,
        subject_assignment_id: int,
        workflow_state: Optional[MarksWorkflowState] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all internal marks for a subject assignment with pagination"""
        pass
    
    @abstractmethod
    async def get_by_workflow_state(
        self,
        workflow_state: MarksWorkflowState,
        department_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 1000
    ) -> List[InternalMark]:
        """Get all marks in a specific workflow state with pagination"""
        pass
    
    @abstractmethod
    async def update(self, internal_mark: InternalMark) -> InternalMark:
        """Update internal mark"""
        pass
    
    @abstractmethod
    async def delete(self, mark_id: int) -> bool:
        """Delete internal mark"""
        pass
    
    @abstractmethod
    async def bulk_create(self, marks: List[InternalMark]) -> List[InternalMark]:
        """Bulk create internal marks"""
        pass

