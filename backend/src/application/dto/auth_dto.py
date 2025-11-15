"""
Authentication DTOs
Request/Response models for authentication endpoints
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional


class LoginRequest(BaseModel):
    """Login request DTO"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)  # Will be validated by Password VO
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john_doe",
                "password": "MyStr0ng!Pass123"
            }
        }


class LoginResponse(BaseModel):
    """Login response DTO"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "username": "john_doe",
                    "email": "john@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "roles": ["teacher"],
                    "department_ids": [1]
                }
            }
        }


class RefreshTokenRequest(BaseModel):
    """Refresh token request DTO"""
    refresh_token: str = Field(..., min_length=10)


class RefreshTokenResponse(BaseModel):
    """Refresh token response DTO"""
    access_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    """Logout request DTO"""
    # Access token comes from Authorization header
    pass


class UserInfoResponse(BaseModel):
    """Current user info response DTO"""
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
    
    class Config:
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
                "phone_number": "+1234567890",
                "avatar_url": "https://example.com/avatar.jpg",
                "bio": "Software Engineer",
                "roles": ["teacher", "hod"],
                "department_ids": [1]
            }
        }


class ForgotPasswordRequest(BaseModel):
    """Forgot password request DTO"""
    email_or_username: str = Field(..., min_length=3, description="User's email or username")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_or_username": "john@example.com"
            }
        }


class ForgotPasswordResponse(BaseModel):
    """Forgot password response DTO"""
    message: str = "If the email/username exists, a password reset link has been sent."
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "If the email/username exists, a password reset link has been sent."
            }
        }


class ResetPasswordRequest(BaseModel):
    """Reset password request DTO"""
    token: str = Field(..., min_length=32, description="Password reset token")
    new_password: str = Field(..., min_length=12, description="New password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "abc123...",
                "new_password": "MyStr0ng!NewPass123"
            }
        }


class ResetPasswordResponse(BaseModel):
    """Reset password response DTO"""
    message: str = "Password has been reset successfully"
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Password has been reset successfully"
            }
        }

