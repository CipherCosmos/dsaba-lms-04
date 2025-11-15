"""
Course Outcome Repository Implementation
SQLAlchemy implementation of ICourseOutcomeRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal

from src.domain.repositories.course_outcome_repository import ICourseOutcomeRepository
from src.domain.entities.course_outcome import CourseOutcome
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import CourseOutcomeModel


class CourseOutcomeRepository(ICourseOutcomeRepository):
    """SQLAlchemy implementation of course outcome repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: CourseOutcomeModel) -> Optional[CourseOutcome]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return CourseOutcome(
            id=model.id,
            subject_id=model.subject_id,
            code=model.code,
            title=model.title,
            description=model.description,
            target_attainment=Decimal(str(model.target_attainment)),
            l1_threshold=Decimal(str(model.l1_threshold)),
            l2_threshold=Decimal(str(model.l2_threshold)),
            l3_threshold=Decimal(str(model.l3_threshold)),
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: CourseOutcome) -> CourseOutcomeModel:
        """Convert domain entity to database model"""
        return CourseOutcomeModel(
            id=entity.id,
            subject_id=entity.subject_id,
            code=entity.code,
            title=entity.title,
            description=entity.description,
            target_attainment=entity.target_attainment,
            l1_threshold=entity.l1_threshold,
            l2_threshold=entity.l2_threshold,
            l3_threshold=entity.l3_threshold
        )
    
    async def get_by_id(self, id: int) -> Optional[CourseOutcome]:
        """Get CO by ID"""
        model = self.db.query(CourseOutcomeModel).filter(CourseOutcomeModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_subject(
        self,
        subject_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[CourseOutcome]:
        """Get all COs for a subject"""
        models = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.subject_id == subject_id
        ).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models if model]
    
    async def get_by_code(self, subject_id: int, code: str) -> Optional[CourseOutcome]:
        """Get CO by code for a subject"""
        model = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.subject_id == subject_id,
            CourseOutcomeModel.code == code.upper()
        ).first()
        return self._to_entity(model)
    
    async def code_exists(
        self,
        subject_id: int,
        code: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if CO code exists for a subject"""
        query = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.subject_id == subject_id,
            CourseOutcomeModel.code == code.upper()
        )
        
        if exclude_id:
            query = query.filter(CourseOutcomeModel.id != exclude_id)
        
        return query.count() > 0
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[CourseOutcome]:
        """Get all COs with optional filtering"""
        query = self.db.query(CourseOutcomeModel)
        
        if filters:
            if 'subject_id' in filters:
                query = query.filter(CourseOutcomeModel.subject_id == filters['subject_id'])
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def create(self, entity: CourseOutcome) -> CourseOutcome:
        """Create a new CO"""
        if await self.code_exists(entity.subject_id, entity.code):
            raise EntityAlreadyExistsError(
                "CourseOutcome",
                "code",
                entity.code
            )
        
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: CourseOutcome) -> CourseOutcome:
        """Update existing CO"""
        model = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("CourseOutcome", entity.id)
        
        # Check for duplicate code (if changed)
        if model.code != entity.code and await self.code_exists(entity.subject_id, entity.code, exclude_id=entity.id):
            raise EntityAlreadyExistsError(
                "CourseOutcome",
                "code",
                entity.code
            )
        
        # Update fields
        model.code = entity.code
        model.title = entity.title
        model.description = entity.description
        model.target_attainment = entity.target_attainment
        model.l1_threshold = entity.l1_threshold
        model.l2_threshold = entity.l2_threshold
        model.l3_threshold = entity.l3_threshold
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete CO"""
        model = self.db.query(CourseOutcomeModel).filter(CourseOutcomeModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if CO exists"""
        return self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count COs with optional filters"""
        query = self.db.query(CourseOutcomeModel)
        
        if filters:
            if 'subject_id' in filters:
                query = query.filter(CourseOutcomeModel.subject_id == filters['subject_id'])
        
        return query.count()

