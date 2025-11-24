"""
Student Progression API Endpoints
Handles year-level progression, promotion, and detention
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from datetime import date

from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session
from src.api.v1.dependencies import get_current_user
from src.domain.entities.user import User as UserEntity
from src.application.services.student_progression_service import (
    StudentProgressionService,
    PromotionCriteria
)
from src.domain.exceptions import BusinessRuleViolationError, EntityNotFoundError

router = APIRouter(prefix="/student-progression", tags=["Student Progression"])


# ============================================================================
# REQUEST/RESPONSE MODELS
#  ============================================================================

class PerformanceData(BaseModel):
    """Student performance metrics"""
    cgpa: Optional[float] = Field(None, ge=0, le=10)
    sgpa: Optional[float] = Field(None, ge=0, le=10)
    credits_earned: Optional[int] = Field(None, ge=0)
    attendance: Optional[float] = Field(None, ge=0, le=100)


class StudentPromotionRequest(BaseModel):
    """Request to promote a student"""
    academic_year_id: int
    performance_data: Optional[PerformanceData] = None
    force: bool = False
    notes: Optional[str] = None


class BatchPromotionRequest(BaseModel):
    """Request to promote entire batch"""
    academic_year_id: int
    auto_promote_eligible: bool = True
    force_all: bool = False


class DetentionRequest(BaseModel):
    """Request to detain a student"""
    reason: str
    notes: Optional[str] = None


class ProgressionResponse(BaseModel):
    """Progression record response"""
    id: int
    student_id: int
    from_year_level: int
    to_year_level: int
    academic_year_id: int
    promotion_date: date
    promotion_type: str
    cgpa: Optional[float]
    sgpa: Optional[float]
    backlogs_count: int
    notes: Optional[str]

    class Config:
        from_attributes = True


class EligibilityResponse(BaseModel):
    """Eligibility check response"""
    eligible: bool
    reasons: List[str]
    performance: dict


class YearStatisticsResponse(BaseModel):
    """Year-level statistics"""
    year_level: int
    total_students: int
    detained_students: int
    students_with_backlogs: int
    students_in_good_standing: int


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/students/{student_id}/promote", response_model=ProgressionResponse)
async def promote_student(
    student_id: int,
    request: StudentPromotionRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Promote student to next academic year
    
    **Permissions**: Admin, HOD, Principal
    """
    # Check permissions
    if current_user.role not in ["admin", "hod", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, HOD, or Principal can promote students"
        )
    
    try:
        service = StudentProgressionService(db)
        progression = await service.promote_student(
            student_id=student_id,
            academic_year_id=request.academic_year_id,
            promoted_by=current_user.id,
            performance_data=request.performance_data.dict() if request.performance_data else None,
            force=request.force,
            notes=request.notes
        )
        return ProgressionResponse.from_orm(progression)
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/students/{student_id}/eligibility", response_model=Eligibility Response)
async def check_promotion_eligibility(
    student_id: int,
    cgpa: Optional[float] = Query(None),
    sgpa: Optional[float] = Query(None),
    attendance: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Check if student is eligible for promotion
    
    **Permissions**: Any authenticated user
    """
    service = StudentProgressionService(db)
    performance_data = {}
    if cgpa is not None:
        performance_data["cgpa"] = cgpa
    if sgpa is not None:
        performance_data["sgpa"] = sgpa
    if attendance is not None:
        performance_data["attendance"] = attendance
    
    try:
        eligibility = await service.check_promotion_eligibility(
            student_id=student_id,
            performance_data=performance_data or None
        )
        return EligibilityResponse(**eligibility)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/batch-instances/{batch_instance_id}/promote")
async def promote_batch(
    batch_instance_id: int,
    request: BatchPromotionRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Promote entire batch to next year
    
    **Permissions**: Admin, Principal
    """
    if current_user.role not in ["admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Principal can promote entire batches"
        )
    
    try:
        service = StudentProgressionService(db)
        result = await service.promote_batch(
            batch_instance_id=batch_instance_id,
            academic_year_id=request.academic_year_id,
            promoted_by=current_user.id,
            auto_promote_eligible=request.auto_promote_eligible,
            force_all=request.force_all
        )
        return result
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/students/{student_id}/detain")
async def detain_student(
    student_id: int,
    request: DetentionRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Mark student as detained (repeat current year)
    
    **Permissions**: Admin, HOD, Principal
    """
    if current_user.role not in ["admin", "hod", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, HOD, or Principal can detain students"
        )
    
    try:
        service = StudentProgressionService(db)
        student = await service.detain_student(
            student_id=student_id,
            reason=request.reason,
            detained_by=current_user.id
        )
        return {"message": f"Student {student_id} detained successfully", "student_id": student.id}
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/students/{student_id}/clear-detention")
async def clear_detention(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Clear student detention status
    
    **Permissions**: Admin, HOD, Principal
    """
    if current_user.role not in ["admin", "hod", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, HOD, or Principal can clear detention"
        )
    
    try:
        service = StudentProgressionService(db)
        student = await service.clear_detention(
            student_id=student_id,
            cleared_by=current_user.id
        )
        return {"message": f"Detention cleared for student {student_id}", "student_id": student.id}
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/students/{student_id}/history", response_model=List[ProgressionResponse])
async def get_progression_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get year-wise progression history of a student
    
    **Permissions**: Any authenticated user
    """
    service = StudentProgressionService(db)
    history = await service.get_progression_history(student_id)
    return [ProgressionResponse.from_orm(record) for record in history]


@router.get("/year/{year_level}/statistics", response_model=YearStatisticsResponse)
async def get_year_statistics(
    year_level: int = Query(..., ge=1, le=4),
    department_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Get statistics for students in a specific year level
    
    **Permissions**: Admin, HOD, Principal, Teacher
    """
    if current_user.role not in ["admin", "hod", "principal", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    service = StudentProgressionService(db)
    stats = await service.get_year_statistics(
        year_level=year_level,
        department_id=department_id,
        academic_year_id=academic_year_id
    )
    return YearStatisticsResponse(**stats)
