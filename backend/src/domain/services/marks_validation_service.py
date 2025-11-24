"""
Marks Validation Service
Domain service for centralized marks validation logic
"""

from typing import Optional
from decimal import Decimal
from ..exceptions import ValidationError


class MarksValidationService:
    """
    Domain service for marks validation

    Centralizes all marks-related validation logic from entities
    """

    @staticmethod
    def validate_mark_obtained(marks: float, max_marks: Optional[float] = None) -> None:
        """
        Validate marks obtained

        Args:
            marks: Marks obtained
            max_marks: Maximum marks (optional)

        Raises:
            ValidationError: If validation fails
        """
        if marks < 0:
            raise ValidationError(
                "Marks cannot be negative",
                field="marks_obtained",
                value=marks
            )

        if max_marks is not None and marks > max_marks:
            raise ValidationError(
                "Marks obtained cannot exceed maximum marks",
                field="marks_obtained",
                value=marks
            )

    @staticmethod
    def validate_max_marks(max_marks: float) -> None:
        """
        Validate maximum marks

        Args:
            max_marks: Maximum marks

        Raises:
            ValidationError: If validation fails
        """
        if max_marks <= 0:
            raise ValidationError(
                "Maximum marks must be greater than zero",
                field="max_marks",
                value=max_marks
            )

    @staticmethod
    def validate_final_mark_data(
        grade: str,
        status: str,
        internal_1: Decimal,
        internal_2: Decimal,
        external: Decimal
    ) -> None:
        """
        Validate final mark data

        Args:
            grade: Grade (A+, A, B+, B, C, D, F)
            status: Status (draft, published, locked)
            internal_1: Internal 1 marks
            internal_2: Internal 2 marks
            external: External marks

        Raises:
            ValidationError: If validation fails
        """
        # Grade validation
        valid_grades = ["A+", "A", "B+", "B", "C", "D", "F"]
        if grade.upper() not in valid_grades:
            raise ValidationError(
                f"Grade must be one of: {valid_grades}",
                field="grade",
                value=grade
            )

        # Status validation
        valid_statuses = ["draft", "published", "locked"]
        if status.lower() not in valid_statuses:
            raise ValidationError(
                "Status must be draft, published, or locked",
                field="status",
                value=status
            )

        # Marks validation
        if float(internal_1) < 0:
            raise ValidationError(
                "Internal 1 marks cannot be negative",
                field="internal_1",
                value=float(internal_1)
            )

        if float(internal_2) < 0:
            raise ValidationError(
                "Internal 2 marks cannot be negative",
                field="internal_2",
                value=float(internal_2)
            )

        if float(external) < 0:
            raise ValidationError(
                "External marks cannot be negative",
                field="external",
                value=float(external)
            )

    @staticmethod
    def validate_workflow_state_transition(
        current_state: str,
        new_state: str,
        action: str
    ) -> None:
        """
        Validate workflow state transition

        Args:
            current_state: Current workflow state
            new_state: New workflow state
            action: Action being performed

        Raises:
            ValidationError: If transition is invalid
        """
        valid_transitions = {
            "draft": ["submitted"],
            "submitted": ["approved", "rejected"],
            "approved": ["frozen", "published"],
            "rejected": ["draft"],
            "frozen": ["published"],
            "published": []  # Terminal state
        }

        if new_state not in valid_transitions.get(current_state, []):
            raise ValidationError(
                f"Cannot {action} marks in {current_state} state",
                field="workflow_state",
                value=f"{current_state} -> {new_state}"
            )

    @staticmethod
    def validate_marks_update_permission(
        workflow_state: str,
        can_override: bool = False
    ) -> None:
        """
        Validate if marks can be updated in current state

        Args:
            workflow_state: Current workflow state
            can_override: Whether user can override restrictions

        Raises:
            ValidationError: If update is not allowed
        """
        if not can_override:
            allowed_states = ["draft", "rejected"]
            if workflow_state not in allowed_states:
                raise ValidationError(
                    f"Cannot update marks in {workflow_state} state",
                    field="workflow_state",
                    value=workflow_state
                )