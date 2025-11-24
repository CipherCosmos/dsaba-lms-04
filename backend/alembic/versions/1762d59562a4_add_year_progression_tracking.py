"""add_year_progression_tracking

Revision ID: 1762d59562a4
Revises: bcf5161c3406
Create Date: 2025-11-24 18:03:29.914785

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1762d59562a4'
down_revision = 'bcf5161c3406'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add year progression tracking system"""
    
    # 1. Create student_year_progression table
    op.create_table(
        'student_year_progression',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_year_level', sa.Integer(), nullable=False),
        sa.Column('to_year_level', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), sa.ForeignKey('academic_years.id', ondelete='CASCADE'), nullable=False),
        sa.Column('promotion_date', sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column('promotion_type', sa.String(20), default='regular'),
        sa.Column('promoted_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cgpa', sa.DECIMAL(3, 2), nullable=True),
        sa.Column('sgpa', sa.DECIMAL(3, 2), nullable=True),
        sa.Column('total_credits_earned', sa.Integer(), nullable=True),
        sa.Column('backlogs_count', sa.Integer(), default=0),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('idx_progression_student', 'student_year_progression', ['student_id'])
    op.create_index('idx_progression_year', 'student_year_progression', ['academic_year_id'])
    op.create_index('idx_progression_from_to', 'student_year_progression', ['from_year_level', 'to_year_level'])
    
    # 2. Add year fields to students table
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_year_level', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('expected_graduation_year', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('is_detained', sa.Boolean(), default=False, server_default='0'))
        batch_op.add_column(sa.Column('backlog_count', sa.Integer(), default=0, server_default='0'))
    
    # 3. Add year fields to batch_instances table
    with op.batch_alter_table('batch_instances', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_year', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('expected_graduation_year', sa.Integer(), nullable=True))
    
    # 4. Add academic_year_level to semesters table
    with op.batch_alter_table('semesters', schema=None) as batch_op:
        batch_op.add_column(sa.Column('academic_year_level', sa.Integer(), nullable=True))
    
    # 5. Backfill data
    conn = op.get_bind()
    
    # Calculate academic_year_level from semester_no (1-2=Year1, 3-4=Year2, etc.)
    conn.execute(sa.text("""
        UPDATE semesters 
        SET academic_year_level = CAST((semester_no + 1) / 2 AS INTEGER)
        WHERE academic_year_level IS NULL
    """))
    
    # Calculate current_year_level for students based on current semester
    conn.execute(sa.text("""
        UPDATE students s
        SET current_year_level = CAST((
            SELECT semester_no FROM semesters 
            WHERE id = s.current_semester_id
        ) / 2.0 + 0.5 AS INTEGER)
        WHERE current_semester_id IS NOT NULL
    """))
    
    # Calculate expected_graduation_year for students
    conn.execute(sa.text("""
        UPDATE students s
        SET expected_graduation_year = (
            SELECT bi.admission_year + b.duration_years
            FROM batch_instances bi
            JOIN batches b ON bi.batch_id = b.id
            WHERE bi.id = s.batch_instance_id
        )
        WHERE batch_instance_id IS NOT NULL
    """))
    
    # Calculate current_year for batch_instances
    conn.execute(sa.text("""
        UPDATE batch_instances
        SET current_year = CAST((current_semester + 1) / 2 AS INTEGER)
    """))
    
    # Calculate expected_graduation_year for batch_instances
    conn.execute(sa.text("""
        UPDATE batch_instances bi
        SET expected_graduation_year = bi.admission_year + (
            SELECT b.duration_years FROM batches b WHERE b.id = bi.batch_id
        )
    """))
    
    # 6. Make academic_year_level non-nullable after backfill
    with op.batch_alter_table('semesters', schema=None) as batch_op:
        batch_op.alter_column('academic_year_level', nullable=False)
    
    print("✅ Year progression system added successfully!")
    print("   - student_year_progression table created")
    print("   - Year fields added to students and batch_instances")
    print("   - Data backfilled for existing records")


def downgrade() -> None:
    """Remove year progression tracking"""
    # Drop indexes
    op.drop_index('idx_progression_from_to', table_name='student_year_progression')
    op.drop_index('idx_progression_year', table_name='student_year_progression')
    op.drop_index('idx_progression_student', table_name='student_year_progression')
    
    # Drop table
    op.drop_table('student_year_progression')
    
    # Remove columns from students
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('backlog_count')
        batch_op.drop_column('is_detained')
        batch_op.drop_column('expected_graduation_year')
        batch_op.drop_column('current_year_level')
    
    # Remove columns from batch_instances
    with op.batch_alter_table('batch_instances', schema=None) as batch_op:
        batch_op.drop_column('expected_graduation_year')
        batch_op.drop_column('current_year')
    
    # Remove column from semesters
    with op.batch_alter_table('semesters', schema=None) as batch_op:
        batch_op.drop_column('academic_year_level')
    
    print("⚠️  Year progression system removed")