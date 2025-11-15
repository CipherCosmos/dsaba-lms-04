"""
Final Mark DTOs
Request/Response models for Final Mark endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, date


class CreateFinalMarkRequest(BaseModel):
    """Create Final Mark request DTO"""
    student_id: int = Field(..., gt=0)
    subject_assignment_id: int = Field(..., gt=0)
    semester_id: int = Field(..., gt=0)
    internal_1: Optional[Decimal] = Field(None, ge=0)
    internal_2: Optional[Decimal] = Field(None, ge=0)
    external: Optional[Decimal] = Field(None, ge=0)
    best_internal_method: str = Field(default="best", pattern="^(best|avg|weighted)$")
    max_internal: Decimal = Field(default=Decimal("40"), gt=0)
    max_external: Decimal = Field(default=Decimal("60"), gt=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": 1,
                "subject_assignment_id": 1,
                "semester_id": 1,
                "internal_1": 35.0,
                "internal_2": 38.0,
                "external": 55.0,
                "best_internal_method": "best",
                "max_internal": 40.0,
                "max_external": 60.0
            }
        }


class UpdateFinalMarkRequest(BaseModel):
    """Update Final Mark request DTO"""
    internal_1: Optional[Decimal] = Field(None, ge=0)
    internal_2: Optional[Decimal] = Field(None, ge=0)
    external: Optional[Decimal] = Field(None, ge=0)
    best_internal_method: Optional[str] = Field(None, pattern="^(best|avg|weighted)$")


class FinalMarkResponse(BaseModel):
    """Final Mark response DTO"""
    id: int
    student_id: int
    subject_assignment_id: int
    semester_id: int
    internal_1: float
    internal_2: float
    best_internal: float
    external: float
    total: float
    percentage: float
    grade: str
    sgpa: Optional[float]
    cgpa: Optional[float]
    co_attainment: Optional[Dict[str, Any]]
    status: str
    is_published: bool
    published_at: Optional[datetime]
    editable_until: Optional[date]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "student_id": 1,
                "subject_assignment_id": 1,
                "semester_id": 1,
                "internal_1": 35.0,
                "internal_2": 38.0,
                "best_internal": 38.0,
                "external": 55.0,
                "total": 93.0,
                "percentage": 93.0,
                "grade": "A+",
                "sgpa": 9.5,
                "cgpa": 9.2,
                "co_attainment": {"CO1": 85.5, "CO2": 90.0},
                "status": "published",
                "is_published": True,
                "published_at": "2024-01-15T10:00:00Z",
                "editable_until": "2024-01-22",
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        }


class FinalMarkListResponse(BaseModel):
    """Final Marks list response DTO"""
    items: List[FinalMarkResponse]
    total: int
    skip: int
    limit: int


class CalculateSGPARequest(BaseModel):
    """Calculate SGPA request DTO"""
    student_id: int = Field(..., gt=0)
    semester_id: int = Field(..., gt=0)


class CalculateCGPARequest(BaseModel):
    """Calculate CGPA request DTO"""
    student_id: int = Field(..., gt=0)
    up_to_semester_id: Optional[int] = Field(None, gt=0)


class GPAResponse(BaseModel):
    """GPA response DTO"""
    student_id: int
    semester_id: Optional[int]
    gpa: float
    type: str  # "SGPA" or "CGPA"
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": 1,
                "semester_id": 1,
                "gpa": 9.5,
                "type": "SGPA"
            }
        }

