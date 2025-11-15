"""
Base Entity Classes
All domain entities inherit from these base classes
"""

from datetime import datetime
from typing import Any, Dict, Optional
from abc import ABC


class Entity(ABC):
    """
    Base class for all domain entities
    
    Entities have identity (ID) and lifecycle
    """
    
    def __init__(self, id: Optional[int] = None):
        self._id = id
        self._created_at: Optional[datetime] = None
        self._updated_at: Optional[datetime] = None
    
    @property
    def id(self) -> Optional[int]:
        return self._id
    
    @property
    def created_at(self) -> Optional[datetime]:
        return self._created_at
    
    @property
    def updated_at(self) -> Optional[datetime]:
        return self._updated_at
    
    def __eq__(self, other: object) -> bool:
        """Entities are equal if they have the same ID"""
        if not isinstance(other, Entity):
            return False
        return self.id == other.id
    
    def __hash__(self) -> int:
        return hash(self.id)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary"""
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AggregateRoot(Entity):
    """
    Base class for aggregate roots
    
    Aggregate roots are entry points to aggregates and
    maintain consistency boundaries
    """
    
    def __init__(self, id: Optional[int] = None):
        super().__init__(id)
        self._domain_events: list = []
    
    def add_domain_event(self, event: Any) -> None:
        """Add a domain event"""
        self._domain_events.append(event)
    
    def clear_domain_events(self) -> None:
        """Clear all domain events"""
        self._domain_events.clear()
    
    def get_domain_events(self) -> list:
        """Get all domain events"""
        return self._domain_events.copy()


class ValueObject(ABC):
    """
    Base class for value objects
    
    Value objects are immutable and have no identity
    They are compared by value, not by reference
    """
    
    def __eq__(self, other: object) -> bool:
        """Value objects are equal if all attributes are equal"""
        if not isinstance(other, self.__class__):
            return False
        return self.__dict__ == other.__dict__
    
    def __hash__(self) -> int:
        return hash(tuple(sorted(self.__dict__.items())))
    
    def __repr__(self) -> str:
        attrs = ', '.join(f"{k}={v}" for k, v in self.__dict__.items())
        return f"{self.__class__.__name__}({attrs})"

