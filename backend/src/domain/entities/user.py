"""
User Entity - Core domain entity representing a system user
"""

from typing import Optional, List
from datetime import datetime
import re
from .base import AggregateRoot
from ..value_objects.email import Email
from ..enums.user_role import UserRole
from ..exceptions import ValidationError, BusinessRuleViolationError


class User(AggregateRoot):
    """
    User aggregate root
    
    Represents a user in the system with roles and permissions
    """
    
    def __init__(
        self,
        username: str,
        email: Email,
        first_name: str,
        last_name: str,
        hashed_password: str,
        id: Optional[int] = None,
        is_active: bool = True,
        email_verified: bool = False,
        phone_number: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        super().__init__(id)
        
        # Validate inputs
        self._validate_username(username)
        self._validate_name(first_name, "first_name")
        self._validate_name(last_name, "last_name")
        if phone_number:
            self._validate_phone_number(phone_number)
        
        # Set attributes
        self._username = username.strip().lower()
        self._email = email
        self._first_name = first_name.strip()
        self._last_name = last_name.strip()
        self._hashed_password = hashed_password
        self._is_active = is_active
        self._email_verified = email_verified
        self._phone_number = phone_number.strip() if phone_number else None
        self._avatar_url = avatar_url
        self._bio = bio
        self._created_at = created_at
        self._updated_at = updated_at
        
        # Roles and permissions (many-to-many)
        self._roles: List[UserRole] = []
        self._department_ids: List[int] = []
    
    # Properties
    @property
    def username(self) -> str:
        return self._username
    
    @property
    def email(self) -> Email:
        return self._email
    
    @property
    def first_name(self) -> str:
        return self._first_name
    
    @property
    def last_name(self) -> str:
        return self._last_name
    
    @property
    def full_name(self) -> str:
        return f"{self._first_name} {self._last_name}"
    
    @property
    def hashed_password(self) -> str:
        return self._hashed_password
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    @property
    def email_verified(self) -> bool:
        return self._email_verified
    
    @property
    def phone_number(self) -> Optional[str]:
        return self._phone_number
    
    @property
    def avatar_url(self) -> Optional[str]:
        return self._avatar_url
    
    @property
    def bio(self) -> Optional[str]:
        return self._bio
    
    @property
    def roles(self) -> List[UserRole]:
        return self._roles.copy()
    
    @property
    def role(self) -> Optional[UserRole]:
        """Get primary role (first role) for backward compatibility"""
        return self._roles[0] if self._roles else None
    
    @property
    def department_ids(self) -> List[int]:
        return self._department_ids.copy()
    
    # Validation methods
    def _validate_username(self, username: str) -> None:
        if not username or len(username.strip()) < 3:
            raise ValidationError(
                "Username must be at least 3 characters",
                field="username",
                value=username
            )
        
        if len(username) > 50:
            raise ValidationError(
                "Username must not exceed 50 characters",
                field="username",
                value=username
            )
        
        # Only alphanumeric and underscore
        if not username.replace('_', '').isalnum():
            raise ValidationError(
                "Username can only contain letters, numbers, and underscores",
                field="username",
                value=username
            )
    
    def _validate_name(self, name: str, field: str) -> None:
        if not name or len(name.strip()) < 2:
            raise ValidationError(
                f"{field} must be at least 2 characters",
                field=field,
                value=name
            )
        
        if len(name) > 50:
            raise ValidationError(
                f"{field} must not exceed 50 characters",
                field=field,
                value=name
            )
    
    def _validate_phone_number(self, phone_number: str) -> None:
        """Validate phone number format"""
        # Basic validation: digits, +, -, spaces, parentheses
        phone_pattern = re.compile(r'^[\d\s\+\-\(\)]{10,20}$')
        if not phone_pattern.match(phone_number):
            raise ValidationError(
                "Phone number format is invalid",
                field="phone_number",
                value=phone_number
            )
    
    # Business methods
    def add_role(self, role: UserRole, department_id: Optional[int] = None) -> None:
        """Add a role to the user"""
        if role not in self._roles:
            self._roles.append(role)
            
            if department_id and department_id not in self._department_ids:
                self._department_ids.append(department_id)
            
            self.add_domain_event({
                "event": "RoleAdded",
                "user_id": self.id,
                "role": role.value,
                "department_id": department_id
            })
    
    def remove_role(self, role: UserRole) -> None:
        """Remove a role from the user"""
        if role in self._roles:
            self._roles.remove(role)
            
            self.add_domain_event({
                "event": "RoleRemoved",
                "user_id": self.id,
                "role": role.value
            })
    
    def has_role(self, role: UserRole) -> bool:
        """Check if user has a specific role"""
        return role in self._roles
    
    def has_any_role(self, roles: List[UserRole]) -> bool:
        """Check if user has any of the specified roles"""
        return any(role in self._roles for role in roles)
    
    def activate(self) -> None:
        """Activate the user account"""
        if self._is_active:
            raise BusinessRuleViolationError(
                rule="user_activation",
                message="User is already active"
            )
        
        self._is_active = True
        self.add_domain_event({
            "event": "UserActivated",
            "user_id": self.id
        })
    
    def deactivate(self) -> None:
        """Deactivate the user account"""
        if not self._is_active:
            raise BusinessRuleViolationError(
                rule="user_deactivation",
                message="User is already inactive"
            )
        
        self._is_active = False
        self.add_domain_event({
            "event": "UserDeactivated",
            "user_id": self.id
        })
    
    def verify_email(self) -> None:
        """Mark email as verified"""
        if self._email_verified:
            raise BusinessRuleViolationError(
                rule="email_verification",
                message="Email is already verified"
            )
        
        self._email_verified = True
        self.add_domain_event({
            "event": "EmailVerified",
            "user_id": self.id,
            "email": self._email.email
        })
    
    def update_password(self, new_hashed_password: str) -> None:
        """Update user password"""
        self._hashed_password = new_hashed_password
        self.add_domain_event({
            "event": "PasswordUpdated",
            "user_id": self.id
        })
    
    def update_profile(
        self,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[Email] = None,
        phone_number: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None
    ) -> None:
        """Update user profile information"""
        if first_name:
            self._validate_name(first_name, "first_name")
            self._first_name = first_name.strip()
        
        if last_name:
            self._validate_name(last_name, "last_name")
            self._last_name = last_name.strip()
        
        if email and email != self._email:
            self._email = email
            self._email_verified = False  # Need to re-verify
            
            self.add_domain_event({
                "event": "EmailChanged",
                "user_id": self.id,
                "new_email": email.email
            })
        
        if phone_number is not None:
            if phone_number:
                self._validate_phone_number(phone_number)
                self._phone_number = phone_number.strip()
            else:
                self._phone_number = None
        
        if avatar_url is not None:
            self._avatar_url = avatar_url
        
        if bio is not None:
            self._bio = bio
    
    def can_access_department(self, department_id: int) -> bool:
        """Check if user can access a specific department"""
        # Principals can access all departments
        if self.has_role(UserRole.PRINCIPAL):
            return True
        
        # Others can only access their departments
        return department_id in self._department_ids
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            "username": self._username,
            "email": self._email.email,
            "first_name": self._first_name,
            "last_name": self._last_name,
            "full_name": self.full_name,
            "is_active": self._is_active,
            "email_verified": self._email_verified,
            "phone_number": self._phone_number,
            "avatar_url": self._avatar_url,
            "bio": self._bio,
            "roles": [role.value for role in self._roles],
            "department_ids": self._department_ids,
        }
    
    def __repr__(self) -> str:
        return f"User(id={self.id}, username={self._username}, roles={[r.value for r in self._roles]})"

