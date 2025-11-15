"""
Validation Exception Classes
"""

from typing import Optional, Dict, Any
from .base import DomainException


class ValidationError(DomainException):
    """Base class for validation errors"""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None
    ):
        details = {}
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = str(value)
        
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details
        )
        self.field = field
        self.value = value


class InvalidEmailError(ValidationError):
    """Raised when email format is invalid"""
    
    def __init__(self, message: str):
        super().__init__(message=message, field="email")


class WeakPasswordError(ValidationError):
    """Raised when password is too weak"""
    
    def __init__(self, message: str):
        super().__init__(message=message, field="password")


class InvalidFieldValueError(ValidationError):
    """Raised when a field value is invalid"""
    
    def __init__(self, field: str, value: Any, reason: str):
        super().__init__(
            message=f"Invalid value for {field}: {reason}",
            field=field,
            value=value
        )


class RequiredFieldMissingError(ValidationError):
    """Raised when a required field is missing"""
    
    def __init__(self, field: str):
        super().__init__(
            message=f"Required field '{field}' is missing",
            field=field
        )


class InvalidRangeError(ValidationError):
    """Raised when a value is out of valid range"""
    
    def __init__(self, field: str, value: Any, min_value: Any, max_value: Any):
        super().__init__(
            message=f"{field} must be between {min_value} and {max_value}, got {value}",
            field=field,
            value=value
        )
        self.min_value = min_value
        self.max_value = max_value

