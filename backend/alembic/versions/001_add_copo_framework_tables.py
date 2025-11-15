"""Add CO/PO/PSO framework tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Check if enum types already exist and create them if they don't (PostgreSQL only)
    from sqlalchemy import text
    from sqlalchemy.engine import reflection
    
    conn = op.get_bind()
    dialect_name = conn.dialect.name
    
    # Only create enum types for PostgreSQL (SQLite uses strings)
    if dialect_name == 'postgresql':
        # Check if potype enum exists
        try:
            result = conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'potype'"))
            if not result.fetchone():
                op.execute("CREATE TYPE potype AS ENUM ('PO', 'PSO')")
        except Exception:
            pass  # Enum might already exist
        
        # Check if attainmentlevel enum exists
        try:
            result = conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'attainmentlevel'"))
            if not result.fetchone():
                op.execute("CREATE TYPE attainmentlevel AS ENUM ('L1', 'L2', 'L3')")
        except Exception:
            pass
        
        # Check if indirectsource enum exists
        try:
            result = conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'indirectsource'"))
            if not result.fetchone():
                op.execute("CREATE TYPE indirectsource AS ENUM ('course_exit_survey', 'employer_feedback', 'alumni_survey', 'industry_feedback')")
        except Exception:
            pass
    
    # Create CO definitions table
    op.create_table('co_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_co_definitions_id'), 'co_definitions', ['id'], unique=False)

    # Create PO definitions table
    op.create_table('po_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(length=10), nullable=False),  # Changed from Enum to String for SQLite compatibility
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_po_definitions_id'), 'po_definitions', ['id'], unique=False)

    # Create CO targets table
    op.create_table('co_targets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('co_code', sa.String(length=10), nullable=False),
        sa.Column('target_pct', sa.Float(), nullable=False),
        sa.Column('l1_threshold', sa.Float(), nullable=False),
        sa.Column('l2_threshold', sa.Float(), nullable=False),
        sa.Column('l3_threshold', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_co_targets_id'), 'co_targets', ['id'], unique=False)

    # Create assessment weights table
    op.create_table('assessment_weights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('exam_type', sa.String(length=20), nullable=False),  # Changed from Enum to String for SQLite compatibility
        sa.Column('weight_pct', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assessment_weights_id'), 'assessment_weights', ['id'], unique=False)

    # Create CO-PO matrix table
    op.create_table('co_po_matrix',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('co_code', sa.String(length=10), nullable=False),
        sa.Column('po_code', sa.String(length=10), nullable=False),
        sa.Column('strength', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_co_po_matrix_id'), 'co_po_matrix', ['id'], unique=False)

    # Create question CO weights table
    op.create_table('question_co_weights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('co_code', sa.String(length=10), nullable=False),
        sa.Column('weight_pct', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_question_co_weights_id'), 'question_co_weights', ['id'], unique=False)

    # Create indirect attainment table
    op.create_table('indirect_attainment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('po_code', sa.String(length=10), nullable=True),
        sa.Column('co_code', sa.String(length=10), nullable=True),
        sa.Column('value_pct', sa.Float(), nullable=False),
        sa.Column('term', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_indirect_attainment_id'), 'indirect_attainment', ['id'], unique=False)

    # Create attainment audit table
    op.create_table('attainment_audit',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('change', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=True),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attainment_audit_id'), 'attainment_audit', ['id'], unique=False)

    # Add co_weighting_mode column to questions table
    op.add_column('questions', sa.Column('co_weighting_mode', sa.String(length=20), nullable=True))
    op.execute("UPDATE questions SET co_weighting_mode = 'equal_split' WHERE co_weighting_mode IS NULL")
    op.alter_column('questions', 'co_weighting_mode', nullable=False)


def downgrade():
    # Remove co_weighting_mode column from questions table
    op.drop_column('questions', 'co_weighting_mode')
    
    # Drop all new tables
    op.drop_table('attainment_audit')
    op.drop_table('indirect_attainment')
    op.drop_table('question_co_weights')
    op.drop_table('co_po_matrix')
    op.drop_table('assessment_weights')
    op.drop_table('co_targets')
    op.drop_table('po_definitions')
    op.drop_table('co_definitions')
    
    # Drop custom enum types (PostgreSQL only)
    from sqlalchemy import text
    
    conn = op.get_bind()
    dialect_name = conn.dialect.name
    
    if dialect_name == 'postgresql':
        # Check if examtype is used by other tables
        try:
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE udt_name = 'examtype'
            """))
            if result.scalar() == 0:
                op.execute('DROP TYPE IF EXISTS examtype')
        except Exception:
            pass
        
        # Drop other enum types
        try:
            op.execute('DROP TYPE IF EXISTS indirectsource')
            op.execute('DROP TYPE IF EXISTS attainmentlevel')
            op.execute('DROP TYPE IF EXISTS potype')
        except Exception:
            pass
