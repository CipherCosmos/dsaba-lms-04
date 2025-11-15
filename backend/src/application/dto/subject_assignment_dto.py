"""
Subject Assignment DTOs
Request/Response models for subject assignment endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SubjectAssignmentResponse(BaseModel):
    """Subject assignment response DTO"""
    id: int
    subject_id: int
    teacher_id: int
    class_id: int
    semester_id: int
    academic_year: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "subject_id": 1,
                "teacher_id": 1,
                "class_id": 1,
                "semester_id": 1,
                "academic_year": 2024,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }

