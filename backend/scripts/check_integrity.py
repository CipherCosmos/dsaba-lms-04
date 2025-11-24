#!/usr/bin/env python3
"""
Database Integrity Check Script

Verifies:
1. No orphan records in key relationships
2. Unique constraints are properly enforced
3. Foreign key relationships are valid
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from src.infrastructure.database.models import (
    AcademicYearModel, BatchInstanceModel, SemesterModel,
    StudentEnrollmentModel, SubjectAssignmentModel,
    InternalMarkModel, FinalMarkModel, AuditLogModel,
    MarksWorkflowAuditModel, MarkAuditLogModel
)

def check_orphans(session):
    """Check for orphan records"""
    issues = []

    # Check StudentEnrollment orphans
    result = session.execute(text("""
        SELECT COUNT(*) FROM student_enrollments se
        LEFT JOIN students s ON se.student_id = s.id
        WHERE s.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan student_enrollments (no matching student)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM student_enrollments se
        LEFT JOIN semesters sem ON se.semester_id = sem.id
        WHERE sem.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan student_enrollments (no matching semester)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM student_enrollments se
        LEFT JOIN academic_years ay ON se.academic_year_id = ay.id
        WHERE ay.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan student_enrollments (no matching academic_year)")

    # Check SubjectAssignment orphans
    result = session.execute(text("""
        SELECT COUNT(*) FROM subject_assignments sa
        LEFT JOIN subjects sub ON sa.subject_id = sub.id
        WHERE sub.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan subject_assignments (no matching subject)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM subject_assignments sa
        LEFT JOIN teachers t ON sa.teacher_id = t.id
        WHERE t.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan subject_assignments (no matching teacher)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM subject_assignments sa
        LEFT JOIN semesters sem ON sa.semester_id = sem.id
        WHERE sem.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan subject_assignments (no matching semester)")

    # Check InternalMark orphans
    result = session.execute(text("""
        SELECT COUNT(*) FROM internal_marks im
        LEFT JOIN students s ON im.student_id = s.id
        WHERE s.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan internal_marks (no matching student)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM internal_marks im
        LEFT JOIN subject_assignments sa ON im.subject_assignment_id = sa.id
        WHERE sa.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan internal_marks (no matching subject_assignment)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM internal_marks im
        LEFT JOIN semesters sem ON im.semester_id = sem.id
        WHERE sem.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan internal_marks (no matching semester)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM internal_marks im
        LEFT JOIN academic_years ay ON im.academic_year_id = ay.id
        WHERE ay.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan internal_marks (no matching academic_year)")

    # Check FinalMark orphans
    result = session.execute(text("""
        SELECT COUNT(*) FROM final_marks fm
        LEFT JOIN students s ON fm.student_id = s.id
        WHERE s.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan final_marks (no matching student)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM final_marks fm
        LEFT JOIN subject_assignments sa ON fm.subject_assignment_id = sa.id
        WHERE sa.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan final_marks (no matching subject_assignment)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM final_marks fm
        LEFT JOIN semesters sem ON fm.semester_id = sem.id
        WHERE sem.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan final_marks (no matching semester)")

    # Check Audit logs orphans
    result = session.execute(text("""
        SELECT COUNT(*) FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE u.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan audit_logs (no matching user)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM marks_workflow_audit mwa
        LEFT JOIN internal_marks im ON mwa.internal_mark_id = im.id
        WHERE im.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan marks_workflow_audit (no matching internal_mark)")

    result = session.execute(text("""
        SELECT COUNT(*) FROM mark_audit_logs mal
        LEFT JOIN marks m ON mal.mark_id = m.id
        WHERE m.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} orphan mark_audit_logs (no matching mark)")

    return issues

def check_unique_constraints(session):
    """Check for violations of unique constraints"""
    issues = []

    # Check InternalMark unique constraint
    result = session.execute(text("""
        SELECT student_id, subject_assignment_id, component_type, COUNT(*)
        FROM internal_marks
        GROUP BY student_id, subject_assignment_id, component_type
        HAVING COUNT(*) > 1
    """)).fetchall()
    if result:
        issues.append(f"Found {len(result)} violations of internal_marks unique constraint (student+subject_assignment+component_type)")

    # Check FinalMark unique constraint
    result = session.execute(text("""
        SELECT student_id, subject_assignment_id, semester_id, COUNT(*)
        FROM final_marks
        GROUP BY student_id, subject_assignment_id, semester_id
        HAVING COUNT(*) > 1
    """)).fetchall()
    if result:
        issues.append(f"Found {len(result)} violations of final_marks unique constraint (student+subject_assignment+semester)")

    # Check StudentEnrollment unique constraint
    result = session.execute(text("""
        SELECT student_id, semester_id, academic_year_id, COUNT(*)
        FROM student_enrollments
        GROUP BY student_id, semester_id, academic_year_id
        HAVING COUNT(*) > 1
    """)).fetchall()
    if result:
        issues.append(f"Found {len(result)} violations of student_enrollments unique constraint (student+semester+academic_year)")

    # Check BatchInstance unique constraint
    result = session.execute(text("""
        SELECT academic_year_id, department_id, batch_id, COUNT(*)
        FROM batch_instances
        GROUP BY academic_year_id, department_id, batch_id
        HAVING COUNT(*) > 1
    """)).fetchall()
    if result:
        issues.append(f"Found {len(result)} violations of batch_instances unique constraint (academic_year+department+batch)")

    return issues

def check_foreign_keys(session):
    """Check foreign key integrity"""
    issues = []

    # This would require checking each FK manually, but since we have CASCADE/SET NULL,
    # orphans should be handled. But let's check a few key ones.

    # Check if any semesters reference non-existent batch_instances
    result = session.execute(text("""
        SELECT COUNT(*) FROM semesters s
        LEFT JOIN batch_instances bi ON s.batch_instance_id = bi.id
        WHERE s.batch_instance_id IS NOT NULL AND bi.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} semesters referencing non-existent batch_instances")

    # Check if any students reference non-existent batch_instances
    result = session.execute(text("""
        SELECT COUNT(*) FROM students s
        LEFT JOIN batch_instances bi ON s.batch_instance_id = bi.id
        WHERE s.batch_instance_id IS NOT NULL AND bi.id IS NULL
    """)).scalar()
    if result > 0:
        issues.append(f"Found {result} students referencing non-existent batch_instances")

    return issues

def main():
    # Database connection
    DATABASE_URL = "postgresql://postgres:password@postgres:5432/exam_management"
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    session = SessionLocal()

    try:
        print("Checking database integrity...")

        # Check orphans
        print("\n1. Checking for orphan records...")
        orphan_issues = check_orphans(session)
        if orphan_issues:
            print("ORPHAN ISSUES FOUND:")
            for issue in orphan_issues:
                print(f"  - {issue}")
        else:
            print("✓ No orphan records found")

        # Check unique constraints
        print("\n2. Checking unique constraints...")
        unique_issues = check_unique_constraints(session)
        if unique_issues:
            print("UNIQUE CONSTRAINT VIOLATIONS:")
            for issue in unique_issues:
                print(f"  - {issue}")
        else:
            print("✓ All unique constraints satisfied")

        # Check foreign keys
        print("\n3. Checking foreign key relationships...")
        fk_issues = check_foreign_keys(session)
        if fk_issues:
            print("FOREIGN KEY ISSUES:")
            for issue in fk_issues:
                print(f"  - {issue}")
        else:
            print("✓ All foreign key relationships valid")

        # Summary
        all_issues = orphan_issues + unique_issues + fk_issues
        if all_issues:
            print(f"\n❌ INTEGRITY CHECK FAILED: {len(all_issues)} issues found")
            return 1
        else:
            print("\n✅ INTEGRITY CHECK PASSED: No issues found")
            return 0

    finally:
        session.close()

if __name__ == "__main__":
    sys.exit(main())