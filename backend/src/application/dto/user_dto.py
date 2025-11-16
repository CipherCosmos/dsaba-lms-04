"""
User DTOs
Request/Response models for user management endpoints
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserCreateRequest(BaseModel):
    """Create user request DTO"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=12)
    roles: List[str] = Field(..., min_items=1)
    department_ids: Optional[List[int]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "password": "MyStr0ng!Pass123",
                "roles": ["teacher"],
                "department_ids": [1]
            }
        }


class UserUpdateRequest(BaseModel):
    """Update user request DTO"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class ProfileUpdateRequest(BaseModel):
    """Profile update request DTO"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "phone_number": "+1234567890",
                "avatar_url": "https://example.com/avatar.jpg",
                "bio": "Software Engineer"
            }
        }


class ProfileResponse(BaseModel):
    """Profile response DTO"""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    email_verified: bool
    roles: List[str]
    department_ids: List[int]
    role: Optional[str] = None  # For backward compatibility (first role from roles array)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "john_doe",
                "email": "john@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "full_name": "John Doe",
                "phone_number": "+1234567890",
                "avatar_url": "https://example.com/avatar.jpg",
                "bio": "Software Engineer",
                "email_verified": True,
                "roles": ["teacher"],
                "department_ids": [1],
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class UserResponse(BaseModel):
    """User response DTO"""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    is_active: bool
    email_verified: bool
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    roles: List[str]
    department_ids: List[int]
    role: Optional[str] = None  # For backward compatibility (first role from roles array)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "john_doe",
                "email": "john@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "full_name": "John Doe",
                "is_active": True,
                "email_verified": True,
                "roles": ["teacher"],
                "department_ids": [1],
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class UserListResponse(BaseModel):
    """User list response DTO"""
    items: List[UserResponse]
    total: int
    skip: int
    limit: int


class ChangePasswordRequest(BaseModel):
    """Change password request DTO"""
    old_password: str = Field(..., min_length=12)
    new_password: str = Field(..., min_length=12)


class ResetPasswordRequest(BaseModel):
    """Reset password request DTO (admin)"""
    new_password: str = Field(..., min_length=12)


class AssignRoleRequest(BaseModel):
    """Assign role request DTO"""
    role: str
    department_id: Optional[int] = None


class RemoveRoleRequest(BaseModel):
    """Remove role request DTO"""
    role: str
    department_id: Optional[int] = None


class BulkUserCreateRequest(BaseModel):
    """Bulk user create request DTO"""
    users: List[UserCreateRequest] = Field(..., min_items=1, max_items=1000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "users": [
                    {
                        "username": "student1",
                        "email": "student1@example.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "password": "TempPass123!@#",
                        "roles": ["student"],
                        "department_ids": [1]
                    },
                    {
                        "username": "student2",
                        "email": "student2@example.com",
                        "first_name": "Jane",
                        "last_name": "Smith",
                        "password": "TempPass123!@#",
                        "roles": ["student"],
                        "department_ids": [1]
                    }
                ]
            }
        }


class BulkUserCreateResponse(BaseModel):
    """Bulk user create response DTO"""
    created: int
    failed: int
    errors: List[Dict[str, Any]]
    users: List[UserResponse]

