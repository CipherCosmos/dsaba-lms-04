"""
Smart Marks Calculation API Endpoints
Intelligent marks calculation, grade assignment, and SGPA/CGPA calculation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from pydantic import BaseModel

from src.application.services.smart_marks_service import SmartMarksService
from src.api.dependencies import get_current_user, get_db
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import EntityNotFoundError, ValidationError
from sqlalchemy.orm import Session


class FinalMarksCalculationRequest(BaseModel):
    student_id: int
    subject_assignment_id: int
    semester_id: int


class RecalculateMarksRequest(BaseModel):
    semester_id: int
    subject_assignment_id: Optional[int] = None


def get_smart_marks_service(
    db: Session = Depends(get_db)
) -> SmartMarksService:
    """Get smart marks service instance"""
    return SmartMarksService(db)


# Create router
router = APIRouter(
    prefix="/smart-marks",
    tags=["Smart Marks"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/best-of-two")
async def calculate_best_of_two(
    student_id: int = Query(..., description="Student ID"),
    subject_assignment_id: int = Query(..., description="Subject Assignment ID"),
    semester_id: int = Query(..., description="Semester ID"),
    academic_year_id: int = Query(..., description="Academic Year ID"),
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate best-of-two internal marks for a student
    
    Returns:
    - IA1 marks
    - IA2 marks
    - Best internal marks
    - Selected component (IA1 or IA2)
    """
    try:
        result = service.calculate_best_of_two_internal(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating best-of-two internal marks: {str(e)}"
        )


@router.get("/final-marks")
async def calculate_final_marks(
    student_id: int = Query(..., description="Student ID"),
    subject_assignment_id: int = Query(..., description="Subject Assignment ID"),
    semester_id: int = Query(..., description="Semester ID"),
    academic_year_id: int = Query(..., description="Academic Year ID"),
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate complete final marks for a student in a subject
    
    Returns:
    - Internal marks (best of two)
    - External marks
    - Total marks
    - Percentage
    - Grade
    - Grade point
    - Pass/Fail status
    """
    try:
        result = service.calculate_final_marks(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id
        )
        return result
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating final marks: {str(e)}"
        )


@router.post("/save-final-marks", status_code=status.HTTP_201_CREATED)
async def save_final_marks(
    request: FinalMarksCalculationRequest,
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate and save final marks to database
    
    Only teachers, HODs, and admins can save final marks.
    """
    # Check permissions
    if not any(role in [UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL] 
               for role in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to save final marks"
        )
    
    try:
        final_mark = service.save_final_marks(
            student_id=request.student_id,
            subject_assignment_id=request.subject_assignment_id,
            semester_id=request.semester_id
        )
        
        return {
            "id": final_mark.id,
            "student_id": final_mark.student_id,
            "subject_assignment_id": final_mark.subject_assignment_id,
            "semester_id": final_mark.semester_id,
            "internal_1": float(final_mark.internal_1),
            "internal_2": float(final_mark.internal_2),
            "best_internal": float(final_mark.best_internal),
            "external": float(final_mark.external),
            "total": float(final_mark.total),
            "percentage": float(final_mark.percentage),
            "grade": final_mark.grade,
            "status": final_mark.status
        }
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving final marks: {str(e)}"
        )


@router.get("/sgpa")
async def calculate_sgpa(
    student_id: int = Query(..., description="Student ID"),
    semester_id: int = Query(..., description="Semester ID"),
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate SGPA (Semester Grade Point Average) for a student
    
    SGPA = Σ(Grade Point × Credits) / Σ(Credits)
    """
    try:
        sgpa = service.calculate_sgpa(student_id, semester_id)
        return {
            "student_id": student_id,
            "semester_id": semester_id,
            "sgpa": sgpa
        }
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating SGPA: {str(e)}"
        )


@router.get("/cgpa")
async def calculate_cgpa(
    student_id: int = Query(..., description="Student ID"),
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate CGPA (Cumulative Grade Point Average) for a student
    
    CGPA = Average of all semester SGPAs
    """
    try:
        cgpa = service.calculate_cgpa(student_id)
        return {
            "student_id": student_id,
            "cgpa": cgpa
        }
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating CGPA: {str(e)}"
        )


@router.post("/recalculate")
async def recalculate_final_marks(
    request: RecalculateMarksRequest,
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Recalculate final marks for all students in a semester
    
    Useful when:
    - Internal marks are updated
    - External marks are entered
    - Grading scale changes
    
    Only HODs, Principals, and Admins can trigger recalculation.
    """
    # Check permissions
    if not any(role in [UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL] 
               for role in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to recalculate marks"
        )
    
    try:
        result = service.recalculate_all_final_marks(
            semester_id=request.semester_id,
            subject_assignment_id=request.subject_assignment_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recalculating marks: {str(e)}"
        )


@router.get("/grading-scale")
async def get_grading_scale(
    service: SmartMarksService = Depends(get_smart_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current grading scale
    
    Returns grade boundaries and grade points
    """
    return {
        "grading_scale": service.default_grading_scale,
        "description": "Percentage-based grading scale with grade points"
    }

