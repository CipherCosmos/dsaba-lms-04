"""
Subject Assignment DTOs
Request/Response models for subject assignment endpoints
"""
  
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
  
  
class SubjectAssignmentCreateRequest(BaseModel):
    """Create subject assignment request DTO
    
    NOTE: class_id is now optional (deprecated). In new architecture,
    class/batch instance is derived from semester.batch_instance_id.
    """
    subject_id: int = Field(..., gt=0)
    teacher_id: int = Field(..., gt=0)
    class_id: Optional[int] = Field(None, gt=0, description="⚠️ DEPRECATED: Optional for backward compatibility only. Class is now derived from semester.batch_instance_id. Do not use in new code.")
    semester_id: int = Field(..., gt=0)
    academic_year: Optional[int] = Field(None, ge=2000, le=3000, description="Optional: Will be derived from semester if not provided")
    
    class Config:
        # NOTE: class_id shown for backward compatibility but should be omitted in new requests.
        json_schema_extra = {
            "example": {
                "subject_id": 1,
                "teacher_id": 1,
                "class_id": 1,
                "semester_id": 1,
                "academic_year": 2024
            }
        }
  
  
class SubjectAssignmentResponse(BaseModel):
    """Subject assignment response DTO"""
    id: int
    subject_id: int
    teacher_id: int
    class_id: Optional[int] = None  # ⚠️ DEPRECATED: Legacy field for backward compatibility
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
  
  
class SubjectAssignmentListResponse(BaseModel):
    """Subject assignment list response DTO"""
    items: List[SubjectAssignmentResponse]
    total: int
    skip: int
    limit: int

