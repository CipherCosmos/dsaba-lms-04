
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class StudentCreateRequest(BaseModel):
    """Student creation request DTO"""
    user_id: int = Field(..., description="User ID associated with this student profile")
    roll_no: str = Field(..., description="Unique roll number")
    batch_instance_id: Optional[int] = Field(None, description="Batch Instance ID")
    section_id: Optional[int] = Field(None, description="Section ID")
    current_semester_id: Optional[int] = Field(None, description="Current Semester ID")
    department_id: Optional[int] = Field(None, description="Department ID")
    academic_year_id: Optional[int] = Field(None, description="Academic Year ID")
    admission_date: Optional[date] = Field(None, description="Date of admission")
    current_year_level: int = Field(1, ge=1, le=5, description="Current year level (1-4)")
    expected_graduation_year: Optional[int] = Field(None, description="Expected graduation year")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 2,
                "roll_no": "CS2024001",
                "batch_instance_id": 1,
                "department_id": 1,
                "current_year_level": 1,
                "admission_date": "2024-08-01"
            }
        }

class StudentResponse(BaseModel):
    """Student response DTO"""
    id: int
    user_id: int
    roll_no: str
    batch_instance_id: Optional[int] = None
    section_id: Optional[int] = None
    current_semester_id: Optional[int] = None
    department_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    admission_date: Optional[date] = None
    current_year_level: int
    expected_graduation_year: Optional[int] = None
    is_detained: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
