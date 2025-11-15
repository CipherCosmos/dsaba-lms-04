"""
CO-PO Mapping Repository Implementation
SQLAlchemy implementation of ICOPOMappingRepository
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.co_po_mapping_repository import ICOPOMappingRepository
from src.domain.entities.co_po_mapping import COPOMapping
from src.domain.exceptions import EntityNotFoundError, EntityAlreadyExistsError

from ..models import COPOMappingModel


class COPOMappingRepository(ICOPOMappingRepository):
    """SQLAlchemy implementation of CO-PO mapping repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: COPOMappingModel) -> Optional[COPOMapping]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return COPOMapping(
            id=model.id,
            co_id=model.co_id,
            po_id=model.po_id,
            strength=model.strength,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: COPOMapping) -> COPOMappingModel:
        """Convert domain entity to database model"""
        return COPOMappingModel(
            id=entity.id,
            co_id=entity.co_id,
            po_id=entity.po_id,
            strength=entity.strength
        )
    
    async def get_by_id(self, id: int) -> Optional[COPOMapping]:
        """Get mapping by ID"""
        model = self.db.query(COPOMappingModel).filter(COPOMappingModel.id == id).first()
        return self._to_entity(model)
    
    async def get_by_co(self, co_id: int) -> List[COPOMapping]:
        """Get all PO mappings for a CO"""
        models = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.co_id == co_id
        ).all()
        
        return [self._to_entity(model) for model in models if model]
    
    async def get_by_po(self, po_id: int) -> List[COPOMapping]:
        """Get all CO mappings for a PO"""
        models = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.po_id == po_id
        ).all()
        
        return [self._to_entity(model) for model in models if model]
    
    async def get_mapping(self, co_id: int, po_id: int) -> Optional[COPOMapping]:
        """Get specific CO-PO mapping"""
        model = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.co_id == co_id,
            COPOMappingModel.po_id == po_id
        ).first()
        return self._to_entity(model)
    
    async def mapping_exists(
        self,
        co_id: int,
        po_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if CO-PO mapping exists"""
        query = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.co_id == co_id,
            COPOMappingModel.po_id == po_id
        )
        
        if exclude_id:
            query = query.filter(COPOMappingModel.id != exclude_id)
        
        return query.count() > 0
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[COPOMapping]:
        """Get all mappings with optional filtering"""
        query = self.db.query(COPOMappingModel)
        
        if filters:
            if 'co_id' in filters:
                query = query.filter(COPOMappingModel.co_id == filters['co_id'])
            if 'po_id' in filters:
                query = query.filter(COPOMappingModel.po_id == filters['po_id'])
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def create(self, entity: COPOMapping) -> COPOMapping:
        """Create a new CO-PO mapping"""
        if await self.mapping_exists(entity.co_id, entity.po_id):
            raise EntityAlreadyExistsError(
                "COPOMapping",
                "co_id+po_id",
                f"{entity.co_id}+{entity.po_id}"
            )
        
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(model.id)
    
    async def update(self, entity: COPOMapping) -> COPOMapping:
        """Update existing mapping"""
        model = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.id == entity.id
        ).first()
        
        if not model:
            raise EntityNotFoundError("COPOMapping", entity.id)
        
        # Check for duplicate mapping (if changed)
        if (model.co_id != entity.co_id or model.po_id != entity.po_id) and \
           await self.mapping_exists(entity.co_id, entity.po_id, exclude_id=entity.id):
            raise EntityAlreadyExistsError(
                "COPOMapping",
                "co_id+po_id",
                f"{entity.co_id}+{entity.po_id}"
            )
        
        # Update fields
        model.co_id = entity.co_id
        model.po_id = entity.po_id
        model.strength = entity.strength
        
        self.db.commit()
        self.db.refresh(model)
        
        return await self.get_by_id(entity.id)
    
    async def delete(self, id: int) -> bool:
        """Delete mapping"""
        model = self.db.query(COPOMappingModel).filter(COPOMappingModel.id == id).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if mapping exists"""
        return self.db.query(COPOMappingModel).filter(
            COPOMappingModel.id == id
        ).count() > 0
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count mappings with optional filters"""
        query = self.db.query(COPOMappingModel)
        
        if filters:
            if 'co_id' in filters:
                query = query.filter(COPOMappingModel.co_id == filters['co_id'])
            if 'po_id' in filters:
                query = query.filter(COPOMappingModel.po_id == filters['po_id'])
        
        return query.count()

