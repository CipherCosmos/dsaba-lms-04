"""
Final Mark Service
Business logic for Final Mark management
"""

from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.orm import Session

from src.domain.repositories.final_mark_repository import IFinalMarkRepository
from src.domain.entities.final_mark import FinalMark
from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.application.services.co_po_attainment_service import COPOAttainmentService


class FinalMarkService:
    """
    Final Mark service

    Handles business logic for Final Mark operations
    """

    def __init__(
        self,
        final_mark_repository: IFinalMarkRepository,
        db: Optional[Session] = None
    ):
        self.final_mark_repository = final_mark_repository
        self.db = db
        self.co_po_attainment_service = COPOAttainmentService(db) if db else None
    
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
        Create or update final mark with CO attainment calculation

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
        # Get subject ID from subject assignment
        from src.infrastructure.database.models import SubjectAssignmentModel
        if self.db:
            subject_assignment = self.db.query(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.id == subject_assignment_id
            ).first()
            subject_id = subject_assignment.subject_id if subject_assignment else None
        else:
            subject_id = None

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

            # Calculate and update CO attainment if service is available
            if self.co_po_attainment_service and subject_id:
                try:
                    co_attainment = self.co_po_attainment_service.calculate_student_co_attainment(
                        student_id=student_id,
                        subject_id=subject_id,
                        semester_id=semester_id
                    )
                    existing.update_co_attainment(co_attainment)
                except Exception as e:
                    # Log error but don't fail the operation
                    print(f"Warning: Failed to calculate CO attainment: {e}")

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

            # Calculate CO attainment if service is available
            if self.co_po_attainment_service and subject_id:
                try:
                    co_attainment = self.co_po_attainment_service.calculate_student_co_attainment(
                        student_id=student_id,
                        subject_id=subject_id,
                        semester_id=semester_id
                    )
                    final_mark.update_co_attainment(co_attainment)
                except Exception as e:
                    # Log error but don't fail the operation
                    print(f"Warning: Failed to calculate CO attainment: {e}")

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

