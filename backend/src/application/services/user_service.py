"""
User Service
Business logic for user management operations
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from src.domain.repositories.user_repository import IUserRepository
from src.domain.entities.user import User
from src.domain.value_objects.email import Email
from src.domain.value_objects.password import Password
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    ValidationError,
    BusinessRuleViolationError
)
from src.infrastructure.security.password_hasher import password_hasher


class UserService:
    """
    User service
    
    Coordinates user management operations
    """
    
    def __init__(self, user_repository: IUserRepository):
        self.user_repository = user_repository
    
    async def create_user(
        self,
        username: str,
        email: str,
        first_name: str,
        last_name: str,
        password: str,
        roles: List[UserRole],
        department_ids: Optional[List[int]] = None
    ) -> User:
        """
        Create a new user
        
        Args:
            username: Username
            email: Email address
            first_name: First name
            last_name: Last name
            password: Plain text password
            roles: List of roles to assign
            department_ids: Optional list of department IDs for role scoping
        
        Returns:
            Created User entity
        
        Raises:
            EntityAlreadyExistsError: If username or email exists
            ValidationError: If validation fails
        """
        # Validate email
        email_vo = Email(email)
        
        # Validate and hash password
        password_vo = Password(plain_password=password)
        
        # Check for duplicates
        if await self.user_repository.username_exists(username):
            raise EntityAlreadyExistsError("User", "username", username)
        
        if await self.user_repository.email_exists(email):
            raise EntityAlreadyExistsError("User", "email", email)
        
        # Create user entity
        user = User(
            username=username,
            email=email_vo,
            first_name=first_name,
            last_name=last_name,
            hashed_password=password_hasher.hash(password_vo.value),
            is_active=True,
            email_verified=False
        )
        
        # Add roles
        for role in roles:
            dept_id = department_ids[0] if department_ids else None
            user.add_role(role, department_id=dept_id)
        
        # Save
        return await self.user_repository.create(user)
    
    async def get_user(self, user_id: int) -> User:
        """
        Get user by ID
        
        Args:
            user_id: User ID
        
        Returns:
            User entity
        
        Raises:
            EntityNotFoundError: If user not found
        """
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError("User", user_id)
        return user
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return await self.user_repository.get_by_username(username)
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return await self.user_repository.get_by_email(email)
    
    async def update_user(
        self,
        user_id: int,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[str] = None,
        is_active: Optional[bool] = None,
        phone_number: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None
    ) -> User:
        """
        Update user information
        
        Args:
            user_id: User ID
            first_name: Optional new first name
            last_name: Optional new last name
            email: Optional new email
            is_active: Optional active status
        
        Returns:
            Updated User entity
        
        Raises:
            EntityNotFoundError: If user not found
            EntityAlreadyExistsError: If new email exists
        """
        user = await self.get_user(user_id)
        
        # Update profile (name, email, and profile fields)
        email_vo = Email(email) if email else None
        user.update_profile(
            first_name=first_name,
            last_name=last_name,
            email=email_vo,
            phone_number=phone_number,
            avatar_url=avatar_url,
            bio=bio
        )
        
        # Check email uniqueness if email was provided
        if email:
            if await self.user_repository.email_exists(email):
                existing_user = await self.user_repository.get_by_email(email)
                if existing_user and existing_user.id != user_id:
                    raise EntityAlreadyExistsError("User", "email", email)
        
        # Update active status
        if is_active is not None:
            if is_active:
                user.activate()
            else:
                user.deactivate()
        
        return await self.user_repository.update(user)
    
    async def change_password(
        self,
        user_id: int,
        old_password: str,
        new_password: str
    ) -> User:
        """
        Change user password
        
        Args:
            user_id: User ID
            old_password: Current password
            new_password: New password
        
        Returns:
            Updated User entity
        
        Raises:
            EntityNotFoundError: If user not found
            ValidationError: If old password is incorrect
        """
        user = await self.get_user(user_id)
        
        # Verify old password
        if not password_hasher.verify(old_password, user.hashed_password):
            raise ValidationError(
                "Current password is incorrect",
                field="old_password"
            )
        
        # Validate and hash new password
        new_password_vo = Password(plain_password=new_password)
        user.update_password(password_hasher.hash(new_password_vo.value))
        
        return await self.user_repository.update(user)
    
    async def reset_password(
        self,
        user_id: int,
        new_password: str
    ) -> User:
        """
        Reset user password (admin operation)
        
        Args:
            user_id: User ID
            new_password: New password
        
        Returns:
            Updated User entity
        """
        user = await self.get_user(user_id)
        
        # Validate and hash new password
        new_password_vo = Password(plain_password=new_password)
        user.update_password(password_hasher.hash(new_password_vo.value))
        
        return await self.user_repository.update(user)
    
    async def assign_role(
        self,
        user_id: int,
        role: UserRole,
        department_id: Optional[int] = None
    ) -> User:
        """
        Assign role to user
        
        Args:
            user_id: User ID
            role: Role to assign
            department_id: Optional department ID for scoping
        
        Returns:
            Updated User entity
        """
        user = await self.get_user(user_id)
        user.add_role(role, department_id=department_id)
        return await self.user_repository.update(user)
    
    async def remove_role(
        self,
        user_id: int,
        role: UserRole,
        department_id: Optional[int] = None
    ) -> User:
        """
        Remove role from user
        
        Args:
            user_id: User ID
            role: Role to remove
            department_id: Optional department ID
        
        Returns:
            Updated User entity
        """
        user = await self.get_user(user_id)
        user.remove_role(role, department_id=department_id)
        return await self.user_repository.update(user)
    
    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[User]:
        """
        List users with pagination and filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records
            filters: Optional filters (is_active, email_verified, etc.)
        
        Returns:
            List of User entities
        """
        return await self.user_repository.get_all(skip=skip, limit=limit, filters=filters)
    
    async def get_users_by_role(
        self,
        role: UserRole,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users with a specific role"""
        return await self.user_repository.get_by_role(role, skip=skip, limit=limit)
    
    async def get_users_by_department(
        self,
        department_id: int,
        role: Optional[UserRole] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users in a department"""
        return await self.user_repository.get_by_department(
            department_id=department_id,
            role=role,
            skip=skip,
            limit=limit
        )
    
    async def delete_user(self, user_id: int) -> bool:
        """
        Delete user
        
        Args:
            user_id: User ID
        
        Returns:
            True if deleted, False if not found
        """
        return await self.user_repository.delete(user_id)
    
    async def count_users(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count users with optional filters"""
        return await self.user_repository.count(filters=filters)
    
    async def bulk_create_users(
        self,
        users_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Bulk create users with optimized batch processing
        
        Args:
            users_data: List of user data dictionaries with:
                - username: str
                - email: str
                - first_name: str
                - last_name: str
                - password: str
                - roles: List[str]
                - department_ids: Optional[List[int]]
        
        Returns:
            Dictionary with:
                - created: Number of successfully created users
                - failed: Number of failed creations
                - errors: List of error messages
                - users: List of created User entities
        """
        import secrets
        import string
        
        created_users = []
        errors = []
        
        # Generate default password if not provided
        def generate_password(length: int = 16) -> str:
            """Generate a secure random password"""
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            return ''.join(secrets.choice(alphabet) for _ in range(length))
        
        # Process each user
        for idx, user_data in enumerate(users_data):
            try:
                # Extract data
                username = user_data.get('username')
                email = user_data.get('email')
                first_name = user_data.get('first_name')
                last_name = user_data.get('last_name')
                password = user_data.get('password') or generate_password()
                roles_str = user_data.get('roles', [])
                department_ids = user_data.get('department_ids', [])
                
                # Validate required fields
                if not username or not email or not first_name or not last_name:
                    errors.append({
                        "index": idx,
                        "username": username or "N/A",
                        "error": "Missing required fields: username, email, first_name, or last_name"
                    })
                    continue
                
                # Convert role strings to enums
                try:
                    roles = [UserRole(role) for role in roles_str]
                except ValueError as e:
                    errors.append({
                        "index": idx,
                        "username": username,
                        "error": f"Invalid role: {str(e)}"
                    })
                    continue
                
                # Check for duplicates before creating
                if await self.user_repository.username_exists(username):
                    errors.append({
                        "index": idx,
                        "username": username,
                        "error": f"Username '{username}' already exists"
                    })
                    continue
                
                if await self.user_repository.email_exists(email):
                    errors.append({
                        "index": idx,
                        "username": username,
                        "error": f"Email '{email}' already exists"
                    })
                    continue
                
                # Create user
                user = await self.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                    roles=roles,
                    department_ids=department_ids if department_ids else None
                )
                
                created_users.append(user)
                
            except Exception as e:
                errors.append({
                    "index": idx,
                    "username": user_data.get('username', 'N/A'),
                    "error": str(e)
                })
        
        return {
            "created": len(created_users),
            "failed": len(errors),
            "errors": errors,
            "users": created_users
        }

