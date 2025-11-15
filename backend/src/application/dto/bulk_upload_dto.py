"""
Bulk Upload DTOs
Request/Response models for bulk upload endpoints
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any


class BulkUploadResponse(BaseModel):
    """Bulk upload response DTO"""
    total_rows: int
    success_count: int
    error_count: int
    errors: List[Dict[str, Any]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_rows": 100,
                "success_count": 95,
                "error_count": 5,
                "errors": [
                    {"row": 10, "error": "Question number already exists"},
                    {"row": 25, "error": "Invalid section"}
                ]
            }
        }

