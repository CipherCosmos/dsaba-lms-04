"""
Academic Year DTOs
Request/Response models for Academic Year endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class AcademicYearCreateRequest(BaseModel):
    """Create Academic Year request DTO"""
    start_year: int = Field(..., ge=2000, le=2100)
    end_year: int = Field(..., ge=2000, le=2100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "start_year": 2024,
                "end_year": 2025,
                "start_date": "2024-06-01",
                "end_date": "2025-05-31"
            }
        }


class AcademicYearUpdateRequest(BaseModel):
    """Update Academic Year request DTO"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class AcademicYearResponse(BaseModel):
    """Academic Year response DTO"""
    id: int
    start_year: int
    end_year: int
    display_name: str
    is_current: bool
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    archived_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "start_year": 2024,
                "end_year": 2025,
                "display_name": "2024-2025",
                "is_current": True,
                "status": "active",
                "start_date": "2024-06-01",
                "end_date": "2025-05-31",
                "archived_at": None,
                "created_at": "2024-01-15T10:00:00Z"
            }
        }


class AcademicYearListResponse(BaseModel):
    """Academic Year list response DTO"""
    items: list[AcademicYearResponse]
    total: int
    skip: int
    limit: int

