"""
Pytest Configuration and Shared Fixtures
Provides test database, authentication, and other shared test utilities
"""

import pytest
import os
import sys
from typing import Generator, AsyncGenerator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient
import tempfile
from datetime import datetime, timedelta

# Set test environment variables before importing app
# Remove old env vars that might conflict
for old_var in ["SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES"]:
    os.environ.pop(old_var, None)

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only-do-not-use-in-production-32chars")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ENV", "test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/1")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Import database module first to ensure relationships are configured
# This must happen before importing app which uses the models
from src.infrastructure.database import models as _  # noqa: F401

from src.main import app
from src.infrastructure.database.session import Base, get_db, create_tables
from src.infrastructure.database.models import (
    UserModel, DepartmentModel, RoleModel, UserRoleModel,
    SectionModel, BatchModel, SemesterModel,
    SubjectModel, SubjectAssignmentModel, ExamModel,
    QuestionModel, SubQuestionModel, MarkModel, FinalMarkModel,
    CourseOutcomeModel, ProgramOutcomeModel, COPOMappingModel,
    BatchInstanceModel
)
from src.infrastructure.security.password_hasher import PasswordHasher
from src.infrastructure.security.jwt_handler import JWTHandler
from src.domain.enums.user_role import UserRole
from src.domain.value_objects.email import Email


# ============================================
# Test Database Setup
# ============================================

@pytest.fixture(scope="session")
def test_db_url():
    """Create a temporary SQLite database for testing"""
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    db_url = f"sqlite:///{db_path}"
    
    yield db_url
    
    # Cleanup
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture(scope="session")
def test_engine(test_db_url):
    """Create test database engine"""
    engine = create_engine(
        test_db_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    
    # Enable foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Cleanup
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def test_db_session(test_engine):
    """Create a test database session for each test"""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )
    
    session = TestingSessionLocal()
    
    try:
        # Clear all tables before each test for isolation
        # This ensures tests don't interfere with each other
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def override_get_db(test_db_session):
    """Override the get_db dependency"""
    from typing import Generator
    
    def _get_db() -> Generator[Session, None, None]:
        try:
            yield test_db_session
        finally:
            # Don't close the session here, it's managed by test_db_session fixture
            pass
    
    # Override the dependency
    from src.infrastructure.database.session import get_db
    app.dependency_overrides[get_db] = _get_db
    
    yield test_db_session
    
    # Clean up override
    app.dependency_overrides.clear()


# ============================================
# Test Clients
# ============================================

@pytest.fixture(scope="function")
def client(override_get_db):
    """Create a test client for API testing"""
    return TestClient(app)


