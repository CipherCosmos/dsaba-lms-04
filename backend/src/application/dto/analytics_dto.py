"""
Analytics DTOs
Request/Response models for analytics endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class StudentAnalyticsResponse(BaseModel):
    """Student analytics response DTO"""
    student_id: int
    student_name: str
    roll_no: str
    total_marks: float
    average_marks: float
    total_exams: int
    exam_type_breakdown: Dict[str, Any]
    subject_id: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": 1,
                "student_name": "John Doe",
                "roll_no": "CS2023001",
                "total_marks": 350.5,
                "average_marks": 87.6,
                "total_exams": 4,
                "exam_type_breakdown": {
                    "internal1": {"total_marks": 85.0, "count": 5, "avg_marks": 17.0},
                    "internal2": {"total_marks": 88.0, "count": 5, "avg_marks": 17.6},
                    "external": {"total_marks": 177.5, "count": 10, "avg_marks": 17.75}
                },
                "subject_id": 1
            }
        }


class TeacherAnalyticsResponse(BaseModel):
    """Teacher analytics response DTO"""
    teacher_id: int
    total_subjects: int
    total_classes: int
    total_exams: int
    total_marks_entered: int
    class_statistics: Dict[str, Any]
    subject_id: Optional[int] = None


class ClassAnalyticsResponse(BaseModel):
    """Class analytics response DTO"""
    class_id: int
    total_students: int
    total_marks_entries: int
    average_marks: float
    median_marks: float
    student_averages: Dict[str, float]
    subject_id: Optional[int] = None


class SubjectAnalyticsResponse(BaseModel):
    """Subject analytics response DTO"""
    subject_id: int
    subject_code: str
    subject_name: str
    total_classes: int
    total_exams: int
    total_marks_entries: int
    average_marks: float
    class_id: Optional[int] = None


class HODAnalyticsResponse(BaseModel):
    """HOD analytics response DTO"""
    department_id: int
    total_subjects: int
    total_classes: int
    total_exams: int
    total_marks_entries: int
    department_average: float
    subject_statistics: Dict[str, Any]


class COAttainmentResponse(BaseModel):
    """CO attainment response DTO"""
    subject_id: int
    subject_code: str
    exam_type: Optional[str]
    co_attainment: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "subject_id": 1,
                "subject_code": "CS101",
                "exam_type": "all",
                "co_attainment": {
                    "CO1": {
                        "code": "CO1",
                        "title": "Understand basic concepts",
                        "attainment_percentage": 75.5,
                        "target_attainment": 70.0,
                        "status": "achieved",
                        "total_obtained": 151.0,
                        "total_possible": 200.0
                    }
                }
            }
        }


class POAttainmentResponse(BaseModel):
    """PO attainment response DTO"""
    department_id: int
    subject_id: Optional[int]
    academic_year_id: Optional[int]
    semester_id: Optional[int]
    po_attainment: Dict[str, Any]

    class Config:
        json_schema_extra = {
            "example": {
                "department_id": 1,
                "subject_id": None,
                "academic_year_id": 1,
                "semester_id": 1,
                "po_attainment": {
                    "1": {
                        "po_code": "PO1",
                        "po_title": "Engineering knowledge",
                        "po_type": "technical",
                        "target_attainment": 70.0,
                        "actual_attainment": 72.5,
                        "contributing_cos": [
                            {
                                "co_id": 1,
                                "co_code": "CO1",
                                "subject_name": "Data Structures",
                                "mapping_strength": 3,
                                "co_attainment": 75.0,
                                "weighted_contribution": 22.5
                            }
                        ],
                        "total_cos": 15,
                        "attained": True,
                        "status": "calculated"
                    }
                }
            }
        }

