"""
Password Reset Token Entity
Represents a password reset token for user authentication
"""

from typing import Optional
from datetime import datetime, timedelta
from .base import AggregateRoot
from ..exceptions import ValidationError, BusinessRuleViolationError


class PasswordResetToken(AggregateRoot):
    """
    Password reset token aggregate root
    
    Represents a secure token for password reset operations
    """
    
    def __init__(
        self,
        user_id: int,
        token: str,
        expires_at: datetime,
        id: Optional[int] = None,
        used_at: Optional[datetime] = None,
        created_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate inputs
        if not user_id or user_id <= 0:
            raise ValidationError(
                "User ID must be a positive integer",
                field="user_id",
                value=user_id
            )
        
        if not token or len(token.strip()) < 32:
            raise ValidationError(
                "Token must be at least 32 characters",
                field="token",
                value=token
            )
        
        if not expires_at:
            raise ValidationError(
                "Expires at must be provided",
                field="expires_at",
                value=expires_at
            )
        
        if expires_at <= datetime.utcnow():
            raise ValidationError(
                "Expires at must be in the future",
                field="expires_at",
                value=expires_at
            )
        
        # Set attributes
        self._user_id = user_id
        self._token = token.strip()
        self._expires_at = expires_at
        self._used_at = used_at
        self._created_at = created_at or datetime.utcnow()
    
    # Properties
    @property
    def user_id(self) -> int:
        return self._user_id
    
    @property
    def token(self) -> str:
        return self._token
    
    @property
    def expires_at(self) -> datetime:
        return self._expires_at
    
    @property
    def used_at(self) -> Optional[datetime]:
        return self._used_at
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() >= self._expires_at
    
    @property
    def is_used(self) -> bool:
        """Check if token has been used"""
        return self._used_at is not None
    
    @property
    def is_valid(self) -> bool:
        """Check if token is valid (not expired and not used)"""
        return not self.is_expired and not self.is_used
    
    # Business methods
    def mark_as_used(self) -> None:
        """Mark token as used"""
        if self.is_used:
            raise BusinessRuleViolationError(
                rule="token_already_used",
                message="Token has already been used"
            )
        
        if self.is_expired:
            raise BusinessRuleViolationError(
                rule="token_expired",
                message="Token has expired"
            )
        
        self._used_at = datetime.utcnow()
        self.add_domain_event({
            "event": "PasswordResetTokenUsed",
            "token_id": self.id,
            "user_id": self._user_id
        })
    
    @classmethod
    def create(
        cls,
        user_id: int,
        token: str,
        expiration_hours: int = 24
    ) -> "PasswordResetToken":
        """
        Create a new password reset token
        
        Args:
            user_id: User ID
            token: Secure token string
            expiration_hours: Hours until expiration (default: 24)
        
        Returns:
            New PasswordResetToken instance
        """
        expires_at = datetime.utcnow() + timedelta(hours=expiration_hours)
        return cls(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            "user_id": self._user_id,
            "token": self._token,
            "expires_at": self._expires_at.isoformat(),
            "used_at": self._used_at.isoformat() if self._used_at else None,
            "is_expired": self.is_expired,
            "is_used": self.is_used,
            "is_valid": self.is_valid,
        }
    
    def __repr__(self) -> str:
        return f"PasswordResetToken(id={self.id}, user_id={self._user_id}, is_valid={self.is_valid})"

