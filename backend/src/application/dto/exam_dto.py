"""
Exam DTOs
Request/Response models for exam management endpoints
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import date, datetime


class ExamCreateRequest(BaseModel):
    """Create exam request DTO"""
    name: str = Field(..., min_length=3, max_length=100)
    subject_assignment_id: int = Field(..., gt=0)
    exam_type: str = Field(..., pattern="^(internal1|internal2|external)$")
    exam_date: date
    total_marks: float = Field(..., gt=0, le=1000)
    duration_minutes: Optional[int] = Field(None, ge=30, le=300)
    instructions: Optional[str] = None
    question_paper_url: Optional[HttpUrl] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Internal Assessment 1",
                "subject_assignment_id": 1,
                "exam_type": "internal1",
                "exam_date": "2024-01-15",
                "total_marks": 40.0,
                "duration_minutes": 90,
                "instructions": "Answer all questions",
                "question_paper_url": "https://example.com/paper.pdf"
            }
        }


class ExamUpdateRequest(BaseModel):
    """Update exam request DTO"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    exam_date: Optional[date] = None
    total_marks: Optional[float] = Field(None, gt=0, le=1000)
    duration_minutes: Optional[int] = Field(None, ge=30, le=300)
    instructions: Optional[str] = None


class ExamResponse(BaseModel):
    """Exam response DTO"""
    id: int
    name: str
    subject_assignment_id: int
    exam_type: str
    exam_date: date
    total_marks: float
    duration_minutes: Optional[int]
    instructions: Optional[str]
    status: str
    question_paper_url: Optional[str]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Internal Assessment 1",
                "subject_assignment_id": 1,
                "exam_type": "internal1",
                "exam_date": "2024-01-15",
                "total_marks": 40.0,
                "duration_minutes": 90,
                "instructions": "Answer all questions",
                "status": "active",
                "question_paper_url": "https://example.com/paper.pdf",
                "created_by": 1,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }


class ExamListResponse(BaseModel):
    """Exam list response DTO"""
    exams: List[ExamResponse]
    total: int
    skip: int
    limit: int

