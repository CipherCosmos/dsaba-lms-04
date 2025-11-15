"""
Program Outcome DTOs
Request/Response models for Program Outcome endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CreatePORequest(BaseModel):
    """Create Program Outcome request DTO"""
    department_id: int = Field(..., gt=0)
    code: str = Field(..., min_length=2, max_length=10, pattern="^(PO|PSO)[0-9]+$")
    type: str = Field(..., pattern="^(PO|PSO)$")
    title: str = Field(..., min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50)
    target_attainment: Decimal = Field(default=Decimal("70.0"), ge=0, le=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "department_id": 1,
                "code": "PO1",
                "type": "PO",
                "title": "Engineering knowledge",
                "description": "Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.",
                "target_attainment": 70.0
            }
        }


class UpdatePORequest(BaseModel):
    """Update Program Outcome request DTO"""
    title: Optional[str] = Field(None, min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50)
    target_attainment: Optional[Decimal] = Field(None, ge=0, le=100)


class POResponse(BaseModel):
    """Program Outcome response DTO"""
    id: int
    department_id: int
    code: str
    type: str
    title: str
    description: Optional[str]
    target_attainment: float
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "department_id": 1,
                "code": "PO1",
                "type": "PO",
                "title": "Engineering knowledge",
                "description": "Apply the knowledge of mathematics...",
                "target_attainment": 70.0,
                "created_at": "2024-01-15T10:00:00Z"
            }
        }


class POListResponse(BaseModel):
    """Program Outcomes list response DTO"""
    items: list[POResponse]
    total: int
    skip: int
    limit: int

