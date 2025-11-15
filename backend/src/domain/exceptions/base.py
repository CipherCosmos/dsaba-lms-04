"""
Base Exception Classes
All domain exceptions inherit from these
"""

from typing import Optional, Dict, Any


class DomainException(Exception):
    """
    Base exception for all domain errors
    
    All business logic exceptions should inherit from this
    """
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
        }
    
    def __str__(self) -> str:
        return f"[{self.error_code}] {self.message}"


class EntityNotFoundError(DomainException):
    """Raised when an entity is not found"""
    
    def __init__(self, entity_type: str, entity_id: Any):
        super().__init__(
            message=f"{entity_type} with ID {entity_id} not found",
            error_code="ENTITY_NOT_FOUND",
            details={"entity_type": entity_type, "entity_id": str(entity_id)}
        )


class EntityAlreadyExistsError(DomainException):
    """Raised when trying to create a duplicate entity"""
    
    def __init__(self, entity_type: str, field: str, value: Any):
        super().__init__(
            message=f"{entity_type} with {field}='{value}' already exists",
            error_code="ENTITY_ALREADY_EXISTS",
            details={"entity_type": entity_type, "field": field, "value": str(value)}
        )


class BusinessRuleViolationError(DomainException):
    """Raised when a business rule is violated"""
    
    def __init__(self, rule: str, message: str):
        super().__init__(
            message=message,
            error_code="BUSINESS_RULE_VIOLATION",
            details={"rule": rule}
        )


class InvalidOperationError(DomainException):
    """Raised when an invalid operation is attempted"""
    
    def __init__(self, operation: str, reason: str):
        super().__init__(
            message=f"Cannot {operation}: {reason}",
            error_code="INVALID_OPERATION",
            details={"operation": operation, "reason": reason}
        )


class ConcurrencyError(DomainException):
    """Raised when a concurrency conflict occurs"""
    
    def __init__(self, entity_type: str, entity_id: Any):
        super().__init__(
            message=f"{entity_type} with ID {entity_id} was modified by another transaction",
            error_code="CONCURRENCY_ERROR",
            details={"entity_type": entity_type, "entity_id": str(entity_id)}
        )

