"""
Analytics Service
Business logic for analytics and CO/PO attainment calculations
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from src.domain.repositories.mark_repository import IMarkRepository
from src.domain.repositories.exam_repository import IExamRepository
from src.domain.repositories.subject_repository import ISubjectRepository
from src.domain.repositories.user_repository import IUserRepository
from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.models import (
    MarkModel, ExamModel, SubjectModel, StudentModel,
    CourseOutcomeModel, ProgramOutcomeModel, QuestionCOMappingModel,
    COPOMappingModel, QuestionModel, FinalMarkModel, SubjectAssignmentModel
)
from src.infrastructure.cache.redis_client import CacheService
from src.shared.constants import CACHE_KEYS


class AnalyticsService:
    """
    Analytics service
    
    Provides analytics for students, teachers, classes, subjects, and HODs
    Includes CO/PO attainment calculations
    """
    
    def __init__(
        self,
        db: Session,
        mark_repository: IMarkRepository,
        exam_repository: IExamRepository,
        subject_repository: ISubjectRepository,
        user_repository: IUserRepository,
        cache_service: Optional[CacheService] = None
    ):
        self.db = db
        self.mark_repository = mark_repository
        self.exam_repository = exam_repository
        self.subject_repository = subject_repository
        self.user_repository = user_repository
        self.cache_service = cache_service
    
    async def get_student_analytics(
        self,
        student_id: int,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive analytics for a student
        
        Args:
            student_id: Student ID
            subject_id: Optional subject filter
        
        Returns:
            Dict with student performance metrics
        """
        # Check cache first
        if self.cache_service and self.cache_service.is_enabled:
            cache_key = self.cache_service.get_cache_key(
                CACHE_KEYS["analytics"],
                type="student",
                student_id=student_id,
                subject_id=subject_id
            )
            cached = await self.cache_service.get(cache_key)
            if cached:
                return cached
        
        # Get student with eager loading
        from sqlalchemy.orm import joinedload
        student = self.db.query(StudentModel).options(
            joinedload(StudentModel.user)
        ).filter(StudentModel.id == student_id).first()
        if not student:
            raise EntityNotFoundError("Student", student_id)
        
        # Get marks with eager loading of exams to avoid N+1 queries
        marks_query = self.db.query(MarkModel).options(
            joinedload(MarkModel.exam)
        ).filter(MarkModel.student_id == student_id)
        
        if subject_id:
            # Filter by subject through exam -> subject_assignment -> subject
            marks_query = marks_query.join(ExamModel).join(
                SubjectAssignmentModel
            ).filter(SubjectAssignmentModel.subject_id == subject_id)
        
        marks = marks_query.all()
        
        # Calculate statistics using SQL aggregation for better performance
        from sqlalchemy import func
        stats_query = self.db.query(
            func.sum(MarkModel.marks_obtained).label('total_marks'),
            func.count(MarkModel.id).label('count'),
            func.avg(MarkModel.marks_obtained).label('avg_marks')
        ).filter(MarkModel.student_id == student_id)
        
        if subject_id:
            stats_query = stats_query.join(ExamModel).join(
                SubjectAssignmentModel
            ).filter(SubjectAssignmentModel.subject_id == subject_id)
        
        stats = stats_query.first()
        total_marks = float(stats.total_marks) if stats.total_marks else 0
        avg_marks = float(stats.avg_marks) if stats.avg_marks else 0
        marks_count = stats.count if stats.count else 0
        
        # Get exam type breakdown using SQL aggregation (more efficient)
        exam_type_query = self.db.query(
            ExamModel.exam_type,
            func.sum(MarkModel.marks_obtained).label('total_marks'),
            func.count(MarkModel.id).label('count'),
            func.avg(MarkModel.marks_obtained).label('avg_marks')
        ).join(MarkModel).filter(
            MarkModel.student_id == student_id
        )
        
        if subject_id:
            exam_type_query = exam_type_query.join(
                SubjectAssignmentModel
            ).filter(SubjectAssignmentModel.subject_id == subject_id)
        
        exam_type_query = exam_type_query.group_by(ExamModel.exam_type)
        exam_type_results = exam_type_query.all()
        
        # Build exam type stats dictionary
        exam_type_stats = {}
        for result in exam_type_results:
            exam_type_stats[result.exam_type] = {
                "total_marks": float(result.total_marks) if result.total_marks else 0,
                "count": result.count,
                "avg_marks": float(result.avg_marks) if result.avg_marks else 0
            }
        
        # Get unique exam count
        exam_count_query = self.db.query(func.count(func.distinct(MarkModel.exam_id))).filter(
            MarkModel.student_id == student_id
        )
        if subject_id:
            exam_count_query = exam_count_query.join(ExamModel).join(
                SubjectAssignmentModel
            ).filter(SubjectAssignmentModel.subject_id == subject_id)
        
        total_exams = exam_count_query.scalar() or 0
        
        result = {
            "student_id": student_id,
            "student_name": f"{student.user.first_name} {student.user.last_name}",
            "roll_no": student.roll_no,
            "total_marks": round(total_marks, 2),
            "average_marks": round(avg_marks, 2),
            "total_exams": total_exams,
            "exam_type_breakdown": exam_type_stats,
            "subject_id": subject_id
        }
        
        # Cache result
        if self.cache_service and self.cache_service.is_enabled:
            cache_key = self.cache_service.get_cache_key(
                CACHE_KEYS["analytics"],
                type="student",
                student_id=student_id,
                subject_id=subject_id
            )
            await self.cache_service.set(cache_key, result, ttl=1800)  # 30 minutes
        
        return result
    
    async def get_teacher_analytics(
        self,
        teacher_id: int,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get analytics for a teacher
        
        Args:
            teacher_id: Teacher ID
            subject_id: Optional subject filter
        
        Returns:
            Dict with teacher performance metrics
        """
        # Get teacher's subject assignments
        assignments_query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.teacher_id == teacher_id
        )
        
        if subject_id:
            assignments_query = assignments_query.filter(
                SubjectAssignmentModel.subject_id == subject_id
            )
        
        assignments = assignments_query.all()
        
        # Get all exams for these assignments
        assignment_ids = [a.id for a in assignments]
        exams = self.db.query(ExamModel).filter(
            ExamModel.subject_assignment_id.in_(assignment_ids)
        ).all()
        
        # Get all marks for these exams
        exam_ids = [e.id for e in exams]
        marks = self.db.query(MarkModel).filter(
            MarkModel.exam_id.in_(exam_ids)
        ).all()
        
        # Calculate class statistics
        class_stats = {}
        for assignment in assignments:
            class_exams = [e for e in exams if e.subject_assignment_id == assignment.id]
            class_exam_ids = [e.id for e in class_exams]
            class_marks = [m for m in marks if m.exam_id in class_exam_ids]
            
            if class_marks:
                total = sum(float(m.marks_obtained) for m in class_marks)
                avg = total / len(class_marks)
                class_stats[assignment.class_id] = {
                    "total_students": len(set(m.student_id for m in class_marks)),
                    "total_marks": round(total, 2),
                    "average_marks": round(avg, 2),
                    "exams_count": len(class_exams)
                }
        
        return {
            "teacher_id": teacher_id,
            "total_subjects": len(set(a.subject_id for a in assignments)),
            "total_classes": len(set(a.class_id for a in assignments)),
            "total_exams": len(exams),
            "total_marks_entered": len(marks),
            "class_statistics": class_stats,
            "subject_id": subject_id
        }
    
    async def get_class_analytics(
        self,
        class_id: int,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get analytics for a class
        
        Args:
            class_id: Class ID
            subject_id: Optional subject filter
        
        Returns:
            Dict with class performance metrics
        """
        # Get students in class
        students = self.db.query(StudentModel).filter(
            StudentModel.class_id == class_id
        ).all()
        
        student_ids = [s.id for s in students]
        
        # Get marks for these students
        marks_query = self.db.query(MarkModel).filter(
            MarkModel.student_id.in_(student_ids)
        )
        
        if subject_id:
            marks_query = marks_query.join(ExamModel).join(
                SubjectAssignmentModel
            ).filter(SubjectAssignmentModel.subject_id == subject_id)
        
        marks = marks_query.all()
        
        # Calculate statistics
        if marks:
            total_marks = sum(float(m.marks_obtained) for m in marks)
            avg_marks = total_marks / len(marks)
            
            # Per student averages
            student_totals = {}
            for student_id in student_ids:
                student_marks = [m for m in marks if m.student_id == student_id]
                if student_marks:
                    student_totals[student_id] = sum(float(m.marks_obtained) for m in student_marks) / len(student_marks)
            
            sorted_totals = sorted(student_totals.values())
            median = sorted_totals[len(sorted_totals) // 2] if sorted_totals else 0
        else:
            total_marks = 0
            avg_marks = 0
            median = 0
            student_totals = {}
        
        return {
            "class_id": class_id,
            "total_students": len(students),
            "total_marks_entries": len(marks),
            "average_marks": round(avg_marks, 2),
            "median_marks": round(median, 2),
            "student_averages": {str(k): round(v, 2) for k, v in student_totals.items()},
            "subject_id": subject_id
        }
    
    async def get_subject_analytics(
        self,
        subject_id: int,
        class_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get analytics for a subject
        
        Args:
            subject_id: Subject ID
            class_id: Optional class filter
        
        Returns:
            Dict with subject performance metrics
        """
        # Get subject
        subject = await self.subject_repository.get_by_id(subject_id)
        if not subject:
            raise EntityNotFoundError("Subject", subject_id)
        
        # Get assignments
        assignments_query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.subject_id == subject_id
        )
        
        if class_id:
            assignments_query = assignments_query.filter(
                SubjectAssignmentModel.class_id == class_id
            )
        
        assignments = assignments_query.all()
        assignment_ids = [a.id for a in assignments]
        
        # Get exams
        exams = self.db.query(ExamModel).filter(
            ExamModel.subject_assignment_id.in_(assignment_ids)
        ).all()
        
        exam_ids = [e.id for e in exams]
        
        # Get marks
        marks = self.db.query(MarkModel).filter(
            MarkModel.exam_id.in_(exam_ids)
        ).all()
        
        # Calculate statistics
        if marks:
            total_marks = sum(float(m.marks_obtained) for m in marks)
            avg_marks = total_marks / len(marks)
        else:
            total_marks = 0
            avg_marks = 0
        
        return {
            "subject_id": subject_id,
            "subject_code": subject.code,
            "subject_name": subject.name,
            "total_classes": len(set(a.class_id for a in assignments)),
            "total_exams": len(exams),
            "total_marks_entries": len(marks),
            "average_marks": round(avg_marks, 2),
            "class_id": class_id
        }
    
    async def get_hod_analytics(
        self,
        department_id: int
    ) -> Dict[str, Any]:
        """
        Get analytics for HOD (department-wide)
        
        Args:
            department_id: Department ID
        
        Returns:
            Dict with department performance metrics
        """
        # Get all subjects in department
        subjects = await self.subject_repository.get_by_department(department_id)
        subject_ids = [s.id for s in subjects]
        
        # Get all assignments
        assignments = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.subject_id.in_(subject_ids)
        ).all()
        
        assignment_ids = [a.id for a in assignments]
        
        # Get exams
        exams = self.db.query(ExamModel).filter(
            ExamModel.subject_assignment_id.in_(assignment_ids)
        ).all()
        
        exam_ids = [e.id for e in exams]
        
        # Get marks
        marks = self.db.query(MarkModel).filter(
            MarkModel.exam_id.in_(exam_ids)
        ).all()
        
        # Calculate department statistics
        if marks:
            total_marks = sum(float(m.marks_obtained) for m in marks)
            avg_marks = total_marks / len(marks)
        else:
            total_marks = 0
            avg_marks = 0
        
        # Per subject statistics
        subject_stats = {}
        for subject in subjects:
            subject_assignments = [a for a in assignments if a.subject_id == subject.id]
            subject_assignment_ids = [a.id for a in subject_assignments]
            subject_exams = [e for e in exams if e.subject_assignment_id in subject_assignment_ids]
            subject_exam_ids = [e.id for e in subject_exams]
            subject_marks = [m for m in marks if m.exam_id in subject_exam_ids]
            
            if subject_marks:
                subject_total = sum(float(m.marks_obtained) for m in subject_marks)
                subject_avg = subject_total / len(subject_marks)
                subject_stats[subject.code] = {
                    "name": subject.name,
                    "total_marks_entries": len(subject_marks),
                    "average_marks": round(subject_avg, 2),
                    "exams_count": len(subject_exams)
                }
        
        return {
            "department_id": department_id,
            "total_subjects": len(subjects),
            "total_classes": len(set(a.class_id for a in assignments)),
            "total_exams": len(exams),
            "total_marks_entries": len(marks),
            "department_average": round(avg_marks, 2),
            "subject_statistics": subject_stats
        }
    
    async def calculate_co_attainment(
        self,
        subject_id: int,
        exam_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate CO (Course Outcome) attainment for a subject
        
        Args:
            subject_id: Subject ID
            exam_type: Optional exam type filter
        
        Returns:
            Dict with CO attainment percentages
        """
        # Get subject
        subject = await self.subject_repository.get_by_id(subject_id)
        if not subject:
            raise EntityNotFoundError("Subject", subject_id)
        
        # Get COs for subject
        cos = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.subject_id == subject_id
        ).all()
        
        # Get assignments
        assignments = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.subject_id == subject_id
        ).all()
        assignment_ids = [a.id for a in assignments]
        
        # Get exams
        exams_query = self.db.query(ExamModel).filter(
            ExamModel.subject_assignment_id.in_(assignment_ids)
        )
        
        if exam_type:
            exams_query = exams_query.filter(ExamModel.exam_type == exam_type)
        
        exams = exams_query.all()
        exam_ids = [e.id for e in exams]
        
        # Get questions with CO mappings
        questions = self.db.query(QuestionModel).filter(
            QuestionModel.exam_id.in_(exam_ids)
        ).all()
        
        question_ids = [q.id for q in questions]
        
        # Get question-CO mappings
        question_co_mappings = self.db.query(QuestionCOMappingModel).filter(
            QuestionCOMappingModel.question_id.in_(question_ids)
        ).all()
        
        # Get marks
        marks = self.db.query(MarkModel).filter(
            MarkModel.question_id.in_(question_ids)
        ).all()
        
        # Calculate CO attainment
        co_attainment = {}
        for co in cos:
            # Get questions mapped to this CO
            co_question_ids = [
                qcm.question_id for qcm in question_co_mappings
                if qcm.co_id == co.id
            ]
            
            # Get marks for these questions
            co_marks = [m for m in marks if m.question_id in co_question_ids]
            
            if co_marks:
                # Calculate total marks obtained vs total possible
                total_obtained = sum(float(m.marks_obtained) for m in co_marks)
                
                # Get question max marks
                co_questions = [q for q in questions if q.id in co_question_ids]
                total_possible = sum(float(q.marks_per_question) for q in co_questions)
                
                if total_possible > 0:
                    attainment_pct = (total_obtained / total_possible) * 100
                    co_attainment[co.code] = {
                        "code": co.code,
                        "title": co.title,
                        "attainment_percentage": round(attainment_pct, 2),
                        "target_attainment": float(co.target_attainment),
                        "status": "achieved" if attainment_pct >= float(co.target_attainment) else "not_achieved",
                        "total_obtained": round(total_obtained, 2),
                        "total_possible": round(total_possible, 2)
                    }
        
        return {
            "subject_id": subject_id,
            "subject_code": subject.code,
            "exam_type": exam_type or "all",
            "co_attainment": co_attainment
        }
    
    async def calculate_po_attainment(
        self,
        department_id: int,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculate PO (Program Outcome) attainment for a department
        
        Args:
            department_id: Department ID
            subject_id: Optional subject filter
        
        Returns:
            Dict with PO attainment percentages
        """
        # Get POs for department
        pos = self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.department_id == department_id
        ).all()
        
        # Get subjects
        if subject_id:
            subjects = [await self.subject_repository.get_by_id(subject_id)]
        else:
            subjects = await self.subject_repository.get_by_department(department_id)
        
        subject_ids = [s.id for s in subjects]
        
        # Get COs for these subjects
        cos = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.subject_id.in_(subject_ids)
        ).all()
        co_ids = [co.id for co in cos]
        
        # Get CO-PO mappings
        co_po_mappings = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.co_id.in_(co_ids)
        ).all()
        
        # Calculate PO attainment from CO attainments
        po_attainment = {}
        for po in pos:
            # Get COs mapped to this PO
            po_co_ids = [
                cpm.co_id for cpm in co_po_mappings
                if cpm.po_id == po.id
            ]
            
            # Get CO attainments (simplified - would need full calculation)
            po_attainment[po.code] = {
                "code": po.code,
                "title": po.title,
                "type": po.type,
                "target_attainment": float(po.target_attainment),
                "mapped_cos_count": len(po_co_ids),
                "attainment_percentage": 0.0,  # Would calculate from CO attainments
                "status": "pending"
            }
        
        return {
            "department_id": department_id,
            "subject_id": subject_id,
            "po_attainment": po_attainment
        }

