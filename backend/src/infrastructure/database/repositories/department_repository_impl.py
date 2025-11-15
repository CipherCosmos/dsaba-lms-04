"""
Department Repository Implementation
SQLAlchemy implementation of IDepartmentRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.department_repository import IDepartmentRepository
from src.domain.entities.department import Department
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import DepartmentModel


class DepartmentRepository(IDepartmentRepository):
    """
    SQLAlchemy implementation of department repository
    
    Maps between domain Department entity and DepartmentModel database model
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: DepartmentModel) -> Optional[Department]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return Department(
            id=model.id,
            name=model.name,
            code=model.code,
            hod_id=model.hod_id,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: Department) -> DepartmentModel:
        """Convert domain entity to database model"""
        return DepartmentModel(
            id=entity.id,
            name=entity.name,
            code=entity.code,
            hod_id=entity.hod_id,
            is_active=entity.is_active
        )
    
    async def get_by_id(self, id: int) -> Optional[Department]:
        """Get department by ID"""
        model = self.db.query(DepartmentModel).filter(DepartmentModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_code(self, code: str) -> Optional[Department]:
        """Get department by code"""
        model = self.db.query(DepartmentModel).filter(
            DepartmentModel.code == code.upper()
        ).first()
        return self._to_entity(model)
    
    async def get_by_hod(self, hod_id: int) -> Optional[Department]:
        """Get department by HOD ID"""
        model = self.db.query(DepartmentModel).filter(
            DepartmentModel.hod_id == hod_id
        ).first()
        return self._to_entity(model)
    
    async def code_exists(self, code: str, exclude_id: Optional[int] = None) -> bool:
        """Check if department code exists"""
        query = self.db.query(DepartmentModel).filter(
            DepartmentModel.code == code.upper()
        )
        
        if exclude_id:
            query = query.filter(DepartmentModel.id != exclude_id)
        
        return query.count() > 0
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Department]:
        """Get all departments with optional filtering"""
        query = self.db.query(DepartmentModel)
        
        if filters:
            if 'is_active' in filters:
                query = query.filter(DepartmentModel.is_active == filters['is_active'])
            if 'has_hod' in filters:
                if filters['has_hod']:
                    query = query.filter(DepartmentModel.hod_id.isnot(None))
                else:
                    query = query.filter(DepartmentModel.hod_id.is_(None))
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models]
    
    async def create(self, entity: Department) -> Department:
        """Create a new department"""
        # Check for duplicate code
        if await self.code_exists(entity.code):
            raise EntityAlreadyExistsError(
                "Department",
                "code",
                entity.code
            )
        
        # Create model
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: Department) -> Department:
        """Update existing department"""
        model = self.db.query(DepartmentModel).filter(
            DepartmentModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("Department", entity.id)
        
        # Check for duplicate code (if changed)
        if model.code != entity.code and await self.code_exists(entity.code, exclude_id=entity.id):
            raise EntityAlreadyExistsError(
                "Department",
                "code",
                entity.code
            )
        
        # Update fields
        model.name = entity.name
        model.code = entity.code
        model.hod_id = entity.hod_id
        model.is_active = entity.is_active
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete department"""
        model = self.db.query(DepartmentModel).filter(DepartmentModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if department exists"""
        return self.db.query(DepartmentModel).filter(
            DepartmentModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count departments with optional filters"""
        query = self.db.query(DepartmentModel)
        
        if filters:
            if 'is_active' in filters:
                query = query.filter(DepartmentModel.is_active == filters['is_active'])
        
        return query.count()

