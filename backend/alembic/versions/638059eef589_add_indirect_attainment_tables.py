"""add_indirect_attainment_tables

Revision ID: 638059eef589
Revises: 4f4ddae55477
Create Date: 2025-11-16 22:28:06.486658

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '638059eef589'
down_revision = '4f4ddae55477'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create surveys table
    op.create_table('surveys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('target_audience', sa.String(length=50), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('draft', 'active', 'closed')", name='check_survey_status')
    )
    op.create_index('idx_surveys_department', 'surveys', ['department_id'])
    op.create_index('idx_surveys_academic_year', 'surveys', ['academic_year_id'])
    op.create_index('idx_surveys_status', 'surveys', ['status'])

    # Create survey_questions table
    op.create_table('survey_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('survey_id', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(length=20), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('required', sa.Boolean(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['survey_id'], ['surveys.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("question_type IN ('rating', 'text', 'multiple_choice', 'yes_no')", name='check_question_type')
    )
    op.create_index('idx_survey_questions_survey', 'survey_questions', ['survey_id'])

    # Create survey_responses table
    op.create_table('survey_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('survey_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('respondent_id', sa.Integer(), nullable=False),
        sa.Column('response_value', sa.Text(), nullable=True),
        sa.Column('rating_value', sa.Integer(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['survey_id'], ['surveys.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['survey_questions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['respondent_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('survey_id', 'respondent_id', name='unique_survey_response')
    )
    op.create_index('idx_survey_responses_survey', 'survey_responses', ['survey_id'])
    op.create_index('idx_survey_responses_respondent', 'survey_responses', ['respondent_id'])
    op.create_index('idx_survey_responses_question', 'survey_responses', ['question_id'])

    # Create exit_exams table
    op.create_table('exit_exams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('exam_date', sa.Date(), nullable=True),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('passing_score', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('draft', 'active', 'completed')", name='check_exit_exam_status')
    )
    op.create_index('idx_exit_exams_department', 'exit_exams', ['department_id'])
    op.create_index('idx_exit_exams_academic_year', 'exit_exams', ['academic_year_id'])
    op.create_index('idx_exit_exams_status', 'exit_exams', ['status'])

    # Create exit_exam_results table
    op.create_table('exit_exam_results',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('exit_exam_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('max_score', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('percentage', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['exit_exam_id'], ['exit_exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('exit_exam_id', 'student_id', name='unique_exit_exam_result')
    )
    op.create_index('idx_exit_exam_results_exam', 'exit_exam_results', ['exit_exam_id'])
    op.create_index('idx_exit_exam_results_student', 'exit_exam_results', ['student_id'])


def downgrade() -> None:
    # Drop tables in reverse order (due to foreign key constraints)
    op.drop_table('exit_exam_results')
    op.drop_table('exit_exams')
    op.drop_table('survey_responses')
    op.drop_table('survey_questions')
    op.drop_table('surveys')