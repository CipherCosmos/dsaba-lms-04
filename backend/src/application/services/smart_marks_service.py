"""
Smart Marks Calculation Service
Implements intelligent marks calculation including best-of-two internal marks,
automatic grade calculation, and marks validation
"""

from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from src.infrastructure.database.models import (
    InternalMarkModel, FinalMarkModel, StudentModel, SubjectAssignmentModel,
    ExamModel, MarkModel, SubjectModel, MarksWorkflowState,
    MarkComponentType, SemesterModel
)
from src.domain.exceptions import BusinessRuleViolationError, ValidationError, EntityNotFoundError


class SmartMarksService:
    """
    Smart Marks Calculation Service
    
    Handles:
    - Best-of-two internal marks calculation
    - Automatic grade assignment
    - Marks validation
    - Final marks calculation
    - Grade point calculation (SGPA/CGPA)
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Grading scale (can be customized per department)
        self.default_grading_scale = {
            'A+': {'min': 90, 'max': 100, 'grade_point': 10},
            'A': {'min': 80, 'max': 89, 'grade_point': 9},
            'B+': {'min': 70, 'max': 79, 'grade_point': 8},
            'B': {'min': 60, 'max': 69, 'grade_point': 7},
            'C': {'min': 50, 'max': 59, 'grade_point': 6},
            'D': {'min': 40, 'max': 49, 'grade_point': 5},
            'F': {'min': 0, 'max': 39, 'grade_point': 0}
        }
    
    def calculate_best_of_two_internal(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int,
        academic_year_id: int
    ) -> Dict[str, any]:
        """
        Calculate best-of-two internal marks for a student
        
        Args:
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
            academic_year_id: Academic year ID
        
        Returns:
            Dictionary with internal marks calculation:
            {
                "internal_1": float,
                "internal_2": float,
                "best_internal": float,
                "component_details": {...}
            }
        """
        # Get IA1 and IA2 marks
        ia1_marks = self.db.query(InternalMarkModel).filter(
            and_(
                InternalMarkModel.student_id == student_id,
                InternalMarkModel.subject_assignment_id == subject_assignment_id,
                InternalMarkModel.semester_id == semester_id,
                InternalMarkModel.academic_year_id == academic_year_id,
                InternalMarkModel.component_type == MarkComponentType.IA1,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.FROZEN,
                    MarksWorkflowState.PUBLISHED
                ])
            )
        ).first()
        
        ia2_marks = self.db.query(InternalMarkModel).filter(
            and_(
                InternalMarkModel.student_id == student_id,
                InternalMarkModel.subject_assignment_id == subject_assignment_id,
                InternalMarkModel.semester_id == semester_id,
                InternalMarkModel.academic_year_id == academic_year_id,
                InternalMarkModel.component_type == MarkComponentType.IA2,
                InternalMarkModel.workflow_state.in_([
                    MarksWorkflowState.FROZEN,
                    MarksWorkflowState.PUBLISHED
                ])
            )
        ).first()
        
        # Calculate marks (default to 0 if not found)
        ia1_obtained = float(ia1_marks.marks_obtained) if ia1_marks else 0.0
        ia2_obtained = float(ia2_marks.marks_obtained) if ia2_marks else 0.0
        
        # Get max marks
        ia1_max = float(ia1_marks.max_marks) if ia1_marks else 40.0
        ia2_max = float(ia2_marks.max_marks) if ia2_marks else 40.0
        
        # Calculate percentages
        ia1_percentage = (ia1_obtained / ia1_max * 100) if ia1_max > 0 else 0.0
        ia2_percentage = (ia2_obtained / ia2_max * 100) if ia2_max > 0 else 0.0
        
        # Best of two
        best_internal = max(ia1_obtained, ia2_obtained)
        
        return {
            "internal_1": ia1_obtained,
            "internal_1_max": ia1_max,
            "internal_1_percentage": round(ia1_percentage, 2),
            "internal_2": ia2_obtained,
            "internal_2_max": ia2_max,
            "internal_2_percentage": round(ia2_percentage, 2),
            "best_internal": best_internal,
            "selected": "IA1" if ia1_obtained >= ia2_obtained else "IA2"
        }
    
    def calculate_grade(self, percentage: float, grading_scale: Optional[Dict] = None) -> Tuple[str, float]:
        """
        Calculate grade and grade point based on percentage
        
        Args:
            percentage: Percentage marks
            grading_scale: Optional custom grading scale
        
        Returns:
            Tuple of (grade, grade_point)
        """
        scale = grading_scale or self.default_grading_scale
        
        for grade, criteria in scale.items():
            if criteria['min'] <= percentage <= criteria['max']:
                return grade, criteria['grade_point']
        
        return 'F', 0.0
    
    def calculate_final_marks(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int,
        academic_year_id: int
    ) -> Dict[str, any]:
        """
        Calculate final marks for a student in a subject
        
        Combines:
        - Best of two internal marks (IA1 or IA2)
        - External exam marks
        - Calculates total, percentage, grade, grade point
        
        Args:
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
            academic_year_id: Academic year ID
        
        Returns:
            Dictionary with complete marks calculation
        """
        # Get subject details
        assignment = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.id == subject_assignment_id
        ).first()
        
        if not assignment:
            raise EntityNotFoundError("SubjectAssignment", subject_assignment_id)
        
        subject = self.db.query(SubjectModel).filter(
            SubjectModel.id == assignment.subject_id
        ).first()
        
        if not subject:
            raise EntityNotFoundError("Subject", assignment.subject_id)
        
        # Get internal marks (best of two)
        internal_calc = self.calculate_best_of_two_internal(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id
        )
        
        best_internal = internal_calc['best_internal']
        
        # Get external marks
        external_exam = self.db.query(ExamModel).join(SubjectAssignmentModel).filter(
            and_(
                SubjectAssignmentModel.id == subject_assignment_id,
                ExamModel.exam_type == 'external'
            )
        ).first()
        
        external_marks = 0.0
        if external_exam:
            # Get marks for this student
            marks = self.db.query(MarkModel).filter(
                and_(
                    MarkModel.exam_id == external_exam.id,
                    MarkModel.student_id == student_id
                )
            ).all()
            
            external_marks = sum(float(m.marks_obtained) for m in marks)
        
        # Calculate total
        max_internal = float(subject.max_internal)
        max_external = float(subject.max_external)
        total_max = max_internal + max_external
        
        # Normalize internal marks to max_internal
        normalized_internal = (best_internal / 40.0) * max_internal if best_internal > 0 else 0.0
        
        total_marks = normalized_internal + external_marks
        percentage = (total_marks / total_max * 100) if total_max > 0 else 0.0
        
        # Calculate grade
        grade, grade_point = self.calculate_grade(percentage)
        
        return {
            "student_id": student_id,
            "subject_assignment_id": subject_assignment_id,
            "semester_id": semester_id,
            "academic_year_id": academic_year_id,
            "internal_marks": {
                "ia1": internal_calc['internal_1'],
                "ia2": internal_calc['internal_2'],
                "best": best_internal,
                "normalized": round(normalized_internal, 2),
                "selected": internal_calc['selected']
            },
            "external_marks": round(external_marks, 2),
            "total_marks": round(total_marks, 2),
            "max_marks": total_max,
            "percentage": round(percentage, 2),
            "grade": grade,
            "grade_point": grade_point,
            "credits": float(subject.credits),
            "status": "pass" if percentage >= 40 else "fail"
        }
    
    def save_final_marks(
        self,
        student_id: int,
        subject_assignment_id: int,
        semester_id: int
    ) -> FinalMarkModel:
        """
        Calculate and save final marks to database
        
        Args:
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
        
        Returns:
            FinalMarkModel instance
        """
        # Get semester to find academic year
        semester = self.db.query(SemesterModel).filter(
            SemesterModel.id == semester_id
        ).first()
        
        if not semester:
            raise EntityNotFoundError("Semester", semester_id)
        
        academic_year_id = semester.academic_year_id
        
        # Calculate final marks
        calc = self.calculate_final_marks(
            student_id=student_id,
            subject_assignment_id=subject_assignment_id,
            semester_id=semester_id,
            academic_year_id=academic_year_id
        )
        
        # Check if final mark already exists
        final_mark = self.db.query(FinalMarkModel).filter(
            and_(
                FinalMarkModel.student_id == student_id,
                FinalMarkModel.subject_assignment_id == subject_assignment_id,
                FinalMarkModel.semester_id == semester_id
            )
        ).first()
        
        if final_mark:
            # Update existing
            final_mark.internal_1 = Decimal(str(calc['internal_marks']['ia1']))
            final_mark.internal_2 = Decimal(str(calc['internal_marks']['ia2']))
            final_mark.best_internal = Decimal(str(calc['internal_marks']['normalized']))
            final_mark.external = Decimal(str(calc['external_marks']))
            final_mark.total = Decimal(str(calc['total_marks']))
            final_mark.percentage = Decimal(str(calc['percentage']))
            final_mark.grade = calc['grade']
        else:
            # Create new
            final_mark = FinalMarkModel(
                student_id=student_id,
                subject_assignment_id=subject_assignment_id,
                semester_id=semester_id,
                internal_1=Decimal(str(calc['internal_marks']['ia1'])),
                internal_2=Decimal(str(calc['internal_marks']['ia2'])),
                best_internal=Decimal(str(calc['internal_marks']['normalized'])),
                external=Decimal(str(calc['external_marks'])),
                total=Decimal(str(calc['total_marks'])),
                percentage=Decimal(str(calc['percentage'])),
                grade=calc['grade'],
                status='draft'
            )
            self.db.add(final_mark)
        
        self.db.commit()
        self.db.refresh(final_mark)
        
        return final_mark
    
    def calculate_sgpa(self, student_id: int, semester_id: int) -> float:
        """
        Calculate SGPA (Semester Grade Point Average) for a student
        
        SGPA = Σ(Grade Point × Credits) / Σ(Credits)
        
        Args:
            student_id: Student ID
            semester_id: Semester ID
        
        Returns:
            SGPA value
        """
        # Get all final marks for the semester
        final_marks = self.db.query(FinalMarkModel).join(
            SubjectAssignmentModel,
            FinalMarkModel.subject_assignment_id == SubjectAssignmentModel.id
        ).join(
            SubjectModel,
            SubjectAssignmentModel.subject_id == SubjectModel.id
        ).filter(
            and_(
                FinalMarkModel.student_id == student_id,
                FinalMarkModel.semester_id == semester_id,
                FinalMarkModel.status == 'published'
            )
        ).all()
        
        if not final_marks:
            return 0.0
        
        total_credit_points = 0.0
        total_credits = 0.0
        
        for fm in final_marks:
            # Get subject
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
            
            # Calculate grade point
            _, grade_point = self.calculate_grade(float(fm.percentage))
            
            credits = float(subject.credits)
            total_credit_points += grade_point * credits
            total_credits += credits
        
        sgpa = total_credit_points / total_credits if total_credits > 0 else 0.0
        return round(sgpa, 2)
    
    def calculate_cgpa(self, student_id: int) -> float:
        """
        Calculate CGPA (Cumulative Grade Point Average) for a student
        
        CGPA = Average of all semester SGPAs
        
        Args:
            student_id: Student ID
        
        Returns:
            CGPA value
        """
        # Get all semesters for the student
        student = self.db.query(StudentModel).filter(
            StudentModel.id == student_id
        ).first()
        
        if not student:
            raise EntityNotFoundError("Student", student_id)
        
        # Get all semesters where student has marks
        semesters = self.db.query(FinalMarkModel.semester_id).filter(
            and_(
                FinalMarkModel.student_id == student_id,
                FinalMarkModel.status == 'published'
            )
        ).distinct().all()
        
        if not semesters:
            return 0.0
        
        total_sgpa = 0.0
        semester_count = 0
        
        for (semester_id,) in semesters:
            sgpa = self.calculate_sgpa(student_id, semester_id)
            if sgpa > 0:
                total_sgpa += sgpa
                semester_count += 1
        
        cgpa = total_sgpa / semester_count if semester_count > 0 else 0.0
        return round(cgpa, 2)
    
    def validate_marks(
        self,
        marks_obtained: float,
        max_marks: float,
        component_type: MarkComponentType
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate marks entry
        
        Args:
            marks_obtained: Marks obtained by student
            max_marks: Maximum marks for component
            component_type: Type of mark component
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check non-negative
        if marks_obtained < 0:
            return False, "Marks cannot be negative"
        
        # Check not exceeding max
        if marks_obtained > max_marks:
            return False, f"Marks cannot exceed maximum ({max_marks})"
        
        # Check reasonable values for internal assessments
        if component_type in [MarkComponentType.IA1, MarkComponentType.IA2]:
            if max_marks > 50:
                return False, "Internal assessment max marks typically should not exceed 50"
        
        # Check decimal places (max 2)
        if '.' in str(marks_obtained):
            decimal_places = len(str(marks_obtained).split('.')[1])
            if decimal_places > 2:
                return False, "Marks can have maximum 2 decimal places"
        
        return True, None
    
    def recalculate_all_final_marks(
        self,
        semester_id: int,
        subject_assignment_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Recalculate final marks for all students in a semester
        
        Useful when:
        - Internal marks are updated
        - External marks are entered
        - Grading scale changes
        
        Args:
            semester_id: Semester ID
            subject_assignment_id: Optional subject assignment filter
        
        Returns:
            Dictionary with recalculation results
        """
        # Get all students in semester
        from src.infrastructure.database.models import StudentEnrollmentModel
        
        enrollments = self.db.query(StudentEnrollmentModel).filter(
            StudentEnrollmentModel.semester_id == semester_id
        ).all()
        
        if not enrollments:
            return {
                "recalculated_count": 0,
                "errors": [],
                "message": "No enrollments found for semester"
            }
        
        # Get subject assignments for semester
        assignments_query = self.db.query(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.semester_id == semester_id
        )
        
        if subject_assignment_id:
            assignments_query = assignments_query.filter(
                SubjectAssignmentModel.id == subject_assignment_id
            )
        
        assignments = assignments_query.all()
        
        recalculated_count = 0
        errors = []
        
        for enrollment in enrollments:
            for assignment in assignments:
                try:
                    self.save_final_marks(
                        student_id=enrollment.student_id,
                        subject_assignment_id=assignment.id,
                        semester_id=semester_id
                    )
                    recalculated_count += 1
                except Exception as e:
                    errors.append({
                        "student_id": enrollment.student_id,
                        "subject_assignment_id": assignment.id,
                        "error": str(e)
                    })
        
        return {
            "recalculated_count": recalculated_count,
            "errors": errors,
            "message": f"Recalculated {recalculated_count} final marks"
        }

