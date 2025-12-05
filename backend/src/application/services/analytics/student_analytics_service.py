"""
Student Analytics Service
Provides detailed internal marks analysis for students
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from decimal import Decimal
from datetime import datetime, date

from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.models import (
    StudentModel,
    InternalMarkModel,
    SubjectModel,
    SubjectAssignmentModel,
    SemesterModel,
    CourseOutcomeModel,
    StudentEnrollmentModel,
    MarksWorkflowState
)
from .analytics_utils import calculate_grade, calculate_percentage, calculate_sgpa


class StudentAnalyticsService:
    """Enhanced analytics service focused on detailed internal marks analysis"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_student_dashboard(
        self,
        student_id: int,
        semester_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive student performance dashboard
        
        Args:
            student_id: Student ID
            semester_id: Optional semester filter (defaults to current semester)
        
        Returns:
            Complete dashboard data with all analytics
        """
        student = self.db.query(StudentModel).filter(
            StudentModel.id == student_id
        ).first()
        
        if not student:
            raise EntityNotFoundError(f"Student {student_id} not found")
        
        # Use current semester if not specified
        if not semester_id:
            semester_id = student.current_semester_id
        
        # Get all analytics
        overview = await self.get_performance_overview(student_id, semester_id)
        component_breakdown = await self.get_component_wise_breakdown(student_id, semester_id)
        subject_performance = await self.get_subject_wise_performance(student_id, semester_id)
        co_analysis = await self.get_co_attainment_status(student_id, semester_id)
        trends = await self.get_performance_trends(student_id)
        strengths_weaknesses = await self.identify_strengths_weaknesses(student_id, semester_id)
        
        return {
            "student_info": {
                "id": student.id,
                "roll_no": student.roll_no,
                "current_year": student.current_year_level,
                "current_semester_id": semester_id,
                "is_detained": student.is_detained,
                "backlog_count": student.backlog_count
            },
            "overview": overview,
            "component_breakdown": component_breakdown,
            "subject_performance": subject_performance,
            "co_attainment": co_analysis,
            "trends": trends,
            "strengths_weaknesses": strengths_weaknesses
        }
    
    async def get_performance_overview(
        self,
        student_id: int,
        semester_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get overall performance metrics for a student
        
        Returns:
            Overall stats, SGPA, percentage, rank
        """
        query = self.db.query(InternalMarkModel).filter(
            InternalMarkModel.student_id == student_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        )
        
        if semester_id:
            query = query.filter(InternalMarkModel.semester_id == semester_id)
        
        marks = query.all()
        
        if not marks:
            return {
                "total_marks_obtained": 0,
                "total_max_marks": 0,
                "percentage": 0.0,
                "total_assessments": 0,
                "sgpa": 0.0,
                "grade": "N/A"
            }
        
        total_obtained = sum(m.marks_obtained for m in marks)
        total_max = sum(m.max_marks for m in marks)
        percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
        
        # Calculate SGPA (simplified - 10-point scale)
        sgpa = (percentage / 10) if percentage > 0 else 0
        
        # Determine grade
        grade = calculate_grade(percentage)
        
        # Get class average for comparison
        class_stats = await self._get_class_statistics(student_id, semester_id)
        
        return {
            "total_marks_obtained": round(total_obtained, 2),
            "total_max_marks": total_max,
            "percentage": round(percentage, 2),
            "total_assessments": len(marks),
            "sgpa": round(sgpa, 2),
            "grade": grade,
            "class_average": class_stats.get("average_percentage", 0),
            "rank": class_stats.get("rank", None),
            "total_students": class_stats.get("total_students", 0)
        }
    
    async def get_component_wise_breakdown(
        self,
        student_id: int,
        semester_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get performance breakdown by assessment component (IA1, IA2, Quiz, etc.)
        
        Returns:
            Component-wise statistics
        """
        query = self.db.query(
            InternalMarkModel.component_type,
            func.sum(InternalMarkModel.marks_obtained).label('obtained'),
            func.sum(InternalMarkModel.max_marks).label('maximum'),
            func.count(InternalMarkModel.id).label('count')
        ).filter(
            InternalMarkModel.student_id == student_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        )
        
        if semester_id:
            query = query.filter(InternalMarkModel.semester_id == semester_id)
        
        query = query.group_by(InternalMarkModel.component_type)
        results = query.all()
        
        breakdown = {}
        for result in results:
            component = result.component_type
            obtained = float(result.obtained) if result.obtained else 0
            maximum = float(result.maximum) if result.maximum else 0
            percentage = (obtained / maximum * 100) if maximum > 0 else 0
            
            breakdown[component] = {
                "obtained": round(obtained, 2),
                "maximum": maximum,
                "percentage": round(percentage, 2),
                "count": result.count,
                "grade": calculate_grade(percentage)
            }
        
        return breakdown
    
    async def get_subject_wise_performance(
        self,
        student_id: int,
        semester_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get performance breakdown by subject
        
        Returns:
            List of subject performance data
        """
        # Get enrollments
        enrollments_query = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.student_id == student_id
        )
        
        if semester_id:
            enrollments_query = enrollments_query.filter(
                StudentEnrollmentModel.semester_id == semester_id
            )
        
        enrollments = enrollments_query.all()
        subject_performance = []
        
        for enrollment in enrollments:
            # Get subject
            subject_assignment = self.db.query(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.id == enrollment.subject_assignment_id
            ).first()
            
            if not subject_assignment:
                continue
            
            subject = self.db.query(SubjectModel).filter(
                SubjectModel.id == subject_assignment.subject_id
            ).first()
            
            # Get marks for this subject
            marks = self.db.query(InternalMarkModel).filter(
                InternalMarkModel.student_id == student_id,
                InternalMarkModel.subject_assignment_id == subject_assignment.id,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.APPROVED,
                    MarksWorkflowState.PUBLISHED
                ])
            ).all()
            
            if not marks:
                continue
            
            total_obtained = sum(m.marks_obtained for m in marks)
            total_max = sum(m.max_marks for m in marks)
            percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
            
            # Component breakdown for this subject
            components = {}
            for mark in marks:
                comp = mark.component_type
                if comp not in components:
                    components[comp] = {
                        "obtained": 0,
                        "maximum": 0
                    }
                components[comp]["obtained"] += mark.marks_obtained
                components[comp]["maximum"] += mark.max_marks
            
            subject_performance.append({
                "subject_id": subject.id,
                "subject_code": subject.code,
                "subject_name": subject.name,
                "credits": subject.credits,
                "obtained": round(total_obtained, 2),
                "maximum": total_max,
                "percentage": round(percentage, 2),
                "grade": calculate_grade(percentage),
                "assessments_count": len(marks),
                "components": components
            })
        
        # Sort by percentage descending
        subject_performance.sort(key=lambda x: x['percentage'], reverse=True)
        
        return subject_performance
    
    async def get_co_attainment_status(
        self,
        student_id: int,
        semester_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get Course Outcome attainment status for student
        
        Returns:
            CO-wise attainment percentages
        """
        # Get student's marks with CO mappings
        # Get student's marks with CO mappings
        # We need question-level marks for CO attainment
        from src.infrastructure.database.models import MarkModel
        
        marks_query = self.db.query(MarkModel).filter(
            MarkModel.student_id == student_id
        )
        
        # Note: MarkModel doesn't have semester_id directly, we need to join with Exam
        if semester_id:
            from src.infrastructure.database.models import ExamModel, SubjectAssignmentModel
            marks_query = marks_query.join(ExamModel).join(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.semester_id == semester_id
            )
        
        marks = marks_query.all()
        
        # Get CO mappings for questions
        from src.infrastructure.database.models import QuestionModel, QuestionCOMappingModel
        
        co_performance = {}
        
        for mark in marks:
            if not mark.question_id:
                continue
            
            # Get CO mappings for this question
            co_mappings = self.db.query(QuestionCOMappingModel).filter(
                QuestionCOMappingModel.question_id == mark.question_id
            ).all()
            
            for mapping in co_mappings:
                co_id = mapping.co_id
                
                if co_id not in co_performance:
                    co_performance[co_id] = {
                        "obtained": 0,
                        "maximum": 0,
                        "count": 0
                    }
                
                # Calculate weight contribution
                weight = float(mapping.weight_pct) / 100.0
                
                # Get question max marks
                question = self.db.query(QuestionModel).filter(QuestionModel.id == mark.question_id).first()
                q_max = float(question.marks_per_question) if question else 0
                
                co_performance[co_id]["obtained"] += float(mark.marks_obtained) * weight
                co_performance[co_id]["maximum"] += q_max * weight
                co_performance[co_id]["count"] += 1
        
        # Calculate attainment percentages
        co_details = []
        total_cos = len(co_performance)
        cos_attained = 0
        attainment_threshold = 60.0  # 60% threshold for attainment
        
        for co_id, data in co_performance.items():
            percentage = (data["obtained"] / data["maximum"] * 100) if data["maximum"] > 0 else 0
            is_attained = percentage >= attainment_threshold
            
            if is_attained:
                cos_attained += 1
            
            # Get CO details
            from src.infrastructure.database.models import CourseOutcomeModel
            co = self.db.query(CourseOutcomeModel).filter(
                CourseOutcomeModel.id == co_id
            ).first()
            
            co_details.append({
                "co_id": co_id,
                "co_code": co.code if co else f"CO{co_id}",
                "obtained": round(data["obtained"], 2),
                "maximum": data["maximum"],
                "percentage": round(percentage, 2),
                "is_attained": is_attained,
                "assessments": data["count"]
            })
        
        # Sort by CO code
        co_details.sort(key=lambda x: x["co_code"])
        
        overall_attainment = (cos_attained / total_cos * 100) if total_cos > 0 else 0
        
        return {
            "total_cos": total_cos,
            "cos_attained": cos_attained,
            "attainment_percentage": round(overall_attainment, 2),
            "threshold": attainment_threshold,
            "co_details": co_details
        }
    
    async def get_performance_trends(
        self,
        student_id: int,
        num_semesters: int = 4
    ) -> Dict[str, Any]:
        """
        Get performance trends over semesters
        
        Returns:
            Semester-wise performance data
        """
        # Get student's semesters
        student = self.db.query(StudentModel).filter(
            StudentModel.id == student_id
        ).first()
        
        # Get marks grouped by semester
        semester_performance = []
        
        query = self.db.query(
            InternalMarkModel.semester_id,
            func.sum(InternalMarkModel.marks_obtained).label('obtained'),
            func.sum(InternalMarkModel.max_marks).label('maximum')
        ).filter(
            InternalMarkModel.student_id == student_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        ).group_by(InternalMarkModel.semester_id).all()
        
        for result in query:
            obtained = float(result.obtained) if result.obtained else 0
            maximum = float(result.maximum) if result.maximum else 0
            percentage = (obtained / maximum * 100) if maximum > 0 else 0
            
            # Get semester info
            semester = self.db.query(SemesterModel).filter(
                SemesterModel.id == result.semester_id
            ).first()
            
            semester_performance.append({
                "semester_id": result.semester_id,
                "semester_no": semester.semester_no if semester else 0,
                "academic_year_level": semester.academic_year_level if semester else 0,
                "percentage": round(percentage, 2),
                "grade": calculate_grade(percentage)
            })
        
        # Sort by semester number
        semester_performance.sort(key=lambda x: x['semester_no'])
        
        return {
            "semesters": semester_performance,
            "trend": self._calculate_trend(semester_performance)
        }
    
    async def identify_strengths_weaknesses(
        self,
        student_id: int,
        semester_id: Optional[int] = None,
        threshold_strong: float = 75.0,
        threshold_weak: float = 50.0
    ) -> Dict[str, Any]:
        """
        Identify student's strengths and weaknesses
        
        Returns:
            Strong and weak areas with suggestions
        """
        subject_performance = await self.get_subject_wise_performance(student_id, semester_id)
        component_breakdown = await self.get_component_wise_breakdown(student_id, semester_id)
        
        strengths = []
        weaknesses = []
        
        # Analyze subjects
        for subject in subject_performance:
            if subject['percentage'] >= threshold_strong:
                strengths.append({
                    "type": "subject",
                    "name": subject['subject_name'],
                    "percentage": subject['percentage'],
                    "grade": subject['grade']
                })
            elif subject['percentage'] < threshold_weak:
                weaknesses.append({
                    "type": "subject",
                    "name": subject['subject_name'],
                    "percentage": subject['percentage'],
                    "grade": subject['grade'],
                    "suggestion": f"Focus on improving {subject['subject_name']}. Consider extra tutoring or study groups."
                })
        
        # Analyze components
        for component, data in component_breakdown.items():
            if data['percentage'] >= threshold_strong:
                strengths.append({
                    "type": "component",
                    "name": component.upper(),
                    "percentage": data['percentage'],
                    "grade": data['grade']
                })
            elif data['percentage'] < threshold_weak:
                weaknesses.append({
                    "type": "component",
                    "name": component.upper(),
                    "percentage": data['percentage'],
                    "grade": data['grade'],
                    "suggestion": f"Improve {component.upper()} performance through regular practice."
                })
        
        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "overall_recommendation": self._generate_recommendation(strengths, weaknesses)
        }
    
    # Helper methods
    
    async def _get_class_statistics(
        self,
        student_id: int,
        semester_id: Optional[int]
    ) -> Dict[str, Any]:
        """Get class statistics for comparison"""
        student = self.db.query(StudentModel).filter(
            StudentModel.id == student_id
        ).first()
        
        if not student:
            return {}
        
        # Get all students in same batch instance
        students = self.db.query(StudentModel).filter(
            StudentModel.batch_instance_id == student.batch_instance_id
        ).all()
        
        # Calculate each student's percentage
        student_percentages = []
        for s in students:
            query = self.db.query(
                func.sum(InternalMarkModel.marks_obtained).label('obtained'),
                func.sum(InternalMarkModel.max_marks).label('maximum')
            ).filter(
                InternalMarkModel.student_id == s.id,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.APPROVED,
                    MarksWorkflowState.PUBLISHED
                ])
            )
            
            if semester_id:
                query = query.filter(InternalMarkModel.semester_id == semester_id)
            
            result = query.first()
            if result and result.obtained and result.maximum:
                percentage = (float(result.obtained) / float(result.maximum) * 100)
                student_percentages.append((s.id, percentage))
        
        if not student_percentages:
            return {}
        
        # Sort by percentage
        student_percentages.sort(key=lambda x: x[1], reverse=True)
        
        # Find rank
        rank = None
        for idx, (sid, _) in enumerate(student_percentages, 1):
            if sid == student_id:
                rank = idx
                break
        
        # Calculate average
        avg_percentage = sum(p for _, p in student_percentages) / len(student_percentages)
        
        return {
            "average_percentage": round(avg_percentage, 2),
            "rank": rank,
            "total_students": len(students)
        }
    
    def _calculate_trend(self, semester_performance: List[Dict]) -> str:
        """Calculate if performance is improving, declining, or stable"""
        if len(semester_performance) < 2:
            return "insufficient_data"
        
        recent = semester_performance[-3:]  # Last 3 semesters
        if len(recent) < 2:
            return "insufficient_data"
        
        # Check if improving (each semester better than previous)
        improving = all(recent[i]['percentage'] < recent[i+1]['percentage'] 
                       for i in range(len(recent)-1))
        
        # Check if declining
        declining = all(recent[i]['percentage'] > recent[i+1]['percentage'] 
                       for i in range(len(recent)-1))
        
        if improving:
            return "improving"
        elif declining:
            return "declining"
        else:
            return "stable"
    
    def _generate_recommendation(self, strengths: List, weaknesses: List) -> str:
        """Generate overall recommendation based on analysis"""
        if len(weaknesses) == 0:
            return "Excellent performance! Keep up the good work across all subjects."
        elif len(weaknesses) > len(strengths):
            return "Focus on improving weak areas. Consider seeking help from faculty or peers for struggling subjects."
        else:
            return "Good overall performance with some areas needing improvement. Focus on weak components while maintaining strength in strong subjects."
