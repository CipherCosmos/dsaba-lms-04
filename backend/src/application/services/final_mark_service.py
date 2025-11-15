"""
Final Mark Service
Business logic for Final Mark management
"""

from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta

from src.domain.repositories.final_mark_repository import IFinalMarkRepository
from src.domain.entities.final_mark import FinalMark
from src.domain.exceptions import EntityNotFoundError, ValidationError


class FinalMarkService:
    """
    Final Mark service
    
    Handles business logic for Final Mark operations
    """
    
    def __init__(
        self,
        final_mark_repository: IFinalMarkRepository
    ):
        self.final_mark_repository = final_mark_repository
    
    async def create_or_update_final_mark(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int,
        internal_1: Optional[Decimal] = None,
        internal_2: Optional[Decimal] = None,
        external: Optional[Decimal] = None,
        best_internal_method: str = "best",
        max_internal: Decimal = Decimal("40"),
        max_external: Decimal = Decimal("60")
    ) -> FinalMark:
        """
        Create or update final mark
        
        Args:
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
            internal_1: Internal 1 marks
            internal_2: Internal 2 marks
            external: External marks
            best_internal_method: Method for best internal ("best", "avg", "weighted")
            max_internal: Maximum internal marks
            max_external: Maximum external marks
        
        Returns:
            Created or updated Final Mark
        """
        # Check if exists
        existing = await self.final_mark_repository.get_by_student_subject(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            semester_id=semester_id
        )
        
        if existing:
            # Update existing
            existing.update_marks(
                internal_1=internal_1 or Decimal("0"),
                internal_2=internal_2 or Decimal("0"),
                external=external or Decimal("0"),
                best_internal_method=best_internal_method
            )
            
            # Recalculate total and percentage
            max_total = max_internal + max_external
            existing.total = existing.calculate_total(max_internal, max_external)
            existing.percentage = existing.calculate_percentage(max_total)
            existing.grade = existing.assign_grade()
            
            return await self.final_mark_repository.update(existing)
        else:
            # Create new
            final_mark = FinalMark(
                id=None,
                student_id=student_id,
                subject_assignment_id=subject_assignment_id,
                semester_id=semester_id,
                internal_1=internal_1 or Decimal("0"),
                internal_2=internal_2 or Decimal("0"),
                external=external or Decimal("0")
            )
            
            # Calculate best internal
            final_mark.best_internal = final_mark.calculate_best_internal(best_internal_method)
            
            # Calculate total and percentage
            max_total = max_internal + max_external
            final_mark.total = final_mark.calculate_total(max_internal, max_external)
            final_mark.percentage = final_mark.calculate_percentage(max_total)
            final_mark.grade = final_mark.assign_grade()
            
            # Set editable until (7 days from now)
            final_mark.editable_until = date.today() + timedelta(days=7)
            
            return await self.final_mark_repository.create(final_mark)
    
    async def get_final_mark(
        self,
        final_mark_id: int
    ) -> FinalMark:
        """
        Get final mark by ID
        
        Args:
            final_mark_id: Final mark ID
        
        Returns:
            Final Mark
        
        Raises:
            EntityNotFoundError: If final mark doesn't exist
        """
        final_mark = await self.final_mark_repository.get_by_id(final_mark_id)
        if not final_mark:
            raise EntityNotFoundError("FinalMark", final_mark_id)
        
        return final_mark
    
    async def get_final_marks_by_student_semester(
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
        return await self.final_mark_repository.get_by_student_semester(
            student_id, semester_id, skip, limit
        )
    
    async def publish_final_mark(
        self,
        final_mark_id: int
    ) -> FinalMark:
        """
        Publish final mark
        
        Args:
            final_mark_id: Final mark ID
        
        Returns:
            Published Final Mark
        
        Raises:
            EntityNotFoundError: If final mark doesn't exist
        """
        final_mark = await self.get_final_mark(final_mark_id)
        final_mark.publish()
        return await self.final_mark_repository.update(final_mark)
    
    async def lock_final_mark(
        self,
        final_mark_id: int
    ) -> FinalMark:
        """
        Lock final mark (no further edits)
        
        Args:
            final_mark_id: Final mark ID
        
        Returns:
            Locked Final Mark
        
        Raises:
            EntityNotFoundError: If final mark doesn't exist
        """
        final_mark = await self.get_final_mark(final_mark_id)
        final_mark.lock()
        return await self.final_mark_repository.update(final_mark)

