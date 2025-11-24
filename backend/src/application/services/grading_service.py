"""
Grading Service
Business logic for SGPA/CGPA calculation and grading
"""

from typing import List, Optional
from decimal import Decimal

from src.domain.repositories.final_mark_repository import IFinalMarkRepository
from src.domain.repositories.subject_repository import ISubjectRepository
from src.domain.repositories.subject_assignment_repository import ISubjectAssignmentRepository
from src.domain.entities.final_mark import FinalMark
from src.domain.entities.subject import Subject
from src.domain.entities.subject_assignment import SubjectAssignment
from src.domain.exceptions import EntityNotFoundError
from src.application.services.smart_marks_service import SmartMarksService
from sqlalchemy.orm import Session


class GradingService:
    """
    Grading service
    
    Handles SGPA/CGPA calculation and grade assignment
    """
    
    def __init__(
        self,
        final_mark_repository: IFinalMarkRepository,
        subject_repository: ISubjectRepository,
        subject_assignment_repository: ISubjectAssignmentRepository,
        db: Session
    ):
        self.final_mark_repository = final_mark_repository
        self.subject_repository = subject_repository
        self.subject_assignment_repository = subject_assignment_repository
        self.smart_marks_service = SmartMarksService(db)
    
    
    async def update_sgpa_for_semester(
        self,
        student_id: int,
        semester_id: int
    ) -> FinalMark:
        """
        Update SGPA for all final marks in a semester
        
        Args:
            student_id: Student ID
            semester_id: Semester ID
        
        Returns:
            Updated final marks (first one, for reference)
        """
        sgpa = self.smart_marks_service.calculate_sgpa(student_id, semester_id)
        
        # Update all final marks for this student in this semester
        final_marks = await self.final_mark_repository.get_by_student_semester(
            student_id=student_id,
            semester_id=semester_id
        )
        
        updated_marks = []
        for final_mark in final_marks:
            final_mark.sgpa = sgpa
            updated = await self.final_mark_repository.update(final_mark)
            updated_marks.append(updated)
        
        return updated_marks[0] if updated_marks else None
    
    async def update_cgpa_for_student(
        self,
        student_id: int
    ) -> None:
        """
        Update CGPA for all final marks of a student
        
        Args:
            student_id: Student ID
        """
        cgpa = self.smart_marks_service.calculate_cgpa(student_id)
        
        # Get all final marks for student
        filters = {"student_id": student_id}
        final_marks = await self.final_mark_repository.get_all(filters=filters)
        
        # Update CGPA for all marks
        for final_mark in final_marks:
            final_mark.cgpa = cgpa
            await self.final_mark_repository.update(final_mark)
    
    async def _get_subject_from_assignment(self, subject_assignment_id: int) -> Optional[Subject]:
        """
        Get subject from subject_assignment_id

        Args:
            subject_assignment_id: Subject assignment ID

        Returns:
            Subject entity or None
        """
        # Get subject assignment first
        assignment = await self.subject_assignment_repository.get_by_id(subject_assignment_id)
        if not assignment:
            return None

        # Get subject using subject repository
        return await self.subject_repository.get_by_id(assignment.subject_id)

