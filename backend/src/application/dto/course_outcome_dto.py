"""
Course Outcome DTOs
Request/Response models for Course Outcome endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CreateCORequest(BaseModel):
    """Create Course Outcome request DTO"""
    subject_id: int = Field(..., gt=0)
    code: str = Field(..., min_length=2, max_length=10, pattern="^CO[0-9]+$")
    title: str = Field(..., min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50)
    target_attainment: Decimal = Field(default=Decimal("70.0"), ge=0, le=100)
    l1_threshold: Decimal = Field(default=Decimal("60.0"), ge=0, le=100)
    l2_threshold: Decimal = Field(default=Decimal("70.0"), ge=0, le=100)
    l3_threshold: Decimal = Field(default=Decimal("80.0"), ge=0, le=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "subject_id": 1,
                "code": "CO1",
                "title": "Understand basic programming concepts",
                "description": "Students will be able to understand and apply basic programming concepts including variables, data types, and control structures.",
                "target_attainment": 70.0,
                "l1_threshold": 60.0,
                "l2_threshold": 70.0,
                "l3_threshold": 80.0
            }
        }


class UpdateCORequest(BaseModel):
    """Update Course Outcome request DTO"""
    title: Optional[str] = Field(None, min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50)
    target_attainment: Optional[Decimal] = Field(None, ge=0, le=100)
    l1_threshold: Optional[Decimal] = Field(None, ge=0, le=100)
    l2_threshold: Optional[Decimal] = Field(None, ge=0, le=100)
    l3_threshold: Optional[Decimal] = Field(None, ge=0, le=100)


class COResponse(BaseModel):
    """Course Outcome response DTO"""
    id: int
    subject_id: int
    code: str
    title: str
    description: Optional[str]
    target_attainment: float
    l1_threshold: float
    l2_threshold: float
    l3_threshold: float
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "subject_id": 1,
                "code": "CO1",
                "title": "Understand basic programming concepts",
                "description": "Students will be able to understand...",
                "target_attainment": 70.0,
                "l1_threshold": 60.0,
                "l2_threshold": 70.0,
                "l3_threshold": 80.0,
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        }


class COListResponse(BaseModel):
    """Course Outcomes list response DTO"""
    items: list[COResponse]
    total: int
    skip: int
    limit: int

