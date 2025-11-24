"""
Internal Marks API Endpoints
CRUD operations and workflow management for Internal Marks
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from pydantic import ValidationError

from src.application.services.internal_marks_service import InternalMarksService
from src.application.dto.internal_mark_dto import (
    InternalMarkCreateRequest,
    InternalMarkUpdateRequest,
    InternalMarkSubmitRequest,
    InternalMarkRejectRequest,
    InternalMarkResponse,
    InternalMarkListResponse
)
from src.api.dependencies import get_current_user
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, BusinessRuleViolationError
from src.infrastructure.database.models import InternalMarkModel, MarksWorkflowState, MarkComponentType
from src.infrastructure.database.session import get_db
from src.infrastructure.database.repositories.internal_mark_repository_impl import InternalMarkRepository
from sqlalchemy.orm import Session


def get_internal_marks_service(
    db: Session = Depends(get_db)
) -> InternalMarksService:
    """Get internal marks service instance"""
    repo = InternalMarkRepository(db)
    return InternalMarksService(repo, db)


# Create router
router = APIRouter(
    prefix="/internal-marks",
    tags=["Internal Marks"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=InternalMarkResponse, status_code=status.HTTP_201_CREATED)
async def create_internal_mark(
    request: InternalMarkCreateRequest,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or update an internal mark
    
    Only Teachers can create/update marks for their assigned subjects.
    """
    # Check if user is teacher
    if current_user.role.value not in ['teacher', 'hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Teachers, HOD, Principal, and Admin can create marks"
        )
    
    # For teachers, verify they own the subject assignment
    if current_user.role.value == 'teacher':
        from src.infrastructure.database.models import SubjectAssignmentModel, TeacherModel
        teacher = db.query(TeacherModel).filter(TeacherModel.user_id == current_user.id).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher profile not found"
            )
        assignment = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == request.subject_assignment_id
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject assignment {request.subject_assignment_id} not found"
            )
        if assignment.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create marks for your assigned subjects"
        )
    
    try:
        from decimal import Decimal
        from src.infrastructure.database.models import MarkComponentType
        
        component_type = MarkComponentType(request.component_type)
        
        mark = await service.create_internal_mark(
            student_id=request.student_id,
            subject_assignment_id=request.subject_assignment_id,
            semester_id=request.semester_id,
            academic_year_id=request.academic_year_id,
            component_type=component_type,
            marks_obtained=Decimal(str(request.marks_obtained)),
            max_marks=Decimal(str(request.max_marks)),
            entered_by=current_user.id,
            notes=request.notes
        )
        
        return InternalMarkResponse(**mark.to_dict())
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error creating internal mark: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the internal mark: {str(e)}"
        )


