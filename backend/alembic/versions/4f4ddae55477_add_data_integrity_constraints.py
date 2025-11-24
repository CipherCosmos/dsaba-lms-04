"""add_data_integrity_constraints

Revision ID: 4f4ddae55477
Revises: 1fa1dcb2862e
Create Date: 2025-11-16 21:23:52.543074

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4f4ddae55477'
down_revision = '1fa1dcb2862e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add additional data integrity constraints

    # Ensure marks don't exceed maximum values
    op.create_check_constraint(
        'check_marks_not_exceed_max',
        'internal_marks',
        'marks_obtained <= max_marks'
    )

    op.create_check_constraint(
        'check_final_marks_range',
        'final_marks',
        'internal_1 >= 0 AND internal_1 <= 40 AND internal_2 >= 0 AND internal_2 <= 40 AND external >= 0 AND external <= 60'
    )

    # Ensure percentages are within valid range
    op.create_check_constraint(
        'check_percentage_range',
        'final_marks',
        'percentage >= 0 AND percentage <= 100'
    )

    # Ensure GPA values are within valid range
    op.create_check_constraint(
        'check_sgpa_range',
        'final_marks',
        'sgpa IS NULL OR (sgpa >= 0 AND sgpa <= 10)'
    )

    op.create_check_constraint(
        'check_cgpa_range',
        'final_marks',
        'cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)'
    )

    # Ensure admission years are reasonable
    op.create_check_constraint(
        'check_admission_year_range',
        'batch_instances',
        'admission_year >= 2000 AND admission_year <= 2030'
    )

    # Ensure semester numbers are valid
    op.create_check_constraint(
        'check_semester_valid_range',
        'semesters',
        'semester_no >= 1 AND semester_no <= 12'
    )

    # Add NOT NULL constraint for critical fields where appropriate
    # Note: These would need to be applied carefully to avoid breaking existing data
    # For now, we'll add them as check constraints

    # Ensure workflow states are valid
    op.create_check_constraint(
        'check_workflow_state_valid',
        'internal_marks',
        "workflow_state IN ('draft', 'submitted', 'approved', 'rejected', 'frozen', 'published')"
    )


def downgrade() -> None:
    # Remove constraints in reverse order
    op.drop_constraint('check_workflow_state_valid', 'internal_marks', type_='check')
    op.drop_constraint('check_semester_valid_range', 'semesters', type_='check')
    op.drop_constraint('check_admission_year_range', 'batch_instances', type_='check')
    op.drop_constraint('check_cgpa_range', 'final_marks', type_='check')
    op.drop_constraint('check_sgpa_range', 'final_marks', type_='check')
    op.drop_constraint('check_percentage_range', 'final_marks', type_='check')
    op.drop_constraint('check_final_marks_range', 'final_marks', type_='check')
    op.drop_constraint('check_marks_not_exceed_max', 'internal_marks', type_='check')