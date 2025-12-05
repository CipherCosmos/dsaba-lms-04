"""
Teacher Analytics Service
Provides class-level analysis and student insights for teachers
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from decimal import Decimal

from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.models import (
    TeacherModel,
    SubjectAssignmentModel,
    InternalMarkModel,
    StudentModel,
    SubjectModel,
    SectionModel,
    MarksWorkflowState
)
from .analytics_utils import calculate_grade, calculate_percentage, generate_at_risk_recommendation


class TeacherAnalyticsService:
    """Enhanced analytics for teachers focused on class and student insights"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_teacher_dashboard(
        self,
        teacher_id: int,
        subject_assignment_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive teacher dashboard
        
        Args:
            teacher_id: Teacher ID
            subject_assignment_id: Optional specific subject assignment
        
        Returns:
            Complete dashboard with class analytics
        """
        teacher = self.db.query(TeacherModel).filter(
            TeacherModel.id == teacher_id
        ).first()
        
        if not teacher:
            raise EntityNotFoundError(f"Teacher {teacher_id} not found")
        
        # Get assignments
        assignments_query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.teacher_id == teacher_id
        )
        
        if subject_assignment_id:
            assignments_query = assignments_query.filter(
                SubjectAssignmentModel.id == subject_assignment_id
            )
        
        assignments = assignments_query.all()
        
        # Get analytics for each assignment
        class_analytics = []
        for assignment in assignments:
            analytics = await self.get_class_performance(assignment.id)
            class_analytics.append({
                "assignment_id": assignment.id,
                "subject_id": assignment.subject_id,
                "semester_id": assignment.semester_id,
                **analytics
            })
        
        at_risk_students = await self.identify_at_risk_students(teacher_id)
        overall_stats = await self.get_overall_teaching_stats(teacher_id)
        
        return {
            "teacher_info": {
                "id": teacher.id,
                "total_classes": len(assignments),
            },
            "class_analytics": class_analytics,
            "at_risk_students": at_risk_students,
            "overall_stats": overall_stats
        }
    
    async def get_class_performance(
        self,
        subject_assignment_id: int
    ) -> Dict[str, Any]:
        """
        Get performance overview for a class
        
        Returns:
            Class statistics, distribution, top/bottom performers
        """
        # Get subject assignment details
        assignment = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == subject_assignment_id
        ).first()
        
        if not assignment:
            raise EntityNotFoundError(f"Subject assignment {subject_assignment_id} not found")
        
        # Get subject
        subject = self.db.query(SubjectModel).filter(
            SubjectModel.id == assignment.subject_id
        ).first()
        
        # Get all internal marks for this assignment
        marks = self.db.query(InternalMarkModel).filter(
            InternalMarkModel.subject_assignment_id == subject_assignment_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        ).all()
        
        if not marks:
            return {
                "subject_name": subject.name if subject else "Unknown",
                "total_students": 0,
                "statistics": {},
                "distribution": {},
                "top_performers": [],
                "bottom_performers": []
            }
        
        # Calculate per-student totals
        student_totals = {}
        for mark in marks:
            if mark.student_id not in student_totals:
                student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
            student_totals[mark.student_id]["obtained"] += mark.marks_obtained
            student_totals[mark.student_id]["maximum"] += mark.max_marks
        
        # Calculate percentages
        student_percentages = []
        for student_id, totals in student_totals.items():
            percentage = (totals["obtained"] / totals["maximum"] * 100) if totals["maximum"] > 0 else 0
            student = self.db.query(StudentModel).filter(StudentModel.id == student_id).first()
            student_percentages.append({
                "student_id": student_id,
                "roll_no": student.roll_no if student else "",
                "percentage": round(percentage, 2),
                "obtained": round(totals["obtained"], 2),
                "maximum": totals["maximum"]
            })
        
        # Sort by percentage
        student_percentages.sort(key=lambda x: x["percentage"], reverse=True)
        
        # Statistics
        percentages = [s["percentage"] for s in student_percentages]
        avg_percentage = sum(percentages) / len(percentages) if percentages else 0
        median_percentage = percentages[len(percentages) // 2] if percentages else 0
        
        # Distribution (grade-wise)
        distribution = {
            "O": len([p for p in percentages if p >= 90]),
            "A+": len([p for p in percentages if 80 <= p < 90]),
            "A": len([p for p in percentages if 70 <= p < 80]),
            "B+": len([p for p in percentages if 60 <= p < 70]),
            "B": len([p for p in percentages if 50 <= p < 60]),
            "C": len([p for p in percentages if 40 <= p < 50]),
            "F": len([p for p in percentages if p < 40])
        }
        
        # Pass/Fail
        passing = len([p for p in percentages if p >= 40])
        pass_percentage = (passing / len(percentages) * 100) if percentages else 0
        
        return {
            "subject_name": subject.name if subject else "Unknown",
            "subject_code": subject.code if subject else "",
            "total_students": len(student_totals),
            "statistics": {
                "average_percentage": round(avg_percentage, 2),
                "median_percentage": round(median_percentage, 2),
                "highest_percentage": percentages[0] if percentages else 0,
                "lowest_percentage": percentages[-1] if percentages else 0,
                "pass_percentage": round(pass_percentage, 2),
                "passing_students": passing,
                "failing_students": len(percentages) - passing
            },
            "distribution": distribution,
            "top_performers": student_percentages[:5],
            "bottom_performers": student_percentages[-5:][::-1]
        }
    
    async def get_component_analysis(
        self,
        subject_assignment_id: int
    ) -> Dict[str, Any]:
        """
        Analyze performance by component type
        
        Returns:
            Component-wise class statistics
        """
        # Get marks grouped by component
        results = self.db.query(
            InternalMarkModel.component_type,
            func.avg(InternalMarkModel.marks_obtained).label('avg_obtained'),
            func.avg(InternalMarkModel.max_marks).label('avg_max'),
            func.count(InternalMarkModel.id).label('count')
        ).filter(
            InternalMarkModel.subject_assignment_id == subject_assignment_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        ).group_by(InternalMarkModel.component_type).all()
        
        component_stats = {}
        for result in results:
            avg_percentage = (float(result.avg_obtained) / float(result.avg_max) * 100) if result.avg_max else 0
            component_stats[result.component_type] = {
                "average_marks": round(float(result.avg_obtained), 2),
                "max_marks": round(float(result.avg_max), 2),
                "average_percentage": round(avg_percentage, 2),
                "total_entries": result.count
            }
        
        return component_stats
    
    async def identify_at_risk_students(
        self,
        teacher_id: int,
        threshold: float = 40.0
    ) -> List[Dict[str, Any]]:
        """
        Identify students at risk of failing
        
        Args:
            teacher_id: Teacher ID
            threshold: Percentage threshold for at-risk (default 40%)
        
        Returns:
            List of at-risk students with details
        """
        # Get all assignments for this teacher
        assignments = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.teacher_id == teacher_id
        ).all()
        
        at_risk = []
        
        for assignment in assignments:
            # Get subject
            subject = self.db.query(SubjectModel).filter(
                SubjectModel.id == assignment.subject_id
            ).first()
            
            # Get all students' performance
            marks = self.db.query(InternalMarkModel).filter(
                InternalMarkModel.subject_assignment_id == assignment.id,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.APPROVED,
                    MarksWorkflowState.PUBLISHED
                ])
            ).all()
            
            # Calculate per-student totals
            student_totals = {}
            for mark in marks:
                if mark.student_id not in student_totals:
                    student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
                student_totals[mark.student_id]["obtained"] += mark.marks_obtained
                student_totals[mark.student_id]["maximum"] += mark.max_marks
            
            # Find at-risk students
            for student_id, totals in student_totals.items():
                percentage = (totals["obtained"] / totals["maximum"] * 100) if totals["maximum"] > 0 else 0
                
                if percentage < threshold:
                    student = self.db.query(StudentModel).filter(
                        StudentModel.id == student_id
                    ).first()
                    
                    if student:
                        at_risk.append({
                            "student_id": student_id,
                            "roll_no": student.roll_no,
                            "subject_name": subject.name if subject else "Unknown",
                            "subject_code": subject.code if subject else "",
                            "current_percentage": round(percentage, 2),
                            "marks_obtained": round(totals["obtained"], 2),
                            "max_marks": totals["maximum"],
                            "risk_level": "critical" if percentage < 30 else "high" if percentage < 35 else "moderate",
                            "recommendation": generate_at_risk_recommendation(percentage)
                        })
        
        # Sort by percentage (lowest first)
        at_risk.sort(key=lambda x: x["current_percentage"])
        
        return at_risk
    
    async def get_student_detail_view(
        self,
        student_id: int,
        subject_assignment_id: int
    ) -> Dict[str, Any]:
        """
        Get detailed view of a specific student's performance in a subject
        
        Returns:
            Detailed student performance data
        """
        student = self.db.query(StudentModel).filter(
            StudentModel.id == student_id
        ).first()
        
        if not student:
            raise EntityNotFoundError(f"Student {student_id} not found")
        
        # Get all marks for this student in this subject
        marks = self.db.query(InternalMarkModel).filter(
            InternalMarkModel.student_id == student_id,
            InternalMarkModel.subject_assignment_id == subject_assignment_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        ).all()
        
        # Component-wise breakdown
        component_breakdown = {}
        total_obtained = 0
        total_max = 0
        
        for mark in marks:
            comp = mark.component_type
            if comp not in component_breakdown:
                component_breakdown[comp] = []
            
            component_breakdown[comp].append({
                "assessment_name": mark.assessment_name or f"{comp.upper()} Assessment",
                "obtained": mark.marks_obtained,
                "maximum": mark.max_marks,
                "percentage": round((mark.marks_obtained / mark.max_marks * 100) if mark.max_marks > 0 else 0, 2),
                "date": mark.created_at.strftime("%Y-%m-%d") if mark.created_at else None
            })
            
            total_obtained += mark.marks_obtained
            total_max += mark.max_marks
        
        overall_percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
        
        return {
            "student_info": {
                "id": student.id,
                "roll_no": student.roll_no,
                "current_year": student.current_year_level
            },
            "overall": {
                "total_obtained": round(total_obtained, 2),
                "total_maximum": total_max,
                "percentage": round(overall_percentage, 2),
                "grade": calculate_grade(overall_percentage)
            },
            "component_breakdown": component_breakdown,
            "total_assessments": len(marks)
        }
    
    async def get_overall_teaching_stats(
        self,
        teacher_id: int
    ) -> Dict[str, Any]:
        """
        Get overall teaching statistics across all classes
        
        Returns:
            Aggregated stats across all subject assignments
        """
        assignments = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.teacher_id == teacher_id
        ).all()
        
        total_students = set()
        total_marks_entered = 0
        all_percentages = []
        
        for assignment in assignments:
            marks = self.db.query(InternalMarkModel).filter(
                InternalMarkModel.subject_assignment_id == assignment.id,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.APPROVED,
                    MarksWorkflowState.PUBLISHED
                ])
            ).all()
            
            total_marks_entered += len(marks)
            
            # Get unique students
            for mark in marks:
                total_students.add(mark.student_id)
            
            # Calculate percentages
            student_totals = {}
            for mark in marks:
                if mark.student_id not in student_totals:
                    student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
                student_totals[mark.student_id]["obtained"] += mark.marks_obtained
                student_totals[mark.student_id]["maximum"] += mark.max_marks
            
            for totals in student_totals.values():
                if totals["maximum"] > 0:
                    percentage = (totals["obtained"] / totals["maximum"] * 100)
                    all_percentages.append(percentage)
        
        avg_class_performance = sum(all_percentages) / len(all_percentages) if all_percentages else 0
        pass_rate = len([p for p in all_percentages if p >= 40]) / len(all_percentages) * 100 if all_percentages else 0
        
        return {
            "total_classes": len(assignments),
            "total_students": len(total_students),
            "total_marks_entered": total_marks_entered,
            "average_class_performance": round(avg_class_performance, 2),
            "overall_pass_rate": round(pass_rate, 2)
        }
    
    # Helper methods remain for complex logic
