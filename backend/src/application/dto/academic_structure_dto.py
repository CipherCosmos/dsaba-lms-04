"""
Academic Structure DTOs
Request/Response models for batch, batch year, and semester management
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


# Batch DTOs
class BatchCreateRequest(BaseModel):
    """Create batch request DTO"""
    name: str = Field(..., min_length=2, max_length=50)
    duration_years: int = Field(..., ge=1, le=6)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "B.Tech",
                "duration_years": 4
            }
        }


class BatchResponse(BaseModel):
    """Batch response DTO"""
    id: int
    name: str
    duration_years: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    """Batch list response DTO"""
    items: List[BatchResponse]
    total: int
    skip: int
    limit: int


# BatchYear DTOs
class BatchYearCreateRequest(BaseModel):
    """Create batch year request DTO"""
    batch_id: int = Field(..., gt=0)
    start_year: int = Field(..., ge=2000)
    end_year: int = Field(..., ge=2000)
    is_current: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "batch_id": 1,
                "start_year": 2023,
                "end_year": 2027,
                "is_current": True
            }
        }


class BatchYearResponse(BaseModel):
    """BatchYear response DTO"""
    id: int
    batch_id: int
    start_year: int
    end_year: int
    display_name: str
    is_current: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class BatchYearListResponse(BaseModel):
    """BatchYear list response DTO"""
    items: List[BatchYearResponse]
    total: int
    skip: int
    limit: int


# Semester DTOs
class SemesterCreateRequest(BaseModel):
    """Create semester request DTO"""
    batch_year_id: int = Field(..., gt=0)
    semester_no: int = Field(..., ge=1, le=12)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "batch_year_id": 1,
                "semester_no": 1,
                "start_date": "2024-01-01",
                "end_date": "2024-06-30",
                "is_current": True
            }
        }


class SemesterUpdateDatesRequest(BaseModel):
    """Update semester dates request DTO"""
    start_date: date
    end_date: date


class SemesterResponse(BaseModel):
    """Semester response DTO"""
    id: int
    batch_year_id: int
    semester_no: int
    display_name: str
    is_current: bool
    start_date: Optional[date]
    end_date: Optional[date]
    is_published: Optional[bool] = False  # Computed field: true if all final_marks are published
    created_at: datetime
    
    class Config:
        from_attributes = True


class SemesterListResponse(BaseModel):
    """Semester list response DTO"""
    items: List[SemesterResponse]
    total: int
    skip: int
    limit: int


# BatchInstance DTOs
class BatchInstanceCreateRequest(BaseModel):
    """Create batch instance request DTO"""
    academic_year_id: int = Field(..., gt=0)
    department_id: int = Field(..., gt=0)
    batch_id: int = Field(..., gt=0)  # Program type (B.Tech, MBA, etc.)
    admission_year: int = Field(..., ge=2000)
    sections: Optional[List[str]] = Field(None, description="List of section names (A, B, C, etc.)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "academic_year_id": 1,
                "department_id": 1,
                "batch_id": 1,
                "admission_year": 2024,
                "sections": ["A", "B", "C"]
            }
        }


class BatchInstanceResponse(BaseModel):
    """BatchInstance response DTO"""
    id: int
    academic_year_id: int
    department_id: int
    batch_id: int
    admission_year: int
    current_semester: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BatchInstanceListResponse(BaseModel):
    """BatchInstance list response DTO"""
    items: List[BatchInstanceResponse]
    total: int
    skip: int
    limit: int


# Section DTOs
class SectionCreateRequest(BaseModel):
    """Create section request DTO"""
    batch_instance_id: int = Field(..., gt=0)
    section_name: str = Field(..., min_length=1, max_length=10, pattern="^[A-Z]$")
    capacity: Optional[int] = Field(None, gt=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "batch_instance_id": 1,
                "section_name": "A",
                "capacity": 60
            }
        }


class SectionUpdateRequest(BaseModel):
    """Update section request DTO"""
    section_name: Optional[str] = Field(None, min_length=1, max_length=10, pattern="^[A-Z]$")
    capacity: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class SectionResponse(BaseModel):
    """Section response DTO"""
    id: int
    batch_instance_id: int
    section_name: str
    capacity: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SectionListResponse(BaseModel):
    """Section list response DTO"""
    items: List[SectionResponse]
    total: int


# Batch Promotion DTOs
class BatchPromotionRequest(BaseModel):
    """Batch promotion request DTO"""
    batch_instance_id: int = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)
    
    class Config:
        json_schema_extra = {
            "example": {
                "batch_instance_id": 1,
                "notes": "Promoted all students to next semester"
            }
        }


class BatchPromotionResponse(BaseModel):
    """Batch promotion response DTO"""
    promoted_count: int
    total_students: int
    errors: List[str]
    new_semester_id: int
    batch_current_semester: int

