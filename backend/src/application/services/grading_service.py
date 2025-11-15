"""
Grading Service
Business logic for SGPA/CGPA calculation and grading
"""

from typing import List, Optional
from decimal import Decimal

from src.domain.repositories.final_mark_repository import IFinalMarkRepository
from src.domain.repositories.subject_repository import ISubjectRepository
from src.domain.entities.final_mark import FinalMark
from src.domain.entities.subject import Subject
from src.domain.exceptions import EntityNotFoundError
from sqlalchemy.orm import Session


class GradingService:
    """
    Grading service
    
    Handles SGPA/CGPA calculation and grade assignment
    """
    
    def __init__(
        self,
        final_mark_repository: IFinalMarkRepository,
        subject_repository: ISubjectRepository
    ):
        self.final_mark_repository = final_mark_repository
        self.subject_repository = subject_repository
    
    async def calculate_sgpa(
        self,
        student_id: int,
        semester_id: int
    ) -> Decimal:
        """
        Calculate Semester GPA (SGPA) for a student
        
        Formula: SGPA = Σ(grade_point × credits) / Σ(credits)
        
        Args:
            student_id: Student ID
            semester_id: Semester ID
        
        Returns:
            SGPA (0-10 scale)
        
        Raises:
            EntityNotFoundError: If no final marks found
        """
        # Get all final marks for student in semester
        final_marks = await self.final_mark_repository.get_by_student_semester(
            student_id=student_id,
            semester_id=semester_id
        )
        
        if not final_marks:
            raise EntityNotFoundError(
                "FinalMarks",
                f"student_id={student_id}, semester_id={semester_id}"
            )
        
        total_grade_points = Decimal("0")
        total_credits = Decimal("0")
        
        for final_mark in final_marks:
            # Get subject to get credits via subject_assignment
            # We need to fetch the subject_assignment and then the subject
            grade_point = final_mark.get_grade_point()
            
            # Fetch credits from subject via subject_assignment
            # Note: This requires accessing the database through repository
            # We'll need to get subject_assignment_id from final_mark
            if hasattr(final_mark, 'subject_assignment_id') and final_mark.subject_assignment_id:
                # Get subject via subject_assignment
                subject = await self._get_subject_from_assignment(final_mark.subject_assignment_id)
                credits = Decimal(str(subject.credits)) if subject else Decimal("3")
            else:
                # Fallback to default if assignment not available
                credits = Decimal("3")
            
            total_grade_points += grade_point * credits
            total_credits += credits
        
        if total_credits == 0:
            return Decimal("0")
        
        sgpa = total_grade_points / total_credits
        return sgpa
    
    async def calculate_cgpa(
        self,
        student_id: int,
        up_to_semester_id: Optional[int] = None
    ) -> Decimal:
        """
        Calculate Cumulative GPA (CGPA) for a student
        
        Formula: CGPA = Σ(grade_point × credits) / Σ(credits) across all semesters
        
        Args:
            student_id: Student ID
            up_to_semester_id: Optional semester ID to calculate up to
        
        Returns:
            CGPA (0-10 scale)
        """
        # Get all final marks for student (across all semesters)
        filters = {"student_id": student_id}
        final_marks = await self.final_mark_repository.get_all(filters=filters)
        
        # Filter by semester_id if specified
        if up_to_semester_id:
            final_marks = [fm for fm in final_marks if fm.semester_id <= up_to_semester_id]
        
        if not final_marks:
            return Decimal("0")
        
        total_grade_points = Decimal("0")
        total_credits = Decimal("0")
        
        for final_mark in final_marks:
            grade_point = final_mark.get_grade_point()
            
            # Fetch credits from subject via subject_assignment
            if hasattr(final_mark, 'subject_assignment_id') and final_mark.subject_assignment_id:
                subject = await self._get_subject_from_assignment(final_mark.subject_assignment_id)
                credits = Decimal(str(subject.credits)) if subject else Decimal("3")
            else:
                credits = Decimal("3")
            
            total_grade_points += grade_point * credits
            total_credits += credits
        
        if total_credits == 0:
            return Decimal("0")
        
        cgpa = total_grade_points / total_credits
        return cgpa
    
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
        sgpa = await self.calculate_sgpa(student_id, semester_id)
        
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
        cgpa = await self.calculate_cgpa(student_id)
        
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
        # This is a helper method to get subject via assignment
        # We need to query the database through the subject repository
        # Since we have subject_repository, we can use it to get subject
        # But we need subject_assignment -> subject relationship
        
        # For now, we'll need to access the database session
        # This is a limitation - ideally we'd have a SubjectAssignmentRepository
        # But for now, we can work around it
        
        # Try to get subject via subject_assignment
        # We'll need to import the model and query directly
        from src.infrastructure.database.models import SubjectAssignmentModel, SubjectModel
        from sqlalchemy.orm import Session
        
        # Get database session from repository if available
        if hasattr(self.final_mark_repository, 'db'):
            db: Session = self.final_mark_repository.db
            assignment = db.query(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.id == subject_assignment_id
            ).first()
            
            if assignment and assignment.subject_id:
                subject_model = db.query(SubjectModel).filter(
                    SubjectModel.id == assignment.subject_id
                ).first()
                
                if subject_model:
                    return Subject(
                        id=subject_model.id,
                        code=subject_model.code,
                        name=subject_model.name,
                        department_id=subject_model.department_id,
                        credits=float(subject_model.credits),
                        max_internal=float(subject_model.max_internal),
                        max_external=float(subject_model.max_external),
                        is_active=subject_model.is_active,
                        created_at=subject_model.created_at,
                        updated_at=subject_model.updated_at
                    )
        
        return None

