"""
Marks Service
Business logic for marks management with smart calculation and edit window
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal

from src.domain.repositories.mark_repository import IMarkRepository
from src.domain.repositories.exam_repository import IExamRepository
from src.domain.entities.mark import Mark
from src.domain.entities.exam import Exam
from src.domain.enums.exam_type import ExamType, ExamStatus
from src.domain.exceptions import (
    EntityNotFoundError,
    BusinessRuleViolationError,
    ValidationError,
    AuthorizationError
)
from src.config import settings


class MarksService:
    """
    Marks service
    
    Coordinates marks management operations with business rules:
    - 7-day edit window enforcement
    - Smart marks calculation (optional questions)
    - Best internal calculation
    - Bulk operations
    """
    
    def __init__(
        self,
        mark_repository: IMarkRepository,
        exam_repository: IExamRepository
    ):
        self.mark_repository = mark_repository
        self.exam_repository = exam_repository
    
    async def enter_mark(
        self,
        exam_id: int,
        student_id: int,
        question_id: int,
        marks_obtained: float,
        entered_by: int,
        sub_question_id: Optional[int] = None
    ) -> Mark:
        """
        Enter a single mark
        
        Args:
            exam_id: Exam ID
            student_id: Student ID
            question_id: Question ID
            marks_obtained: Marks obtained
            entered_by: User ID entering the mark
            sub_question_id: Optional sub-question ID
        
        Returns:
            Created Mark entity
        
        Raises:
            EntityNotFoundError: If exam not found
            BusinessRuleViolationError: If exam is not active
            ValidationError: If marks are invalid
        """
        # Verify exam exists and is active
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        
        if exam.status != ExamStatus.ACTIVE:
            raise BusinessRuleViolationError(
                rule="marks_entry",
                message=f"Cannot enter marks for exam in {exam.status.value} status"
            )
        
        # Validate marks
        if marks_obtained < 0:
            raise ValidationError(
                "Marks cannot be negative",
                field="marks_obtained",
                value=marks_obtained
            )
        
        # Create mark entity
        mark = Mark(
            exam_id=exam_id,
            student_id=student_id,
            question_id=question_id,
            marks_obtained=marks_obtained,
            sub_question_id=sub_question_id,
            entered_by=entered_by
        )
        
        return await self.mark_repository.create(mark)
    
    async def update_mark(
        self,
        mark_id: int,
        new_marks: float,
        updated_by: int,
        can_override: bool = False,
        reason: Optional[str] = None
    ) -> Mark:
        """
        Update a mark with 7-day edit window enforcement
        
        Args:
            mark_id: Mark ID
            new_marks: New marks value
            updated_by: User ID making the update
            can_override: Whether user can override edit window (admin/HOD)
            reason: Reason for override (required if can_override=True)
        
        Returns:
            Updated Mark entity
        
        Raises:
            EntityNotFoundError: If mark not found
            BusinessRuleViolationError: If edit window expired and no override
            ValidationError: If marks are invalid
        """
        # Get mark
        mark = await self.mark_repository.get_by_id(mark_id)
        
        # Get exam to check status
        exam = await self.exam_repository.get_by_id(mark.exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", mark.exam_id)
        
        # Check if exam is locked or published
        if exam.status in [ExamStatus.LOCKED, ExamStatus.PUBLISHED]:
            if not can_override:
                raise BusinessRuleViolationError(
                    rule="marks_update",
                    message=f"Cannot update marks for exam in {exam.status.value} status"
                )
        
        # Check 7-day edit window
        if not can_override:
            days_since_entry = (datetime.utcnow() - mark.entered_at).days
            if days_since_entry > settings.MARKS_EDIT_WINDOW_DAYS:
                raise BusinessRuleViolationError(
                    rule="edit_window_expired",
                    message=f"Marks can only be edited within {settings.MARKS_EDIT_WINDOW_DAYS} days of entry"
                )
        else:
            # Override requires reason
            if not reason:
                raise ValidationError(
                    "Reason is required when overriding edit window",
                    field="reason"
                )
        
        # Validate new marks
        if new_marks < 0:
            raise ValidationError(
                "Marks cannot be negative",
                field="marks_obtained",
                value=new_marks
            )
        
        # Update mark
        mark.update_marks(
            new_marks=new_marks,
            updated_by=updated_by,
            can_override=can_override,
            reason=reason
        )
        
        return await self.mark_repository.update(mark)
    
    async def bulk_enter_marks(
        self,
        exam_id: int,
        marks_data: List[Dict[str, Any]],
        entered_by: int
    ) -> List[Mark]:
        """
        Enter marks for multiple students/questions at once
        
        Args:
            exam_id: Exam ID
            marks_data: List of mark data dicts with keys:
                - student_id: int
                - question_id: int
                - marks_obtained: float
                - sub_question_id: Optional[int]
            entered_by: User ID entering the marks
        
        Returns:
            List of created Mark entities
        
        Raises:
            EntityNotFoundError: If exam not found
            BusinessRuleViolationError: If exam is not active
            ValidationError: If any marks are invalid
        """
        # Verify exam exists and is active
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        
        if exam.status != ExamStatus.ACTIVE:
            raise BusinessRuleViolationError(
                rule="marks_entry",
                message=f"Cannot enter marks for exam in {exam.status.value} status"
            )
        
        # Validate and create marks
        marks = []
        for data in marks_data:
            # Validate required fields
            if 'student_id' not in data or 'question_id' not in data or 'marks_obtained' not in data:
                raise ValidationError(
                    "Missing required fields: student_id, question_id, marks_obtained",
                    field="marks_data"
                )
            
            # Validate marks
            marks_obtained = data['marks_obtained']
            if marks_obtained < 0:
                raise ValidationError(
                    f"Marks cannot be negative for student {data['student_id']}, question {data['question_id']}",
                    field="marks_obtained",
                    value=marks_obtained
                )
            
            # Create mark entity
            mark = Mark(
                exam_id=exam_id,
                student_id=data['student_id'],
                question_id=data['question_id'],
                marks_obtained=marks_obtained,
                sub_question_id=data.get('sub_question_id'),
                entered_by=entered_by
            )
            marks.append(mark)
        
        # Bulk create
        return await self.mark_repository.bulk_create(marks)
    
    async def get_student_exam_marks(
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
            List of Mark entities
        """
        return await self.mark_repository.get_by_exam_and_student(
            exam_id=exam_id,
            student_id=student_id
        )
    
    async def calculate_student_total(
        self,
        exam_id: int,
        student_id: int,
        question_max_marks: Dict[int, float],
        optional_questions: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Calculate total marks for a student with smart calculation
        
        Smart calculation handles optional questions:
        - If question is optional and student answered it, include it
        - If question is optional and student didn't answer, exclude it
        - Required questions are always included
        
        Args:
            exam_id: Exam ID
            student_id: Student ID
            question_max_marks: Dict mapping question_id to max marks
            optional_questions: Optional list of question IDs that are optional
        
        Returns:
            Dict with:
                - total_obtained: float
                - total_max: float
                - percentage: float
                - questions_counted: List[int]
        """
        # Get all marks for student
        marks = await self.get_student_exam_marks(exam_id, student_id)
        
        # Group marks by question
        marks_by_question: Dict[int, float] = {}
        for mark in marks:
            question_id = mark.question_id
            if question_id not in marks_by_question:
                marks_by_question[question_id] = 0.0
            marks_by_question[question_id] += mark.marks_obtained
        
        # Calculate totals
        optional_questions_set = set(optional_questions or [])
        total_obtained = 0.0
        total_max = 0.0
        questions_counted = []
        
        for question_id, max_marks in question_max_marks.items():
            is_optional = question_id in optional_questions_set
            student_marks = marks_by_question.get(question_id, 0.0)
            
            if is_optional:
                # Optional question: include only if student answered
                if student_marks > 0:
                    total_obtained += student_marks
                    total_max += max_marks
                    questions_counted.append(question_id)
            else:
                # Required question: always include
                total_obtained += student_marks
                total_max += max_marks
                questions_counted.append(question_id)
        
        # Calculate percentage
        percentage = (total_obtained / total_max * 100) if total_max > 0 else 0.0
        
        return {
            "total_obtained": round(total_obtained, 2),
            "total_max": round(total_max, 2),
            "percentage": round(percentage, 2),
            "questions_counted": questions_counted
        }
    
    async def calculate_best_internal(
        self,
        subject_assignment_id: int,
        student_id: int,
        internal_1_marks: Optional[float],
        internal_2_marks: Optional[float]
    ) -> Dict[str, Any]:
        """
        Calculate best internal marks
        
        Uses the method specified in settings (best, avg, weighted)
        
        Args:
            subject_assignment_id: Subject assignment ID
            student_id: Student ID
            internal_1_marks: Internal 1 marks (if available)
            internal_2_marks: Internal 2 marks (if available)
        
        Returns:
            Dict with:
                - best_internal: float
                - method: str
                - internal_1: Optional[float]
                - internal_2: Optional[float]
        """
        method = settings.INTERNAL_CALCULATION_METHOD
        
        # Filter out None values
        available_marks = [m for m in [internal_1_marks, internal_2_marks] if m is not None]
        
        if not available_marks:
            return {
                "best_internal": 0.0,
                "method": method,
                "internal_1": internal_1_marks,
                "internal_2": internal_2_marks
            }
        
        if method == "best":
            # Take the best (highest) of the two
            best_internal = max(available_marks)
        elif method == "avg":
            # Take average
            best_internal = sum(available_marks) / len(available_marks)
        elif method == "weighted":
            # Weighted average (Internal 1: 40%, Internal 2: 60%)
            if len(available_marks) == 2:
                best_internal = (internal_1_marks * 0.4) + (internal_2_marks * 0.6)
            else:
                # If only one available, use it
                best_internal = available_marks[0]
        else:
            # Default to best
            best_internal = max(available_marks)
        
        return {
            "best_internal": round(best_internal, 2),
            "method": method,
            "internal_1": internal_1_marks,
            "internal_2": internal_2_marks
        }
    
    async def get_exam_marks(
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
            List of Mark entities
        """
        return await self.mark_repository.get_by_exam(
            exam_id=exam_id,
            skip=skip,
            limit=limit
        )
    
    async def get_student_marks(
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
            List of Mark entities
        """
        return await self.mark_repository.get_by_student(
            student_id=student_id,
            skip=skip,
            limit=limit
        )
    
    async def delete_mark(self, mark_id: int) -> bool:
        """
        Delete a mark
        
        Args:
            mark_id: Mark ID
        
        Returns:
            True if deleted, False if not found
        
        Note:
            Should check if exam is locked/published before deletion
        """
        return await self.mark_repository.delete(mark_id)

