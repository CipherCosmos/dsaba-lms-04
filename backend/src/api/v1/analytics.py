"""
Analytics API Endpoints
Analytics and CO/PO attainment calculations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.analytics_service import AnalyticsService
from src.application.dto.analytics_dto import (
    StudentAnalyticsResponse,
    TeacherAnalyticsResponse,
    ClassAnalyticsResponse,
    SubjectAnalyticsResponse,
    HODAnalyticsResponse,
    COAttainmentResponse,
    POAttainmentResponse
)
from src.api.dependencies import (
    get_current_user,
    get_mark_repository,
    get_exam_repository,
    get_user_repository
)
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import QuestionModel
from src.infrastructure.cache.redis_client import get_cache_service
from sqlalchemy.orm import Session
from sqlalchemy import func, case


def get_analytics_service(
    db: Session = Depends(get_db),
    mark_repo: MarkRepository = Depends(get_mark_repository),
    exam_repo: ExamRepository = Depends(get_exam_repository),
    user_repo: UserRepository = Depends(get_user_repository)
) -> AnalyticsService:
    """Get analytics service instance"""
    subject_repo = SubjectRepository(db)
    cache_service = get_cache_service()
    return AnalyticsService(db, mark_repo, exam_repo, subject_repo, user_repo, cache_service)


# Create router
router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.get("/student/{student_id}", response_model=StudentAnalyticsResponse)
async def get_student_analytics(
    student_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get student analytics
    
    - **student_id**: Student ID
    - **subject_id**: Optional subject filter
    """
    try:
        analytics = await analytics_service.get_student_analytics(
            student_id=student_id,
            subject_id=subject_id
        )
        return StudentAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/teacher/{teacher_id}", response_model=TeacherAnalyticsResponse)
