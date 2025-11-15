"""
Academic Structure API Endpoints
Batch, BatchYear, and Semester management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from src.application.services.academic_structure_service import AcademicStructureService
from src.application.dto.academic_structure_dto import (
    BatchCreateRequest,
    BatchResponse,
    BatchListResponse,
    BatchYearCreateRequest,
    BatchYearResponse,
    BatchYearListResponse,
    SemesterCreateRequest,
    SemesterUpdateDatesRequest,
    SemesterResponse,
    SemesterListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import (
    EntityNotFoundError,
    EntityAlreadyExistsError,
    BusinessRuleViolationError
)
from src.infrastructure.database.repositories.academic_structure_repository_impl import (
    BatchRepository,
    BatchYearRepository,
    SemesterRepository
)
from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import SemesterModel
from sqlalchemy.orm import Session


def get_academic_structure_service(
    db: Session = Depends(get_db)
) -> AcademicStructureService:
    """Get academic structure service instance"""
    batch_repo = BatchRepository(db)
    batch_year_repo = BatchYearRepository(db)
    semester_repo = SemesterRepository(db)
    return AcademicStructureService(batch_repo, batch_year_repo, semester_repo)


# Create router
router = APIRouter(
    prefix="/academic",
    tags=["Academic Structure"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


# Batch endpoints
@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    request: BatchCreateRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new batch"""
    try:
        batch = await service.create_batch(
            name=request.name,
            duration_years=request.duration_years
        )
        return BatchResponse(**batch.to_dict())
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/batches", response_model=BatchListResponse)
async def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """List batches"""
    batches = await service.list_batches(skip=skip, limit=limit, is_active=is_active)
    return BatchListResponse(
        items=[BatchResponse(**b.to_dict()) for b in batches],
        total=len(batches),
        skip=skip,
        limit=limit
    )


