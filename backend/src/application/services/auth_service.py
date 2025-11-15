"""
Authentication Service
Handles user authentication and token management
"""

from typing import Tuple, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.user_repository import IUserRepository
from src.domain.value_objects.password import Password
from src.domain.exceptions import (
    InvalidCredentialsError,
    AccountLockedError,
    TokenInvalidError
)
from src.infrastructure.security.password_hasher import password_hasher
from src.infrastructure.security.jwt_handler import jwt_handler


class AuthService:
    """
    Authentication service
    
    Coordinates authentication operations
    """
    
    def __init__(self, user_repository: IUserRepository):
        self.user_repository = user_repository
    
    async def login(
        self,
        username: str,
        password: str
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Authenticate user and generate tokens
        
        Args:
            username: Username
            password: Plain text password
        
        Returns:
            Tuple of (access_token, refresh_token, user_dict)
        
        Raises:
            InvalidCredentialsError: If credentials are invalid
            AccountLockedError: If account is locked
        """
        # Get user
        user = await self.user_repository.get_by_username(username)
        
        if not user:
            raise InvalidCredentialsError()
        
        # Check if account is active
        if not user.is_active:
            raise AccountLockedError(reason="Account is deactivated")
        
        # Verify password
        if not password_hasher.verify(password, user.hashed_password):
            raise InvalidCredentialsError()
        
        # Check if password needs rehashing (security upgrade)
        if password_hasher.needs_rehash(user.hashed_password):
            new_hash = password_hasher.hash(password)
            user.update_password(new_hash)
            await self.user_repository.update(user)
        
        # Generate tokens
        token_data = {"sub": user.username}
        access_token = jwt_handler.create_access_token(token_data)
        refresh_token = jwt_handler.create_refresh_token(token_data)
        
        # Prepare user data
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "email_verified": user.email_verified,
            "phone_number": user.phone_number,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "roles": [role.value for role in user.roles],
            "department_ids": user.department_ids,
            # For backward compatibility, include singular role field (first role or primary role)
            "role": user.roles[0].value if user.roles else "student",
        }
        
        return access_token, refresh_token, user_data
    
    async def logout(self, access_token: str) -> None:
        """
        Logout user by blacklisting token
        
        Args:
            access_token: Token to blacklist
        """
        jwt_handler.blacklist_token(access_token)
    
    async def refresh_token(self, refresh_token: str) -> str:
        """
        Refresh access token
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            New access token
        
        Raises:
            TokenInvalidError: If refresh token is invalid
        """
        try:
            # Decode refresh token
            payload = jwt_handler.decode_token(refresh_token)
            
            # Verify it's a refresh token
            if payload.get("type") != "refresh":
                raise TokenInvalidError()
            
            # Generate new access token
            username = payload.get("sub")
            if not username:
                raise TokenInvalidError()
            
            # Verify user still exists and is active
            user = await self.user_repository.get_by_username(username)
            if not user or not user.is_active:
                raise TokenInvalidError()
            
            # Create new access token
            token_data = {"sub": username}
            new_access_token = jwt_handler.create_access_token(token_data)
            
            return new_access_token
            
        except Exception as e:
            raise TokenInvalidError()
    
    async def get_current_user(self, access_token: str) -> Dict[str, Any]:
        """
        Get current user from access token
        
        Args:
            access_token: Valid access token
        
        Returns:
            User data dictionary
        
        Raises:
            TokenInvalidError: If token is invalid
        """
        # Decode token
        payload = jwt_handler.decode_token(access_token)
        
        # Get username
        username = payload.get("sub")
        if not username:
            raise TokenInvalidError()
        
        # Get user
        user = await self.user_repository.get_by_username(username)
        if not user:
            raise TokenInvalidError()
        
        return user.to_dict()

