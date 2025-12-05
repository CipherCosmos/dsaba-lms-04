"""API Version 1 Endpoints"""

from fastapi import APIRouter

from src.api.v1 import (
    auth,
    users,
    departments,
    subjects,
    academic_structure,
    exams,
    questions,
    marks,
    dashboard,
    profile,
    subject_assignments,
    students,
    final_marks,
    internal_marks,
    analytics,
    reports,
    pdf_generation,
    academic_years,
    batch_instances,
    student_enrollments,
    program_outcomes,
    course_outcomes,
    co_po_mappings,
    co_po_attainment,
    smart_marks,
    bulk_uploads,
    audit,
    monitoring,
    teachers,
    indirect_attainment
)

# Create main API router
router = APIRouter(prefix="/api/v1")

# Include all sub-routers
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(teachers.router)
router.include_router(departments.router)
router.include_router(subjects.router)
router.include_router(academic_structure.router)
router.include_router(exams.router)
router.include_router(questions.router)
router.include_router(marks.router)
router.include_router(dashboard.router)
router.include_router(profile.router)
router.include_router(subject_assignments.router)
router.include_router(students.router)
router.include_router(final_marks.router)
router.include_router(internal_marks.router)
router.include_router(analytics.router)
router.include_router(reports.router)
router.include_router(pdf_generation.router)
router.include_router(academic_years.router)
router.include_router(batch_instances.router)
router.include_router(student_enrollments.router)
router.include_router(program_outcomes.router)
router.include_router(course_outcomes.router)
router.include_router(co_po_mappings.router)
router.include_router(co_po_attainment.router)
router.include_router(smart_marks.router)
router.include_router(bulk_uploads.router)
router.include_router(audit.router)
router.include_router(monitoring.router)
router.include_router(indirect_attainment.router)
