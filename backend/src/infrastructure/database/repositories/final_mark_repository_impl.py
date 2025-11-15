"""
Final Mark Repository Implementation
SQLAlchemy implementation of IFinalMarkRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date

from src.domain.repositories.final_mark_repository import IFinalMarkRepository
from src.domain.entities.final_mark import FinalMark
from src.domain.exceptions import EntityNotFoundError

from ..models import FinalMarkModel


class FinalMarkRepository(IFinalMarkRepository):
    """SQLAlchemy implementation of final mark repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: FinalMarkModel) -> Optional[FinalMark]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return FinalMark(
            id=model.id,
            student_id=model.student_id,
            subject_assignment_id=model.subject_assignment_id,
            semester_id=model.semester_id,
            internal_1=Decimal(str(model.internal_1)),
            internal_2=Decimal(str(model.internal_2)),
            best_internal=Decimal(str(model.best_internal)),
            external=Decimal(str(model.external)),
            total=Decimal(str(model.total)),
            percentage=Decimal(str(model.percentage)),
            grade=model.grade,
            sgpa=Decimal(str(model.sgpa)) if model.sgpa else None,
            cgpa=Decimal(str(model.cgpa)) if model.cgpa else None,
            co_attainment=model.co_attainment,
            status=model.status,
            is_published=model.is_published,
            published_at=model.published_at,
            editable_until=model.editable_until,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: FinalMark) -> FinalMarkModel:
        """Convert domain entity to database model"""
        return FinalMarkModel(
            id=entity.id,
            student_id=entity.student_id,
            subject_assignment_id=entity.subject_assignment_id,
            semester_id=entity.semester_id,
            internal_1=entity.internal_1,
            internal_2=entity.internal_2,
            best_internal=entity.best_internal,
            external=entity.external,
            total=entity.total,
            percentage=entity.percentage,
            grade=entity.grade,
            sgpa=entity.sgpa,
            cgpa=entity.cgpa,
            co_attainment=entity.co_attainment,
            status=entity.status,
            is_published=entity.is_published,
            published_at=entity.published_at,
            editable_until=entity.editable_until
        )
    
    async def get_by_id(self, id: int) -> Optional[FinalMark]:
        """Get final mark by ID"""
        model = self.db.query(FinalMarkModel).filter(FinalMarkModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_student_semester(
        self,
        student_id: int,
        semester_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[FinalMark]:
        """Get all final marks for a student in a semester"""
        models = self.db.query(FinalMarkModel).filter(
            FinalMarkModel.student_id == student_id,
            FinalMarkModel.semester_id == semester_id
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models if model]
    
    async def get_by_student_subject(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int
    ) -> Optional[FinalMark]:
        """Get final mark for a student in a subject for a semester"""
        model = self.db.query(FinalMarkModel).filter(
            FinalMarkModel.student_id == student_id,
            FinalMarkModel.subject_assignment_id == subject_assignment_id,
            FinalMarkModel.semester_id == semester_id
        ).first()
        return self._to_entity(model)
    
    async def get_by_semester(
        self,
        semester_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[FinalMark]:
        """Get all final marks for a semester"""
        models = self.db.query(FinalMarkModel).filter(
            FinalMarkModel.semester_id == semester_id
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models if model]
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[FinalMark]:
        """Get all final marks with optional filtering"""
        query = self.db.query(FinalMarkModel)
        
        if filters:
            if 'student_id' in filters:
                query = query.filter(FinalMarkModel.student_id == filters['student_id'])
            if 'semester_id' in filters:
                query = query.filter(FinalMarkModel.semester_id == filters['semester_id'])
            if 'status' in filters:
                query = query.filter(FinalMarkModel.status == filters['status'])
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def create(self, entity: FinalMark) -> FinalMark:
        """Create a new final mark"""
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: FinalMark) -> FinalMark:
        """Update existing final mark"""
        model = self.db.query(FinalMarkModel).filter(
            FinalMarkModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("FinalMark", entity.id)
        
        # Update fields
        model.internal_1 = entity.internal_1
        model.internal_2 = entity.internal_2
        model.best_internal = entity.best_internal
        model.external = entity.external
        model.total = entity.total
        model.percentage = entity.percentage
        model.grade = entity.grade
        model.sgpa = entity.sgpa
        model.cgpa = entity.cgpa
        model.co_attainment = entity.co_attainment
        model.status = entity.status
        model.is_published = entity.is_published
        model.published_at = entity.published_at
        model.editable_until = entity.editable_until
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete final mark"""
        model = self.db.query(FinalMarkModel).filter(FinalMarkModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if final mark exists"""
        return self.db.query(FinalMarkModel).filter(
            FinalMarkModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count final marks with optional filters"""
        query = self.db.query(FinalMarkModel)
        
        if filters:
            if 'student_id' in filters:
                query = query.filter(FinalMarkModel.student_id == filters['student_id'])
            if 'semester_id' in filters:
                query = query.filter(FinalMarkModel.semester_id == filters['semester_id'])
            if 'status' in filters:
                query = query.filter(FinalMarkModel.status == filters['status'])
        
        return query.count()

