"""Subject assignment data transfer objects"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SubjectAssignmentCreate(BaseModel):
    """
    Subject assignment creation DTO
    
    Uses semester-based grouping. Students belong to batch instances via enrollments.
    """
    subject_id: int = Field(..., gt=0, description="ID of the subject to assign")
    teacher_id: int = Field(..., gt=0, description="ID of the teacher")
    semester_id: int = Field(..., gt=0, description="ID of the semester")
    academic_year_id: int = Field(..., gt=0, description="ID of the academic year")

    class Config:
        json_schema_extra = {
            "example": {
                "subject_id": 5,
                "teacher_id": 3,
                "semester_id": 2,
                "academic_year_id": 1
            }
        }


class SubjectAssignmentUpdate(BaseModel):
    """Subject assignment update DTO"""
    teacher_id: Optional[int] = Field(None, gt=0, description="New teacher ID")
    semester_id: Optional[int] = Field(None, gt=0, description="New semester ID")


class SubjectAssignmentResponse(BaseModel):
    """Subject assignment response DTO"""
    id: int
    subject_id: int
    teacher_id: int
    semester_id: int
    academic_year_id: Optional[int] = None
    academic_year: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "subject_id": 5,
                "teacher_id": 3,
                "semester_id": 2,
                "academic_year_id": 1,
                "academic_year": 2024,
                "created_at": "2024-01-15T10:00:00",
                "updated_at": "2024-01-15T10:00:00"
            }
        }


class SubjectAssignmentListResponse(BaseModel):
    """Subject assignment list response DTO"""
    items: List[SubjectAssignmentResponse]
    total: int
    skip: int

