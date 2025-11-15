"""
Course Outcome Service
Business logic for Course Outcome management
"""

from typing import List, Optional
from decimal import Decimal

from src.domain.repositories.course_outcome_repository import ICourseOutcomeRepository
from src.domain.repositories.subject_repository import ISubjectRepository
from src.domain.entities.course_outcome import CourseOutcome
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError, ValidationError


class CourseOutcomeService:
    """
    Course Outcome service
    
    Handles business logic for Course Outcome operations
    """
    
    def __init__(
        self,
        co_repository: ICourseOutcomeRepository,
        subject_repository: ISubjectRepository
    ):
        self.co_repository = co_repository
        self.subject_repository = subject_repository
    
    async def create_co(
        self,
        subject_id: int,
        code: str,
        title: str,
        description: Optional[str] = None,
        target_attainment: Decimal = Decimal("70.0"),
        l1_threshold: Decimal = Decimal("60.0"),
        l2_threshold: Decimal = Decimal("70.0"),
        l3_threshold: Decimal = Decimal("80.0")
    ) -> CourseOutcome:
        """
        Create a new Course Outcome
        
        Args:
            subject_id: Subject ID
            code: CO code (e.g., "CO1")
            title: CO title
            description: CO description
            target_attainment: Target attainment percentage
            l1_threshold: Level 1 threshold
            l2_threshold: Level 2 threshold
            l3_threshold: Level 3 threshold
        
        Returns:
            Created Course Outcome
        
        Raises:
            EntityNotFoundError: If subject doesn't exist
            EntityAlreadyExistsError: If CO code already exists
        """
        # Verify subject exists
        subject = await self.subject_repository.get_by_id(subject_id)
        if not subject:
            raise EntityNotFoundError("Subject", subject_id)
        
        # Check if code already exists
        if await self.co_repository.code_exists(subject_id, code):
            raise EntityAlreadyExistsError("CourseOutcome", "code", code)
        
        # Create CO entity
        co = CourseOutcome(
            id=None,
            subject_id=subject_id,
            code=code,
            title=title,
            description=description,
            target_attainment=target_attainment,
            l1_threshold=l1_threshold,
            l2_threshold=l2_threshold,
            l3_threshold=l3_threshold
        )
        
        return await self.co_repository.create(co)
    
    async def get_co(self, co_id: int) -> CourseOutcome:
        """
        Get Course Outcome by ID
        
        Args:
            co_id: CO ID
        
        Returns:
            Course Outcome
        
        Raises:
            EntityNotFoundError: If CO doesn't exist
        """
        co = await self.co_repository.get_by_id(co_id)
        if not co:
            raise EntityNotFoundError("CourseOutcome", co_id)
        
        return co
    
    async def get_cos_by_subject(
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
            List of Course Outcomes
        """
        return await self.co_repository.get_by_subject(subject_id, skip, limit)
    
    async def update_co(
        self,
        co_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        target_attainment: Optional[Decimal] = None,
        l1_threshold: Optional[Decimal] = None,
        l2_threshold: Optional[Decimal] = None,
        l3_threshold: Optional[Decimal] = None
    ) -> CourseOutcome:
        """
        Update Course Outcome
        
        Args:
            co_id: CO ID
            title: New title
            description: New description
            target_attainment: New target attainment
            l1_threshold: New L1 threshold
            l2_threshold: New L2 threshold
            l3_threshold: New L3 threshold
        
        Returns:
            Updated Course Outcome
        
        Raises:
            EntityNotFoundError: If CO doesn't exist
        """
        co = await self.get_co(co_id)
        
        # Update fields
        co.update(
            title=title,
            description=description,
            target_attainment=target_attainment,
            l1_threshold=l1_threshold,
            l2_threshold=l2_threshold,
            l3_threshold=l3_threshold
        )
        
        return await self.co_repository.update(co)
    
    async def delete_co(self, co_id: int) -> bool:
        """
        Delete Course Outcome
        
        Args:
            co_id: CO ID
        
        Returns:
            True if deleted, False otherwise
        
        Raises:
            EntityNotFoundError: If CO doesn't exist
        """
        co = await self.get_co(co_id)
        return await self.co_repository.delete(co.id)

