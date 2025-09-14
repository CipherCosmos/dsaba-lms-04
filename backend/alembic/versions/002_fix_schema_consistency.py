"""Fix schema consistency issues

Revision ID: 002
Revises: 9b8013b0ad0a
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '9b8013b0ad0a'
branch_labels = None
depends_on = None


def upgrade():
    # Remove redundant co_code and po_code columns from co_targets
    op.drop_column('co_targets', 'co_code')
    
    # Remove redundant co_code and po_code columns from co_po_matrix
    op.drop_column('co_po_matrix', 'co_code')
    op.drop_column('co_po_matrix', 'po_code')
    
    # Remove redundant co_code column from question_co_weights
    op.drop_column('question_co_weights', 'co_code')
    
    # Remove redundant po_code and co_code columns from indirect_attainment
    op.drop_column('indirect_attainment', 'po_code')
    op.drop_column('indirect_attainment', 'co_code')
    
    # Add proper foreign key constraints
    op.create_foreign_key('fk_co_targets_co_id', 'co_targets', 'co_definitions', ['co_id'], ['id'])
    op.create_foreign_key('fk_co_po_matrix_co_id', 'co_po_matrix', 'co_definitions', ['co_id'], ['id'])
    op.create_foreign_key('fk_co_po_matrix_po_id', 'co_po_matrix', 'po_definitions', ['po_id'], ['id'])
    op.create_foreign_key('fk_question_co_weights_co_id', 'question_co_weights', 'co_definitions', ['co_id'], ['id'])
    op.create_foreign_key('fk_indirect_attainment_po_id', 'indirect_attainment', 'po_definitions', ['po_id'], ['id'])
    op.create_foreign_key('fk_indirect_attainment_co_id', 'indirect_attainment', 'co_definitions', ['co_id'], ['id'])
    
    # Add indexes for better performance
    op.create_index('ix_co_targets_co_id', 'co_targets', ['co_id'])
    op.create_index('ix_co_po_matrix_co_id', 'co_po_matrix', ['co_id'])
    op.create_index('ix_co_po_matrix_po_id', 'co_po_matrix', ['po_id'])
    op.create_index('ix_question_co_weights_co_id', 'question_co_weights', ['co_id'])
    op.create_index('ix_indirect_attainment_po_id', 'indirect_attainment', ['po_id'])
    op.create_index('ix_indirect_attainment_co_id', 'indirect_attainment', ['co_id'])


def downgrade():
    # Remove indexes
    op.drop_index('ix_indirect_attainment_co_id', table_name='indirect_attainment')
    op.drop_index('ix_indirect_attainment_po_id', table_name='indirect_attainment')
    op.drop_index('ix_question_co_weights_co_id', table_name='question_co_weights')
    op.drop_index('ix_co_po_matrix_po_id', table_name='co_po_matrix')
    op.drop_index('ix_co_po_matrix_co_id', table_name='co_po_matrix')
    op.drop_index('ix_co_targets_co_id', table_name='co_targets')
    
    # Remove foreign key constraints
    op.drop_constraint('fk_indirect_attainment_co_id', 'indirect_attainment', type_='foreignkey')
    op.drop_constraint('fk_indirect_attainment_po_id', 'indirect_attainment', type_='foreignkey')
    op.drop_constraint('fk_question_co_weights_co_id', 'question_co_weights', type_='foreignkey')
    op.drop_constraint('fk_co_po_matrix_po_id', 'co_po_matrix', type_='foreignkey')
    op.drop_constraint('fk_co_po_matrix_co_id', 'co_po_matrix', type_='foreignkey')
    op.drop_constraint('fk_co_targets_co_id', 'co_targets', type_='foreignkey')
    
    # Add back redundant columns
    op.add_column('indirect_attainment', sa.Column('co_code', sa.String(length=10), nullable=True))
    op.add_column('indirect_attainment', sa.Column('po_code', sa.String(length=10), nullable=True))
    op.add_column('question_co_weights', sa.Column('co_code', sa.String(length=10), nullable=False))
    op.add_column('co_po_matrix', sa.Column('po_code', sa.String(length=10), nullable=False))
    op.add_column('co_po_matrix', sa.Column('co_code', sa.String(length=10), nullable=False))
    op.add_column('co_targets', sa.Column('co_code', sa.String(length=10), nullable=False))
