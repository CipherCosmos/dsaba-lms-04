"""
Database optimization and maintenance utilities.
"""

from sqlalchemy import text, Index, MetaData, Table, Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import *
import logging

logger = logging.getLogger(__name__)


def create_database_indexes():
    """Create optimized database indexes for better performance"""
    
    with engine.connect() as conn:
        # User table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
        """))
        
        # Department table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_departments_hod_id ON departments(hod_id);
        """))
        
        # Class table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_classes_department_id ON classes(department_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_classes_semester ON classes(semester);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_classes_name_semester ON classes(name, semester);
        """))
        
        # Subject table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON subjects(teacher_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
        """))
        
        # Exam table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_exams_exam_type ON exams(exam_type);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);
        """))
        
        # Question table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
        """))
        
        # Mark table indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks(exam_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_marks_question_id ON marks(question_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_marks_exam_student ON marks(exam_id, student_id);
        """))
        
        # CO/PO/PSO Framework indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_definitions_subject_id ON co_definitions(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_definitions_code ON co_definitions(code);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_po_definitions_department_id ON po_definitions(department_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_po_definitions_code ON po_definitions(code);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_po_definitions_type ON po_definitions(type);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_targets_subject_id ON co_targets(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_targets_co_id ON co_targets(co_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_weights_subject_id ON assessment_weights(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_weights_exam_type ON assessment_weights(exam_type);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_po_matrix_subject_id ON co_po_matrix(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_po_matrix_co_id ON co_po_matrix(co_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_co_po_matrix_po_id ON co_po_matrix(po_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_question_co_weights_question_id ON question_co_weights(question_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_question_co_weights_co_id ON question_co_weights(co_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_indirect_attainment_subject_id ON indirect_attainment(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_indirect_attainment_po_id ON indirect_attainment(po_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_indirect_attainment_co_id ON indirect_attainment(co_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_attainment_audit_subject_id ON attainment_audit(subject_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_attainment_audit_user_id ON attainment_audit(user_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_attainment_audit_timestamp ON attainment_audit(timestamp);
        """))
        
        # Student Goals and Milestones indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_goals_student_id ON student_goals(student_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_goals_status ON student_goals(status);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_goals_goal_type ON student_goals(goal_type);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_milestones_student_id ON student_milestones(student_id);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_milestones_achieved ON student_milestones(achieved);
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_student_milestones_milestone_type ON student_milestones(milestone_type);
        """))
        
        conn.commit()
        logger.info("Database indexes created successfully")


def analyze_database_performance():
    """Analyze database performance and suggest optimizations"""
    
    with engine.connect() as conn:
        # Get table sizes
        result = conn.execute(text("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        """))
        
        logger.info("Table sizes:")
        for row in result:
            logger.info(f"  {row.tablename}: {row.size}")
        
        # Get index usage statistics
        result = conn.execute(text("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC;
        """))
        
        logger.info("Index usage statistics:")
        for row in result:
            logger.info(f"  {row.tablename}.{row.indexname}: {row.idx_scan} scans, {row.idx_tup_read} reads")
        
        # Get slow queries (if pg_stat_statements is enabled)
        try:
            result = conn.execute(text("""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                ORDER BY mean_time DESC 
                LIMIT 10;
            """))
            
            logger.info("Slow queries:")
            for row in result:
                logger.info(f"  {row.query[:100]}... - {row.mean_time}ms avg, {row.calls} calls")
        except Exception as e:
            logger.warning(f"Could not get slow query statistics: {e}")


def optimize_database():
    """Run database optimization tasks"""
    
    with engine.connect() as conn:
        # Update table statistics
        conn.execute(text("ANALYZE;"))
        
        # Vacuum tables (SQLite compatible)
        conn.execute(text("VACUUM;"))
        
        # Reindex if needed (SQLite compatible)
        conn.execute(text("REINDEX;"))
        
        conn.commit()
        logger.info("Database optimization completed")


def check_database_integrity():
    """Check database integrity and consistency"""
    
    issues = []
    
    with engine.connect() as conn:
        # Check for orphaned records
        result = conn.execute(text("""
            SELECT 'users' as table_name, 'department_id' as column_name, COUNT(*) as orphaned_count
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.department_id IS NOT NULL AND d.id IS NULL
            UNION ALL
            SELECT 'users', 'class_id', COUNT(*)
            FROM users u
            LEFT JOIN classes c ON u.class_id = c.id
            WHERE u.class_id IS NOT NULL AND c.id IS NULL
            UNION ALL
            SELECT 'classes', 'department_id', COUNT(*)
            FROM classes c
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE d.id IS NULL
            UNION ALL
            SELECT 'subjects', 'class_id', COUNT(*)
            FROM subjects s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE c.id IS NULL
            UNION ALL
            SELECT 'subjects', 'teacher_id', COUNT(*)
            FROM subjects s
            LEFT JOIN users u ON s.teacher_id = u.id
            WHERE s.teacher_id IS NOT NULL AND u.id IS NULL
            UNION ALL
            SELECT 'exams', 'subject_id', COUNT(*)
            FROM exams e
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE s.id IS NULL
            UNION ALL
            SELECT 'questions', 'exam_id', COUNT(*)
            FROM questions q
            LEFT JOIN exams e ON q.exam_id = e.id
            WHERE e.id IS NULL
            UNION ALL
            SELECT 'marks', 'exam_id', COUNT(*)
            FROM marks m
            LEFT JOIN exams e ON m.exam_id = e.id
            WHERE e.id IS NULL
            UNION ALL
            SELECT 'marks', 'student_id', COUNT(*)
            FROM marks m
            LEFT JOIN users u ON m.student_id = u.id
            WHERE u.id IS NULL
            UNION ALL
            SELECT 'marks', 'question_id', COUNT(*)
            FROM marks m
            LEFT JOIN questions q ON m.question_id = q.id
            WHERE q.id IS NULL;
        """))
        
        for row in result:
            if row.orphaned_count > 0:
                issues.append(f"{row.table_name}.{row.column_name}: {row.orphaned_count} orphaned records")
        
        # Check for data consistency issues
        result = conn.execute(text("""
            SELECT 'marks_obtained > max_marks' as issue, COUNT(*) as count
            FROM marks m
            JOIN questions q ON m.question_id = q.id
            WHERE m.marks_obtained > q.max_marks
            UNION ALL
            SELECT 'negative_marks', COUNT(*)
            FROM marks
            WHERE marks_obtained < 0
            UNION ALL
            SELECT 'invalid_percentages', COUNT(*)
            FROM co_targets
            WHERE target_pct < 0 OR target_pct > 100
            UNION ALL
            SELECT 'invalid_weights', COUNT(*)
            FROM assessment_weights
            WHERE weight_pct < 0 OR weight_pct > 100;
        """))
        
        for row in result:
            if row.count > 0:
                issues.append(f"{row.issue}: {row.count} records")
        
        # Check for missing required data
        result = conn.execute(text("""
            SELECT 'subjects_without_teacher' as issue, COUNT(*) as count
            FROM subjects
            WHERE teacher_id IS NULL
            UNION ALL
            SELECT 'departments_without_hod', COUNT(*)
            FROM departments
            WHERE hod_id IS NULL
            UNION ALL
            SELECT 'classes_without_students', COUNT(*)
            FROM classes c
            LEFT JOIN users u ON c.id = u.class_id AND u.role = 'student'
            WHERE u.id IS NULL;
        """))
        
        for row in result:
            if row.count > 0:
                issues.append(f"{row.issue}: {row.count} records")
    
    if issues:
        logger.warning("Database integrity issues found:")
        for issue in issues:
            logger.warning(f"  - {issue}")
    else:
        logger.info("Database integrity check passed - no issues found")
    
    return issues


def cleanup_orphaned_data():
    """Clean up orphaned data from the database"""
    
    with engine.connect() as conn:
        # Delete orphaned marks
        conn.execute(text("""
            DELETE FROM marks 
            WHERE exam_id NOT IN (SELECT id FROM exams)
            OR student_id NOT IN (SELECT id FROM users WHERE role = 'student')
            OR question_id NOT IN (SELECT id FROM questions);
        """))
        
        # Delete orphaned questions
        conn.execute(text("""
            DELETE FROM questions 
            WHERE exam_id NOT IN (SELECT id FROM exams);
        """))
        
        # Delete orphaned exams
        conn.execute(text("""
            DELETE FROM exams 
            WHERE subject_id NOT IN (SELECT id FROM subjects);
        """))
        
        # Delete orphaned subjects
        conn.execute(text("""
            DELETE FROM subjects 
            WHERE class_id NOT IN (SELECT id FROM classes);
        """))
        
        # Delete orphaned classes
        conn.execute(text("""
            DELETE FROM classes 
            WHERE department_id NOT IN (SELECT id FROM departments);
        """))
        
        # Delete orphaned users (soft delete by deactivating)
        conn.execute(text("""
            UPDATE users 
            SET is_active = false 
            WHERE (department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM departments))
            OR (class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes));
        """))
        
        conn.commit()
        logger.info("Orphaned data cleanup completed")


def get_database_statistics():
    """Get comprehensive database statistics"""
    
    stats = {}
    
    with engine.connect() as conn:
        # Get record counts
        tables = [
            'users', 'departments', 'classes', 'subjects', 'exams', 
            'questions', 'marks', 'co_definitions', 'po_definitions',
            'co_targets', 'assessment_weights', 'co_po_matrix',
            'question_co_weights', 'indirect_attainment', 'attainment_audit',
            'student_goals', 'student_milestones'
        ]
        
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table};"))
            stats[table] = result.scalar()
        
        # Get user role distribution
        result = conn.execute(text("""
            SELECT role, COUNT(*) as count
            FROM users
            WHERE is_active = true
            GROUP BY role;
        """))
        
        stats['user_roles'] = {row.role: row.count for row in result}
        
        # Get exam statistics
        result = conn.execute(text("""
            SELECT 
                exam_type,
                COUNT(*) as count,
                AVG(total_marks) as avg_marks
            FROM exams
            GROUP BY exam_type;
        """))
        
        stats['exam_types'] = {
            row.exam_type: {
                'count': row.count,
                'avg_marks': float(row.avg_marks) if row.avg_marks else 0
            }
            for row in result
        }
        
        # Get marks statistics
        result = conn.execute(text("""
            SELECT 
                COUNT(*) as total_marks,
                AVG(marks_obtained) as avg_marks,
                MIN(marks_obtained) as min_marks,
                MAX(marks_obtained) as max_marks
            FROM marks;
        """))
        
        row = result.fetchone()
        if row:
            stats['marks'] = {
                'total_marks': row.total_marks,
                'avg_marks': float(row.avg_marks) if row.avg_marks else 0,
                'min_marks': float(row.min_marks) if row.min_marks else 0,
                'max_marks': float(row.max_marks) if row.max_marks else 0
            }
    
    return stats


def run_maintenance():
    """Run comprehensive database maintenance"""
    
    logger.info("Starting database maintenance...")
    
    # Check integrity
    issues = check_database_integrity()
    
    if issues:
        logger.warning(f"Found {len(issues)} integrity issues")
        # Optionally clean up orphaned data
        # cleanup_orphaned_data()
    else:
        logger.info("Database integrity check passed")
    
    # Create indexes
    create_database_indexes()
    
    # Optimize database
    optimize_database()
    
    # Get statistics
    stats = get_database_statistics()
    logger.info(f"Database statistics: {stats}")
    
    logger.info("Database maintenance completed")


if __name__ == "__main__":
    run_maintenance()
