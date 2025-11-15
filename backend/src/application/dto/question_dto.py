"""
Question DTOs
Request/Response models for Question endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime


class CreateQuestionRequest(BaseModel):
    """Create Question request DTO"""
    exam_id: int = Field(..., gt=0)
    question_no: str = Field(..., min_length=1, max_length=10)
    question_text: str = Field(..., min_length=10)
    section: str = Field(..., pattern="^(A|B|C)$")
    marks_per_question: Decimal = Field(..., gt=0)
    required_count: int = Field(default=1, ge=1)
    optional_count: int = Field(default=0, ge=0)
    blooms_level: Optional[str] = Field(None, pattern="^L[1-6]$")
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "exam_id": 1,
                "question_no": "1",
                "question_text": "Explain the concept of object-oriented programming with examples.",
                "section": "A",
                "marks_per_question": 10.0,
                "required_count": 1,
                "optional_count": 0,
                "blooms_level": "L2",
                "difficulty": "medium"
            }
        }


class UpdateQuestionRequest(BaseModel):
    """Update Question request DTO"""
    question_text: Optional[str] = Field(None, min_length=10)
    section: Optional[str] = Field(None, pattern="^(A|B|C)$")
    marks_per_question: Optional[Decimal] = Field(None, gt=0)
    required_count: Optional[int] = Field(None, ge=1)
    optional_count: Optional[int] = Field(None, ge=0)
    blooms_level: Optional[str] = Field(None, pattern="^L[1-6]$")
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")


class QuestionResponse(BaseModel):
    """Question response DTO"""
    id: int
    exam_id: int
    question_no: str
    question_text: str
    section: str
    marks_per_question: float
    required_count: int
    optional_count: int
    blooms_level: Optional[str]
    difficulty: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "exam_id": 1,
                "question_no": "1",
                "question_text": "Explain the concept of object-oriented programming...",
                "section": "A",
                "marks_per_question": 10.0,
                "required_count": 1,
                "optional_count": 0,
                "blooms_level": "L2",
                "difficulty": "medium",
                "created_at": "2024-01-15T10:00:00Z"
            }
        }


class QuestionListResponse(BaseModel):
    """Questions list response DTO"""
    items: List[QuestionResponse]
    total: int
    skip: int
    limit: int


class CreateQuestionCOMappingRequest(BaseModel):
    """Create Question-CO mapping request DTO"""
    question_id: int = Field(..., gt=0)
    co_id: int = Field(..., gt=0)
    weight_pct: Decimal = Field(default=Decimal("100.0"), ge=0, le=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "question_id": 1,
                "co_id": 1,
                "weight_pct": 100.0
            }
        }


class QuestionCOMappingResponse(BaseModel):
    """Question-CO mapping response DTO"""
    question_id: int
    co_id: int
    weight_pct: float
    
    class Config:
        from_attributes = True

