"""drop_legacy_class_columns

Revision ID: bcf5161c3406
Revises: 1e8d417fd158
Create Date: 2025-11-24 17:58:59.894899

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bcf5161c3406'
down_revision = '1e8d417fd158'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop legacy class_id and batch_year_id columns"""
    # Verify no data exists in legacy columns before dropping
    conn = op.get_bind()
    
    # Check students table
    result = conn.execute(sa.text("""
        SELECT COUNT(*) as count FROM students 
        WHERE class_id IS NOT NULL OR batch_year_id IS NOT NULL
    """)).fetchone()
    
    if result and result[0] > 0:
        print(f"WARNING: Found {result[0]} students with legacy class_id/batch_year_id data")
        print("Proceeding with drop - data will be lost!")
    
    # Check subject_assignments table
    result = conn.execute(sa.text("""
        SELECT COUNT(*) as count FROM subject_assignments WHERE class_id IS NOT NULL
    """)).fetchone()
    
    if result and result[0] > 0:
        print(f"WARNING: Found {result[0]} subject assignments with legacy class_id data")
    
    # Check semesters table
    result = conn.execute(sa.text("""
        SELECT COUNT(*) as count FROM semesters WHERE batch_year_id IS NOT NULL
    """)).fetchone()
    
    if result and result[0] > 0:
        print(f"WARNING: Found {result[0]} semesters with legacy batch_year_id data")
    
    # Drop columns using batch operations for SQLite/Postgres compatibility
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('class_id')
        batch_op.drop_column('batch_year_id')
    
    with op.batch_alter_table('subject_assignments', schema=None) as batch_op:
        batch_op.drop_column('class_id')
    
    with op.batch_alter_table('semesters', schema=None) as batch_op:
        batch_op.drop_column('batch_year_id')
    
    print("✅ Successfully dropped all legacy class columns")


def downgrade() -> None:
    """Restore legacy columns (they will be empty)"""
    # Recreate columns as nullable for rollback capability
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.add_column(sa.Column('class_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('batch_year_id', sa.Integer(), nullable=True))
    
    with op.batch_alter_table('subject_assignments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('class_id', sa.Integer(), nullable=True))
    
    with op.batch_alter_table('semesters', schema=None) as batch_op:
        batch_op.add_column(sa.Column('batch_year_id', sa.Integer(), nullable=True))
    
    print("⚠️  Legacy columns restored but data is not recoverable")