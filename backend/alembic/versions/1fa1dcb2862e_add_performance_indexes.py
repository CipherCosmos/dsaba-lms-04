"""add_performance_indexes

Revision ID: 1fa1dcb2862e
Revises: 0006
Create Date: 2025-11-16 21:23:26.099135

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1fa1dcb2862e'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add composite indexes for better query performance

    # Final marks - common query patterns
    op.create_index('idx_final_marks_student_semester', 'final_marks', ['student_id', 'semester_id'])
    op.create_index('idx_final_marks_student_subject', 'final_marks', ['student_id', 'subject_assignment_id'])

    # Internal marks - common query patterns
    op.create_index('idx_internal_marks_student_subject', 'internal_marks', ['student_id', 'subject_assignment_id'])
    op.create_index('idx_internal_marks_student_semester_ay', 'internal_marks', ['student_id', 'semester_id', 'academic_year_id'])

    # Batch instances - for academic structure queries
    op.create_index('idx_batch_instances_dept_ay_batch', 'batch_instances', ['department_id', 'academic_year_id', 'batch_id'])

    # Marks - for exam-based queries
    op.create_index('idx_marks_exam_question', 'marks', ['exam_id', 'question_id'])

    # Student enrollments - for enrollment queries
    op.create_index('idx_student_enrollments_student_ay', 'student_enrollments', ['student_id', 'academic_year_id'])

    # Subject assignments - additional composite for teacher queries
    op.create_index('idx_assignments_teacher_semester', 'subject_assignments', ['teacher_id', 'semester_id'])

    # Semesters - for academic year and department queries
    op.create_index('idx_semesters_ay_dept', 'semesters', ['academic_year_id', 'department_id'])


def downgrade() -> None:
    # Remove indexes in reverse order
    op.drop_index('idx_semesters_ay_dept', table_name='semesters')
    op.drop_index('idx_assignments_teacher_semester', table_name='subject_assignments')
    op.drop_index('idx_student_enrollments_student_ay', table_name='student_enrollments')
    op.drop_index('idx_marks_exam_question', table_name='marks')
    op.drop_index('idx_batch_instances_dept_ay_batch', table_name='batch_instances')
    op.drop_index('idx_internal_marks_student_semester_ay', table_name='internal_marks')
    op.drop_index('idx_internal_marks_student_subject', table_name='internal_marks')
    op.drop_index('idx_final_marks_student_subject', table_name='final_marks')
    op.drop_index('idx_final_marks_student_semester', table_name='final_marks')