@router.get("/batches/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Get batch by ID"""
    try:
        batch = await service.get_batch(batch_id)
        return BatchResponse(**batch.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")


@router.post("/batches/{batch_id}/activate", response_model=BatchResponse)
async def activate_batch(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Activate batch"""
    try:
        batch = await service.activate_batch(batch_id)
        return BatchResponse(**batch.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/batches/{batch_id}/deactivate", response_model=BatchResponse)
async def deactivate_batch(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Deactivate batch"""
    try:
        batch = await service.deactivate_batch(batch_id)
        return BatchResponse(**batch.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch {batch_id} not found")
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# BatchYear endpoints
@router.post("/batch-years", response_model=BatchYearResponse, status_code=status.HTTP_201_CREATED)
async def create_batch_year(
    request: BatchYearCreateRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new batch year"""
    try:
        batch_year = await service.create_batch_year(
            batch_id=request.batch_id,
            start_year=request.start_year,
            end_year=request.end_year,
            is_current=request.is_current
        )
        return BatchYearResponse(**batch_year.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/batches/{batch_id}/batch-years", response_model=List[BatchYearResponse])
async def get_batch_years(
    batch_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Get all batch years for a batch"""
    batch_years = await service.get_batch_years_by_batch(batch_id)
    return [BatchYearResponse(**by.to_dict()) for by in batch_years]


@router.post("/batch-years/{batch_year_id}/mark-current", response_model=BatchYearResponse)
async def mark_batch_year_current(
    batch_year_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Mark batch year as current"""
    try:
        batch_year = await service.mark_batch_year_as_current(batch_year_id)
        return BatchYearResponse(**batch_year.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"BatchYear {batch_year_id} not found")


# Semester endpoints
@router.post("/semesters", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
async def create_semester(
    request: SemesterCreateRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new semester"""
    try:
        semester = await service.create_semester(
            batch_year_id=request.batch_year_id,
            semester_no=request.semester_no,
            start_date=request.start_date,
            end_date=request.end_date,
            is_current=request.is_current
        )
        return SemesterResponse(**semester.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EntityAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("/semesters", response_model=SemesterListResponse)
async def list_semesters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    batch_year_id: Optional[int] = Query(None, gt=0),
    is_current: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """List all semesters with optional filters"""
    from src.infrastructure.database.models import FinalMarkModel
    
    semesters = await service.list_semesters(
        skip=skip,
        limit=limit,
        batch_year_id=batch_year_id,
        is_current=is_current
    )
    
    # Check published status for each semester
    semester_responses = []
    for s in semesters:
        semester_dict = s.to_dict()
        
        # Check if semester is published (all final_marks are published)
        final_marks_count = db.query(FinalMarkModel).filter(
            FinalMarkModel.semester_id == s.id
        ).count()
        
        published_count = db.query(FinalMarkModel).filter(
            FinalMarkModel.semester_id == s.id,
            FinalMarkModel.is_published == True
        ).count()
        
        # Semester is published if it has final_marks and all are published
        semester_dict['is_published'] = final_marks_count > 0 and published_count == final_marks_count
        
        semester_responses.append(SemesterResponse(**semester_dict))
    
    return SemesterListResponse(
        items=semester_responses,
        total=len(semester_responses),
        skip=skip,
        limit=limit
    )


@router.get("/batch-years/{batch_year_id}/semesters", response_model=List[SemesterResponse])
async def get_semesters(
    batch_year_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Get all semesters for a batch year"""
    semesters = await service.get_semesters_by_batch_year(batch_year_id)
    return [SemesterResponse(**s.to_dict()) for s in semesters]


@router.post("/semesters/{semester_id}/mark-current", response_model=SemesterResponse)
async def mark_semester_current(
    semester_id: int,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Mark semester as current"""
    try:
        semester = await service.mark_semester_as_current(semester_id)
        return SemesterResponse(**semester.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Semester {semester_id} not found")


@router.put("/semesters/{semester_id}/dates", response_model=SemesterResponse)
async def update_semester_dates(
    semester_id: int,
    request: SemesterUpdateDatesRequest,
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """Update semester dates"""
    try:
        semester = await service.update_semester_dates(
            semester_id=semester_id,
            start_date=request.start_date,
            end_date=request.end_date
        )
        return SemesterResponse(**semester.to_dict())
    except EntityNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Semester {semester_id} not found")
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/semesters/{semester_id}/publish")
async def publish_semester(
    semester_id: int,
    db: Session = Depends(get_db),
    service: AcademicStructureService = Depends(get_academic_structure_service),
    current_user: User = Depends(get_current_user)
):
    """
    Publish semester results
    
    Validates all exams are complete, then triggers Celery job to:
    - Calculate best internal, total, grade, SGPA
    - Calculate CO attainment
    - Generate PDF report cards
    - Upload to S3
    - Send email notifications to students
    - Update status to published
    """
    from src.infrastructure.database.models import SemesterModel, FinalMarkModel, ExamModel, SubjectAssignmentModel
    from src.infrastructure.queue.celery_app import celery_app
    
    # Only HOD and Principal can publish
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can publish semester results"
        )
    
    try:
        # Get semester
        semester = db.query(SemesterModel).filter(SemesterModel.id == semester_id).first()
        if not semester:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Semester {semester_id} not found"
            )
        
        # Validate all exams are complete
        # Get all subject assignments for this semester
        assignments = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.semester_id == semester_id
        ).all()
        
        missing_exams = []
        for assignment in assignments:
            # Check if all required exams exist (internal1, internal2, external)
            internal1 = db.query(ExamModel).filter(
                ExamModel.subject_assignment_id == assignment.id,
                ExamModel.exam_type == 'internal1',
                ExamModel.status.in_(['locked', 'published'])
            ).first()
            
            internal2 = db.query(ExamModel).filter(
                ExamModel.subject_assignment_id == assignment.id,
                ExamModel.exam_type == 'internal2',
                ExamModel.status.in_(['locked', 'published'])
            ).first()
            
            external = db.query(ExamModel).filter(
                ExamModel.subject_assignment_id == assignment.id,
                ExamModel.exam_type == 'external',
                ExamModel.status.in_(['locked', 'published'])
            ).first()
            
            if not internal1 or not internal2 or not external:
                from src.infrastructure.database.models import SubjectModel
                subject = db.query(SubjectModel).filter(SubjectModel.id == assignment.subject_id).first()
                missing_exams.append({
                    "subject_id": assignment.subject_id,
                    "subject_name": subject.name if subject else "Unknown",
                    "missing": []
                })
                if not internal1:
                    missing_exams[-1]["missing"].append("internal1")
                if not internal2:
                    missing_exams[-1]["missing"].append("internal2")
                if not external:
                    missing_exams[-1]["missing"].append("external")
        
        if missing_exams:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Cannot publish semester: Some exams are incomplete",
                    "missing_exams": missing_exams
                }
            )
        
        # Trigger Celery task for publishing
        from src.infrastructure.queue.tasks.report_tasks import publish_semester_async
        
        task = publish_semester_async.delay(semester_id, current_user.id)
        
        return {
            "status": "processing",
            "message": "Semester publish job started",
            "task_id": task.id,
            "semester_id": semester_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish semester: {str(e)}"
        )

