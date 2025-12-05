"""
Analytics API Endpoints
Analytics and CO/PO attainment calculations
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from src.application.services.analytics import AnalyticsService
from src.application.dto.analytics_dto import (
    StudentAnalyticsResponse,
    TeacherAnalyticsResponse,
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
from src.domain.enums.user_role import UserRole
from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.repositories.mark_repository_impl import MarkRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.user_repository_impl import UserRepository
from src.infrastructure.database.repositories.subject_repository_impl import SubjectRepository
from src.infrastructure.database.session import get_db
from src.infrastructure.database.models import QuestionModel
from src.infrastructure.cache.redis_client import get_cache_service
from src.api.middleware.rate_limiting import limiter
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
    logger = logging.getLogger(__name__)
    logger.info(f"get_multi_dimensional_analytics called with dim={dim}, filters={filters}")

    try:
        # Parse filters if provided
        filter_dict = {}
        if filters:
            try:
                filter_dict = json.loads(filters)
                logger.info(f"Parsed filters: {filter_dict}")
            except json.JSONDecodeError:
                logger.error(f"Invalid filters JSON: {filters}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid filters JSON"
                )
        
        # Get dimension-specific analytics
        if dim == "year":
            # Group by academic year (using AcademicYearModel via semester)
            from src.infrastructure.database.models import FinalMarkModel, SemesterModel, AcademicYearModel
            query = db.query(
                AcademicYearModel.display_name,
                AcademicYearModel.start_year,
                func.avg(FinalMarkModel.total).label('avg_total'),
                func.count(FinalMarkModel.id).label('count')
            ).join(
                SemesterModel, FinalMarkModel.semester_id == SemesterModel.id
            ).join(
                AcademicYearModel, SemesterModel.academic_year_id == AcademicYearModel.id
            )
            
            if filter_dict.get('department_id'):
                from src.infrastructure.database.models import SubjectAssignmentModel, SubjectModel
                query = query.join(
                    SubjectAssignmentModel, FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
                ).join(
                    SubjectModel, SubjectAssignmentModel.subject_id == SubjectModel.id
                ).filter(SubjectModel.department_id == filter_dict['department_id'])
            
            results = query.group_by(AcademicYearModel.id, AcademicYearModel.display_name, AcademicYearModel.start_year).all()
            
            return {
                "dimension": "year",
                "data": [
                    {
                        "year": display_name or f"{start_year}-{start_year+1}",
                        "academic_year_name": display_name,
                        "start_year": start_year,
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for display_name, start_year, avg_total, count in results
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
            
            if filter_dict.get('batch_instance_id'):
                query = query.filter(SemesterModel.batch_instance_id == filter_dict['batch_instance_id'])
            elif filter_dict.get('academic_year_id'):
                query = query.filter(SemesterModel.academic_year_id == filter_dict['academic_year_id'])
            
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
            logger.info("Processing class dimension analytics")
            # Group by batch instance (class)
            from src.infrastructure.database.models import (
                FinalMarkModel, SemesterModel, BatchInstanceModel,
                BatchModel, DepartmentModel, AcademicYearModel
            )
            try:
                query = db.query(
                    BatchInstanceModel.id,
                    DepartmentModel.code,
                    BatchModel.name,
                    BatchInstanceModel.admission_year,
                    AcademicYearModel.display_name,
                    func.avg(FinalMarkModel.total).label('avg_total'),
                    func.count(FinalMarkModel.id).label('count')
                ).join(
                    SemesterModel, FinalMarkModel.semester_id == SemesterModel.id
                ).join(
                    BatchInstanceModel, SemesterModel.batch_instance_id == BatchInstanceModel.id
                ).join(
                    DepartmentModel, BatchInstanceModel.department_id == DepartmentModel.id
                ).join(
                    BatchModel, BatchInstanceModel.batch_id == BatchModel.id
                ).join(
                    AcademicYearModel, BatchInstanceModel.academic_year_id == AcademicYearModel.id
                )

                if filter_dict.get('department_id'):
                    query = query.filter(BatchInstanceModel.department_id == filter_dict['department_id'])
                    logger.info(f"Applied department filter: {filter_dict['department_id']}")

                if filter_dict.get('academic_year_id'):
                    query = query.filter(BatchInstanceModel.academic_year_id == filter_dict['academic_year_id'])
                    logger.info(f"Applied academic_year filter: {filter_dict['academic_year_id']}")

                logger.info("Executing class dimension query")
                results = query.group_by(
                    BatchInstanceModel.id,
                    DepartmentModel.code,
                    BatchModel.name,
                    BatchInstanceModel.admission_year,
                    AcademicYearModel.display_name
                ).all()
                logger.info(f"Class dimension query returned {len(results)} results")
            except Exception as e:
                logger.error(f"Error in class dimension query: {str(e)}", exc_info=True)
                raise
            
            return {
                "dimension": "class",
                "data": [
                    {
                        "class_id": batch_instance_id,
                        "class_name": f"{dept_code}-{batch_name}-{admission_year}",
                        "academic_year": ay_display,
                        "avg_total": float(avg_total) if avg_total else 0,
                        "count": count
                    }
                    for batch_instance_id, dept_code, batch_name, admission_year, ay_display, avg_total, count in results
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


# ============================================
# Enhanced Analytics Endpoints
# ============================================

@router.get("/blooms-taxonomy")
async def get_blooms_analysis_enhanced(
    subject_assignment_id: Optional[int] = Query(None, description="Filter by subject assignment"),
    department_id: Optional[int] = Query(None, description="Filter by department"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze student performance based on Bloom's taxonomy levels
    
    Returns distribution across:
    - L1: Remember
    - L2: Understand
    - L3: Apply
    - L4: Analyze
    - L5: Evaluate
    - L6: Create
    """
    try:
        result = analytics_service.get_blooms_taxonomy_analysis(
            subject_assignment_id=subject_assignment_id,
            department_id=department_id,
            semester_id=semester_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing Bloom's taxonomy: {str(e)}"
        )