@router.get("", response_model=InternalMarkListResponse)
async def list_internal_marks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    student_id: Optional[int] = Query(None, gt=0),
    subject_assignment_id: Optional[int] = Query(None, gt=0),
    semester_id: Optional[int] = Query(None, gt=0),
    academic_year_id: Optional[int] = Query(None, gt=0),
    workflow_state: Optional[str] = Query(None, pattern="^(draft|submitted|approved|rejected|frozen|published)$"),
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List internal marks with optional filters
    
    Teachers can only see marks for their assigned subjects.
    HOD can see marks for their department.
    Principal can see all marks.
    """
    # Apply role-based filtering
    from src.infrastructure.database.models import SubjectAssignmentModel, TeacherModel, DepartmentModel
    
    # For teachers, filter by their subject assignments
    if current_user.role.value == 'teacher':
        teacher = db.query(TeacherModel).filter(TeacherModel.user_id == current_user.id).first()
        if teacher:
            # Get teacher's subject assignment IDs
            teacher_assignments = db.query(SubjectAssignmentModel.id).filter(
                SubjectAssignmentModel.teacher_id == teacher.id
            ).all()
            teacher_assignment_ids = [a[0] for a in teacher_assignments]
            
            # If filtering by subject_assignment_id, verify teacher owns it
            if subject_assignment_id:
                if subject_assignment_id not in teacher_assignment_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You can only view marks for your assigned subjects"
                    )
            # If no subject_assignment_id specified, we'll filter in the query below
        else:
            # Teacher profile not found, return empty
            return InternalMarkListResponse(items=[], total=0, skip=skip, limit=limit)
    
    # For HOD, filter by department
    elif current_user.role.value == 'hod':
        hod_department_id = getattr(current_user, 'department_id', None) or (getattr(current_user, 'department_ids', [None])[0] if getattr(current_user, 'department_ids', None) else None)
        if hod_department_id:
            # Get department's subject assignment IDs
            dept_assignments = db.query(SubjectAssignmentModel.id).join(
                SubjectModel
            ).filter(
                SubjectModel.department_id == hod_department_id
            ).all()
            dept_assignment_ids = [a[0] for a in dept_assignments]
            
            # If filtering by subject_assignment_id, verify it belongs to department
            if subject_assignment_id:
                if subject_assignment_id not in dept_assignment_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You can only view marks from your department"
                    )
    
    if student_id:
        marks = await service.get_student_marks(
            student_id=student_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id,
            skip=skip,
            limit=limit
        )
    elif subject_assignment_id:
        workflow_state_enum = None
        if workflow_state:
            workflow_state_enum = MarksWorkflowState(workflow_state)
        
        # Additional role-based filtering for teachers
        if current_user.role.value == 'teacher':
            teacher = db.query(TeacherModel).filter(TeacherModel.user_id == current_user.id).first()
            if teacher:
                teacher_assignments = db.query(SubjectAssignmentModel.id).filter(
                    SubjectAssignmentModel.teacher_id == teacher.id
                ).all()
                teacher_assignment_ids = [a[0] for a in teacher_assignments]
                if subject_assignment_id not in teacher_assignment_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You can only view marks for your assigned subjects"
                    )
        
        marks = await service.get_subject_marks(
            subject_assignment_id=subject_assignment_id,
            workflow_state=workflow_state_enum,
            skip=skip,
            limit=limit
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either student_id or subject_assignment_id must be provided"
        )
    
    # Get total count for pagination (database-level count is more efficient)
    count_query = db.query(InternalMarkModel)
    if student_id:
        count_query = count_query.filter(InternalMarkModel.student_id == student_id)
        if semester_id:
            count_query = count_query.filter(InternalMarkModel.semester_id == semester_id)
        if academic_year_id:
            count_query = count_query.filter(InternalMarkModel.academic_year_id == academic_year_id)
    elif subject_assignment_id:
        count_query = count_query.filter(InternalMarkModel.subject_assignment_id == subject_assignment_id)
        if workflow_state:
            count_query = count_query.filter(InternalMarkModel.workflow_state == workflow_state)
    total = count_query.count()
    
    return InternalMarkListResponse(
        items=[InternalMarkResponse(**m.to_dict()) for m in marks],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{mark_id}", response_model=InternalMarkResponse)
async def get_internal_mark(
    mark_id: int,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """Get internal mark by ID"""
    try:
        mark = await service.get_internal_mark(mark_id)
        return InternalMarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{mark_id}", response_model=InternalMarkResponse)
async def update_internal_mark(
    mark_id: int,
    request: InternalMarkUpdateRequest,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update internal mark
    
    Only Teachers can update marks in DRAFT or REJECTED state.
    """
    if current_user.role.value not in ['teacher', 'hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Teachers, HOD, Principal, and Admin can update marks"
        )
    
    try:
        from decimal import Decimal
        mark = await service.get_internal_mark(mark_id)
        mark.update_marks(Decimal(str(request.marks_obtained)))
        if request.notes is not None:
            mark._notes = request.notes
        updated = await service.repository.update(mark)
        return InternalMarkResponse(**updated.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{mark_id}/submit", response_model=InternalMarkResponse)
async def submit_mark(
    mark_id: int,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Submit mark for HOD approval
    
    Only Teachers can submit marks.
    """
    if current_user.role.value not in ['teacher', 'hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Teachers, HOD, Principal, and Admin can submit marks"
        )
    
    try:
        mark = await service.submit_marks(mark_id, current_user.id)
        return InternalMarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/bulk-submit", response_model=dict)
async def bulk_submit_marks(
    request: InternalMarkSubmitRequest,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk submit marks for a subject assignment
    
    Only Teachers can bulk submit marks.
    """
    if current_user.role.value not in ['teacher', 'hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Teachers, HOD, Principal, and Admin can submit marks"
        )
    
    if not request.subject_assignment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="subject_assignment_id is required for bulk submit"
        )
    
    result = await service.bulk_submit_marks(
        subject_assignment_id=request.subject_assignment_id,
        submitted_by=current_user.id
    )
    
    return {
        "submitted": result["submitted"],
        "errors": result["errors"],
        "marks": [InternalMarkResponse(**m.to_dict()) for m in result["marks"]]
    }


@router.post("/{mark_id}/approve", response_model=InternalMarkResponse)
async def approve_mark(
    mark_id: int,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve mark (HOD)
    
    Only HOD, Principal, and Admin can approve marks.
    """
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can approve marks"
        )
    
    # For HOD, verify the mark belongs to their department
    if current_user.role.value == 'hod':
        from src.infrastructure.database.models import InternalMarkModel, SubjectAssignmentModel, SubjectModel
        mark_model = db.query(InternalMarkModel).filter(InternalMarkModel.id == mark_id).first()
        if not mark_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mark {mark_id} not found"
            )
        assignment = db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == mark_model.subject_assignment_id
        ).first()
        if assignment:
            subject = db.query(SubjectModel).filter(SubjectModel.id == assignment.subject_id).first()
            hod_department_id = getattr(current_user, 'department_id', None) or (getattr(current_user, 'department_ids', [None])[0] if getattr(current_user, 'department_ids', None) else None)
            if subject and subject.department_id != hod_department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only approve marks from your department"
        )
    
    try:
        mark = await service.approve_marks(mark_id, current_user.id)
        return InternalMarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{mark_id}/reject", response_model=InternalMarkResponse)
async def reject_mark(
    mark_id: int,
    request: InternalMarkRejectRequest,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Reject mark (HOD)
    
    Only HOD, Principal, and Admin can reject marks.
    """
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can reject marks"
        )
    
    try:
        mark = await service.reject_marks(mark_id, current_user.id, request.reason)
        return InternalMarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{mark_id}/freeze", response_model=InternalMarkResponse)
async def freeze_mark(
    mark_id: int,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Freeze mark (Principal)
    
    Only Principal and Admin can freeze marks.
    """
    if current_user.role.value not in ['principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal and Admin can freeze marks"
        )
    
    try:
        mark = await service.freeze_marks(mark_id, current_user.id)
        return InternalMarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{mark_id}/publish", response_model=InternalMarkResponse)
async def publish_mark(
    mark_id: int,
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Publish mark (HOD/Principal)
    
    Only HOD, Principal, and Admin can publish marks.
    """
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can publish marks"
        )
    
    try:
        mark = await service.publish_marks(mark_id)
        return InternalMarkResponse(**mark.to_dict())
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except BusinessRuleViolationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/submitted/list", response_model=InternalMarkListResponse)
async def get_submitted_marks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    department_id: Optional[int] = Query(None, gt=0),
    service: InternalMarksService = Depends(get_internal_marks_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all submitted marks awaiting approval
    
    Only HOD, Principal, and Admin can view submitted marks.
    """
    if current_user.role.value not in ['hod', 'principal', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HOD, Principal, and Admin can view submitted marks"
        )
    
    marks = await service.get_submitted_marks(
        department_id=department_id,
        skip=skip,
        limit=limit
    )
    
    # Marks are already paginated from service
    total = len(marks)
    
    return InternalMarkListResponse(
        items=[InternalMarkResponse(**m.to_dict()) for m in marks],
        total=total,
        skip=skip,
        limit=limit
    )