@pytest.fixture(scope="function")
async def async_client(override_get_db):
    """Create an async test client for API testing"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# ============================================
# Authentication Fixtures
# ============================================

@pytest.fixture
def password_hasher():
    """Password hasher instance"""
    return PasswordHasher()


@pytest.fixture
def jwt_handler():
    """JWT handler instance"""
    return JWTHandler()


@pytest.fixture
def admin_user(test_db_session, password_hasher):
    """Create an admin user for testing"""
    # Create admin role
    admin_role = test_db_session.query(RoleModel).filter(
        RoleModel.name == UserRole.ADMIN.value
    ).first()
    
    if not admin_role:
        admin_role = RoleModel(name=UserRole.ADMIN.value, description="Admin")
        test_db_session.add(admin_role)
        test_db_session.commit()
        test_db_session.refresh(admin_role)
    
    # Create admin user
    admin = UserModel(
        username="admin",
        email="admin@test.com",
        first_name="Admin",
        last_name="User",
        hashed_password=password_hasher.hash("admin123"),
        is_active=True,
        email_verified=True
    )
    test_db_session.add(admin)
    test_db_session.commit()
    test_db_session.refresh(admin)
    
    # Assign admin role
    user_role = UserRoleModel(user_id=admin.id, role_id=admin_role.id)
    test_db_session.add(user_role)
    test_db_session.commit()
    
    return admin


@pytest.fixture
def teacher_user(test_db_session, password_hasher, department):
    """Create a teacher user for testing"""
    from src.infrastructure.database.models import TeacherModel
    
    # Create teacher role
    teacher_role = test_db_session.query(RoleModel).filter(
        RoleModel.name == UserRole.TEACHER.value
    ).first()
    
    if not teacher_role:
        teacher_role = RoleModel(name=UserRole.TEACHER.value, description="Teacher")
        test_db_session.add(teacher_role)
        test_db_session.commit()
        test_db_session.refresh(teacher_role)
    
    # Create teacher user
    teacher = UserModel(
        username="teacher",
        email="teacher@test.com",
        first_name="Test",
        last_name="Teacher",
        hashed_password=password_hasher.hash("teacher123"),
        is_active=True,
        email_verified=True
    )
    test_db_session.add(teacher)
    test_db_session.commit()
    test_db_session.refresh(teacher)
    
    # Create teacher profile
    teacher_profile = TeacherModel(
        user_id=teacher.id,
        department_id=department.id,
        employee_id="T001"
    )
    test_db_session.add(teacher_profile)
    test_db_session.commit()
    
    # Assign teacher role
    user_role = UserRoleModel(user_id=teacher.id, role_id=teacher_role.id)
    test_db_session.add(user_role)
    test_db_session.commit()
    
    return teacher


@pytest.fixture
def batch_instance(test_db_session, department, batch, academic_year):
    """Create a test batch instance"""
    batch_instance = BatchInstanceModel(
        academic_year_id=academic_year.id,
        department_id=department.id,
        batch_id=batch.id,
        admission_year=2024,
        current_semester=1
    )
    test_db_session.add(batch_instance)
    test_db_session.commit()
    test_db_session.refresh(batch_instance)
    return batch_instance


@pytest.fixture
def student_user(test_db_session, password_hasher, batch_instance, department):
    """Create a student user for testing"""
    from src.infrastructure.database.models import StudentModel

    # Create student role
    student_role = test_db_session.query(RoleModel).filter(
        RoleModel.name == UserRole.STUDENT.value
    ).first()

    if not student_role:
        student_role = RoleModel(name=UserRole.STUDENT.value, description="Student")
        test_db_session.add(student_role)
        test_db_session.commit()
        test_db_session.refresh(student_role)

    # Create student user
    student = UserModel(
        username="student",
        email="student@test.com",
        first_name="Test",
        last_name="Student",
        hashed_password=password_hasher.hash("student123"),
        is_active=True,
        email_verified=True
    )
    test_db_session.add(student)
    test_db_session.commit()
    test_db_session.refresh(student)

    # Create student profile
    student_profile = StudentModel(
        user_id=student.id,
        roll_no="ST001",
        department_id=department.id,
        batch_instance_id=batch_instance.id
    )
    test_db_session.add(student_profile)
    test_db_session.commit()

    # Assign student role
    user_role = UserRoleModel(user_id=student.id, role_id=student_role.id)
    test_db_session.add(user_role)
    test_db_session.commit()

    return student


@pytest.fixture
def hod_user(test_db_session, password_hasher, department):
    """Create an HOD user for testing"""
    from src.infrastructure.database.models import TeacherModel
    
    # Create HOD role
    hod_role = test_db_session.query(RoleModel).filter(
        RoleModel.name == UserRole.HOD.value
    ).first()
    
    if not hod_role:
        hod_role = RoleModel(name=UserRole.HOD.value, description="HOD")
        test_db_session.add(hod_role)
        test_db_session.commit()
        test_db_session.refresh(hod_role)
    
    # Create HOD user
    hod = UserModel(
        username="hod",
        email="hod@test.com",
        first_name="Test",
        last_name="HOD",
        hashed_password=password_hasher.hash("hod123"),
        is_active=True,
        email_verified=True
    )
    test_db_session.add(hod)
    test_db_session.commit()
    test_db_session.refresh(hod)
    
    # Create teacher profile for HOD (HODs are also teachers)
    hod_profile = TeacherModel(
        user_id=hod.id,
        department_id=department.id,
        employee_id="HOD001"
    )
    test_db_session.add(hod_profile)
    test_db_session.commit()
    
    # Assign HOD role
    user_role = UserRoleModel(user_id=hod.id, role_id=hod_role.id, department_id=department.id)
    test_db_session.add(user_role)
    test_db_session.commit()
    
    return hod


@pytest.fixture
def admin_token(admin_user, jwt_handler):
    """Generate JWT token for admin user"""
    token_data = {
        "sub": admin_user.username,
        "user_id": admin_user.id,
        "username": admin_user.username,
        "roles": [UserRole.ADMIN.value]
    }
    return jwt_handler.create_access_token(token_data)


@pytest.fixture
def teacher_token(teacher_user, jwt_handler):
    """Generate JWT token for teacher user"""
    token_data = {
        "sub": teacher_user.username,
        "user_id": teacher_user.id,
        "username": teacher_user.username,
        "roles": [UserRole.TEACHER.value]
    }
    return jwt_handler.create_access_token(token_data)


@pytest.fixture
def student_token(student_user, jwt_handler):
    """Generate JWT token for student user"""
    token_data = {
        "sub": student_user.username,
        "user_id": student_user.id,
        "username": student_user.username,
        "roles": [UserRole.STUDENT.value]
    }
    return jwt_handler.create_access_token(token_data)


@pytest.fixture
def hod_token(hod_user, jwt_handler):
    """Generate JWT token for HOD user"""
    token_data = {
        "sub": hod_user.username,
        "user_id": hod_user.id,
        "username": hod_user.username,
        "roles": [UserRole.HOD.value]
    }
    return jwt_handler.create_access_token(token_data)


# ============================================
# Data Fixtures
# ============================================

@pytest.fixture
def department(test_db_session):
    """Create a test department"""
    dept = DepartmentModel(
        name="Computer Science Engineering",
        code="CSE"
    )
    test_db_session.add(dept)
    test_db_session.commit()
    test_db_session.refresh(dept)
    return dept


@pytest.fixture
def batch(test_db_session):
    """Create a test batch"""
    batch = BatchModel(
        name="2024",
        duration_years=4
    )
    test_db_session.add(batch)
    test_db_session.commit()
    test_db_session.refresh(batch)
    return batch


# @pytest.fixture
# def batch_year(test_db_session, batch):
#     """Create a test batch year"""
#     batch_year = BatchYearModel(
#         batch_id=batch.id,
#         start_year=2024,
#         end_year=2025
#     )
#     test_db_session.add(batch_year)
#     test_db_session.commit()
#     test_db_session.refresh(batch_year)
#     return batch_year


@pytest.fixture
def academic_year(test_db_session):
    """Create a test academic year"""
    from src.infrastructure.database.models import AcademicYearModel
    from src.infrastructure.database.models import AcademicYearStatus
    
    ay = AcademicYearModel(
        start_year=2024,
        end_year=2025,
        display_name="2024-2025",
        status=AcademicYearStatus.ACTIVE,
        is_current=True
    )
    test_db_session.add(ay)
    test_db_session.commit()
    test_db_session.refresh(ay)
    return ay


@pytest.fixture
def semester(test_db_session, batch_instance, academic_year, department):
    """Create a test semester"""
    from datetime import date
    semester = SemesterModel(
        batch_instance_id=batch_instance.id,
        semester_no=1,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=180),
        academic_year_id=academic_year.id,
        department_id=department.id
    )
    test_db_session.add(semester)
    test_db_session.commit()
    test_db_session.refresh(semester)
    return semester


@pytest.fixture
def section(test_db_session, department, semester, batch_instance):
    """Create a test section"""
    section = SectionModel(
        section_name="A",
        batch_instance_id=batch_instance.id,
        capacity=60
    )
    test_db_session.add(section)
    test_db_session.commit()
    test_db_session.refresh(section)
    return section


@pytest.fixture
def subject(test_db_session, department):
    """Create a test subject"""
    subject = SubjectModel(
        name="Data Structures",
        code="CS101",
        department_id=department.id,
        credits=4
    )
    test_db_session.add(subject)
    test_db_session.commit()
    test_db_session.refresh(subject)
    return subject


@pytest.fixture
def subject_assignment(test_db_session, subject, teacher_user, batch_instance, semester):
    """Create a test subject assignment"""
    # Get teacher profile ID
    from src.infrastructure.database.models import TeacherModel
    teacher_profile = test_db_session.query(TeacherModel).filter(
        TeacherModel.user_id == teacher_user.id
    ).first()

    assignment = SubjectAssignmentModel(
        subject_id=subject.id,
        teacher_id=teacher_profile.id,
        semester_id=semester.id,
        academic_year=2024
    )
    test_db_session.add(assignment)
    test_db_session.commit()
    test_db_session.refresh(assignment)
    return assignment


@pytest.fixture
def exam(test_db_session, subject_assignment):
    """Create a test exam"""
    from datetime import date
    exam = ExamModel(
        subject_assignment_id=subject_assignment.id,
        name="Midterm Exam",
        exam_type="internal1",
        exam_date=date.today() + timedelta(days=7),
        total_marks=100.0,
        duration_minutes=120,
        status="active"  # Use "active" status to allow marks entry
    )
    test_db_session.add(exam)
    test_db_session.commit()
    test_db_session.refresh(exam)
    return exam


@pytest.fixture
def course_outcome(test_db_session, subject):
    """Create a test course outcome"""
    co = CourseOutcomeModel(
        subject_id=subject.id,
        code="CO1",
        title="Understand fundamental concepts",
        description="Students will understand the fundamental concepts of data structures and algorithms",
        target_attainment=70.0
    )
    test_db_session.add(co)
    test_db_session.commit()
    test_db_session.refresh(co)
    return co


@pytest.fixture
def program_outcome(test_db_session, department):
    """Create a test program outcome"""
    po = ProgramOutcomeModel(
        department_id=department.id,
        code="PO1",
        title="Engineering Knowledge Application",
        description="Apply knowledge of mathematics, science, and engineering fundamentals to solve complex problems",
        type="PO",
        target_attainment=70.0
    )
    test_db_session.add(po)
    test_db_session.commit()
    test_db_session.refresh(po)
    return po


@pytest.fixture
def co_po_mapping(test_db_session, course_outcome, program_outcome):
    """Create a test CO-PO mapping"""
    from src.infrastructure.database.models import COPOMappingModel
    mapping = COPOMappingModel(
        co_id=course_outcome.id,
        po_id=program_outcome.id,
        strength=2
    )
    test_db_session.add(mapping)
    test_db_session.commit()
    test_db_session.refresh(mapping)
    return mapping


@pytest.fixture
def question(test_db_session, exam):
    """Create a test question"""
    question = QuestionModel(
        exam_id=exam.id,
        question_no="1",
        question_text="What is data structure?",
        marks_per_question=10.0,
        section="A",
        difficulty="medium"
    )
    test_db_session.add(question)
    test_db_session.commit()
    test_db_session.refresh(question)
    return question


@pytest.fixture
def mark(test_db_session, exam, student_user, question):
    """Create a test mark"""
    from src.infrastructure.database.models import StudentModel
    # Get student profile ID
    student_profile = test_db_session.query(StudentModel).filter(
        StudentModel.user_id == student_user.id
    ).first()
    
    mark = MarkModel(
        exam_id=exam.id,
        student_id=student_profile.id,
        question_id=question.id,
        marks_obtained=8.5
    )
    test_db_session.add(mark)
    test_db_session.commit()
    test_db_session.refresh(mark)
    return mark

