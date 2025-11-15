"""
Mark DTOs
Request/Response models for marks management endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class MarkCreateRequest(BaseModel):
    """Create mark request DTO"""
    exam_id: int = Field(..., gt=0)
    student_id: int = Field(..., gt=0)
    question_id: int = Field(..., gt=0)
    marks_obtained: float = Field(..., ge=0)
    sub_question_id: Optional[int] = Field(None, gt=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "exam_id": 1,
                "student_id": 1,
                "question_id": 1,
                "marks_obtained": 8.5,
                "sub_question_id": None
            }
        }


class MarkUpdateRequest(BaseModel):
    """Update mark request DTO"""
    marks_obtained: float = Field(..., ge=0)
    can_override: bool = False
    reason: Optional[str] = Field(None, min_length=10)


class BulkMarkCreateRequest(BaseModel):
    """Bulk create marks request DTO"""
    exam_id: int = Field(..., gt=0)
    marks: List[Dict[str, Any]] = Field(..., min_items=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "exam_id": 1,
                "marks": [
                    {
                        "student_id": 1,
                        "question_id": 1,
                        "marks_obtained": 8.5,
                        "sub_question_id": None
                    },
                    {
                        "student_id": 1,
                        "question_id": 2,
                        "marks_obtained": 7.0,
                        "sub_question_id": None
                    }
                ]
            }
        }


class MarkResponse(BaseModel):
    """Mark response DTO"""
    id: int
    exam_id: int
    student_id: int
    question_id: int
    sub_question_id: Optional[int]
    marks_obtained: float
    entered_by: Optional[int]
    entered_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "exam_id": 1,
                "student_id": 1,
                "question_id": 1,
                "sub_question_id": None,
                "marks_obtained": 8.5,
                "entered_by": 1,
                "entered_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        }


class MarkListResponse(BaseModel):
    """Mark list response DTO"""
    marks: List[MarkResponse]
    total: int
    skip: int
    limit: int


class StudentTotalMarksResponse(BaseModel):
    """Student total marks calculation response DTO"""
    total_obtained: float
    total_max: float
    percentage: float
    questions_counted: List[int]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_obtained": 35.5,
                "total_max": 40.0,
                "percentage": 88.75,
                "questions_counted": [1, 2, 3, 4, 5]
            }
        }


class BestInternalResponse(BaseModel):
    """Best internal calculation response DTO"""
    best_internal: float
    method: str
    internal_1: Optional[float]
    internal_2: Optional[float]
    
    class Config:
        json_schema_extra = {
            "example": {
                "best_internal": 38.5,
                "method": "best",
                "internal_1": 35.0,
                "internal_2": 38.5
            }
        }