@router.get("/performance-trends")
async def get_performance_trends(
    student_id: Optional[int] = Query(None, description="Filter by student"),
    subject_id: Optional[int] = Query(None, description="Filter by subject"),
    department_id: Optional[int] = Query(None, description="Filter by department"),
    months: int = Query(6, description="Number of months to analyze"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get performance trends over time
    
    Returns:
    - Monthly performance averages
    - Trend direction (improving/declining/stable)
    - Overall statistics
    """
    try:
        result = analytics_service.get_performance_trends(
            student_id=student_id,
            subject_id=subject_id,
            department_id=department_id,
            months=months
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating performance trends: {str(e)}"
        )


@router.get("/department-comparison")
async def get_department_comparison(
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Compare performance across departments
    
    Returns:
    - Department-wise statistics
    - Student/teacher/subject counts
    - Average performance
    - Pass rates
    - Rankings
    """
    # Only admins and principals can see department comparisons
    if not any(role in [UserRole.ADMIN, UserRole.PRINCIPAL] for role in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view department comparisons"
        )
    
    try:
        result = analytics_service.get_department_comparison(
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing departments: {str(e)}"
        )


@router.get("/student-performance/{student_id}")
async def get_student_performance_enhanced(
    student_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Comprehensive performance analytics for a student
    
    Returns:
    - Subject-wise performance
    - Overall statistics
    - Strengths and weaknesses
    - Pass/fail status
    """
    try:
        result = await analytics_service.get_student_performance_analytics(
            student_id=student_id,
            academic_year_id=academic_year_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching student performance: {str(e)}"
        )


@router.get("/subject-analytics/{subject_id}")
async def get_subject_analytics_enhanced(
    subject_id: int,
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    batch_instance_id: Optional[int] = Query(None, description="Filter by batch instance"),
    include_bloom_analysis: bool = Query(False, description="Include Bloom's taxonomy analysis"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get subject-level analytics (Enhanced)
    """
    try:
        result = analytics_service.get_subject_analytics_enhanced(
            subject_id=subject_id,
            semester_id=semester_id,
            batch_instance_id=batch_instance_id,
            include_bloom_analysis=include_bloom_analysis
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching subject analytics: {str(e)}"
        )


@router.get("/class-performance/{batch_instance_id}")
async def get_class_performance_analytics(
    batch_instance_id: int,
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    subject_id: Optional[int] = Query(None, description="Filter by subject"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get class/batch instance performance analytics
    """
    try:
        result = analytics_service.get_class_performance_analytics(
            batch_instance_id=batch_instance_id,
            semester_id=semester_id,
            subject_id=subject_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching class performance: {str(e)}"
        )


@router.get("/teacher-performance/{teacher_id}")
async def get_teacher_performance_enhanced(
    teacher_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    semester_id: Optional[int] = Query(None, description="Filter by semester"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Analytics for teacher performance
    
    Returns:
    - Students taught
    - Subjects handled
    - Average student performance
    - Marks submission status
    """
    try:
        result = await analytics_service.get_teacher_performance_analytics(
            teacher_id=teacher_id,
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching teacher performance: {str(e)}"
        )


@router.get("/department-analytics/{department_id}")
async def get_department_analytics_enhanced(
    department_id: int,
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year"),
    include_po_attainment: bool = Query(False, description="Include PO attainment"),
    include_trends: bool = Query(False, description="Include performance trends"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get department-level analytics (Enhanced)
    """
    try:
        result = analytics_service.get_department_analytics_enhanced(
            department_id=department_id,
            academic_year_id=academic_year_id,
            include_po_attainment=include_po_attainment,
            include_trends=include_trends
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching department analytics: {str(e)}"
        )


@router.get("/nba/{department_id}")
async def get_nba_accreditation_data(
    department_id: int,
    academic_year_id: int = Query(..., description="Academic year ID"),
    include_indirect_attainment: bool = Query(False, description="Include indirect attainment"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get NBA accreditation report data
    """
    try:
        result = analytics_service.get_nba_accreditation_data(
            department_id=department_id,
            academic_year_id=academic_year_id,
            include_indirect_attainment=include_indirect_attainment
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching NBA accreditation data: {str(e)}"
        )
