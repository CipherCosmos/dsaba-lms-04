"""add academic year and workflow

Revision ID: 0005
Revises: 0004
Create Date: 2024-12-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '003'  # Latest migration is 003
branch_labels = None
depends_on = None


def upgrade():
    # Create academic_years table
    op.create_table(
        'academic_years',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('start_year', sa.Integer(), nullable=False),
        sa.Column('end_year', sa.Integer(), nullable=False),
        sa.Column('display_name', sa.String(length=20), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('status', sa.Enum('active', 'archived', 'planned', name='academicyearstatus'), nullable=False, server_default='planned'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('start_year', 'end_year', name='unique_academic_year'),
        sa.CheckConstraint('end_year > start_year', name='check_academic_year_order')
    )
    op.create_index('idx_academic_years_status', 'academic_years', ['status'])
    op.create_index('idx_academic_years_current', 'academic_years', ['is_current'])
    
    # Add new columns to semesters table
    op.add_column('semesters', sa.Column('academic_year_id', sa.Integer(), nullable=True))
    op.add_column('semesters', sa.Column('department_id', sa.Integer(), nullable=True))
    op.add_column('semesters', sa.Column('status', sa.String(length=20), server_default='active', nullable=True))
    op.add_column('semesters', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=True))
    
    # Create foreign keys for semesters
    op.create_foreign_key('fk_semesters_academic_year', 'semesters', 'academic_years', ['academic_year_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_semesters_department', 'semesters', 'departments', ['department_id'], ['id'], ondelete='CASCADE')
    
    # Create unique constraint for semesters
    op.create_unique_constraint('unique_semester_dept_ay', 'semesters', ['academic_year_id', 'department_id', 'semester_no'])
    
    # Create indexes for semesters
    op.create_index('idx_semesters_dept', 'semesters', ['department_id'])
    op.create_index('idx_semesters_ay', 'semesters', ['academic_year_id'])
    
    # Add academic_year_id to subject_assignments
    op.add_column('subject_assignments', sa.Column('academic_year_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_subject_assignments_academic_year', 'subject_assignments', 'academic_years', ['academic_year_id'], ['id'], ondelete='CASCADE')
    
    # Add semester_id to subjects (optional)
    op.add_column('subjects', sa.Column('semester_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_subjects_semester', 'subjects', 'semesters', ['semester_id'], ['id'], ondelete='SET NULL')
    
    # Create student_enrollments table
    op.create_table(
        'student_enrollments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('semester_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('roll_no', sa.String(length=20), nullable=False),
        sa.Column('enrollment_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('promotion_status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('next_semester_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'semester_id', 'academic_year_id', name='unique_student_enrollment'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['next_semester_id'], ['semesters.id'], ondelete='SET NULL')
    )
    op.create_index('idx_enrollments_student', 'student_enrollments', ['student_id'])
    op.create_index('idx_enrollments_semester', 'student_enrollments', ['semester_id'])
    op.create_index('idx_enrollments_ay', 'student_enrollments', ['academic_year_id'])
    
    # Create internal_marks table
    op.create_table(
        'internal_marks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('subject_assignment_id', sa.Integer(), nullable=False),
        sa.Column('semester_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('component_type', sa.Enum('ia1', 'ia2', 'assignment', 'practical', 'attendance', 'quiz', 'project', 'other', name='markcomponenttype'), nullable=False),
        sa.Column('marks_obtained', sa.DECIMAL(precision=5, scale=2), nullable=False, server_default='0'),
        sa.Column('max_marks', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('workflow_state', sa.Enum('draft', 'submitted', 'approved', 'rejected', 'frozen', 'published', name='marksworkflowstate'), nullable=False, server_default='draft'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('submitted_by', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_by', sa.Integer(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('frozen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('frozen_by', sa.Integer(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('entered_by', sa.Integer(), nullable=False),
        sa.Column('entered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'subject_assignment_id', 'component_type', name='unique_internal_mark'),
        sa.CheckConstraint("workflow_state IN ('draft', 'submitted', 'approved', 'rejected', 'frozen', 'published')", name='check_workflow_state'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_assignment_id'], ['subject_assignments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['entered_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['rejected_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['frozen_by'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_internal_marks_student', 'internal_marks', ['student_id'])
    op.create_index('idx_internal_marks_subject', 'internal_marks', ['subject_assignment_id'])
    op.create_index('idx_internal_marks_workflow', 'internal_marks', ['workflow_state'])
    
    # Create marks_workflow_audit table
    op.create_table(
        'marks_workflow_audit',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('internal_mark_id', sa.Integer(), nullable=False),
        sa.Column('old_state', sa.String(length=20), nullable=True),
        sa.Column('new_state', sa.String(length=20), nullable=False),
        sa.Column('changed_by', sa.Integer(), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('change_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['internal_mark_id'], ['internal_marks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_workflow_audit_mark', 'marks_workflow_audit', ['internal_mark_id'])
    op.create_index('idx_workflow_audit_user', 'marks_workflow_audit', ['changed_by'])
    op.create_index('idx_workflow_audit_date', 'marks_workflow_audit', ['changed_at'])
    
    # Create promotion_history table
    op.create_table(
        'promotion_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('from_semester_id', sa.Integer(), nullable=False),
        sa.Column('to_semester_id', sa.Integer(), nullable=False),
        sa.Column('from_academic_year_id', sa.Integer(), nullable=False),
        sa.Column('to_academic_year_id', sa.Integer(), nullable=False),
        sa.Column('promotion_date', sa.Date(), nullable=False),
        sa.Column('promotion_type', sa.String(length=20), server_default='regular', nullable=True),
        sa.Column('promoted_by', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_semester_id'], ['semesters.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['to_semester_id'], ['semesters.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['from_academic_year_id'], ['academic_years.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['to_academic_year_id'], ['academic_years.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['promoted_by'], ['users.id'], ondelete='SET NULL')
    )
    op.create_index('idx_promotion_student', 'promotion_history', ['student_id'])
    op.create_index('idx_promotion_from_sem', 'promotion_history', ['from_semester_id'])
    op.create_index('idx_promotion_to_sem', 'promotion_history', ['to_semester_id'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('promotion_history')
    op.drop_table('marks_workflow_audit')
    op.drop_table('internal_marks')
    op.drop_table('student_enrollments')
    
    # Remove columns from subjects
    op.drop_constraint('fk_subjects_semester', 'subjects', type_='foreignkey')
    op.drop_column('subjects', 'semester_id')
    
    # Remove columns from subject_assignments
    op.drop_constraint('fk_subject_assignments_academic_year', 'subject_assignments', type_='foreignkey')
    op.drop_column('subject_assignments', 'academic_year_id')
    
    # Remove columns from semesters
    op.drop_index('idx_semesters_ay', 'semesters')
    op.drop_index('idx_semesters_dept', 'semesters')
    op.drop_constraint('unique_semester_dept_ay', 'semesters', type_='unique')
    op.drop_constraint('fk_semesters_department', 'semesters', type_='foreignkey')
    op.drop_constraint('fk_semesters_academic_year', 'semesters', type_='foreignkey')
    op.drop_column('semesters', 'updated_at')
    op.drop_column('semesters', 'status')
    op.drop_column('semesters', 'department_id')
    op.drop_column('semesters', 'academic_year_id')
    
    # Drop academic_years table
    op.drop_index('idx_academic_years_current', 'academic_years')
    op.drop_index('idx_academic_years_status', 'academic_years')
    op.drop_table('academic_years')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS marksworkflowstate")
    op.execute("DROP TYPE IF EXISTS markcomponenttype")
    op.execute("DROP TYPE IF EXISTS academicyearstatus")

