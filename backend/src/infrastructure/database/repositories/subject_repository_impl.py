"""
Subject Repository Implementation
SQLAlchemy implementation of ISubjectRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload

from src.domain.repositories.subject_repository import ISubjectRepository
from src.domain.entities.subject import Subject
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import SubjectModel, DepartmentModel


class SubjectRepository(ISubjectRepository):
    """
    SQLAlchemy implementation of subject repository
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: SubjectModel) -> Optional[Subject]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return Subject(
            id=model.id,
            code=model.code,
            name=model.name,
            department_id=model.department_id,
            credits=float(model.credits),
            max_internal=float(model.max_internal),
            max_external=float(model.max_external),
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: Subject) -> SubjectModel:
        """Convert domain entity to database model"""
        model = SubjectModel(
            id=entity.id,
            code=entity.code,
            name=entity.name,
            department_id=entity.department_id,
            credits=entity.credits,
            max_internal=entity.max_internal,
            max_external=entity.max_external,
            is_active=entity.is_active
        )
        # Set optional fields if available in entity
        if hasattr(entity, 'semester_id'):
            model.semester_id = getattr(entity, 'semester_id', None)
        return model
    
    async def get_by_id(self, id: int) -> Optional[Subject]:
        """Get subject by ID with eager loading"""
        model = self.db.query(SubjectModel).options(
            joinedload(SubjectModel.department)
        ).filter(SubjectModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_code(self, code: str) -> Optional[Subject]:
        """Get subject by code"""
        model = self.db.query(SubjectModel).filter(
            SubjectModel.code == code.upper()
        ).first()
        return self._to_entity(model)
    
    async def get_by_department(
        self,
        department_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Subject]:
        """Get all subjects in a department with eager loading"""
        models = self.db.query(SubjectModel).options(
            joinedload(SubjectModel.department)
        ).filter(
            SubjectModel.department_id == department_id
        ).order_by(SubjectModel.code).offset(skip).limit(limit).all()
        
        return [self._to_entity(model) for model in models]
    
    async def code_exists(self, code: str, exclude_id: Optional[int] = None) -> bool:
        """Check if subject code exists"""
        query = self.db.query(SubjectModel).filter(
            SubjectModel.code == code.upper()
        )
        
        if exclude_id:
            query = query.filter(SubjectModel.id != exclude_id)
        
        return query.count() > 0
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Subject]:
        """Get all subjects with optional filtering and eager loading"""
        query = self.db.query(SubjectModel).options(
            joinedload(SubjectModel.department)
        )
        
        if filters:
            if 'is_active' in filters:
                query = query.filter(SubjectModel.is_active == filters['is_active'])
            if 'department_id' in filters:
                query = query.filter(SubjectModel.department_id == filters['department_id'])
        
        models = query.order_by(SubjectModel.code).offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Subject) -> Subject:
        """Create a new subject"""
        # Check for duplicate code
        if await self.code_exists(entity.code):
            raise EntityAlreadyExistsError(
                "Subject",
                "code",
                entity.code
            )
        
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Subject) -> Subject:
        """Update existing subject"""
        model = self.db.query(SubjectModel).filter(
            SubjectModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("Subject", entity.id)
        
        # Check for duplicate code (if changed)
        if model.code != entity.code and await self.code_exists(entity.code, exclude_id=entity.id):
            raise EntityAlreadyExistsError(
                "Subject",
                "code",
                entity.code
            )
        
        # Update fields
        model.code = entity.code
        model.name = entity.name
        model.department_id = entity.department_id
        model.credits = entity.credits
        model.max_internal = entity.max_internal
        model.max_external = entity.max_external
        model.is_active = entity.is_active
        # Update optional fields if available
        if hasattr(entity, 'semester_id'):
            model.semester_id = getattr(entity, 'semester_id', None)
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete subject"""
        model = self.db.query(SubjectModel).filter(SubjectModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if subject exists"""
        return self.db.query(SubjectModel).filter(
            SubjectModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count subjects with optional filters"""
        query = self.db.query(SubjectModel)
        
        if filters:
            if 'is_active' in filters:
                query = query.filter(SubjectModel.is_active == filters['is_active'])
            if 'department_id' in filters:
                query = query.filter(SubjectModel.department_id == filters['department_id'])
        
        return query.count()

