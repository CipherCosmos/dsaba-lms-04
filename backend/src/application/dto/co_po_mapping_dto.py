"""
CO-PO Mapping DTOs
Request/Response models for CO-PO mapping endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CreateCOPOMappingRequest(BaseModel):
    """Create CO-PO mapping request DTO"""
    co_id: int = Field(..., gt=0)
    po_id: int = Field(..., gt=0)
    strength: int = Field(..., ge=1, le=3, description="1=Low, 2=Medium, 3=High")
    
    class Config:
        json_schema_extra = {
            "example": {
                "co_id": 1,
                "po_id": 1,
                "strength": 3
            }
        }


class UpdateCOPOMappingRequest(BaseModel):
    """Update CO-PO mapping request DTO"""
    strength: int = Field(..., ge=1, le=3, description="1=Low, 2=Medium, 3=High")


class COPOMappingResponse(BaseModel):
    """CO-PO mapping response DTO"""
    id: int
    co_id: int
    po_id: int
    strength: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "co_id": 1,
                "po_id": 1,
                "strength": 3,
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        }


class COPOMappingListResponse(BaseModel):
    """CO-PO mappings list response DTO"""
    items: list[COPOMappingResponse]
    total: int

