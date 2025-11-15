"""
Question Repository Implementation
SQLAlchemy implementation of IQuestionRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal

from src.domain.repositories.question_repository import IQuestionRepository
from src.domain.entities.question import Question
from src.domain.exceptions import EntityNotFoundError

from ..models import QuestionModel


class QuestionRepository(IQuestionRepository):
    """SQLAlchemy implementation of question repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: QuestionModel) -> Optional[Question]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return Question(
            id=model.id,
            exam_id=model.exam_id,
            question_no=model.question_no,
            question_text=model.question_text,
            section=model.section,
            marks_per_question=Decimal(str(model.marks_per_question)),
            required_count=model.required_count,
            optional_count=model.optional_count,
            blooms_level=model.blooms_level,
            difficulty=model.difficulty,
            created_at=model.created_at
        )
    
    def _to_model(self, entity: Question) -> QuestionModel:
        """Convert domain entity to database model"""
        return QuestionModel(
            id=entity.id,
            exam_id=entity.exam_id,
            question_no=entity.question_no,
            question_text=entity.question_text,
            section=entity.section,
            marks_per_question=entity.marks_per_question,
            required_count=entity.required_count,
            optional_count=entity.optional_count,
            blooms_level=entity.blooms_level,
            difficulty=entity.difficulty
        )
    
    async def get_by_id(self, id: int) -> Optional[Question]:
        """Get question by ID"""
        model = self.db.query(QuestionModel).filter(QuestionModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_exam(
        self,
        exam_id: int,
        section: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Question]:
        """Get all questions for an exam"""
        query = self.db.query(QuestionModel).filter(QuestionModel.exam_id == exam_id)
        
        if section:
            query = query.filter(QuestionModel.section == section.upper())
        
        models = query.order_by(QuestionModel.question_no).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def get_by_question_no(self, exam_id: int, question_no: str) -> Optional[Question]:
        """Get question by question number for an exam"""
        model = self.db.query(QuestionModel).filter(
            QuestionModel.exam_id == exam_id,
            QuestionModel.question_no == question_no
        ).first()
        return self._to_entity(model)
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Question]:
        """Get all questions with optional filtering"""
        query = self.db.query(QuestionModel)
        
        if filters:
            if 'exam_id' in filters:
                query = query.filter(QuestionModel.exam_id == filters['exam_id'])
            if 'section' in filters:
                query = query.filter(QuestionModel.section == filters['section'].upper())
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def create(self, entity: Question) -> Question:
        """Create a new question"""
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Question) -> Question:
        """Update existing question"""
        model = self.db.query(QuestionModel).filter(
            QuestionModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("Question", entity.id)
        
        # Update fields
        model.question_no = entity.question_no
        model.question_text = entity.question_text
        model.section = entity.section
        model.marks_per_question = entity.marks_per_question
        model.required_count = entity.required_count
        model.optional_count = entity.optional_count
        model.blooms_level = entity.blooms_level
        model.difficulty = entity.difficulty
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete question"""
        model = self.db.query(QuestionModel).filter(QuestionModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if question exists"""
        return self.db.query(QuestionModel).filter(
            QuestionModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count questions with optional filters"""
        query = self.db.query(QuestionModel)
        
        if filters:
            if 'exam_id' in filters:
                query = query.filter(QuestionModel.exam_id == filters['exam_id'])
            if 'section' in filters:
                query = query.filter(QuestionModel.section == filters['section'].upper())
        
        return query.count()

