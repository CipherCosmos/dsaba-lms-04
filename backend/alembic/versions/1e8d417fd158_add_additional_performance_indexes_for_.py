"""add_additional_performance_indexes_for_large_datasets

Revision ID: 1e8d417fd158
Revises: f2f586771a41
Create Date: 2025-11-17 14:37:55.479674

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1e8d417fd158'
down_revision = 'f2f586771a41'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Additional performance indexes for large dataset queries

    # Analytics queries: marks joined with exams and subject assignments
    op.create_index('idx_marks_exam_student_marks', 'marks', ['exam_id', 'student_id', 'marks_obtained'])
    op.create_index('idx_exams_assignment_exam_type_date', 'exams', ['subject_assignment_id', 'exam_type', 'exam_date'])

    # Student enrollment analytics: enrollments with academic year and semester
    op.create_index('idx_student_enrollments_ay_semester_student', 'student_enrollments', ['academic_year_id', 'semester_id', 'student_id'])

    # Audit logs: timestamp-based queries for compliance and monitoring
    op.create_index('idx_audit_logs_user_action_created', 'audit_logs', ['user_id', 'action', 'created_at'])
    op.create_index('idx_marks_workflow_audit_mark_state_changed', 'marks_workflow_audit', ['internal_mark_id', 'new_state', 'changed_at'])

    # CO/PO attainment calculations: mappings for analytics
    op.create_index('idx_co_po_mappings_po_co_strength', 'co_po_mappings', ['po_id', 'co_id', 'strength'])
    op.create_index('idx_question_co_mappings_co_question_weight', 'question_co_mappings', ['co_id', 'question_id', 'weight_pct'])

    # Survey responses: for indirect attainment analytics
    op.create_index('idx_survey_responses_question_respondent', 'survey_responses', ['question_id', 'respondent_id'])
    op.create_index('idx_exit_exam_results_student_score', 'exit_exam_results', ['student_id', 'score'])

    # Final marks: additional composite for batch processing
    op.create_index('idx_final_marks_subject_semester_status', 'final_marks', ['subject_assignment_id', 'semester_id', 'status'])

    # Internal marks: workflow analytics
    op.create_index('idx_internal_marks_entered_by_updated', 'internal_marks', ['entered_by', 'updated_at'])
    op.create_index('idx_internal_marks_submitted_by_approved', 'internal_marks', ['submitted_by', 'approved_by'])


def downgrade() -> None:
    # Remove indexes in reverse order
    op.drop_index('idx_internal_marks_submitted_by_approved', table_name='internal_marks')
    op.drop_index('idx_internal_marks_entered_by_updated', table_name='internal_marks')
    op.drop_index('idx_final_marks_subject_semester_status', table_name='final_marks')
    op.drop_index('idx_exit_exam_results_student_score', table_name='exit_exam_results')
    op.drop_index('idx_survey_responses_question_respondent', table_name='survey_responses')
    op.drop_index('idx_question_co_mappings_co_question_weight', table_name='question_co_mappings')
    op.drop_index('idx_co_po_mappings_po_co_strength', table_name='co_po_mappings')
    op.drop_index('idx_marks_workflow_audit_mark_state_changed', table_name='marks_workflow_audit')
    op.drop_index('idx_audit_logs_user_action_created', table_name='audit_logs')
    op.drop_index('idx_student_enrollments_ay_semester_student', table_name='student_enrollments')
    op.drop_index('idx_exams_assignment_exam_type_date', table_name='exams')
    op.drop_index('idx_marks_exam_student_marks', table_name='marks')