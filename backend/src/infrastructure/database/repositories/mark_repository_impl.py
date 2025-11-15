"""
Mark Repository Implementation
SQLAlchemy implementation of IMarkRepository
"""

from typing import List
from sqlalchemy.orm import Session

from src.domain.repositories.mark_repository import IMarkRepository
from src.domain.entities.mark import Mark
from src.domain.exceptions import EntityNotFoundError

from ..models import MarkModel


class MarkRepository(IMarkRepository):
    """
    SQLAlchemy implementation of mark repository
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: MarkModel) -> Mark:
        """Convert database model to domain entity"""
        return Mark(
            id=model.id,
            exam_id=model.exam_id,
            student_id=model.student_id,
            question_id=model.question_id,
            marks_obtained=float(model.marks_obtained),
            sub_question_id=model.sub_question_id,
            entered_by=model.entered_by,
            entered_at=model.entered_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: Mark) -> MarkModel:
        """Convert domain entity to database model"""
        return MarkModel(
            id=entity.id,
            exam_id=entity.exam_id,
            student_id=entity.student_id,
            question_id=entity.question_id,
            marks_obtained=entity.marks_obtained,
            sub_question_id=entity.sub_question_id,
            entered_by=entity.entered_by
        )
    
    async def get_by_id(self, id: int) -> Mark:
        """Get mark by ID"""
        model = self.db.query(MarkModel).filter(MarkModel.id == id).first()
        if not model:
            raise EntityNotFoundError("Mark", id)
        return self._to_entity(model)
    
    async def get_by_exam_and_student(
        self,
        exam_id: int,
        student_id: int
    ) -> List[Mark]:
        """Get all marks for a student in an exam"""
        models = self.db.query(MarkModel).filter(
            MarkModel.exam_id == exam_id,
            MarkModel.student_id == student_id
        ).all()
        
        return [self._to_entity(model) for model in models]
    
    async def get_by_exam(
        self,
        exam_id: int,
        skip: int = 0,
        limit: int = 1000
    ) -> List[Mark]:
        """Get all marks for an exam"""
        models = self.db.query(MarkModel).filter(
            MarkModel.exam_id == exam_id
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def get_by_student(
        self,
        student_id: int,
        skip: int = 0,
        limit: int = 1000
    ) -> List[Mark]:
        """Get all marks for a student"""
        models = self.db.query(MarkModel).filter(
            MarkModel.student_id == student_id
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def get_by_question(
        self,
        question_id: int
    ) -> List[Mark]:
        """Get all marks for a question"""
        models = self.db.query(MarkModel).filter(
            MarkModel.question_id == question_id
        ).all()
        
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Mark) -> Mark:
        """Create a new mark"""
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Mark) -> Mark:
        """Update existing mark"""
        model = self.db.query(MarkModel).filter(MarkModel.id == entity.id).first()
        
        if not model:
            raise EntityNotFoundError("Mark", entity.id)
        
        # Update fields
        model.marks_obtained = entity.marks_obtained
        model.entered_by = entity.entered_by
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete mark"""
        model = self.db.query(MarkModel).filter(MarkModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def get_all(self, skip: int = 0, limit: int = 100, filters=None) -> List[Mark]:
        """Get all marks"""
        models = self.db.query(MarkModel).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def count(self, filters=None) -> int:
        """Count marks"""
        return self.db.query(MarkModel).count()
    
    async def exists(self, id: int) -> bool:
        """Check if mark exists"""
        return self.db.query(MarkModel).filter(MarkModel.id == id).count() > 0
    
    async def bulk_create(self, marks: List[Mark]) -> List[Mark]:
        """Create multiple marks at once"""
        models = [self._to_model(mark) for mark in marks]
        self.db.add_all(models)
        self.db.commit()
        
        # Refresh all models to get IDs
        for model in models:
            self.db.refresh(model)
        
        return [self._to_entity(model) for model in models]
    
    async def bulk_update(self, marks: List[Mark]) -> List[Mark]:
        """Update multiple marks at once"""
        updated = []
        for mark in marks:
            updated_mark = await self.update(mark)
            updated.append(updated_mark)
        
        return updated

