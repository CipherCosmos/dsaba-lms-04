"""
Student Progression Service
Handles student year-level progression, promotion, and detention
"""

from typing import List, Optional, Dict
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import math

from src.domain.entities.student import Student
from src.domain.exceptions import BusinessRuleViolationError, EntityNotFoundError
from src.infrastructure.database.models import (
    StudentModel,
    StudentYearProgressionModel,
    BatchInstanceModel,
    SemesterModel,
    AcademicYearModel
)


class PromotionCriteria:
    """Configuration for promotion criteria"""
    def __init__(
        self,
        min_cgpa: float = 5.0,
        max_backlogs_allowed: int = 3,
        min_attendance: float = 75.0,
        min_credits_percentage: float = 80.0
    ):
        self.min_cgpa = min_cgpa
        self.max_backlogs_allowed = max_backlogs_allowed
        self.min_attendance = min_attendance
        self.min_credits_percentage = min_credits_percentage


class StudentProgressionService:
    """Service for managing student year-level progression"""
    
    def __init__(self, db: Session, criteria: Optional[PromotionCriteria] = None):
        self.db = db
        self.criteria = criteria or PromotionCriteria()
    
    def get_year_from_semester(self, semester_no: int) -> int:
        """
        Convert semester number to year level
        Year 1: Semesters 1-2
        Year 2: Semesters 3-4
        Year 3: Semesters 5-6
        Year 4: Semesters 7-8
        """
        return math.ceil(semester_no / 2)
    
    async def check_promotion_eligibility(
        self,
        student_id: int,
        performance_data: Optional[Dict] = None
    ) -> Dict:
        """
        Check if student is eligible for promotion to next year
        
        Returns:
            dict with keys: eligible (bool), reasons (list), performance (dict)
        """
        student = self.db.query(StudentModel).filter(StudentModel.id == student_id).first()
        if not student:
            raise EntityNotFoundError(f"Student {student_id} not found")
        
        if student.is_detained:
            return {
                "eligible": False,
                "reasons": ["Student is currently detained"],
                "performance": {}
            }
        
        reasons = []
        eligible = True
        
        # Check CGPA
        cgpa = performance_data.get("cgpa", 0.0) if performance_data else 0.0
        if cgpa < self.criteria.min_cgpa:
            eligible = False
            reasons.append(f"CGPA {cgpa} is below minimum {self.criteria.min_cgpa}")
        
        # Check backlogs
        if student.backlog_count > self.criteria.max_backlogs_allowed:
            eligible = False
            reasons.append(
                f"Backlog count {student.backlog_count} exceeds maximum {self.criteria.max_backlogs_allowed}"
            )
        
        # Check attendance (if provided)
        if performance_data and "attendance" in performance_data:
            attendance = performance_data["attendance"]
            if attendance < self.criteria.min_attendance:
                eligible = False
                reasons.append(
                    f"Attendance {attendance}% is below minimum {self.criteria.min_attendance}%"
                )
        
        return {
            "eligible": eligible,
            "reasons": reasons if not eligible else ["All criteria met"],
            "performance": performance_data or {}
        }
    
    async def promote_student(
        self,
        student_id: int,
        academic_year_id: int,
        promoted_by: int,
        performance_data: Optional[Dict] = None,
        force: bool = False,
        notes: Optional[str] = None
    ) -> StudentYearProgressionModel:
        """
        Promote student to next academic year
        
        Args:
            student_id: ID of student to promote
            academic_year_id: ID of academic year for promotion
            promoted_by: User ID of person promoting
            performance_data: Dict with cgpa, sgpa, credits_earned, etc.
            force: If True, override eligibility checks
            notes: Optional notes for promotion record
        
        Returns:
            StudentYearProgressionModel record
        """
        student = self.db.query(StudentModel).filter(StudentModel.id == student_id).first()
        if not student:
            raise EntityNotFoundError(f"Student {student_id} not found")
        
        # Check eligibility unless forced
        if not force:
            eligibility = await self.check_promotion_eligibility(student_id, performance_data)
            if not eligibility["eligible"]:
                raise BusinessRuleViolationError(
                    f"Student not eligible for promotion: {', '.join(eligibility['reasons'])}"
                )
        
        # Determine promotion type
        promotion_type = "regular"
        if force:
            if student.backlog_count > 0:
                promotion_type = "promoted_with_backlogs"
            else:
                promotion_type = "manual_override"
        
        # Current year level
        from_year = student.current_year_level
        to_year = min(from_year + 1, 4)  # Cap at Year 4
        
        # Create progression record
        progression = StudentYearProgressionModel(
            student_id=student_id,
            from_year_level=from_year,
            to_year_level=to_year,
            academic_year_id=academic_year_id,
            promotion_date=date.today(),
            promotion_type=promotion_type,
            promoted_by=promoted_by,
            cgpa=performance_data.get("cgpa") if performance_data else None,
            sgpa=performance_data.get("sgpa") if performance_data else None,
            total_credits_earned=performance_data.get("credits_earned") if performance_data else None,
            backlogs_count=student.backlog_count,
            notes=notes
        )
        
        # Update student's current year
        student.current_year_level = to_year
        
        self.db.add(progression)
        self.db.commit()
        self.db.refresh(progression)
        
        return progression
    
    async def promote_batch(
        self,
        batch_instance_id: int,
        academic_year_id: int,
        promoted_by: int,
        auto_promote_eligible: bool = True,
        force_all: bool = False
    ) -> Dict:
        """
        Promote entire batch instance to next year
        
        Returns:
            dict with promoted_count, failed_count, detained_count, results
        """
        batch = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.id == batch_instance_id
        ).first()
        
        if not batch:
            raise EntityNotFoundError(f"Batch instance {batch_instance_id} not found")
        
        # Get all students in batch
        students = self.db.query(StudentModel).filter(
            StudentModel.batch_instance_id == batch_instance_id,
            StudentModel.is_detained == False
        ).all()
        
        results = {
            "promoted": [],
            "failed": [],
            "detained": []
        }
        
        for student in students:
            try:
                # Check eligibility
                eligibility = await self.check_promotion_eligibility(student.id)
                
                if eligibility["eligible"] or force_all:
                    # Promote student
                    progression = await self.promote_student(
                        student_id=student.id,
                        academic_year_id=academic_year_id,
                        promoted_by=promoted_by,
                        force=force_all
                    )
                    results["promoted"].append({
                        "student_id": student.id,
                        "progression_id": progression.id
                    })
                else:
                    results["failed"].append({
                        "student_id": student.id,
                        "reasons": eligibility["reasons"]
                    })
            except Exception as e:
                results["failed"].append({
                    "student_id": student.id,
                    "error": str(e)
                })
        
        # Update batch's current year
        if results["promoted"]:
            batch.current_year = min(batch.current_year + 1, 4)
            self.db.commit()
        
        return {
            "promoted_count": len(results["promoted"]),
            "failed_count": len(results["failed"]),
            "detained_count": len(results["detained"]),
            "results": results
        }
    
    async def detain_student(
        self,
        student_id: int,
        reason: str,
        detained_by: int
    ) -> StudentModel:
        """Mark student as detained (repeat current year)"""
        student = self.db.query(StudentModel).filter(StudentModel.id == student_id).first()
        if not student:
            raise EntityNotFoundError(f"Student {student_id} not found")
        
        student.is_detained = True
        self.db.commit()
        self.db.refresh(student)
        
        return student
    
    async def clear_detention(
        self,
        student_id: int,
        cleared_by: int
    ) -> StudentModel:
        """Clear student detention status"""
        student = self.db.query(StudentModel).filter(StudentModel.id == student_id).first()
        if not student:
            raise EntityNotFoundError(f"Student {student_id} not found")
        
        student.is_detained = False
        self.db.commit()
        self.db.refresh(student)
        
        return student
    
    async def get_progression_history(
        self,
        student_id: int
    ) -> List[StudentYearProgressionModel]:
        """Get year-wise progression history of a student"""
        return self.db.query(StudentYearProgressionModel).filter(
            StudentYearProgressionModel.student_id == student_id
        ).order_by(StudentYearProgressionModel.promotion_date.desc()).all()
    
    async def get_year_statistics(
        self,
        year_level: int,
        department_id: Optional[int] = None,
        academic_year_id: Optional[int] = None
    ) -> Dict:
        """Get statistics for students in a specific year level"""
        query = self.db.query(StudentModel).filter(
            StudentModel.current_year_level == year_level
        )
        
        if department_id:
            query = query.filter(StudentModel.department_id == department_id)
        
        if academic_year_id:
            query = query.filter(StudentModel.academic_year_id == academic_year_id)
        
        total = query.count()
        detained = query.filter(StudentModel.is_detained == True).count()
        with_backlogs = query.filter(StudentModel.backlog_count > 0).count()
        
        return {
            "year_level": year_level,
            "total_students": total,
            "detained_students": detained,
            "students_with_backlogs": with_backlogs,
            "students_in_good_standing": total - detained - with_backlogs
        }
