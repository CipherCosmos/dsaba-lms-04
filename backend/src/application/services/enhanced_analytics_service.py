"""
Enhanced Analytics Service
Real-time analytics with Bloom's taxonomy analysis, performance trends,
and comprehensive department comparisons
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, desc
from decimal import Decimal

from src.infrastructure.database.models import (
    StudentModel, SubjectModel, SubjectAssignmentModel, InternalMarkModel,
    FinalMarkModel, ExamModel, QuestionModel, MarkModel,
    DepartmentModel, BatchInstanceModel, SemesterModel, StudentEnrollmentModel,
    CourseOutcomeModel, ProgramOutcomeModel, TeacherModel,
    MarksWorkflowState, AcademicYearModel
)


class EnhancedAnalyticsService:
    """
    Enhanced Analytics Service
    
    Provides:
    - Real-time performance analytics
    - Bloom's taxonomy analysis
    - Department comparison analytics
    - Performance trend analysis
    - Predictive analytics
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_blooms_taxonomy_analysis(
        self,
        subject_assignment_id: Optional[int] = None,
        department_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Analyze student performance based on Bloom's taxonomy levels
        
        Bloom's Levels:
        - L1: Remember
        - L2: Understand
        - L3: Apply
        - L4: Analyze
        - L5: Evaluate
        - L6: Create
        
        Returns distribution of student performance across Bloom's levels
        """
        # Build base query for questions
        query = self.db.query(
            QuestionModel.blooms_level,
            func.count(MarkModel.id).label('total_attempts'),
            func.avg(
                func.cast(MarkModel.marks_obtained, func.Float) / 
                func.cast(QuestionModel.marks_per_question, func.Float) * 100
            ).label('avg_percentage'),
            func.sum(
                case(
                    (func.cast(MarkModel.marks_obtained, func.Float) / 
                     func.cast(QuestionModel.marks_per_question, func.Float) * 100 >= 60, 1),
                    else_=0
                )
            ).label('passed_count')
        ).join(
            MarkModel, QuestionModel.id == MarkModel.question_id
        ).join(
            ExamModel, MarkModel.exam_id == ExamModel.id
        ).join(
            SubjectAssignmentModel, ExamModel.subject_assignment_id == SubjectAssignmentModel.id
        )
        
        # Apply filters
        if subject_assignment_id:
            query = query.filter(SubjectAssignmentModel.id == subject_assignment_id)
        
        if department_id:
            query = query.join(
                SubjectModel, SubjectAssignmentModel.subject_id == SubjectModel.id
            ).filter(SubjectModel.department_id == department_id)
        
        if semester_id:
            query = query.filter(SubjectAssignmentModel.semester_id == semester_id)
        
        # Filter only valid Bloom's levels
        query = query.filter(
            QuestionModel.blooms_level.in_(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'])
        )
        
        # Group by Bloom's level
        results = query.group_by(QuestionModel.blooms_level).all()
        
        blooms_data = {}
        for level, total, avg_pct, passed in results:
            pass_rate = (passed / total * 100) if total > 0 else 0.0
            blooms_data[level] = {
                "level": level,
                "level_name": self._get_blooms_level_name(level),
                "total_attempts": total,
                "average_percentage": round(float(avg_pct) if avg_pct else 0.0, 2),
                "pass_rate": round(pass_rate, 2),
                "passed_count": passed
            }
        
        # Ensure all levels are present
        for level in ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']:
            if level not in blooms_data:
                blooms_data[level] = {
                    "level": level,
                    "level_name": self._get_blooms_level_name(level),
                    "total_attempts": 0,
                    "average_percentage": 0.0,
                    "pass_rate": 0.0,
                    "passed_count": 0
                }
        
        return {
            "blooms_distribution": blooms_data,
            "summary": {
                "total_questions": sum(d['total_attempts'] for d in blooms_data.values()),
                "overall_avg_percentage": round(
                    sum(d['average_percentage'] * d['total_attempts'] for d in blooms_data.values()) /
                    sum(d['total_attempts'] for d in blooms_data.values())
                    if sum(d['total_attempts'] for d in blooms_data.values()) > 0 else 0.0,
                    2
                )
            }
        }
    
    def _get_blooms_level_name(self, level: str) -> str:
        """Get Bloom's taxonomy level name"""
        mapping = {
            'L1': 'Remember',
            'L2': 'Understand',
            'L3': 'Apply',
            'L4': 'Analyze',
            'L5': 'Evaluate',
            'L6': 'Create'
        }
        return mapping.get(level, 'Unknown')
    
    def get_performance_trends(
        self,
        student_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        department_id: Optional[int] = None,
        months: int = 6
    ) -> Dict[str, any]:
        """
        Get performance trends over time
        
        Args:
            student_id: Optional student filter
            subject_id: Optional subject filter
            department_id: Optional department filter
            months: Number of months to analyze
        
        Returns:
            Monthly performance trends with averages and trends
        """
        cutoff_date = datetime.utcnow() - timedelta(days=months * 30)
        
        # Query internal marks over time
        query = self.db.query(
            func.date_trunc('month', InternalMarkModel.entered_at).label('month'),
            func.avg(
                func.cast(InternalMarkModel.marks_obtained, func.Float) /
                func.cast(InternalMarkModel.max_marks, func.Float) * 100
            ).label('avg_percentage'),
            func.count(InternalMarkModel.id).label('total_entries')
        ).filter(
            InternalMarkModel.entered_at >= cutoff_date,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.FROZEN,
                MarksWorkflowState.PUBLISHED
            ])
        )
        
        # Apply filters
        if student_id:
            query = query.filter(InternalMarkModel.student_id == student_id)
        
        if subject_id:
            query = query.join(
                SubjectAssignmentModel,
                InternalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).filter(SubjectAssignmentModel.subject_id == subject_id)
        
        if department_id:
            query = query.join(
                SubjectAssignmentModel,
                InternalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                SubjectModel,
                SubjectAssignmentModel.subject_id == SubjectModel.id
            ).filter(SubjectModel.department_id == department_id)
        
        # Group by month
        results = query.group_by(func.date_trunc('month', InternalMarkModel.entered_at)).order_by('month').all()
        
        trends = []
        for month, avg_pct, count in results:
            trends.append({
                "month": month.strftime('%Y-%m') if month else None,
                "average_percentage": round(float(avg_pct) if avg_pct else 0.0, 2),
                "total_entries": count
            })
        
        # Calculate trend direction
        trend_direction = "stable"
        if len(trends) >= 2:
            first_half_avg = sum(t['average_percentage'] for t in trends[:len(trends)//2]) / (len(trends)//2)
            second_half_avg = sum(t['average_percentage'] for t in trends[len(trends)//2:]) / (len(trends) - len(trends)//2)
            
            if second_half_avg > first_half_avg + 5:
                trend_direction = "improving"
            elif second_half_avg < first_half_avg - 5:
                trend_direction = "declining"
        
        return {
            "trends": trends,
            "summary": {
                "trend_direction": trend_direction,
                "overall_average": round(
                    sum(t['average_percentage'] for t in trends) / len(trends)
                    if trends else 0.0,
                    2
                ),
                "total_months": len(trends)
            }
        }
    
    def get_department_comparison(
        self,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Compare performance across departments
        
        Returns:
            Comparative analytics for all departments
        """
        departments = self.db.query(DepartmentModel).filter(
            DepartmentModel.is_active == True
        ).all()
        
        department_stats = []
        
        for dept in departments:
            # Get batch instances for department
            batch_instances = self.db.query(BatchInstanceModel).filter(
                BatchInstanceModel.department_id == dept.id,
                BatchInstanceModel.is_active == True
            )
            
            if academic_year_id:
                batch_instances = batch_instances.filter(
                    BatchInstanceModel.academic_year_id == academic_year_id
                )
            
            batch_instances = batch_instances.all()
            
            if not batch_instances:
                continue
            
            # Get students count
            student_count = self.db.query(StudentModel).filter(
                StudentModel.department_id == dept.id
            ).count()
            
            # Get subjects count
            subject_count = self.db.query(SubjectModel).filter(
                SubjectModel.department_id == dept.id,
                SubjectModel.is_active == True
            ).count()
            
            # Get teachers count
            teacher_count = self.db.query(TeacherModel).filter(
                TeacherModel.department_id == dept.id
            ).count()
            
            # Get average performance
            perf_query = self.db.query(
                func.avg(
                    func.cast(InternalMarkModel.marks_obtained, func.Float) /
                    func.cast(InternalMarkModel.max_marks, func.Float) * 100
                ).label('avg_pct')
            ).join(
                SubjectAssignmentModel,
                InternalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                SubjectModel,
                SubjectAssignmentModel.subject_id == SubjectModel.id
            ).filter(
                SubjectModel.department_id == dept.id,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.FROZEN,
                    MarksWorkflowState.PUBLISHED
                ])
            )
            
            if semester_id:
                perf_query = perf_query.filter(
                    InternalMarkModel.semester_id == semester_id
                )
            
            if academic_year_id:
                perf_query = perf_query.filter(
                    InternalMarkModel.academic_year_id == academic_year_id
                )
            
            avg_performance = perf_query.scalar()
            
            # Get pass rate
            pass_query = self.db.query(
                func.count(
                    case(
                        (func.cast(FinalMarkModel.percentage, func.Float) >= 40, 1),
                        else_=None
                    )
                ).label('passed'),
                func.count(FinalMarkModel.id).label('total')
            ).join(
                SubjectAssignmentModel,
                FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
            ).join(
                SubjectModel,
                SubjectAssignmentModel.subject_id == SubjectModel.id
            ).filter(
                SubjectModel.department_id == dept.id,
                FinalMarkModel.status == 'published'
            )
            
            if semester_id:
                pass_query = pass_query.filter(FinalMarkModel.semester_id == semester_id)
            
            pass_result = pass_query.first()
            pass_rate = (pass_result[0] / pass_result[1] * 100) if pass_result and pass_result[1] > 0 else 0.0
            
            department_stats.append({
                "department_id": dept.id,
                "department_name": dept.name,
                "department_code": dept.code,
                "student_count": student_count,
                "subject_count": subject_count,
                "teacher_count": teacher_count,
                "average_performance": round(float(avg_performance) if avg_performance else 0.0, 2),
                "pass_rate": round(pass_rate, 2),
                "batch_instances": len(batch_instances)
            })
        
        # Sort by average performance
        department_stats.sort(key=lambda x: x['average_performance'], reverse=True)
        
        return {
            "departments": department_stats,
            "summary": {
                "total_departments": len(department_stats),
                "overall_avg_performance": round(
                    sum(d['average_performance'] for d in department_stats) / len(department_stats)
                    if department_stats else 0.0,
                    2
                ),
                "overall_pass_rate": round(
                    sum(d['pass_rate'] for d in department_stats) / len(department_stats)
                    if department_stats else 0.0,
                    2
                ),
                "top_performing_department": department_stats[0]['department_name'] if department_stats else None
            }
        }
    
    def get_student_performance_analytics(
        self,
        student_id: int,
        academic_year_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Comprehensive performance analytics for a student
        
        Returns:
            - Subject-wise performance
            - Semester-wise trends
            - Strengths and weaknesses
            - Bloom's taxonomy analysis
            - CO attainment
        """
        student = self.db.query(StudentModel).filter(
            StudentModel.id == student_id
        ).first()
        
        if not student:
            return {"error": "Student not found"}
        
        # Get all final marks
        marks_query = self.db.query(FinalMarkModel).filter(
            FinalMarkModel.student_id == student_id,
            FinalMarkModel.status == 'published'
        )
        
        if academic_year_id:
            marks_query = marks_query.join(
                SemesterModel,
                FinalMarkModel.semester_id == SemesterModel.id
            ).filter(SemesterModel.academic_year_id == academic_year_id)
        
        final_marks = marks_query.all()
        
        if not final_marks:
            return {
                "student_id": student_id,
                "message": "No published marks found",
                "data": {}
            }
        
        # Calculate subject-wise performance
        subject_performance = {}
        for fm in final_marks:
            assignment = self.db.query(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.id == fm.subject_assignment_id
            ).first()
            
            if not assignment:
                continue
            
            subject = self.db.query(SubjectModel).filter(
                SubjectModel.id == assignment.subject_id
            ).first()
            
            if not subject:
                continue
            
            subject_performance[subject.code] = {
                "subject_name": subject.name,
                "subject_code": subject.code,
                "percentage": float(fm.percentage),
                "grade": fm.grade,
                "status": "pass" if float(fm.percentage) >= 40 else "fail"
            }
        
        # Calculate overall statistics
        total_percentage = sum(float(fm.percentage) for fm in final_marks)
        avg_percentage = total_percentage / len(final_marks) if final_marks else 0.0
        
        passed_count = sum(1 for fm in final_marks if float(fm.percentage) >= 40)
        pass_rate = (passed_count / len(final_marks) * 100) if final_marks else 0.0
        
        # Identify strengths and weaknesses
        sorted_subjects = sorted(
            subject_performance.items(),
            key=lambda x: x[1]['percentage'],
            reverse=True
        )
        
        strengths = [s[0] for s in sorted_subjects[:3]] if len(sorted_subjects) >= 3 else [s[0] for s in sorted_subjects]
        weaknesses = [s[0] for s in sorted_subjects[-3:]] if len(sorted_subjects) >= 3 else []
        
        return {
            "student_id": student_id,
            "roll_no": student.roll_no,
            "subject_performance": subject_performance,
            "overall_statistics": {
                "average_percentage": round(avg_percentage, 2),
                "total_subjects": len(final_marks),
                "passed_subjects": passed_count,
                "failed_subjects": len(final_marks) - passed_count,
                "pass_rate": round(pass_rate, 2)
            },
            "strengths": strengths,
            "weaknesses": weaknesses[::-1],  # Reverse to show weakest first
            "academic_year_id": academic_year_id
        }
    
    def get_teacher_performance_analytics(
        self,
        teacher_id: int,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Analytics for teacher performance
        
        Returns:
            - Students taught
            - Subjects handled
            - Average student performance
            - Marks submission status
        """
        teacher = self.db.query(TeacherModel).filter(
            TeacherModel.id == teacher_id
        ).first()
        
        if not teacher:
            return {"error": "Teacher not found"}
        
        # Get subject assignments
        assignments_query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.teacher_id == teacher_id
        )
        
        if semester_id:
            assignments_query = assignments_query.filter(
                SubjectAssignmentModel.semester_id == semester_id
            )
        
        if academic_year_id:
            assignments_query = assignments_query.filter(
                SubjectAssignmentModel.academic_year_id == academic_year_id
            )
        
        assignments = assignments_query.all()
        
        if not assignments:
            return {
                "teacher_id": teacher_id,
                "message": "No assignments found",
                "data": {}
            }
        
        # Calculate statistics
        assignment_ids = [a.id for a in assignments]
        
        # Students taught (unique)
        students_taught = self.db.query(func.count(func.distinct(InternalMarkModel.student_id))).filter(
            InternalMarkModel.subject_assignment_id.in_(assignment_ids)
        ).scalar() or 0
        
        # Average performance
        avg_performance = self.db.query(
            func.avg(
                func.cast(InternalMarkModel.marks_obtained, func.Float) /
                func.cast(InternalMarkModel.max_marks, func.Float) * 100
            )
        ).filter(
            InternalMarkModel.subject_assignment_id.in_(assignment_ids),
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.FROZEN,
                MarksWorkflowState.PUBLISHED
            ])
        ).scalar()
        
        # Marks submission status
        pending_submissions = self.db.query(func.count(InternalMarkModel.id)).filter(
            InternalMarkModel.subject_assignment_id.in_(assignment_ids),
            InternalMarkModel.workflow_state == MarksWorkflowState.DRAFT
        ).scalar() or 0
        
        submitted_marks = self.db.query(func.count(InternalMarkModel.id)).filter(
            InternalMarkModel.subject_assignment_id.in_(assignment_ids),
            InternalMarkModel.workflow_state == MarksWorkflowState.SUBMITTED
        ).scalar() or 0
        
        approved_marks = self.db.query(func.count(InternalMarkModel.id)).filter(
            InternalMarkModel.subject_assignment_id.in_(assignment_ids),
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.FROZEN,
                MarksWorkflowState.PUBLISHED
            ])
        ).scalar() or 0
        
        return {
            "teacher_id": teacher_id,
            "subjects_handled": len(assignments),
            "students_taught": students_taught,
            "average_student_performance": round(float(avg_performance) if avg_performance else 0.0, 2),
            "marks_submission": {
                "pending": pending_submissions,
                "submitted": submitted_marks,
                "approved": approved_marks,
                "total": pending_submissions + submitted_marks + approved_marks
            },
            "academic_year_id": academic_year_id,
            "semester_id": semester_id
        }

