
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class TeacherCreateRequest(BaseModel):
    """Teacher creation request DTO"""
    user_id: int = Field(..., description="User ID associated with this teacher profile")
    department_id: Optional[int] = Field(None, description="Department ID")
    employee_id: Optional[str] = Field(None, description="Employee ID")
    specialization: Optional[str] = Field(None, description="Area of specialization")
    join_date: Optional[date] = Field(None, description="Date of joining")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "department_id": 1,
                "employee_id": "EMP001",
                "specialization": "Computer Science",
                "join_date": "2024-01-01"
            }
        }

class TeacherResponse(BaseModel):
    """Teacher response DTO"""
    id: int
    user_id: int
    department_id: Optional[int] = None
    employee_id: Optional[str] = None
    specialization: Optional[str] = None
    join_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True
