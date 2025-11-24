"""redesign academic structure with batches and sections

Revision ID: 0006
Revises: 0005
Create Date: 2024-12-15 14:30:00.000000

This migration redesigns the academic structure to properly support:
- Batches per Academic Year + Department + Program
- Sections within batches
- Semesters per batch (not globally per academic year)
- Students linked to batch + section
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    # ============================================
    # Step 1: Create new BatchInstance table
    # Represents: Academic Year + Department + Program (Batch)
    # ============================================
    op.create_table(
        'batch_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('batch_id', sa.Integer(), nullable=False),  # FK to batches (program type)
        sa.Column('admission_year', sa.Integer(), nullable=False),
        sa.Column('current_semester', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('academic_year_id', 'department_id', 'batch_id', name='unique_batch_instance'),
        sa.CheckConstraint('current_semester BETWEEN 1 AND 12', name='check_batch_semester_range'),
        sa.CheckConstraint('admission_year >= 2000', name='check_admission_year')
    )
    op.create_index('idx_batch_instances_ay', 'batch_instances', ['academic_year_id'])
    op.create_index('idx_batch_instances_dept', 'batch_instances', ['department_id'])
    op.create_index('idx_batch_instances_batch', 'batch_instances', ['batch_id'])
    op.create_index('idx_batch_instances_active', 'batch_instances', ['is_active'])
    op.create_foreign_key('fk_batch_instances_ay', 'batch_instances', 'academic_years', ['academic_year_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_batch_instances_dept', 'batch_instances', 'departments', ['department_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_batch_instances_batch', 'batch_instances', 'batches', ['batch_id'], ['id'], ondelete='CASCADE')
    
    # ============================================
    # Step 2: Create Sections table
    # Represents: Sections within a batch (A, B, C, etc.)
    # ============================================
    op.create_table(
        'sections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('batch_instance_id', sa.Integer(), nullable=False),
        sa.Column('section_name', sa.String(10), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_instance_id', 'section_name', name='unique_section_per_batch'),
        sa.CheckConstraint("section_name ~ '^[A-Z]$'", name='check_section_name_format')
    )
    op.create_index('idx_sections_batch', 'sections', ['batch_instance_id'])
    op.create_index('idx_sections_active', 'sections', ['is_active'])
    op.create_foreign_key('fk_sections_batch_instance', 'sections', 'batch_instances', ['batch_instance_id'], ['id'], ondelete='CASCADE')
    
    # ============================================
    # Step 3: Update Semesters table
    # Add batch_instance_id, make it the primary link
    # Keep batch_year_id for backward compatibility (nullable)
    # ============================================
    op.add_column('semesters', sa.Column('batch_instance_id', sa.Integer(), nullable=True))
    op.create_index('idx_semesters_batch_instance', 'semesters', ['batch_instance_id'])
    op.create_foreign_key('fk_semesters_batch_instance', 'semesters', 'batch_instances', ['batch_instance_id'], ['id'], ondelete='CASCADE')
    
    # Update unique constraint to include batch_instance
    # First drop old constraint if exists
    op.drop_constraint('unique_semester_dept_ay', 'semesters', type_='unique')
    # Create new constraint: batch_instance + semester_no must be unique
    op.create_unique_constraint('unique_semester_batch_instance', 'semesters', ['batch_instance_id', 'semester_no'])
    
    # ============================================
    # Step 4: Update Students table
    # Add batch_instance_id and section_id
    # Keep batch_year_id for backward compatibility (nullable)
    # ============================================
    op.add_column('students', sa.Column('batch_instance_id', sa.Integer(), nullable=True))
    op.add_column('students', sa.Column('section_id', sa.Integer(), nullable=True))
    op.add_column('students', sa.Column('current_semester_id', sa.Integer(), nullable=True))
    op.add_column('students', sa.Column('academic_year_id', sa.Integer(), nullable=True))  # Denormalized for queries
    
    op.create_index('idx_students_batch_instance', 'students', ['batch_instance_id'])
    op.create_index('idx_students_section', 'students', ['section_id'])
    op.create_index('idx_students_current_semester', 'students', ['current_semester_id'])
    op.create_index('idx_students_ay', 'students', ['academic_year_id'])
    
    op.create_foreign_key('fk_students_batch_instance', 'students', 'batch_instances', ['batch_instance_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_students_section', 'students', 'sections', ['section_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_students_current_semester', 'students', 'semesters', ['current_semester_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_students_ay', 'students', 'academic_years', ['academic_year_id'], ['id'], ondelete='SET NULL')
    
    # ============================================
    # Step 5: Data Migration
    # Migrate existing BatchYearModel data to BatchInstance
    # ============================================

    # Get database connection for raw SQL operations
    conn = op.get_bind()

    # 1. Get or create current academic year
    # First, try to find an existing current academic year
    result = conn.execute(sa.text("""
        SELECT id, start_year, end_year FROM academic_years
        WHERE is_current = true
        ORDER BY start_year DESC
        LIMIT 1
    """)).fetchone()

    if result:
        current_ay_id = result[0]
        current_ay_start = result[1]
        current_ay_end = result[2]
    else:
        # Create a default academic year (2024-2025) if none exists
        current_ay_start = 2024
        current_ay_end = 2025
        result = conn.execute(sa.text("""
            INSERT INTO academic_years (start_year, end_year, display_name, is_current, status)
            VALUES (:start_year, :end_year, :display_name, true, 'active')
            RETURNING id
        """), {
            'start_year': current_ay_start,
            'end_year': current_ay_end,
            'display_name': f'{current_ay_start}-{current_ay_end}'
        })
        current_ay_id = result.fetchone()[0]
        op.execute(f"SELECT setval('academic_years_id_seq', {current_ay_id})")

    # 2. Migrate BatchYear data to BatchInstance
    # Get all batch_years with their associated department from classes/semesters
    batch_years = conn.execute(sa.text("""
        SELECT DISTINCT
            by.id as batch_year_id,
            by.batch_id,
            by.start_year,
            by.end_year,
            s.department_id
        FROM batch_years by
        JOIN semesters s ON s.batch_year_id = by.id
        WHERE s.department_id IS NOT NULL
        ORDER BY by.id
    """)).fetchall()

    batch_instance_map = {}  # batch_year_id -> batch_instance_id

    for batch_year in batch_years:
        batch_year_id = batch_year[0]
        batch_id = batch_year[1]
        start_year = batch_year[2]
        department_id = batch_year[4]

        # Create BatchInstance
        result = conn.execute(sa.text("""
            INSERT INTO batch_instances (
                academic_year_id, department_id, batch_id,
                admission_year, current_semester, is_active
            )
            VALUES (:ay_id, :dept_id, :batch_id, :admission_year, 1, true)
            RETURNING id
        """), {
            'ay_id': current_ay_id,
            'dept_id': department_id,
            'batch_id': batch_id,
            'admission_year': start_year
        })
        batch_instance_id = result.fetchone()[0]
        batch_instance_map[batch_year_id] = batch_instance_id

    # 3. Create sections from ClassModel.section
    # Get unique sections per batch_instance
    classes = conn.execute(sa.text("""
        SELECT DISTINCT
            c.section,
            s.batch_year_id
        FROM classes c
        JOIN semesters s ON s.id = c.semester_id
        WHERE c.section IS NOT NULL
        AND s.batch_year_id IS NOT NULL
        ORDER BY s.batch_year_id, c.section
    """)).fetchall()

    section_map = {}  # (batch_instance_id, section_name) -> section_id

    for class_row in classes:
        section_name = class_row[0]
        batch_year_id = class_row[1]

        if batch_year_id in batch_instance_map:
            batch_instance_id = batch_instance_map[batch_year_id]

            # Create section if it doesn't exist
            result = conn.execute(sa.text("""
                INSERT INTO sections (batch_instance_id, section_name, is_active)
                VALUES (:batch_instance_id, :section_name, true)
                ON CONFLICT (batch_instance_id, section_name) DO NOTHING
                RETURNING id
            """), {
                'batch_instance_id': batch_instance_id,
                'section_name': section_name
            })

            section_result = result.fetchone()
            if section_result:
                section_id = section_result[0]
                section_map[(batch_instance_id, section_name)] = section_id

    # 4. Update students to link to batch_instance + section
    # First, get students with their class information
    students = conn.execute(sa.text("""
        SELECT DISTINCT
            st.id as student_id,
            c.section,
            s.batch_year_id
        FROM students st
        LEFT JOIN classes c ON c.id = st.class_id
        LEFT JOIN semesters s ON s.id = c.semester_id
        WHERE st.batch_year_id IS NOT NULL
        OR st.class_id IS NOT NULL
    """)).fetchall()

    for student in students:
        student_id = student[0]
        section_name = student[1]
        batch_year_id = student[2]

        if batch_year_id and batch_year_id in batch_instance_map:
            batch_instance_id = batch_instance_map[batch_year_id]
            section_id = None

            if section_name and (batch_instance_id, section_name) in section_map:
                section_id = section_map[(batch_instance_id, section_name)]

            # Update student
            conn.execute(sa.text("""
                UPDATE students
                SET batch_instance_id = :batch_instance_id,
                    section_id = :section_id,
                    academic_year_id = :academic_year_id
                WHERE id = :student_id
            """), {
                'batch_instance_id': batch_instance_id,
                'section_id': section_id,
                'academic_year_id': current_ay_id,
                'student_id': student_id
            })

    # 5. Update semesters to link to batch_instance
    for batch_year_id, batch_instance_id in batch_instance_map.items():
        conn.execute(sa.text("""
            UPDATE semesters
            SET batch_instance_id = :batch_instance_id
            WHERE batch_year_id = :batch_year_id
        """), {
            'batch_instance_id': batch_instance_id,
            'batch_year_id': batch_year_id
        })


def downgrade():
    # Drop foreign keys and columns from students
    op.drop_constraint('fk_students_ay', 'students', type_='foreignkey')
    op.drop_constraint('fk_students_current_semester', 'students', type_='foreignkey')
    op.drop_constraint('fk_students_section', 'students', type_='foreignkey')
    op.drop_constraint('fk_students_batch_instance', 'students', type_='foreignkey')
    op.drop_index('idx_students_ay', 'students')
    op.drop_index('idx_students_current_semester', 'students')
    op.drop_index('idx_students_section', 'students')
    op.drop_index('idx_students_batch_instance', 'students')
    op.drop_column('students', 'academic_year_id')
    op.drop_column('students', 'current_semester_id')
    op.drop_column('students', 'section_id')
    op.drop_column('students', 'batch_instance_id')
    
    # Drop foreign keys and columns from semesters
    op.drop_constraint('unique_semester_batch_instance', 'semesters', type_='unique')
    op.create_unique_constraint('unique_semester_dept_ay', 'semesters', ['academic_year_id', 'department_id', 'semester_no'])
    op.drop_constraint('fk_semesters_batch_instance', 'semesters', type_='foreignkey')
    op.drop_index('idx_semesters_batch_instance', 'semesters')
    op.drop_column('semesters', 'batch_instance_id')
    
    # Drop sections table
    op.drop_table('sections')
    
    # Drop batch_instances table
    op.drop_table('batch_instances')

