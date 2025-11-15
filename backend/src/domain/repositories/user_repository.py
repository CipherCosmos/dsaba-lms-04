"""
User Repository Interface
"""

from abc import abstractmethod
from typing import Optional, List
from .base_repository import IRepository
from ..entities.user import User
from ..enums.user_role import UserRole


class IUserRepository(IRepository[User]):
    """
    User repository interface
    
    Defines operations specific to User entity
    """
    
    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username
        
        Args:
            username: Username to search for
        
        Returns:
            User if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email
        
        Args:
            email: Email to search for
        
        Returns:
            User if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_role(
        self,
        role: UserRole,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Get all users with a specific role
        
        Args:
            role: User role to filter by
            skip: Number of records to skip
            limit: Maximum number of records to return
        
        Returns:
            List of users with the specified role
        """
        pass
    
    @abstractmethod
    async def get_by_department(
        self,
        department_id: int,
        role: Optional[UserRole] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Get all users in a department
        
        Args:
            department_id: Department ID
            role: Optional role filter
            skip: Number of records to skip
            limit: Maximum number of records to return
        
        Returns:
            List of users in the department
        """
        pass
    
    @abstractmethod
    async def username_exists(self, username: str) -> bool:
        """
        Check if username already exists
        
        Args:
            username: Username to check
        
        Returns:
            True if exists, False otherwise
        """
        pass
    
    @abstractmethod
    async def email_exists(self, email: str) -> bool:
        """
        Check if email already exists
        
        Args:
            email: Email to check
        
        Returns:
            True if exists, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_active_users(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Get all active users
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
        
        Returns:
            List of active users
        """
        pass
    
    @abstractmethod
    async def search_by_name(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Search users by name (first_name or last_name)
        
        Args:
            search_term: Search term
            skip: Number of records to skip
            limit: Maximum number of records to return
        
        Returns:
            List of matching users
        """
        pass
    
    @abstractmethod
    async def get_student_by_roll_no(self, roll_no: str) -> Optional[User]:
        """
        Get student user by roll number
        
        Args:
            roll_no: Student roll number
            
        Returns:
            User if found, None otherwise
        """
        pass

