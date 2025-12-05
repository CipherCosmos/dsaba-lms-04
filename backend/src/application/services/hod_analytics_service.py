"""
HOD Analytics Service
Department-wide analysis for Heads of Department
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from decimal import Decimal

from src.domain.exceptions import EntityNotFoundError
from src.infrastructure.database.models import (
    DepartmentModel,
    SubjectAssignmentModel,
    InternalMarkModel,
    StudentModel,
    TeacherModel,
    SubjectModel,
    BatchInstanceModel,
    MarksWorkflowState
)


class HODAnalyticsService:
    """Analytics service for department-wide insights"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_department_dashboard(
        self,
        department_id: int,
        academic_year_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive department dashboard
        
        Args:
            department_id: Department ID
            academic_year_id: Optional academic year filter
        
        Returns:
            Complete department analytics
        """
        department = self.db.query(DepartmentModel).filter(
            DepartmentModel.id == department_id
        ).first()
        
        if not department:
            raise EntityNotFoundError(f"Department {department_id} not found")
        
        # Get all analytics
        overview = await self.get_department_overview(department_id, academic_year_id)
        batch_performance = await self.get_batch_comparison(department_id, academic_year_id)
        faculty_stats = await self.get_faculty_performance(department_id)
        top_subjects = await self.get_top_performing_subjects(department_id)
        weak_areas = await self.get_weak_areas(department_id)
        
        return {
            "department_info": {
                "id": department.id,
                "name": department.name,
                "code": department.code
            },
            "overview": overview,
            "batch_performance": batch_performance,
            "faculty_stats": faculty_stats,
            "top_subjects": top_subjects,
            "weak_areas": weak_areas
        }
    
    async def get_department_overview(
        self,
        department_id: int,
        academic_year_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get department overview statistics
        
        Returns:
            Overall department metrics
        """
        # Get all students in department
        students_query = self.db.query(StudentModel).filter(
            StudentModel.department_id == department_id
        )
        
        students = students_query.all()
        total_students = len(students)
        
        # Count detained and backlog students
        detained = len([s for s in students if s.is_detained])
        with_backlogs = len([s for s in students if s.backlog_count > 0])
        
        # Get all marks for department students
        marks_query = self.db.query(InternalMarkModel).join(
            StudentModel, InternalMarkModel.student_id == StudentModel.id
        ).filter(
            StudentModel.department_id == department_id,
            InternalMarkModel.workflow_state.in_([
                MarksWorkflowState.APPROVED,
                MarksWorkflowState.PUBLISHED
            ])
        )
        
        marks = marks_query.all()
        
        # Calculate department average
        if marks:
            student_totals = {}
            for mark in marks:
                if mark.student_id not in student_totals:
                    student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
                student_totals[mark.student_id]["obtained"] += mark.marks_obtained
                student_totals[mark.student_id]["maximum"] += mark.max_marks
            
            percentages = [
                (totals["obtained"] / totals["maximum"] * 100)
                for totals in student_totals.values()
                if totals["maximum"] > 0
            ]
            
            dept_avg = sum(percentages) / len(percentages) if percentages else 0
            pass_rate = len([p for p in percentages if p >= 40]) / len(percentages) * 100 if percentages else 0
        else:
            dept_avg = 0
            pass_rate = 0
        
        # Count faculty
        faculty_count = self.db.query(TeacherModel).filter(
            TeacherModel.department_id == department_id
        ).count()
        
        # Count active batches
        active_batches = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.department_id == department_id,
            BatchInstanceModel.is_active == True
        ).count()
        
        return {
            "total_students": total_students,
            "total_faculty": faculty_count,
            "active_batches": active_batches,
            "department_average": round(dept_avg, 2),
            "pass_rate": round(pass_rate, 2),
            "detained_students": detained,
            "students_with_backlogs": with_backlogs,
            "students_in_good_standing": total_students - detained - with_backlogs
        }
    
    async def get_batch_comparison(
        self,
        department_id: int,
        academic_year_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Compare performance across different batches
        
        Returns:
            List of batch performance metrics
        """
        batches_query = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.department_id == department_id,
            BatchInstanceModel.is_active == True
        )
        
        if academic_year_id:
            batches_query = batches_query.filter(
                BatchInstanceModel.academic_year_id == academic_year_id
            )
        
        batches = batches_query.all()
        batch_stats = []
        
        for batch in batches:
            # Get students in this batch
            students = self.db.query(StudentModel).filter(
                StudentModel.batch_instance_id == batch.id
            ).all()
            
            if not students:
                continue
            
            student_ids = [s.id for s in students]
            
            # Get marks for these students
            marks = self.db.query(InternalMarkModel).filter(
                InternalMarkModel.student_id.in_(student_ids),
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.APPROVED,
                    MarksWorkflowState.PUBLISHED
                ])
            ).all()
            
            # Calculate batch average
            student_totals = {}
            for mark in marks:
                if mark.student_id not in student_totals:
                    student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
                student_totals[mark.student_id]["obtained"] += mark.marks_obtained
                student_totals[mark.student_id]["maximum"] += mark.max_marks
            
            percentages = [
                (totals["obtained"] / totals["maximum"] * 100)
                for totals in student_totals.values()
                if totals["maximum"] > 0
            ]
            
            avg = sum(percentages) / len(percentages) if percentages else 0
            pass_rate = len([p for p in percentages if p >= 40]) / len(percentages) * 100 if percentages else 0
            
            batch_stats.append({
                "batch_id": batch.id,
                "admission_year": batch.admission_year,
                "current_year": batch.current_year,
                "total_students": len(students),
                "average_percentage": round(avg, 2),
                "pass_rate": round(pass_rate, 2),
                "detained": len([s for s in students if s.is_detained])
            })
        
        # Sort by average descending
        batch_stats.sort(key=lambda x: x["average_percentage"], reverse=True)
        
        return batch_stats
    
    async def get_faculty_performance(
        self,
        department_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get faculty performance metrics
        
        Returns:
            List of faculty stats
        """
        faculty = self.db.query(TeacherModel).filter(
            TeacherModel.department_id == department_id
        ).all()
        
        faculty_stats = []
        
        for teacher in faculty:
            # Get subject assignments
            assignments = self.db.query(SubjectAssignmentModel).filter(
                SubjectAssignmentModel.teacher_id == teacher.id
            ).all()
            
            total_marks_entered = 0
            student_percentages = []
            
            for assignment in assignments:
                marks = self.db.query(InternalMarkModel).filter(
                    InternalMarkModel.subject_assignment_id == assignment.id,
                    InternalMarkModel.workflow_state.in_([
                        MarksWorkflowState.APPROVED,
                        MarksWorkflowState.PUBLISHED
                    ])
                ).all()
                
                total_marks_entered += len(marks)
                
                # Calculate class average for this subject
                student_totals = {}
                for mark in marks:
                    if mark.student_id not in student_totals:
                        student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
                    student_totals[mark.student_id]["obtained"] += mark.marks_obtained
                    student_totals[mark.student_id]["maximum"] += mark.max_marks
                
                for totals in student_totals.values():
                    if totals["maximum"] > 0:
                        percentage = (totals["obtained"] / totals["maximum"] * 100)
                        student_percentages.append(percentage)
            
            avg_class_performance = sum(student_percentages) / len(student_percentages) if student_percentages else 0
            pass_rate = len([p for p in student_percentages if p >= 40]) / len(student_percentages) * 100 if student_percentages else 0
            
            # Get teacher name from user
            from src.infrastructure.database.models import UserModel
            user = self.db.query(UserModel).filter(UserModel.id == teacher.user_id).first()
            
            faculty_stats.append({
                "teacher_id": teacher.id,
                "name": f"{user.first_name} {user.last_name}" if user else "Unknown",
                "total_classes": len(assignments),
                "marks_entered": total_marks_entered,
                "average_class_performance": round(avg_class_performance, 2),
                "pass_rate": round(pass_rate, 2)
            })
        
        # Sort by average class performance
        faculty_stats.sort(key=lambda x: x["average_class_performance"], reverse=True)
        
        return faculty_stats
    
    async def get_top_performing_subjects(
        self,
        department_id: int,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get top performing subjects in department
        
        Returns:
            List of subjects with highest averages
        """
        # Get all subject assignments for department
        assignments = self.db.query(SubjectAssignmentModel).join(
            SubjectModel, SubjectAssignmentModel.subject_id == SubjectModel.id
        ).filter(
            SubjectModel.department_id == department_id
        ).all()
        
        subject_performance = {}
        
        for assignment in assignments:
            marks = self.db.query(InternalMarkModel).filter(
                InternalMarkModel.subject_assignment_id == assignment.id,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.APPROVED,
                    MarksWorkflowState.PUBLISHED
                ])
            ).all()
            
            if not marks:
                continue
            
            student_totals = {}
            for mark in marks:
                if mark.student_id not in student_totals:
                    student_totals[mark.student_id] = {"obtained": 0, "maximum": 0}
                student_totals[mark.student_id]["obtained"] += mark.marks_obtained
                student_totals[mark.student_id]["maximum"] += mark.max_marks
            
            percentages = [
                (totals["obtained"] / totals["maximum"] * 100)
                for totals in student_totals.values()
                if totals["maximum"] > 0
            ]
            
            if assignment.subject_id not in subject_performance:
                subject = self.db.query(SubjectModel).filter(
                    SubjectModel.id == assignment.subject_id
                ).first()
                
                subject_performance[assignment.subject_id] = {
                    "subject_id": assignment.subject_id,
                    "subject_name": subject.name if subject else "Unknown",
                    "subject_code": subject.code if subject else "",
                    "percentages": []
                }
            
            subject_performance[assignment.subject_id]["percentages"].extend(percentages)
        
        # Calculate averages
        results = []
        for data in subject_performance.values():
            if data["percentages"]:
                avg = sum(data["percentages"]) / len(data["percentages"])
                results.append({
                    **{k: v for k, v in data.items() if k != "percentages"},
                    "average_percentage": round(avg, 2),
                    "total_assessments": len(data["percentages"])
                })
        
        # Sort and limit
        results.sort(key=lambda x: x["average_percentage"], reverse=True)
        
        return results[:limit]
    
    async def get_weak_areas(
        self,
        department_id: int,
        threshold: float = 50.0
    ) -> List[Dict[str, Any]]:
        """
        Identify subjects/areas where students are struggling
        
        Returns:
            List of weak areas with suggestions
        """
        all_subjects = await self.get_top_performing_subjects(department_id, limit=100)
        
        weak_subjects = [
            {
                **subject,
                "improvement_needed": round(float(Decimal(str(threshold)) - Decimal(str(subject["average_percentage"]))), 2),
                "recommendation": f"Focus on improving {subject['subject_name']}. Consider additional tutorials or practice sessions."
            }
            for subject in all_subjects
            if subject["average_percentage"] < threshold
        ]
        
        # Sort by weakest first
        weak_subjects.sort(key=lambda x: x["average_percentage"])
        
        return weak_subjects[:10]  # Top 10 weakest areas
