"""Domain Exceptions"""

from .base import (
    DomainException,
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError,
    InvalidOperationError,
    ConcurrencyError,
)
from .validation_exceptions import (
    ValidationError,
    InvalidEmailError,
    WeakPasswordError,
    InvalidFieldValueError,
    RequiredFieldMissingError,
    InvalidRangeError,
)
from .auth_exceptions import (
    AuthenticationError,
    InvalidCredentialsError,
    AccountLockedError,
    TokenExpiredError,
    TokenInvalidError,
    TokenRevokedError,
    AuthorizationError,
    InsufficientPermissionsError,
    DepartmentScopeViolationError,
    ResourceOwnershipError,
)

__all__ = [
    # Base exceptions
    "DomainException",
    "EntityNotFoundError",
    "EntityAlreadyExistsError",
    "BusinessRuleViolationError",
    "InvalidOperationError",
    "ConcurrencyError",
    # Validation exceptions
    "ValidationError",
    "InvalidEmailError",
    "WeakPasswordError",
    "InvalidFieldValueError",
    "RequiredFieldMissingError",
    "InvalidRangeError",
    # Auth exceptions
    "AuthenticationError",
    "InvalidCredentialsError",
    "AccountLockedError",
    "TokenExpiredError",
    "TokenInvalidError",
    "TokenRevokedError",
    "AuthorizationError",
    "InsufficientPermissionsError",
    "DepartmentScopeViolationError",
    "ResourceOwnershipError",
]

