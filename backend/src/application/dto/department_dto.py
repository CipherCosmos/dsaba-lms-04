"""
Department DTOs
Request/Response models for department management endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DepartmentCreateRequest(BaseModel):
    """Create department request DTO"""
    name: str = Field(..., min_length=3, max_length=100)
    code: str = Field(..., min_length=2, max_length=10)
    hod_id: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Computer Science and Engineering",
                "code": "CSE",
                "hod_id": 1
            }
        }


class DepartmentUpdateRequest(BaseModel):
    """Update department request DTO"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=10)


class DepartmentResponse(BaseModel):
    """Department response DTO"""
    id: int
    name: str
    code: str
    hod_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Computer Science and Engineering",
                "code": "CSE",
                "hod_id": 1,
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class DepartmentListResponse(BaseModel):
    """Department list response DTO"""
    departments: List[DepartmentResponse]
    total: int
    skip: int
    limit: int


class AssignHODRequest(BaseModel):
    """Assign HOD request DTO"""
    hod_id: int

