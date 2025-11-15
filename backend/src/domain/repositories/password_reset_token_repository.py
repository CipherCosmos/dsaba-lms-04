"""
Password Reset Token Repository Interface
"""

from abc import abstractmethod
from typing import Optional
from .base_repository import IRepository
from ..entities.password_reset_token import PasswordResetToken


class IPasswordResetTokenRepository(IRepository[PasswordResetToken]):
    """
    Password reset token repository interface
    
    Defines operations specific to PasswordResetToken entity
    """
    
    @abstractmethod
    async def get_by_token(self, token: str) -> Optional[PasswordResetToken]:
        """
        Get token by token string
        
        Args:
            token: Token string to search for
        
        Returns:
            PasswordResetToken if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_user_id(
        self,
        user_id: int,
        include_used: bool = False,
        include_expired: bool = False
    ) -> list[PasswordResetToken]:
        """
        Get all tokens for a user
        
        Args:
            user_id: User ID
            include_used: Include used tokens
            include_expired: Include expired tokens
        
        Returns:
            List of PasswordResetToken instances
        """
        pass
    
    @abstractmethod
    async def invalidate_user_tokens(self, user_id: int) -> int:
        """
        Invalidate all active tokens for a user
        
        Args:
            user_id: User ID
        
        Returns:
            Number of tokens invalidated
        """
        pass
    
    @abstractmethod
    async def cleanup_expired_tokens(self) -> int:
        """
        Delete expired tokens
        
        Returns:
            Number of tokens deleted
        """
        pass

