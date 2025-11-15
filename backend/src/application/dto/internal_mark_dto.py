"""
Internal Mark DTOs
Request/Response models for Internal Mark endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class InternalMarkCreateRequest(BaseModel):
    """Create Internal Mark request DTO"""
    student_id: int = Field(..., gt=0)
    subject_assignment_id: int = Field(..., gt=0)
    semester_id: int = Field(..., gt=0)
    academic_year_id: int = Field(..., gt=0)
    component_type: str = Field(..., pattern="^(ia1|ia2|assignment|practical|attendance|quiz|project|other)$")
    marks_obtained: Decimal = Field(..., ge=0)
    max_marks: Decimal = Field(..., gt=0)
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": 1,
                "subject_assignment_id": 1,
                "semester_id": 1,
                "academic_year_id": 1,
                "component_type": "ia1",
                "marks_obtained": 35.0,
                "max_marks": 40.0,
                "notes": "Good performance"
            }
        }


class InternalMarkUpdateRequest(BaseModel):
    """Update Internal Mark request DTO"""
    marks_obtained: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class InternalMarkSubmitRequest(BaseModel):
    """Submit marks request DTO"""
    mark_ids: Optional[list[int]] = None  # If None, submit all for subject_assignment
    subject_assignment_id: Optional[int] = None


class InternalMarkRejectRequest(BaseModel):
    """Reject marks request DTO"""
    reason: str = Field(..., min_length=10)


class InternalMarkResponse(BaseModel):
    """Internal Mark response DTO"""
    id: int
    student_id: int
    subject_assignment_id: int
    semester_id: int
    academic_year_id: int
    component_type: str
    marks_obtained: float
    max_marks: float
    workflow_state: str
    entered_by: int
    submitted_at: Optional[datetime]
    submitted_by: Optional[int]
    approved_at: Optional[datetime]
    approved_by: Optional[int]
    rejected_at: Optional[datetime]
    rejected_by: Optional[int]
    rejection_reason: Optional[str]
    frozen_at: Optional[datetime]
    frozen_by: Optional[int]
    published_at: Optional[datetime]
    notes: Optional[str]
    entered_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class InternalMarkListResponse(BaseModel):
    """Internal Mark list response DTO"""
    items: list[InternalMarkResponse]
    total: int
    skip: int
    limit: int

