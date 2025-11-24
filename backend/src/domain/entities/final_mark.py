"""
Final Mark Entity
Domain entity for Final Aggregated Marks
"""

from datetime import datetime, date
from typing import Optional, Dict, Any
from decimal import Decimal

from .base import Entity
from ..services.marks_validation_service import MarksValidationService


class FinalMark(Entity):
    """
    Final Mark entity
    
    Represents aggregated final marks for a student in a subject for a semester
    Includes internal assessments, external assessment, grades, and GPA
    """
    
    # Grade to grade point mapping
    GRADE_POINTS = {
        "A+": 10.0,
        "A": 9.0,
        "B+": 8.0,
        "B": 7.0,
        "C": 6.0,
        "D": 5.0,
        "F": 0.0
    }
    
    # Grade thresholds (percentage-based)
    GRADE_THRESHOLDS = {
        "A+": 90.0,
        "A": 80.0,
        "B+": 70.0,
        "B": 60.0,
        "C": 50.0,
        "D": 40.0,
        "F": 0.0
    }
    
    def __init__(
        self,
        id: Optional[int],
        student_id: int,
        subject_assignment_id: int,
        semester_id: int,
        internal_1: Decimal = Decimal("0"),
        internal_2: Decimal = Decimal("0"),
        best_internal: Decimal = Decimal("0"),
        external: Decimal = Decimal("0"),
        total: Decimal = Decimal("0"),
        percentage: Decimal = Decimal("0"),
        grade: str = "F",
        sgpa: Optional[Decimal] = None,
        cgpa: Optional[Decimal] = None,
        co_attainment: Optional[Dict[str, Any]] = None,
        status: str = "draft",
        is_published: bool = False,
        published_at: Optional[datetime] = None,
        editable_until: Optional[date] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        """
        Initialize Final Mark
        
        Args:
            id: Final mark ID (None for new)
            student_id: Student ID
            subject_assignment_id: Subject assignment ID
            semester_id: Semester ID
            internal_1: Internal 1 marks
            internal_2: Internal 2 marks
            best_internal: Best internal marks (calculated)
            external: External marks
            total: Total marks
            percentage: Percentage
            grade: Grade (A+, A, B+, B, C, D, F)
            sgpa: Semester GPA
            cgpa: Cumulative GPA
            co_attainment: CO attainment dictionary
            status: Status (draft, published, locked)
            is_published: Whether published
            published_at: Publication timestamp
            editable_until: Editable until date
            created_at: Creation timestamp
            updated_at: Last update timestamp
        """
        super().__init__(id)
        if created_at:
            self._created_at = created_at
        if updated_at:
            self._updated_at = updated_at
        self.student_id = student_id
        self.subject_assignment_id = subject_assignment_id
        self.semester_id = semester_id
        self.internal_1 = internal_1
        self.internal_2 = internal_2
        self.best_internal = best_internal
        self.external = external
        self.total = total
        self.percentage = percentage
        self.grade = grade.upper()
        self.sgpa = sgpa
        self.cgpa = cgpa
        self.co_attainment = co_attainment or {}
        self.status = status.lower()
        self.is_published = is_published
        self.published_at = published_at
        self.editable_until = editable_until
        
        self._validate()
    
    def _validate(self) -> None:
        """Validate final mark data"""
        MarksValidationService.validate_final_mark_data(
            self.grade,
            self.status,
            self.internal_1,
            self.internal_2,
            self.external
        )
    
    def calculate_best_internal(self, method: str = "best") -> Decimal:
        """
        Calculate best internal based on method
        
        Args:
            method: Calculation method ("best", "avg", "weighted")
        
        Returns:
            Best internal marks
        """
        if method == "best":
            return max(self.internal_1, self.internal_2)
        elif method == "avg":
            return (self.internal_1 + self.internal_2) / Decimal("2")
        elif method == "weighted":
            # Weighted: I1 * 0.4 + I2 * 0.6
            return (self.internal_1 * Decimal("0.4")) + (self.internal_2 * Decimal("0.6"))
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def calculate_total(self, max_internal: Decimal, max_external: Decimal) -> Decimal:
        """
        Calculate total marks
        
        Args:
            max_internal: Maximum internal marks
            max_external: Maximum external marks
        
        Returns:
            Total marks
        """
        # Total = best_internal + external
        return self.best_internal + self.external
    
    def calculate_percentage(self, max_total: Decimal) -> Decimal:
        """
        Calculate percentage
        
        Args:
            max_total: Maximum total marks
        
        Returns:
            Percentage
        """
        if max_total == 0:
            return Decimal("0")
        return (self.total / max_total) * Decimal("100")
    
    def assign_grade(self) -> str:
        """
        Assign grade based on percentage
        
        Returns:
            Grade (A+, A, B+, B, C, D, F)
        """
        pct = float(self.percentage)
        
        if pct >= self.GRADE_THRESHOLDS["A+"]:
            return "A+"
        elif pct >= self.GRADE_THRESHOLDS["A"]:
            return "A"
        elif pct >= self.GRADE_THRESHOLDS["B+"]:
            return "B+"
        elif pct >= self.GRADE_THRESHOLDS["B"]:
            return "B"
        elif pct >= self.GRADE_THRESHOLDS["C"]:
            return "C"
        elif pct >= self.GRADE_THRESHOLDS["D"]:
            return "D"
        else:
            return "F"
    
    def get_grade_point(self) -> Decimal:
        """
        Get grade point for this grade
        
        Returns:
            Grade point
        """
        return Decimal(str(self.GRADE_POINTS.get(self.grade, 0.0)))
    
    def publish(self) -> None:
        """Publish final marks"""
        # Validate status transition
        if self.status == "locked":
            from ..exceptions import ValidationError
            raise ValidationError(
                "Cannot publish locked marks",
                field="status",
                value=self.status
            )

        self.status = "published"
        self.is_published = True
        self.published_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def lock(self) -> None:
        """Lock final marks (no further edits)"""
        self.status = "locked"
        self.updated_at = datetime.utcnow()
    
    def update_marks(
        self,
        internal_1: Optional[Decimal] = None,
        internal_2: Optional[Decimal] = None,
        external: Optional[Decimal] = None,
        best_internal_method: str = "best"
    ) -> None:
        """
        Update marks and recalculate

        Args:
            internal_1: New internal 1 marks
            internal_2: New internal 2 marks
            external: New external marks
            best_internal_method: Method for calculating best internal
        """
        if self.status == "locked":
            from ..exceptions import ValidationError
            raise ValidationError(
                "Cannot update locked marks",
                field="status",
                value=self.status
            )

        if internal_1 is not None:
            self.internal_1 = internal_1
        if internal_2 is not None:
            self.internal_2 = internal_2
        if external is not None:
            self.external = external

        # Recalculate best internal
        self.best_internal = self.calculate_best_internal(best_internal_method)

        self.updated_at = datetime.utcnow()

    def update_co_attainment(self, co_attainment: Dict[str, Any]) -> None:
        """
        Update CO attainment data

        Args:
            co_attainment: Dictionary containing CO attainment data for this student
        """
        if self.status == "locked":
            from ..exceptions import ValidationError
            raise ValidationError(
                "Cannot update locked marks",
                field="status",
                value=self.status
            )

        self.co_attainment = co_attainment or {}
        self.updated_at = datetime.utcnow()

    def get_co_attainment_summary(self) -> Dict[str, Any]:
        """
        Get summary of CO attainment data

        Returns:
            Dictionary with CO attainment summary
        """
        if not self.co_attainment:
            return {
                "total_cos": 0,
                "attained_cos": 0,
                "attainment_rate": 0.0,
                "average_percentage": 0.0,
                "co_levels": {"L1": 0, "L2": 0, "L3": 0}
            }

        total_cos = len(self.co_attainment)
        attained_cos = sum(1 for co_data in self.co_attainment.values()
                          if isinstance(co_data, dict) and co_data.get("attained", False))

        percentages = [co_data.get("percentage", 0.0)
                      for co_data in self.co_attainment.values()
                      if isinstance(co_data, dict)]
        average_percentage = sum(percentages) / len(percentages) if percentages else 0.0

        # Count attainment levels
        co_levels = {"L1": 0, "L2": 0, "L3": 0}
        for co_data in self.co_attainment.values():
            if isinstance(co_data, dict):
                level = co_data.get("attainment_level", "L1")
                if level in co_levels:
                    co_levels[level] += 1

        return {
            "total_cos": total_cos,
            "attained_cos": attained_cos,
            "attainment_rate": round((attained_cos / total_cos * 100.0) if total_cos > 0 else 0.0, 2),
            "average_percentage": round(average_percentage, 2),
            "co_levels": co_levels
        }

