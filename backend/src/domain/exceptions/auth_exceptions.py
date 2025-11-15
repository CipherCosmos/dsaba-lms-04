"""
Authentication & Authorization Exception Classes
"""

from typing import Optional
from .base import DomainException


class AuthenticationError(DomainException):
    """Base class for authentication errors"""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR"
        )


class InvalidCredentialsError(AuthenticationError):
    """Raised when credentials are invalid"""
    
    def __init__(self):
        super().__init__(message="Invalid username or password")


class AccountLockedError(AuthenticationError):
    """Raised when account is locked"""
    
    def __init__(self, reason: Optional[str] = None):
        message = "Account is locked"
        if reason:
            message += f": {reason}"
        super().__init__(message=message)


class TokenExpiredError(AuthenticationError):
    """Raised when token has expired"""
    
    def __init__(self):
        super().__init__(message="Token has expired")


class TokenInvalidError(AuthenticationError):
    """Raised when token is invalid"""
    
    def __init__(self):
        super().__init__(message="Invalid token")


class TokenRevokedError(AuthenticationError):
    """Raised when token has been revoked"""
    
    def __init__(self):
        super().__init__(message="Token has been revoked")


class AuthorizationError(DomainException):
    """Base class for authorization errors"""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR"
        )


class InsufficientPermissionsError(AuthorizationError):
    """Raised when user lacks required permissions"""
    
    def __init__(self, required_permission: Optional[str] = None):
        message = "Insufficient permissions"
        if required_permission:
            message += f" (requires: {required_permission})"
        super().__init__(message=message)


class DepartmentScopeViolationError(AuthorizationError):
    """Raised when user tries to access resources outside their department"""
    
    def __init__(self):
        super().__init__(
            message="Cannot access resources outside your department"
        )


class ResourceOwnershipError(AuthorizationError):
    """Raised when user tries to modify resources they don't own"""
    
    def __init__(self, resource_type: str):
        super().__init__(
            message=f"You do not own this {resource_type}"
        )

