"""Add password reset tokens and profile fields

Revision ID: 003
Revises: 002
Create Date: 2024-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Check if columns exist before adding them
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Add profile fields to users table (only if they don't exist)
    if 'phone_number' not in users_columns:
        op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))
    
    if 'avatar_url' not in users_columns:
        op.add_column('users', sa.Column('avatar_url', sa.String(255), nullable=True))
    
    if 'bio' not in users_columns:
        op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    
    # Create index for phone_number (only if column exists)
    if 'phone_number' in users_columns or 'phone_number' not in users_columns:
        try:
            op.create_index('idx_users_phone', 'users', ['phone_number'])
        except Exception:
            pass  # Index might already exist
    
    # Create password_reset_tokens table (only if it doesn't exist)
    from sqlalchemy import inspect
    existing_tables = inspector.get_table_names()
    
    if 'password_reset_tokens' not in existing_tables:
        op.create_table(
            'password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(255), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create indexes for password_reset_tokens
        try:
            op.create_index('idx_reset_tokens_user', 'password_reset_tokens', ['user_id'])
            op.create_index('idx_reset_tokens_token', 'password_reset_tokens', ['token'])
            op.create_index('idx_reset_tokens_expires', 'password_reset_tokens', ['expires_at'])
        except Exception:
            pass  # Indexes might already exist


def downgrade():
    # Drop password_reset_tokens table
    op.drop_index('idx_reset_tokens_expires', table_name='password_reset_tokens')
    op.drop_index('idx_reset_tokens_token', table_name='password_reset_tokens')
    op.drop_index('idx_reset_tokens_user', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')
    
    # Remove profile fields from users table
    op.drop_index('idx_users_phone', table_name='users')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'phone_number')

