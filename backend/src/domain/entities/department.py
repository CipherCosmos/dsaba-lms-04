"""
Department Entity - Represents an academic department
"""

from typing import Optional
from datetime import datetime
from .base import AggregateRoot
from ..exceptions import ValidationError, BusinessRuleViolationError


class Department(AggregateRoot):
    """
    Department aggregate root
    
    Represents an academic department (e.g., Computer Science, Mechanical Engineering)
    """
    
    def __init__(
        self,
        name: str,
        code: str,
        id: Optional[int] = None,
        hod_id: Optional[int] = None,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate inputs
        self._validate_name(name)
        self._validate_code(code)
        
        # Set attributes
        self._name = name.strip()
        self._code = code.strip().upper()
        self._hod_id = hod_id
        self._is_active = is_active
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def code(self) -> str:
        return self._code
    
    @property
    def hod_id(self) -> Optional[int]:
        return self._hod_id
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    # Validation methods
    def _validate_name(self, name: str) -> None:
        if not name or len(name.strip()) < 3:
            raise ValidationError(
                "Department name must be at least 3 characters",
                field="name",
                value=name
            )
        
        if len(name) > 100:
            raise ValidationError(
                "Department name must not exceed 100 characters",
                field="name",
                value=name
            )
    
    def _validate_code(self, code: str) -> None:
        if not code or len(code.strip()) < 2:
            raise ValidationError(
                "Department code must be at least 2 characters",
                field="code",
                value=code
            )
        
        if len(code) > 10:
            raise ValidationError(
                "Department code must not exceed 10 characters",
                field="code",
                value=code
            )
        
        # Only alphanumeric
        if not code.replace('-', '').replace('_', '').isalnum():
            raise ValidationError(
                "Department code can only contain letters, numbers, hyphens, and underscores",
                field="code",
                value=code
            )
    
    # Business methods
    def assign_hod(self, hod_id: int) -> None:
        """Assign a Head of Department"""
        if self._hod_id == hod_id:
            raise BusinessRuleViolationError(
                rule="hod_assignment",
                message="This user is already the HOD"
            )
        
        old_hod_id = self._hod_id
        self._hod_id = hod_id
        
        self.add_domain_event({
            "event": "HODAssigned",
            "department_id": self.id,
            "new_hod_id": hod_id,
            "old_hod_id": old_hod_id
        })
    
    def remove_hod(self) -> None:
        """Remove the current HOD"""
        if not self._hod_id:
            raise BusinessRuleViolationError(
                rule="hod_removal",
                message="Department has no HOD assigned"
            )
        
        old_hod_id = self._hod_id
        self._hod_id = None
        
        self.add_domain_event({
            "event": "HODRemoved",
            "department_id": self.id,
            "old_hod_id": old_hod_id
        })
    
    def activate(self) -> None:
        """Activate the department"""
        if self._is_active:
            raise BusinessRuleViolationError(
                rule="department_activation",
                message="Department is already active"
            )
        
        self._is_active = True
        self.add_domain_event({
            "event": "DepartmentActivated",
            "department_id": self.id
        })
    
    def deactivate(self) -> None:
        """Deactivate the department"""
        if not self._is_active:
            raise BusinessRuleViolationError(
                rule="department_deactivation",
                message="Department is already inactive"
            )
        
        self._is_active = False
        self.add_domain_event({
            "event": "DepartmentDeactivated",
            "department_id": self.id
        })
    
    def update_info(self, name: Optional[str] = None, code: Optional[str] = None) -> None:
        """Update department information"""
        if name:
            self._validate_name(name)
            self._name = name.strip()
        
        if code:
            self._validate_code(code)
            self._code = code.strip().upper()
        
        if name or code:
            self.add_domain_event({
                "event": "DepartmentUpdated",
                "department_id": self.id
            })
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            "name": self._name,
            "code": self._code,
            "hod_id": self._hod_id,
            "is_active": self._is_active,
        }
    
    def __repr__(self) -> str:
        return f"Department(id={self.id}, code={self._code}, name={self._name})"

