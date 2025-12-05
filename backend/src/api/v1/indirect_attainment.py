"""
Indirect Attainment API endpoints for surveys and exit exams
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...application.services.indirect_attainment_service import IndirectAttainmentService
from ...infrastructure.database.session import get_db
from ...infrastructure.database.repositories.survey_repository_impl import SurveyRepositoryImpl
from ...infrastructure.database.repositories.exit_exam_repository_impl import ExitExamRepositoryImpl
from ...api.dependencies import get_current_user
from ...domain.entities.user import User

router = APIRouter(prefix="/indirect-attainment", tags=["Indirect Attainment"])

def get_indirect_attainment_service(db: Session = Depends(get_db)) -> IndirectAttainmentService:
    """Dependency to get indirect attainment service"""
    survey_repo = SurveyRepositoryImpl(db)
    exit_exam_repo = ExitExamRepositoryImpl(db)
    return IndirectAttainmentService(survey_repo, exit_exam_repo)

# Survey Endpoints

@router.get("/surveys", response_model=List[dict])
async def get_surveys(
    department_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get surveys, optionally filtered by department"""
    if department_id:
        surveys = await service.get_surveys_by_department(department_id, skip, limit)
    else:
        # Return empty list if no department specified
        surveys = []

    return [survey.dict() for survey in surveys]

@router.get("/surveys/active", response_model=List[dict])
async def get_active_surveys(
    department_id: int = Query(..., gt=0),
    academic_year_id: Optional[int] = Query(None),
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get active surveys for a department"""
    surveys = await service.get_active_surveys(department_id, academic_year_id)
    return [survey.dict() for survey in surveys]

@router.get("/surveys/{survey_id}", response_model=dict)
async def get_survey(
    survey_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get a specific survey"""
    survey = await service.get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey.dict()

@router.post("/surveys", response_model=dict)
async def create_survey(
    survey_data: dict,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new survey"""
    survey_data["created_by"] = current_user.id
    survey = await service.create_survey(survey_data)
    return survey.dict()

@router.put("/surveys/{survey_id}", response_model=dict)
async def update_survey(
    survey_id: int,
    survey_data: dict,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Update an existing survey"""
    survey = await service.update_survey(survey_id, survey_data)
    return survey.dict()

@router.delete("/surveys/{survey_id}")
async def delete_survey(
    survey_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Delete a survey"""
    success = await service.delete_survey(survey_id)
    if not success:
        raise HTTPException(status_code=404, detail="Survey not found")
    return {"message": "Survey deleted successfully"}

@router.post("/surveys/{survey_id}/responses", response_model=List[dict])
async def submit_survey_response(
    survey_id: int,
    responses: List[dict],
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Submit responses for a survey"""
    try:
        saved_responses = await service.submit_survey_response(survey_id, current_user.id, responses)
        return [response.dict() for response in saved_responses]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/surveys/{survey_id}/analytics", response_model=dict)
async def get_survey_analytics(
    survey_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for a survey"""
    analytics = await service.get_survey_analytics(survey_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Survey not found")
    return analytics

# Exit Exam Endpoints

@router.get("/exit-exams", response_model=List[dict])
async def get_exit_exams(
    department_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get exit exams, optionally filtered by department"""
    if department_id:
        exams = await service.get_exit_exams_by_department(department_id, skip, limit)
    else:
        exams = []

    return [exam.dict() for exam in exams]

@router.get("/exit-exams/active", response_model=List[dict])
async def get_active_exit_exams(
    department_id: int = Query(..., gt=0),
    academic_year_id: Optional[int] = Query(None),
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get active exit exams for a department"""
    exams = await service.get_active_exit_exams(department_id, academic_year_id)
    return [exam.dict() for exam in exams]

@router.get("/exit-exams/{exam_id}", response_model=dict)
async def get_exit_exam(
    exam_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get a specific exit exam"""
    exam = await service.get_exit_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exit exam not found")
    return exam.dict()

@router.post("/exit-exams", response_model=dict)
async def create_exit_exam(
    exam_data: dict,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new exit exam"""
    exam_data["created_by"] = current_user.id
    exam = await service.create_exit_exam(exam_data)
    return exam.dict()

@router.put("/exit-exams/{exam_id}", response_model=dict)
async def update_exit_exam(
    exam_id: int,
    exam_data: dict,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Update an existing exit exam"""
    exam = await service.update_exit_exam(exam_id, exam_data)
    return exam.dict()

@router.delete("/exit-exams/{exam_id}")
async def delete_exit_exam(
    exam_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Delete an exit exam"""
    success = await service.delete_exit_exam(exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exit exam not found")
    return {"message": "Exit exam deleted successfully"}

@router.post("/exit-exams/{exam_id}/results", response_model=dict)
async def submit_exit_exam_result(
    exam_id: int,
    result_data: dict,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Submit result for an exit exam"""
    try:
        result = await service.submit_exit_exam_result(
            exam_id,
            result_data["student_id"],
            result_data["score"],
            result_data["max_score"]
        )
        return result.dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/exit-exams/{exam_id}/analytics", response_model=dict)
async def get_exit_exam_analytics(
    exam_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get analytics for an exit exam"""
    analytics = await service.get_exit_exam_analytics(exam_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Exit exam not found")
    return analytics

# Indirect Attainment Calculation Endpoints

@router.get("/attainment/{department_id}", response_model=dict)
async def calculate_indirect_attainment(
    department_id: int,
    academic_year_id: Optional[int] = Query(None),
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Calculate indirect attainment for a department"""
    try:
        result = await service.calculate_indirect_attainment(department_id, academic_year_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating attainment: {str(e)}")

# Backward compatibility endpoint - returns empty data instead of throwing errors
@router.get("/subject/{subject_id}", response_model=List[dict])
async def get_indirect_attainment_by_subject(
    subject_id: int,
    service: IndirectAttainmentService = Depends(get_indirect_attainment_service),
    current_user: User = Depends(get_current_user)
):
    """Get indirect attainment data by subject (returns empty for backward compatibility)"""
    # Return empty list instead of throwing error
    return []