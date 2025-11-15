"""
Reports DTOs
Request/Response models for reports endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class GenerateReportRequest(BaseModel):
    """Generate report request DTO"""
    report_type: str = Field(..., pattern="^(student_performance|class_analysis|co_po_attainment|teacher_performance|department_summary|nba_compliance)$")
    format: str = Field(default="json", pattern="^(json|pdf|excel)$")
    filters: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_type": "student_performance",
                "format": "pdf",
                "filters": {
                    "student_id": 1,
                    "subject_id": 1
                }
            }
        }


class ReportResponse(BaseModel):
    """Report response DTO"""
    report_type: str
    generated_at: str
    format: str
    data: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_type": "student_performance",
                "generated_at": "2024-01-15T10:00:00Z",
                "format": "json",
                "data": {
                    "student_id": 1,
                    "total_marks": 350.5,
                    "average_marks": 87.6
                }
            }
        }


class ReportTypeResponse(BaseModel):
    """Report type response DTO"""
    id: str
    name: str
    description: str
    filters: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "student_performance",
                "name": "Student Performance Report",
                "description": "Individual student performance analysis",
                "filters": ["student_id", "subject_id", "exam_type"]
            }
        }


class ReportTypesListResponse(BaseModel):
    """Report types list response DTO"""
    report_types: List[ReportTypeResponse]

