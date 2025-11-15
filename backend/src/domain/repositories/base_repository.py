"""
Base Repository Interfaces
All repository interfaces inherit from these
"""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, List, Dict, Any


# Generic entity type
TEntity = TypeVar('TEntity')


class IRepository(ABC, Generic[TEntity]):
    """
    Base repository interface
    
    Defines common operations for all repositories
    """
    
    @abstractmethod
    async def get_by_id(self, id: int) -> Optional[TEntity]:
        """
        Get entity by ID
        
        Args:
            id: Entity ID
        
        Returns:
            Entity if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[TEntity]:
        """
        Get all entities with optional filtering and pagination
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Optional filters as key-value pairs
        
        Returns:
            List of entities
        """
        pass
    
    @abstractmethod
    async def create(self, entity: TEntity) -> TEntity:
        """
        Create a new entity
        
        Args:
            entity: Entity to create
        
        Returns:
            Created entity with ID
        """
        pass
    
    @abstractmethod
    async def update(self, entity: TEntity) -> TEntity:
        """
        Update an existing entity
        
        Args:
            entity: Entity to update
        
        Returns:
            Updated entity
        """
        pass
    
    @abstractmethod
    async def delete(self, id: int) -> bool:
        """
        Delete an entity by ID
        
        Args:
            id: Entity ID
        
        Returns:
            True if deleted, False if not found
        """
        pass
    
    @abstractmethod
    async def exists(self, id: int) -> bool:
        """
        Check if entity exists
        
        Args:
            id: Entity ID
        
        Returns:
            True if exists, False otherwise
        """
        pass
    
    @abstractmethod
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count entities with optional filters
        
        Args:
            filters: Optional filters as key-value pairs
        
        Returns:
            Count of entities
        """
        pass


class IReadOnlyRepository(ABC, Generic[TEntity]):
    """
    Read-only repository interface
    
    For repositories that only need read access
    """
    
    @abstractmethod
    async def get_by_id(self, id: int) -> Optional[TEntity]:
        pass
    
    @abstractmethod
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[TEntity]:
        pass
    
    @abstractmethod
    async def exists(self, id: int) -> bool:
        pass
    
    @abstractmethod
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        pass


class IWriteOnlyRepository(ABC, Generic[TEntity]):
    """
    Write-only repository interface
    
    For repositories that only need write access
    """
    
    @abstractmethod
    async def create(self, entity: TEntity) -> TEntity:
        pass
    
    @abstractmethod
    async def update(self, entity: TEntity) -> TEntity:
        pass
    
    @abstractmethod
    async def delete(self, id: int) -> bool:
        pass

