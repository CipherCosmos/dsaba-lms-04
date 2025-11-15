"""
Password Reset Token Repository Implementation
SQLAlchemy implementation of IPasswordResetTokenRepository
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from src.domain.repositories.password_reset_token_repository import IPasswordResetTokenRepository
from src.domain.entities.password_reset_token import PasswordResetToken

from ..models import PasswordResetTokenModel


class PasswordResetTokenRepository(IPasswordResetTokenRepository):
    """
    SQLAlchemy implementation of password reset token repository
    
    Maps between domain PasswordResetToken entity and PasswordResetTokenModel database model
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def _to_entity(self, model: PasswordResetTokenModel) -> Optional[PasswordResetToken]:
        """Convert database model to domain entity"""
        if not model:
            return None
        
        return PasswordResetToken(
            id=model.id,
            user_id=model.user_id,
            token=model.token,
            expires_at=model.expires_at,
            used_at=model.used_at,
            created_at=model.created_at
        )
    
    def _to_model(self, entity: PasswordResetToken) -> PasswordResetTokenModel:
        """Convert domain entity to database model"""
        return PasswordResetTokenModel(
            id=entity.id,
            user_id=entity.user_id,
            token=entity.token,
            expires_at=entity.expires_at,
            used_at=entity.used_at,
            created_at=entity.created_at
        )
    
    async def get_by_id(self, id: int) -> Optional[PasswordResetToken]:
        """Get token by ID"""
        model = self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.id == id
        ).first()
        
        return self._to_entity(model)
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict] = None
    ) -> List[PasswordResetToken]:
        """Get all tokens with optional filtering"""
        query = self.db.query(PasswordResetTokenModel)
        
        if filters:
            if 'user_id' in filters:
                query = query.filter(PasswordResetTokenModel.user_id == filters['user_id'])
            if 'is_used' in filters:
                if filters['is_used']:
                    query = query.filter(PasswordResetTokenModel.used_at.isnot(None))
                else:
                    query = query.filter(PasswordResetTokenModel.used_at.is_(None))
            if 'is_expired' in filters:
                now = datetime.utcnow()
                if filters['is_expired']:
                    query = query.filter(PasswordResetTokenModel.expires_at < now)
                else:
                    query = query.filter(PasswordResetTokenModel.expires_at >= now)
        
        models = query.offset(skip).limit(limit).all()
        return [self._to_entity(model) for model in models if model]
    
    async def create(self, entity: PasswordResetToken) -> PasswordResetToken:
        """Create a new token"""
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        
        # Return entity with ID
        entity._id = model.id
        return entity
    
    async def update(self, entity: PasswordResetToken) -> PasswordResetToken:
        """Update an existing token"""
        model = self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.id == entity.id
        ).first()
        
        if not model:
            return None
        
        model.used_at = entity.used_at
        self.db.commit()
        self.db.refresh(model)
        
        # Return updated entity
        updated_entity = self._to_entity(model)
        return updated_entity
    
    async def delete(self, id: int) -> bool:
        """Delete a token by ID"""
        model = self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.id == id
        ).first()
        
        if not model:
            return False
        
        self.db.delete(model)
        self.db.commit()
        return True
    
    async def exists(self, id: int) -> bool:
        """Check if token exists"""
        return self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.id == id
        ).first() is not None
    
    async def count(self, filters: Optional[dict] = None) -> int:
        """Count tokens with optional filtering"""
        query = self.db.query(PasswordResetTokenModel)
        
        if filters:
            if 'user_id' in filters:
                query = query.filter(PasswordResetTokenModel.user_id == filters['user_id'])
            if 'is_used' in filters:
                if filters['is_used']:
                    query = query.filter(PasswordResetTokenModel.used_at.isnot(None))
                else:
                    query = query.filter(PasswordResetTokenModel.used_at.is_(None))
            if 'is_expired' in filters:
                now = datetime.utcnow()
                if filters['is_expired']:
                    query = query.filter(PasswordResetTokenModel.expires_at < now)
                else:
                    query = query.filter(PasswordResetTokenModel.expires_at >= now)
        
        return query.count()
    
    async def get_by_token(self, token: str) -> Optional[PasswordResetToken]:
        """Get token by token string"""
        model = self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.token == token
        ).first()
        
        return self._to_entity(model)
    
    async def get_by_user_id(
        self,
        user_id: int,
        include_used: bool = False,
        include_expired: bool = False
    ) -> List[PasswordResetToken]:
        """Get all tokens for a user"""
        query = self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.user_id == user_id
        )
        
        if not include_used:
            query = query.filter(PasswordResetTokenModel.used_at.is_(None))
        
        if not include_expired:
            now = datetime.utcnow()
            query = query.filter(PasswordResetTokenModel.expires_at >= now)
        
        models = query.order_by(PasswordResetTokenModel.created_at.desc()).all()
        return [self._to_entity(model) for model in models if model]
    
    async def invalidate_user_tokens(self, user_id: int) -> int:
        """Invalidate all active tokens for a user"""
        now = datetime.utcnow()
        result = self.db.query(PasswordResetTokenModel).filter(
            and_(
                PasswordResetTokenModel.user_id == user_id,
                PasswordResetTokenModel.used_at.is_(None),
                PasswordResetTokenModel.expires_at >= now
            )
        ).update({
            PasswordResetTokenModel.used_at: now
        })
        
        self.db.commit()
        return result
    
    async def cleanup_expired_tokens(self) -> int:
        """Delete expired tokens"""
        now = datetime.utcnow()
        result = self.db.query(PasswordResetTokenModel).filter(
            PasswordResetTokenModel.expires_at < now
        ).delete()
        
        self.db.commit()
        return result

