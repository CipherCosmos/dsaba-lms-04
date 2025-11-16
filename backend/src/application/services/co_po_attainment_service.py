"""
CO-PO Attainment Calculation Service
Business logic for calculating CO and PO attainment levels
"""

from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from src.infrastructure.database.models import (
    CourseOutcomeModel, ProgramOutcomeModel, COPOMappingModel,
    QuestionModel, QuestionCOMappingModel, MarkModel,
    StudentModel, SubjectAssignmentModel, ExamModel,
    FinalMarkModel, InternalMarkModel
)


class COPOAttainmentService:
    """
    CO-PO Attainment Calculation Service
    
    Calculates Course Outcome and Program Outcome attainment based on:
    - Question-CO mappings
    - Student marks
    - CO-PO mapping strengths
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_co_attainment(
        self,
        subject_id: int,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[int, Dict[str, any]]:
        """
        Calculate CO attainment for a subject
        
        Args:
            subject_id: Subject ID
            academic_year_id: Optional academic year filter
            semester_id: Optional semester filter
        
        Returns:
            Dictionary with CO attainment data:
            {
                co_id: {
                    "co_code": "CO1",
                    "co_title": "...",
                    "target_attainment": 70.0,
                    "actual_attainment": 75.5,
                    "level_1_percentage": 15.0,  # Below L1 threshold
                    "level_2_percentage": 25.0,  # Between L1 and L2
                    "level_3_percentage": 60.0,  # Above L2
                    "total_students": 100,
                    "attained": True/False
                }
            }
        """
        # Get all COs for the subject
        cos = self.db.query(CourseOutcomeModel).filter(
            CourseOutcomeModel.subject_id == subject_id
        ).all()
        
        if not cos:
            return {}
        
        attainment_results = {}
        
        for co in cos:
            attainment_results[co.id] = self._calculate_single_co_attainment(
                co=co,
                subject_id=subject_id,
                academic_year_id=academic_year_id,
                semester_id=semester_id
            )
        
        return attainment_results
    
    def _calculate_single_co_attainment(
        self,
        co: CourseOutcomeModel,
        subject_id: int,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[str, any]:
        """Calculate attainment for a single CO"""
        
        # Get all questions mapped to this CO
        question_mappings = self.db.query(QuestionCOMappingModel).filter(
            QuestionCOMappingModel.co_id == co.id
        ).all()
        
        if not question_mappings:
            return {
                "co_code": co.code,
                "co_title": co.title,
                "target_attainment": float(co.target_attainment),
                "actual_attainment": 0.0,
                "level_1_percentage": 0.0,
                "level_2_percentage": 0.0,
                "level_3_percentage": 0.0,
                "total_students": 0,
                "attained": False,
                "status": "no_data"
            }
        
        question_ids = [qm.question_id for qm in question_mappings]
        
        # Get all marks for these questions
        marks_query = self.db.query(MarkModel).join(
            QuestionModel, MarkModel.question_id == QuestionModel.id
        ).join(
            ExamModel, MarkModel.exam_id == ExamModel.id
        ).join(
            SubjectAssignmentModel, ExamModel.subject_assignment_id == SubjectAssignmentModel.id
        ).filter(
            MarkModel.question_id.in_(question_ids),
            SubjectAssignmentModel.subject_id == subject_id
        )
        
        # Apply filters if provided
        if semester_id:
            marks_query = marks_query.filter(
                SubjectAssignmentModel.semester_id == semester_id
            )
        
        if academic_year_id:
            marks_query = marks_query.filter(
                SubjectAssignmentModel.academic_year_id == academic_year_id
            )
        
        marks = marks_query.all()
        
        if not marks:
            return {
                "co_code": co.code,
                "co_title": co.title,
                "target_attainment": float(co.target_attainment),
                "actual_attainment": 0.0,
                "level_1_percentage": 0.0,
                "level_2_percentage": 0.0,
                "level_3_percentage": 0.0,
                "total_students": 0,
                "attained": False,
                "status": "no_marks"
            }
        
        # Group marks by student
        student_scores = {}
        student_max_scores = {}
        
        for mark in marks:
            student_id = mark.student_id
            question = self.db.query(QuestionModel).filter(
                QuestionModel.id == mark.question_id
            ).first()
            
            if not question:
                continue
            
            # Get CO mapping weight
            mapping = next((m for m in question_mappings if m.question_id == mark.question_id), None)
            weight_pct = float(mapping.weight_pct) / 100.0 if mapping else 1.0
            
            # Calculate weighted marks
            marks_obtained = float(mark.marks_obtained) * weight_pct
            max_marks = float(question.marks_per_question) * weight_pct
            
            if student_id not in student_scores:
                student_scores[student_id] = 0.0
                student_max_scores[student_id] = 0.0
            
            student_scores[student_id] += marks_obtained
            student_max_scores[student_id] += max_marks
        
        # Calculate percentage for each student
        student_percentages = {}
        for student_id in student_scores:
            if student_max_scores[student_id] > 0:
                student_percentages[student_id] = (
                    student_scores[student_id] / student_max_scores[student_id]
                ) * 100.0
            else:
                student_percentages[student_id] = 0.0
        
        if not student_percentages:
            return {
                "co_code": co.code,
                "co_title": co.title,
                "target_attainment": float(co.target_attainment),
                "actual_attainment": 0.0,
                "level_1_percentage": 0.0,
                "level_2_percentage": 0.0,
                "level_3_percentage": 0.0,
                "total_students": 0,
                "attained": False,
                "status": "no_students"
            }
        
        # Calculate level distribution
        total_students = len(student_percentages)
        l1_threshold = float(co.l1_threshold)
        l2_threshold = float(co.l2_threshold)
        l3_threshold = float(co.l3_threshold)
        
        level_1_count = sum(1 for pct in student_percentages.values() if pct < l1_threshold)
        level_2_count = sum(1 for pct in student_percentages.values() if l1_threshold <= pct < l2_threshold)
        level_3_count = sum(1 for pct in student_percentages.values() if pct >= l2_threshold)
        
        level_1_pct = (level_1_count / total_students) * 100.0 if total_students > 0 else 0.0
        level_2_pct = (level_2_count / total_students) * 100.0 if total_students > 0 else 0.0
        level_3_pct = (level_3_count / total_students) * 100.0 if total_students > 0 else 0.0
        
        # Calculate actual attainment (average percentage of students who achieved target)
        # Using weighted approach: students above L2 threshold
        actual_attainment = level_3_pct
        
        # Alternative: Average of all student percentages
        # actual_attainment = sum(student_percentages.values()) / total_students
        
        target_attainment = float(co.target_attainment)
        attained = actual_attainment >= target_attainment
        
        return {
            "co_code": co.code,
            "co_title": co.title,
            "target_attainment": target_attainment,
            "actual_attainment": round(actual_attainment, 2),
            "level_1_percentage": round(level_1_pct, 2),
            "level_2_percentage": round(level_2_pct, 2),
            "level_3_percentage": round(level_3_pct, 2),
            "total_students": total_students,
            "attained": attained,
            "status": "calculated",
            "l1_threshold": l1_threshold,
            "l2_threshold": l2_threshold,
            "l3_threshold": l3_threshold
        }
    
    def calculate_po_attainment(
        self,
        department_id: int,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[int, Dict[str, any]]:
        """
        Calculate PO attainment for a department
        
        Args:
            department_id: Department ID
            academic_year_id: Optional academic year filter
            semester_id: Optional semester filter
        
        Returns:
            Dictionary with PO attainment data:
            {
                po_id: {
                    "po_code": "PO1",
                    "po_title": "...",
                    "target_attainment": 70.0,
                    "actual_attainment": 72.5,
                    "contributing_cos": [
                        {
                            "co_id": 1,
                            "co_code": "CO1",
                            "subject_name": "Data Structures",
                            "mapping_strength": 3,
                            "co_attainment": 75.0,
                            "weighted_contribution": 22.5
                        },
                        ...
                    ],
                    "total_cos": 15,
                    "attained": True/False
                }
            }
        """
        # Get all POs for the department
        pos = self.db.query(ProgramOutcomeModel).filter(
            ProgramOutcomeModel.department_id == department_id
        ).all()
        
        if not pos:
            return {}
        
        attainment_results = {}
        
        for po in pos:
            attainment_results[po.id] = self._calculate_single_po_attainment(
                po=po,
                department_id=department_id,
                academic_year_id=academic_year_id,
                semester_id=semester_id
            )
        
        return attainment_results
    
    def _calculate_single_po_attainment(
        self,
        po: ProgramOutcomeModel,
        department_id: int,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[str, any]:
        """Calculate attainment for a single PO"""
        
        # Get all CO-PO mappings for this PO
        co_po_mappings = self.db.query(COPOMappingModel).filter(
            COPOMappingModel.po_id == po.id
        ).all()
        
        if not co_po_mappings:
            return {
                "po_code": po.code,
                "po_title": po.title,
                "po_type": po.type,
                "target_attainment": float(po.target_attainment),
                "actual_attainment": 0.0,
                "contributing_cos": [],
                "total_cos": 0,
                "attained": False,
                "status": "no_mappings"
            }
        
        contributing_cos = []
        total_weighted_attainment = 0.0
        total_weight = 0.0
        
        for mapping in co_po_mappings:
            co = self.db.query(CourseOutcomeModel).filter(
                CourseOutcomeModel.id == mapping.co_id
            ).first()
            
            if not co:
                continue
            
            # Get subject for CO
            from src.infrastructure.database.models import SubjectModel
            subject = self.db.query(SubjectModel).filter(
                SubjectModel.id == co.subject_id
            ).first()
            
            if not subject or subject.department_id != department_id:
                continue
            
            # Calculate CO attainment
            co_attainment_data = self._calculate_single_co_attainment(
                co=co,
                subject_id=subject.id,
                academic_year_id=academic_year_id,
                semester_id=semester_id
            )
            
            co_attainment = co_attainment_data.get("actual_attainment", 0.0)
            
            # Apply mapping strength as weight
            strength = mapping.strength  # 1=Low, 2=Medium, 3=High
            weighted_contribution = co_attainment * strength
            
            contributing_cos.append({
                "co_id": co.id,
                "co_code": co.code,
                "co_title": co.title,
                "subject_id": subject.id,
                "subject_name": subject.name,
                "subject_code": subject.code,
                "mapping_strength": strength,
                "co_attainment": co_attainment,
                "weighted_contribution": round(weighted_contribution, 2)
            })
            
            total_weighted_attainment += weighted_contribution
            total_weight += strength
        
        # Calculate PO attainment as weighted average
        actual_attainment = 0.0
        if total_weight > 0:
            actual_attainment = total_weighted_attainment / total_weight
        
        target_attainment = float(po.target_attainment)
        attained = actual_attainment >= target_attainment
        
        return {
            "po_code": po.code,
            "po_title": po.title,
            "po_type": po.type,
            "target_attainment": target_attainment,
            "actual_attainment": round(actual_attainment, 2),
            "contributing_cos": contributing_cos,
            "total_cos": len(contributing_cos),
            "attained": attained,
            "status": "calculated" if contributing_cos else "no_data"
        }
    
    def get_co_po_attainment_summary(
        self,
        department_id: int,
        academic_year_id: Optional[int] = None,
        semester_id: Optional[int] = None
    ) -> Dict[str, any]:
        """
        Get comprehensive CO-PO attainment summary for a department
        
        Returns:
            {
                "department_id": int,
                "academic_year_id": int or None,
                "semester_id": int or None,
                "co_attainment": {...},
                "po_attainment": {...},
                "summary": {
                    "total_cos": int,
                    "attained_cos": int,
                    "co_attainment_rate": float,
                    "total_pos": int,
                    "attained_pos": int,
                    "po_attainment_rate": float
                }
            }
        """
        # Get all subjects for department
        from src.infrastructure.database.models import SubjectModel
        subjects = self.db.query(SubjectModel).filter(
            SubjectModel.department_id == department_id
        ).all()
        
        # Calculate CO attainment for all subjects
        all_co_attainment = {}
        for subject in subjects:
            co_attainment = self.calculate_co_attainment(
                subject_id=subject.id,
                academic_year_id=academic_year_id,
                semester_id=semester_id
            )
            all_co_attainment.update(co_attainment)
        
        # Calculate PO attainment
        po_attainment = self.calculate_po_attainment(
            department_id=department_id,
            academic_year_id=academic_year_id,
            semester_id=semester_id
        )
        
        # Calculate summary statistics
        total_cos = len(all_co_attainment)
        attained_cos = sum(1 for co in all_co_attainment.values() if co.get("attained", False))
        co_attainment_rate = (attained_cos / total_cos * 100.0) if total_cos > 0 else 0.0
        
        total_pos = len(po_attainment)
        attained_pos = sum(1 for po in po_attainment.values() if po.get("attained", False))
        po_attainment_rate = (attained_pos / total_pos * 100.0) if total_pos > 0 else 0.0
        
        return {
            "department_id": department_id,
            "academic_year_id": academic_year_id,
            "semester_id": semester_id,
            "co_attainment": all_co_attainment,
            "po_attainment": po_attainment,
            "summary": {
                "total_cos": total_cos,
                "attained_cos": attained_cos,
                "co_attainment_rate": round(co_attainment_rate, 2),
                "total_pos": total_pos,
                "attained_pos": attained_pos,
                "po_attainment_rate": round(po_attainment_rate, 2)
            }
        }

