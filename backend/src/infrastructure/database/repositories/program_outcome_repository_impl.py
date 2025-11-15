"""
Program Outcome Repository Implementation
SQLAlchemy implementation of IProgramOutcomeRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal

from src.domain.repositories.program_outcome_repository import IProgramOutcomeRepository
from src.domain.entities.program_outcome import ProgramOutcome
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import ProgramOutcomeModel


class ProgramOutcomeRepository(IProgramOutcomeRepository):
    """SQLAlchemy implementation of program outcome repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: ProgramOutcomeModel) -> Optional[ProgramOutcome]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return ProgramOutcome(
            id=model.id,
            department_id=model.department_id,
            code=model.code,
            type=model.type,
            title=model.title,
            description=model.description,
            target_attainment=Decimal(str(model.target_attainment)),
            created_at=model.created_at
        )
    
    def _to_model(self, entity: ProgramOutcome) -> ProgramOutcomeModel:
        """Convert domain entity to database model"""
        return ProgramOutcomeModel(
            id=entity.id,
            department_id=entity.department_id,
            code=entity.code,
            type=entity.type,
            title=entity.title,
            description=entity.description,
            target_attainment=entity.target_attainment
        )
    
    async def get_by_id(self, id: int) -> Optional[ProgramOutcome]:
        """Get PO by ID"""
        model = self.db.query(ProgramOutcomeModel).filter(ProgramOutcomeModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_department(
        self,
        department_id: int,
        po_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProgramOutcome]:
        """Get all POs for a department"""
        query = self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.department_id == department_id
        )
        
        if po_type:
            query = query.filter(ProgramOutcomeModel.type == po_type.upper())
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def get_by_code(self, department_id: int, code: str) -> Optional[ProgramOutcome]:
        """Get PO by code for a department"""
        model = self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.department_id == department_id,
            ProgramOutcomeModel.code == code.upper()
        ).first()
        return self._to_entity(model)
    
    async def code_exists(
        self,
        department_id: int,
        code: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if PO code exists for a department"""
        query = self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.department_id == department_id,
            ProgramOutcomeModel.code == code.upper()
        )
        
        if exclude_id:
            query = query.filter(ProgramOutcomeModel.id != exclude_id)
        
        return query.count() > 0
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ProgramOutcome]:
        """Get all POs with optional filtering"""
        query = self.db.query(ProgramOutcomeModel)
        
        if filters:
            if 'department_id' in filters:
                query = query.filter(ProgramOutcomeModel.department_id == filters['department_id'])
            if 'type' in filters:
                query = query.filter(ProgramOutcomeModel.type == filters['type'].upper())
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def create(self, entity: ProgramOutcome) -> ProgramOutcome:
        """Create a new PO"""
        if await self.code_exists(entity.department_id, entity.code):
            raise EntityAlreadyExistsError(
                "ProgramOutcome",
                "code",
                entity.code
            )
        
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: ProgramOutcome) -> ProgramOutcome:
        """Update existing PO"""
        model = self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("ProgramOutcome", entity.id)
        
        # Check for duplicate code (if changed)
        if model.code != entity.code and await self.code_exists(entity.department_id, entity.code, exclude_id=entity.id):
            raise EntityAlreadyExistsError(
                "ProgramOutcome",
                "code",
                entity.code
            )
        
        # Update fields
        model.code = entity.code
        model.title = entity.title
        model.description = entity.description
        model.target_attainment = entity.target_attainment
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete PO"""
        model = self.db.query(ProgramOutcomeModel).filter(ProgramOutcomeModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if PO exists"""
        return self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count POs with optional filters"""
        query = self.db.query(ProgramOutcomeModel)
        
        if filters:
            if 'department_id' in filters:
                query = query.filter(ProgramOutcomeModel.department_id == filters['department_id'])
            if 'type' in filters:
                query = query.filter(ProgramOutcomeModel.type == filters['type'].upper())
        
        return query.count()

