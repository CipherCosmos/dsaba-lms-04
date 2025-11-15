"""
Question Service
Business logic for Question management
"""

from typing import List, Optional
from decimal import Decimal

from src.domain.repositories.question_repository import IQuestionRepository
from src.domain.repositories.exam_repository import IExamRepository
from src.domain.entities.question import Question
from src.domain.exceptions import EntityNotFoundError, ValidationError


class QuestionService:
    """
    Question service
    
    Handles business logic for Question operations
    """
    
    def __init__(
        self,
        question_repository: IQuestionRepository,
        exam_repository: IExamRepository
    ):
        self.question_repository = question_repository
        self.exam_repository = exam_repository
    
    async def create_question(
        self,
        exam_id: int,
        question_no: str,
        question_text: str,
        section: str,
        marks_per_question: Decimal,
        required_count: int = 1,
        optional_count: int = 0,
        blooms_level: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> Question:
        """
        Create a new question
        
        Args:
            exam_id: Exam ID
            question_no: Question number
            question_text: Question text
            section: Section (A, B, or C)
            marks_per_question: Marks for this question
            required_count: Number of required answers
            optional_count: Number of optional answers
            blooms_level: Bloom's taxonomy level (L1-L6)
            difficulty: Difficulty level (easy, medium, hard)
        
        Returns:
            Created Question
        
        Raises:
            EntityNotFoundError: If exam doesn't exist
        """
        # Verify exam exists
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        
        # Check if question number already exists for this exam
        existing = await self.question_repository.get_by_question_no(exam_id, question_no)
        if existing:
            raise ValidationError(
                f"Question number {question_no} already exists for this exam",
                field="question_no"
            )
        
        # Create question entity
        question = Question(
            id=None,
            exam_id=exam_id,
            question_no=question_no,
            question_text=question_text,
            section=section,
            marks_per_question=marks_per_question,
            required_count=required_count,
            optional_count=optional_count,
            blooms_level=blooms_level,
            difficulty=difficulty
        )
        
        return await self.question_repository.create(question)
    
    async def get_question(self, question_id: int) -> Question:
        """
        Get question by ID
        
        Args:
            question_id: Question ID
        
        Returns:
            Question
        
        Raises:
            EntityNotFoundError: If question doesn't exist
        """
        question = await self.question_repository.get_by_id(question_id)
        if not question:
            raise EntityNotFoundError("Question", question_id)
        
        return question
    
    async def get_questions_by_exam(
        self,
        exam_id: int,
        section: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """
        Get all questions for an exam
        
        Args:
            exam_id: Exam ID
            section: Optional section filter (A, B, C)
            skip: Number of records to skip
            limit: Maximum number of records
        
        Returns:
            List of questions
        """
        return await self.question_repository.get_by_exam(exam_id, section, skip, limit)
    
    async def update_question(
        self,
        question_id: int,
        question_text: Optional[str] = None,
        section: Optional[str] = None,
        marks_per_question: Optional[Decimal] = None,
        required_count: Optional[int] = None,
        optional_count: Optional[int] = None,
        blooms_level: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> Question:
        """
        Update question
        
        Args:
            question_id: Question ID
            question_text: New question text
            section: New section
            marks_per_question: New marks
            required_count: New required count
            optional_count: New optional count
            blooms_level: New Bloom's level
            difficulty: New difficulty
        
        Returns:
            Updated Question
        
        Raises:
            EntityNotFoundError: If question doesn't exist
        """
        question = await self.get_question(question_id)
        
        # Update fields
        question.update(
            question_text=question_text,
            section=section,
            marks_per_question=marks_per_question,
            required_count=required_count,
            optional_count=optional_count,
            blooms_level=blooms_level,
            difficulty=difficulty
        )
        
        return await self.question_repository.update(question)
    
    async def delete_question(self, question_id: int) -> bool:
        """
        Delete question
        
        Args:
            question_id: Question ID
        
        Returns:
            True if deleted, False otherwise
        
        Raises:
            EntityNotFoundError: If question doesn't exist
        """
        question = await self.get_question(question_id)
        return await self.question_repository.delete(question.id)

