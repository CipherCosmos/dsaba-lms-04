"""
Subject Entity - Represents an academic subject/course
"""

from typing import Optional
from datetime import datetime
from .base import AggregateRoot
from ..exceptions import ValidationError, InvalidRangeError


class Subject(AggregateRoot):
    """
    Subject aggregate root
    
    Represents an academic subject/course
    """
    
    def __init__(
        self,
        code: str,
        name: str,
        department_id: int,
        credits: float,
        id: Optional[int] = None,
        max_internal: float = 40.0,
        max_external: float = 60.0,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate
        self._validate_code(code)
        self._validate_name(name)
        self._validate_credits(credits)
        self._validate_marks(max_internal, max_external)
        
        # Set attributes
        self._code = code.strip().upper()
        self._name = name.strip()
        self._department_id = department_id
        self._credits = credits
        self._max_internal = max_internal
        self._max_external = max_external
        self._is_active = is_active
        self._created_at = created_at
        self._updated_at = updated_at
    
    # Properties
    @property
    def code(self) -> str:
        return self._code
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def department_id(self) -> int:
        return self._department_id
    
    @property
    def credits(self) -> float:
        return self._credits
    
    @property
    def max_internal(self) -> float:
        return self._max_internal
    
    @property
    def max_external(self) -> float:
        return self._max_external
    
    @property
    def total_marks(self) -> float:
        return self._max_internal + self._max_external
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    # Validation
    def _validate_code(self, code: str) -> None:
        if not code or len(code.strip()) < 2:
            raise ValidationError(
                "Subject code must be at least 2 characters",
                field="code",
                value=code
            )
        
        if len(code) > 20:
            raise ValidationError(
                "Subject code must not exceed 20 characters",
                field="code",
                value=code
            )
    
    def _validate_name(self, name: str) -> None:
        if not name or len(name.strip()) < 3:
            raise ValidationError(
                "Subject name must be at least 3 characters",
                field="name",
                value=name
            )
        
        if len(name) > 100:
            raise ValidationError(
                "Subject name must not exceed 100 characters",
                field="name",
                value=name
            )
    
    def _validate_credits(self, credits: float) -> None:
        if credits < 1 or credits > 10:
            raise InvalidRangeError(
                field="credits",
                value=credits,
                min_value=1,
                max_value=10
            )
    
    def _validate_marks(self, internal: float, external: float) -> None:
        if internal < 0 or internal > 100:
            raise InvalidRangeError(
                field="max_internal",
                value=internal,
                min_value=0,
                max_value=100
            )
        
        if external < 0 or external > 100:
            raise InvalidRangeError(
                field="max_external",
                value=external,
                min_value=0,
                max_value=100
            )
        
        total = internal + external
        if total != 100:
            raise ValidationError(
                f"Internal + External must equal 100, got {total}",
                field="marks",
                value=total
            )
    
    # Business methods
    def update_info(
        self,
        name: Optional[str] = None,
        credits: Optional[float] = None
    ) -> None:
        """Update subject information"""
        if name:
            self._validate_name(name)
            self._name = name.strip()
        
        if credits:
            self._validate_credits(credits)
            self._credits = credits
        
        if name or credits:
            self.add_domain_event({
                "event": "SubjectUpdated",
                "subject_id": self.id
            })
    
    def update_marks_distribution(self, max_internal: float, max_external: float) -> None:
        """Update marks distribution"""
        self._validate_marks(max_internal, max_external)
        self._max_internal = max_internal
        self._max_external = max_external
        
        self.add_domain_event({
            "event": "MarksDistributionUpdated",
            "subject_id": self.id,
            "max_internal": max_internal,
            "max_external": max_external
        })
    
    def activate(self) -> None:
        """Activate the subject"""
        self._is_active = True
    
    def deactivate(self) -> None:
        """Deactivate the subject"""
        self._is_active = False
    
    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "code": self._code,
            "name": self._name,
            "department_id": self._department_id,
            "credits": self._credits,
            "max_internal": self._max_internal,
            "max_external": self._max_external,
            "total_marks": self.total_marks,
            "is_active": self._is_active,
        }
    
    def __repr__(self) -> str:
        return f"Subject(id={self.id}, code={self._code}, name={self._name})"

