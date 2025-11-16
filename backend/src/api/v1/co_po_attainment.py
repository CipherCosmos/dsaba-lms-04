"""
CO-PO Attainment API Endpoints
Calculate and retrieve CO-PO attainment data
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.co_po_attainment_service import COPOAttainmentService
from src.api.dependencies import get_current_user, get_db
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from sqlalchemy.orm import Session


def get_attainment_service(
    db: Session = Depends(get_db)
) -> COPOAttainmentService:
    """Get CO-PO attainment service instance"""
    return COPOAttainmentService(db)


# Create router
router = APIRouter(
    prefix="/co-po-attainment",
    tags=["CO-PO Attainment"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/co/{subject_id}")
async def get_co_attainment(
    subject_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    service: COPOAttainmentService = Depends(get_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate CO attainment for a subject
    
    Returns attainment data for all Course Outcomes of the specified subject.
    Optionally filter by academic year and/or semester.
    
    - **subject_id**: Subject ID
    - **academic_year_id**: Optional academic year filter
    - **semester_id**: Optional semester filter
    
    Returns:
        Dictionary with CO attainment data including:
        - Target attainment
        - Actual attainment
        - Level distribution (L1, L2, L3)
        - Total students
        - Attainment status
    """
    try:
        attainment_data = service.calculate_co_attainment(
            subject_id=subject_id,
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        
        return {
            "subject_id": subject_id,
            "academic_year_id": academic_year_id,
            "semester_id": semester_id,
            "co_attainment": attainment_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating CO attainment: {str(e)}"
        )


@router.get("/po/{department_id}")
async def get_po_attainment(
    department_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    service: COPOAttainmentService = Depends(get_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate PO attainment for a department
    
    Returns attainment data for all Program Outcomes of the specified department.
    PO attainment is calculated based on CO attainments and CO-PO mapping strengths.
    
    - **department_id**: Department ID
    - **academic_year_id**: Optional academic year filter
    - **semester_id**: Optional semester filter
    
    Returns:
        Dictionary with PO attainment data including:
        - Target attainment
        - Actual attainment (weighted average)
        - Contributing COs with their attainments
        - Total COs mapped
        - Attainment status
    """
    try:
        # Verify user has access to this department
        # HOD can only access their own department
        if UserRole.HOD in current_user.roles:
            if department_id not in current_user.department_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this department"
                )
        
        attainment_data = service.calculate_po_attainment(
            department_id=department_id,
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        
        return {
            "department_id": department_id,
            "academic_year_id": academic_year_id,
            "semester_id": semester_id,
            "po_attainment": attainment_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating PO attainment: {str(e)}"
        )


@router.get("/summary/{department_id}")
async def get_co_po_summary(
    department_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    service: COPOAttainmentService = Depends(get_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive CO-PO attainment summary for a department
    
    Returns complete attainment data including:
    - All CO attainments across all subjects
    - All PO attainments
    - Summary statistics (attainment rates, counts)
    
    - **department_id**: Department ID
    - **academic_year_id**: Optional academic year filter
    - **semester_id**: Optional semester filter
    
    Returns:
        Complete CO-PO attainment summary with statistics
    """
    try:
        # Verify user has access to this department
        if UserRole.HOD in current_user.roles:
            if department_id not in current_user.department_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this department"
                )
        
        summary = service.get_co_po_attainment_summary(
            department_id=department_id,
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        
        return summary
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating attainment summary: {str(e)}"
        )

