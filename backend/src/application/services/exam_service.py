"""
Exam Service
Business logic for exam management operations
"""

from typing import List, Optional, Dict, Any
from datetime import date

from src.domain.repositories.exam_repository import IExamRepository
from src.domain.entities.exam import Exam
from src.domain.enums.exam_type import ExamType, ExamStatus
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError,
    ValidationError
)


class ExamService:
    """
    Exam service
    
    Coordinates exam management operations
    """
    
    def __init__(self, exam_repository: IExamRepository):
        self.exam_repository = exam_repository
    
    async def create_exam(
        self,
        name: str,
        subject_assignment_id: int,
        exam_type: ExamType,
        exam_date: date,
        total_marks: float,
        created_by: int,
        duration_minutes: Optional[int] = None,
        instructions: Optional[str] = None,
        question_paper_url: Optional[str] = None
    ) -> Exam:
        """
        Create a new exam
        
        Args:
            name: Exam name
            subject_assignment_id: Subject assignment ID
            exam_type: Exam type (internal1, internal2, external)
            exam_date: Exam date
            total_marks: Total marks for the exam
            created_by: User ID creating the exam
            duration_minutes: Optional duration in minutes
            instructions: Optional instructions
            question_paper_url: Optional question paper URL
        
        Returns:
            Created Exam entity
        
        Raises:
            EntityAlreadyExistsError: If exam already exists for this subject and type
            ValidationError: If validation fails
        """
        # Check for duplicate
        if await self.exam_repository.exists_for_subject_assignment(
            subject_assignment_id,
            exam_type
        ):
            raise EntityAlreadyExistsError(
                "Exam",
                "subject_assignment_id + exam_type",
                f"Exam of type {exam_type.value} already exists for this subject assignment"
            )
        
        # Create exam entity
        exam = Exam(
            name=name,
            subject_assignment_id=subject_assignment_id,
            exam_type=exam_type,
            exam_date=exam_date,
            total_marks=total_marks,
            duration_minutes=duration_minutes,
            instructions=instructions,
            status=ExamStatus.DRAFT,
            question_paper_url=question_paper_url,
            created_by=created_by
        )
        
        return await self.exam_repository.create(exam)
    
    async def get_exam(self, exam_id: int) -> Exam:
        """
        Get exam by ID
        
        Args:
            exam_id: Exam ID
        
        Returns:
            Exam entity
        
        Raises:
            EntityNotFoundError: If exam not found
        """
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        return exam
    
    async def update_exam(
        self,
        exam_id: int,
        name: Optional[str] = None,
        exam_date: Optional[date] = None,
        total_marks: Optional[float] = None,
        duration_minutes: Optional[int] = None,
        instructions: Optional[str] = None
    ) -> Exam:
        """
        Update exam information
        
        Args:
            exam_id: Exam ID
            name: Optional new name
            exam_date: Optional new date
            total_marks: Optional new total marks
            duration_minutes: Optional new duration
            instructions: Optional new instructions
        
        Returns:
            Updated Exam entity
        
        Raises:
            EntityNotFoundError: If exam not found
            BusinessRuleViolationError: If exam is published
        """
        exam = await self.get_exam(exam_id)
        exam.update_info(
            name=name,
            exam_date=exam_date,
            total_marks=total_marks,
            duration_minutes=duration_minutes,
            instructions=instructions
        )
        return await self.exam_repository.update(exam)
    
    async def activate_exam(self, exam_id: int) -> Exam:
        """
        Activate exam (make it available for marks entry)
        
        Args:
            exam_id: Exam ID
        
        Returns:
            Updated Exam entity
        
        Raises:
            EntityNotFoundError: If exam not found
            BusinessRuleViolationError: If exam is not in DRAFT status
        """
        exam = await self.get_exam(exam_id)
        exam.activate()
        return await self.exam_repository.update(exam)
    
    async def lock_exam(self, exam_id: int) -> Exam:
        """
        Lock exam (prevent further marks entry)
        
        Args:
            exam_id: Exam ID
        
        Returns:
            Updated Exam entity
        
        Raises:
            EntityNotFoundError: If exam not found
            BusinessRuleViolationError: If exam is not in ACTIVE status
        """
        exam = await self.get_exam(exam_id)
        exam.lock()
        return await self.exam_repository.update(exam)
    
    async def publish_exam(self, exam_id: int) -> Exam:
        """
        Publish exam (make results visible to students)
        
        Args:
            exam_id: Exam ID
        
        Returns:
            Updated Exam entity
        
        Raises:
            EntityNotFoundError: If exam not found
            BusinessRuleViolationError: If exam is not in LOCKED status
        """
        exam = await self.get_exam(exam_id)
        exam.publish()
        return await self.exam_repository.update(exam)
    
    async def list_exams(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Exam]:
        """
        List exams with pagination and filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records
            filters: Optional filters (status, exam_type, subject_assignment_id)
        
        Returns:
            List of Exam entities
        """
        return await self.exam_repository.get_all(
            skip=skip,
            limit=limit,
            filters=filters
        )
    
    async def get_exams_by_subject_assignment(
        self,
        subject_assignment_id: int,
        exam_type: Optional[ExamType] = None
    ) -> List[Exam]:
        """
        Get exams by subject assignment
        
        Args:
            subject_assignment_id: Subject assignment ID
            exam_type: Optional exam type filter
        
        Returns:
            List of Exam entities
        """
        return await self.exam_repository.get_by_subject_assignment(
            subject_assignment_id=subject_assignment_id,
            exam_type=exam_type
        )
    
    async def get_exams_by_status(
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
            List of Exam entities
        """
        return await self.exam_repository.get_by_status(
            status=status,
            skip=skip,
            limit=limit
        )
    
    async def delete_exam(self, exam_id: int) -> bool:
        """
        Delete exam
        
        Args:
            exam_id: Exam ID
        
        Returns:
            True if deleted, False if not found
        
        Note:
            Should check for dependencies (marks, questions) before deletion
        """
        return await self.exam_repository.delete(exam_id)
    
    async def count_exams(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count exams with optional filters"""
        return await self.exam_repository.count(filters=filters)