async def get_teacher_analytics(
    teacher_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get teacher analytics
    
    - **teacher_id**: Teacher ID
    - **subject_id**: Optional subject filter
    """
    try:
        analytics = await analytics_service.get_teacher_analytics(
            teacher_id=teacher_id,
            subject_id=subject_id
        )
        return TeacherAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/class/{class_id}", response_model=ClassAnalyticsResponse)
async def get_class_analytics(
    class_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get class analytics
    
    - **class_id**: Class ID
    - **subject_id**: Optional subject filter
    """
    try:
        analytics = await analytics_service.get_class_analytics(
            class_id=class_id,
            subject_id=subject_id
        )
        return ClassAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/subject/{subject_id}", response_model=SubjectAnalyticsResponse)
async def get_subject_analytics(
    subject_id: int,
    class_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get subject analytics
    
    - **subject_id**: Subject ID
    - **class_id**: Optional class filter
    """
    try:
        analytics = await analytics_service.get_subject_analytics(
            subject_id=subject_id,
            class_id=class_id
        )
        return SubjectAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/hod/department/{department_id}", response_model=HODAnalyticsResponse)
async def get_hod_analytics(
    department_id: int,
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get HOD analytics (department-wide)
    
    - **department_id**: Department ID
    """
    try:
        analytics = await analytics_service.get_hod_analytics(
            department_id=department_id
        )
        return HODAnalyticsResponse(**analytics)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/co-attainment/subject/{subject_id}", response_model=COAttainmentResponse)
async def get_co_attainment(
    subject_id: int,
    exam_type: Optional[str] = Query(None, pattern="^(internal1|internal2|external|all)$"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate CO (Course Outcome) attainment for a subject
    
    - **subject_id**: Subject ID
    - **exam_type**: Optional exam type filter (internal1, internal2, external, all)
    """
    try:
        attainment = await analytics_service.calculate_co_attainment(
            subject_id=subject_id,
            exam_type=exam_type
        )
        return COAttainmentResponse(**attainment)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/po-attainment/department/{department_id}", response_model=POAttainmentResponse)
async def get_po_attainment(
    department_id: int,
    subject_id: Optional[int] = Query(None, gt=0),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate PO (Program Outcome) attainment for a department
    
    - **department_id**: Department ID
    - **subject_id**: Optional subject filter
    """
    try:
        attainment = await analytics_service.calculate_po_attainment(
            department_id=department_id,
            subject_id=subject_id
        )
        return POAttainmentResponse(**attainment)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/blooms")
async def get_blooms_analysis(
    exam_id: Optional[int] = Query(None, gt=0),
    subject_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Bloom's taxonomy level analysis
    
    - **exam_id**: Optional exam filter
    - **subject_id**: Optional subject filter
    
    Returns count of questions grouped by Bloom's level (L1-L6)
    """
    try:
        query = db.query(
            QuestionModel.blooms_level,
            func.count(QuestionModel.id).label('count')
        ).group_by(QuestionModel.blooms_level)
        
        if exam_id:
            query = query.filter(QuestionModel.exam_id == exam_id)
        
        if subject_id:
            # Filter by subject through exam -> subject_assignment
            from src.infrastructure.database.models import ExamModel, SubjectAssignmentModel
            query = query.join(ExamModel).join(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.subject_id == subject_id
            )
        
        results = query.all()
        
        # Format response
        blooms_data = {}
        total = 0
        for blooms_level, count in results:
            if blooms_level:
                blooms_data[blooms_level] = count
                total += count
        
        return {
            "blooms_levels": blooms_data,
            "total": total,
            "exam_id": exam_id,
            "subject_id": subject_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Bloom's analysis: {str(e)}"
        )


@router.get("/multi")
async def get_multi_dimensional_analytics(
    dim: str = Query(..., description="Dimension: year, semester, subject, class, teacher"),
    filters: Optional[str] = Query(None, description="JSON string of additional filters"),
    db: Session = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get multi-dimensional analytics with pivot queries
    
    - **dim**: Dimension to analyze (year, semester, subject, class, teacher)
    - **filters**: Optional JSON string with additional filters
    
    Returns pivot data for charts (bar/line)
    """
    import json
    
    try:
        # Parse filters if provided
        filter_dict = {}
        if filters:
            try:
                filter_dict = json.loads(filters)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid filters JSON"
                )
        
        # Get dimension-specific analytics
        if dim == "year":
            # Group by academic year
            from src.infrastructure.database.models import FinalMarkModel, SemesterModel, BatchYearModel
            query = db.query(
                BatchYearModel.start_year,
                func.avg(FinalMarkModel.total).label('avg_total'),
                func.count(FinalMarkModel.id).label('count')
            ).join(
                SemesterModel, FinalMarkModel.semester_id == SemesterModel.id
            ).join(
                BatchYearModel, SemesterModel.batch_year_id == BatchYearModel.id
            )
            
            if filter_dict.get('department_id'):
                from src.infrastructure.database.models import SubjectAssignmentModel, SubjectModel
                query = query.join(
                    SubjectAssignmentModel, FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
                ).join(
                    SubjectModel, SubjectAssignmentModel.subject_id == SubjectModel.id
                ).filter(SubjectModel.department_id == filter_dict['department_id'])
            
            results = query.group_by(BatchYearModel.start_year).all()
            
            return {
                "dimension": "year",
                "data": [
                    {
                        "year": year,
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for year, avg_total, count in results
                ]
            }
        
        elif dim == "semester":
            # Group by semester
            from src.infrastructure.database.models import FinalMarkModel, SemesterModel
            query = db.query(
                SemesterModel.semester_no,
                func.avg(FinalMarkModel.total).label('avg_total'),
                func.count(FinalMarkModel.id).label('count')
            ).join(
                SemesterModel, FinalMarkModel.semester_id == SemesterModel.id
            )
            
            if filter_dict.get('batch_year_id'):
                query = query.filter(SemesterModel.batch_year_id == filter_dict['batch_year_id'])
            
            results = query.group_by(SemesterModel.semester_no).all()
            
            return {
                "dimension": "semester",
                "data": [
                    {
                        "semester": semester_no,
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for semester_no, avg_total, count in results
                ]
            }
        
        elif dim == "subject":
            # Group by subject
            from src.infrastructure.database.models import FinalMarkModel, SubjectAssignmentModel, SubjectModel
            query = db.query(
                SubjectModel.name,
                SubjectModel.id,
                func.avg(FinalMarkModel.total).label('avg_total'),
                func.count(FinalMarkModel.id).label('count')
            ).join(
                SubjectAssignmentModel, FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                SubjectModel, SubjectAssignmentModel.subject_id == SubjectModel.id
            )
            
            if filter_dict.get('department_id'):
                query = query.filter(SubjectModel.department_id == filter_dict['department_id'])
            
            results = query.group_by(SubjectModel.id, SubjectModel.name).all()
            
            return {
                "dimension": "subject",
                "data": [
                    {
                        "subject_id": subject_id,
                        "subject_name": subject_name,
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for subject_name, subject_id, avg_total, count in results
                ]
            }
        
        elif dim == "class":
            # Group by class
            from src.infrastructure.database.models import FinalMarkModel, SubjectAssignmentModel, ClassModel
            query = db.query(
                ClassModel.name,
                ClassModel.id,
                func.avg(FinalMarkModel.total).label('avg_total'),
                func.count(FinalMarkModel.id).label('count')
            ).join(
                SubjectAssignmentModel, FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                ClassModel, SubjectAssignmentModel.class_id == ClassModel.id
            )
            
            if filter_dict.get('department_id'):
                query = query.filter(ClassModel.department_id == filter_dict['department_id'])
            
            results = query.group_by(ClassModel.id, ClassModel.name).all()
            
            return {
                "dimension": "class",
                "data": [
                    {
                        "class_id": class_id,
                        "class_name": class_name,
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for class_name, class_id, avg_total, count in results
                ]
            }
        
        elif dim == "teacher":
            # Group by teacher
            from src.infrastructure.database.models import FinalMarkModel, SubjectAssignmentModel, TeacherModel, UserModel
            query = db.query(
                UserModel.first_name,
                UserModel.last_name,
                TeacherModel.id,
                func.avg(FinalMarkModel.total).label('avg_total'),
                func.count(FinalMarkModel.id).label('count')
            ).join(
                SubjectAssignmentModel, FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                TeacherModel, SubjectAssignmentModel.teacher_id == TeacherModel.id
            ).join(
                UserModel, TeacherModel.user_id == UserModel.id
            )
            
            if filter_dict.get('department_id'):
                from src.infrastructure.database.models import SubjectModel
                query = query.join(
                    SubjectModel, SubjectAssignmentModel.subject_id == SubjectModel.id
                ).filter(SubjectModel.department_id == filter_dict['department_id'])
            
            results = query.group_by(TeacherModel.id, UserModel.first_name, UserModel.last_name).all()
            
            return {
                "dimension": "teacher",
                "data": [
                    {
                        "teacher_id": teacher_id,
                        "teacher_name": f"{first_name} {last_name}",
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for first_name, last_name, teacher_id, avg_total, count in results
                ]
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid dimension: {dim}. Must be one of: year, semester, subject, class, teacher"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get multi-dimensional analytics: {str(e)}"
        )

