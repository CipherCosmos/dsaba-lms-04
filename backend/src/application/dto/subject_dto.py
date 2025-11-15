"""
Subject DTOs
Request/Response models for subject management endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SubjectCreateRequest(BaseModel):
    """Create subject request DTO"""
    code: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=3, max_length=100)
    department_id: int = Field(..., gt=0)
    semester_id: Optional[int] = Field(None, gt=0)  # Optional: link to specific semester
    academic_year_id: Optional[int] = Field(None, gt=0)  # Optional: link to academic year
    credits: float = Field(..., ge=1, le=10)
    max_internal: float = Field(default=40.0, ge=0, le=100)
    max_external: float = Field(default=60.0, ge=0, le=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "CS101",
                "name": "Introduction to Computer Science",
                "department_id": 1,
                "credits": 3.0,
                "max_internal": 40.0,
                "max_external": 60.0
            }
        }


class SubjectUpdateRequest(BaseModel):
    """Update subject request DTO"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    credits: Optional[float] = Field(None, ge=1, le=10)


class SubjectUpdateMarksRequest(BaseModel):
    """Update marks distribution request DTO"""
    max_internal: float = Field(..., ge=0, le=100)
    max_external: float = Field(..., ge=0, le=100)


class SubjectResponse(BaseModel):
    """Subject response DTO"""
    id: int
    code: str
    name: str
    department_id: int
    credits: float
    max_internal: float
    max_external: float
    total_marks: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "code": "CS101",
                "name": "Introduction to Computer Science",
                "department_id": 1,
                "credits": 3.0,
                "max_internal": 40.0,
                "max_external": 60.0,
                "total_marks": 100.0,
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class SubjectListResponse(BaseModel):
    """Subject list response DTO"""
    items: List[SubjectResponse]
    total: int
    skip: int
    limit: int

