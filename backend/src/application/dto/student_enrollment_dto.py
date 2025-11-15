"""
Student Enrollment DTOs
Request/Response models for Student Enrollment endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class StudentEnrollmentCreateRequest(BaseModel):
    """Create Student Enrollment request DTO"""
    student_id: int = Field(..., gt=0)
    semester_id: int = Field(..., gt=0)
    academic_year_id: int = Field(..., gt=0)
    roll_no: str = Field(..., min_length=1, max_length=20)
    enrollment_date: date = Field(default_factory=date.today)
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": 1,
                "semester_id": 1,
                "academic_year_id": 1,
                "roll_no": "CS2024001",
                "enrollment_date": "2024-06-01"
            }
        }


class BulkEnrollmentRequest(BaseModel):
    """Bulk enrollment request DTO"""
    semester_id: int = Field(..., gt=0)
    academic_year_id: int = Field(..., gt=0)
    enrollments: List[dict] = Field(..., min_items=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "semester_id": 1,
                "academic_year_id": 1,
                "enrollments": [
                    {"student_id": 1, "roll_no": "CS2024001"},
                    {"student_id": 2, "roll_no": "CS2024002"}
                ]
            }
        }


class StudentEnrollmentResponse(BaseModel):
    """Student Enrollment response DTO"""
    id: int
    student_id: int
    semester_id: int
    academic_year_id: int
    roll_no: str
    enrollment_date: date
    is_active: bool
    promotion_status: str
    next_semester_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class StudentEnrollmentListResponse(BaseModel):
    """Student Enrollment list response DTO"""
    items: list[StudentEnrollmentResponse]
    total: int
    skip: int
    limit: int

