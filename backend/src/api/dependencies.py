"""
API Dependencies
Dependency injection for FastAPI endpoints
"""

from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.infrastructure.database.session import get_db
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.security.jwt_handler import jwt_handler
from src.application.services.auth_service import AuthService
from src.domain.exceptions import TokenInvalidError, TokenExpiredError, TokenRevokedError

# Security scheme
security = HTTPBearer()


# Repository dependencies
def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    """Get user repository instance"""
    return UserRepository(db)


def get_password_reset_token_repository(db: Session = Depends(get_db)):
    """Get password reset token repository instance"""
    from src.infrastructure.database.repositories.password_reset_token_repository_impl import PasswordResetTokenRepository
    return PasswordResetTokenRepository(db)


def get_department_repository(db: Session = Depends(get_db)):
    """Get department repository instance"""
    from src.infrastructure.database.repositories.department_repository_impl import DepartmentRepository
    return DepartmentRepository(db)


def get_exam_repository(db: Session = Depends(get_db)):
    """Get exam repository instance"""
    from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
    return ExamRepository(db)


def get_mark_repository(db: Session = Depends(get_db)):
    """Get mark repository instance"""
    from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
    return MarkRepository(db)


# Service dependencies
def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository)
) -> AuthService:
    """Get auth service instance"""
    return AuthService(user_repo)


def get_password_reset_service(
    user_repo: UserRepository = Depends(get_user_repository),
    token_repo = Depends(get_password_reset_token_repository)
):
    """Get password reset service instance"""
    from src.application.services.password_reset_service import PasswordResetService
    return PasswordResetService(user_repo, token_repo)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Get user service instance"""
    from src.application.services.user_service import UserService
    return UserService(user_repo)


# Authentication dependency
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Get current authenticated user
    
    This dependency validates the JWT token and returns the user entity
    
    Raises:
        HTTPException 401: If token is invalid or expired
    """
    try:
        # Extract token
        token = credentials.credentials
        
        # Decode and validate
        payload = jwt_handler.decode_token(token)
        
        # Get username from token
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user = await user_repo.get_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user

    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenRevokedError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except TokenInvalidError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Optional authentication dependency
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """
    Get current authenticated user (optional)

    This dependency validates the JWT token and returns the user entity if valid,
    otherwise returns None. Useful for endpoints that work with or without authentication.

    Returns:
        User entity if token is valid, None otherwise
    """
    try:
        # Extract token
        token = credentials.credentials

        # Decode and validate
        payload = jwt_handler.decode_token(token)

        # Get username from token
        username = payload.get("sub")
        if not username:
            return None

        # Get user from database
        user = await user_repo.get_by_username(username)
        if not user or not user.is_active:
            return None

        return user

    except Exception:
        # Return None for any authentication failure
        return None

