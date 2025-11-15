"""
Comprehensive integration test for the exam management system.
Tests database operations, API endpoints, and business logic.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import tempfile
import os
from datetime import datetime, timedelta

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
from src.main import app
from database import Base, get_db
from models import *
from schemas import *
from crud import *
from validation import *
from auth import get_password_hash, create_access_token


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestDatabaseSetup:
    """Test database setup and basic operations"""
    
    def setup_method(self):
        """Setup test database"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
    
    def teardown_method(self):
        """Cleanup test database"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
    
    def test_database_connection(self):
        """Test database connection"""
        assert self.db is not None
    
    def test_create_tables(self):
        """Test that all tables are created"""
        # Check if all expected tables exist
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        expected_tables = [
            'users', 'departments', 'classes', 'subjects', 'exams',
            'questions', 'marks', 'co_definitions', 'po_definitions',
            'co_targets', 'assessment_weights', 'co_po_matrix',
            'question_co_weights', 'indirect_attainment', 'attainment_audit',
            'student_goals', 'student_milestones'
        ]
        
        for table in expected_tables:
            assert table in tables, f"Table {table} not found"


class TestUserOperations:
    """Test user-related operations"""
    
    def setup_method(self):
        """Setup test data"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Create test department
        self.department = Department(
            name="Computer Science",
            code="CS",
            hod_id=None
        )
        self.db.add(self.department)
        self.db.commit()
        self.db.refresh(self.department)
        
        # Create test class
        self.class_obj = Class(
            name="CS-2024-1",
            department_id=self.department.id,
            semester=3,
            section="A"
        )
        self.db.add(self.class_obj)
        self.db.commit()
        self.db.refresh(self.class_obj)
    
    def teardown_method(self):
        """Cleanup test data"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_create_user(self):
        """Test user creation"""
        user_data = UserCreate(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            role=UserRole.student,
            department_id=self.department.id,
            class_id=self.class_obj.id,
            password="TestPassword123"
        )
        
        user = create_user(self.db, user_data)
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.role == UserRole.student
    
    def test_user_validation(self):
        """Test user validation"""
        # Test valid user
        user_data = UserCreate(
            username="validuser",
            email="valid@example.com",
            first_name="Valid",
            last_name="User",
            role=UserRole.student,
            department_id=self.department.id,
            class_id=self.class_obj.id,
            password="ValidPassword123"
        )
        
        # Should not raise exception
        validate_user_data(user_data, self.db)
        
        # Test invalid email
        user_data.email = "invalid-email"
        with pytest.raises(ValidationError):
            validate_user_data(user_data, self.db)
    
    def test_duplicate_username(self):
        """Test duplicate username handling"""
        user_data1 = UserCreate(
            username="duplicate",
            email="user1@example.com",
            first_name="User",
            last_name="One",
            role=UserRole.student,
            department_id=self.department.id,
            class_id=self.class_obj.id,
            password="Password123"
        )
        
        user_data2 = UserCreate(
            username="duplicate",
            email="user2@example.com",
            first_name="User",
            last_name="Two",
            role=UserRole.student,
            department_id=self.department.id,
            class_id=self.class_obj.id,
            password="Password123"
        )
        
        # Create first user
        create_user(self.db, user_data1)
        
        # Try to create second user with same username
        with pytest.raises(ValidationError):
            validate_user_data(user_data2, self.db)


class TestSubjectOperations:
    """Test subject-related operations"""
    
    def setup_method(self):
        """Setup test data"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Create test department
        self.department = Department(
            name="Computer Science",
            code="CS"
        )
        self.db.add(self.department)
        self.db.commit()
        self.db.refresh(self.department)
        
        # Create test class
        self.class_obj = Class(
            name="CS-2024-1",
            department_id=self.department.id,
            semester=3,
            section="A"
        )
        self.db.add(self.class_obj)
        self.db.commit()
        self.db.refresh(self.class_obj)
        
        # Create test teacher
        self.teacher = User(
            username="teacher",
            email="teacher@example.com",
            first_name="Test",
            last_name="Teacher",
            hashed_password=get_password_hash("password123"),
            role=UserRole.teacher,
            department_id=self.department.id
        )
        self.db.add(self.teacher)
        self.db.commit()
        self.db.refresh(self.teacher)
    
    def teardown_method(self):
        """Cleanup test data"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_create_subject(self):
        """Test subject creation"""
        subject_data = SubjectCreate(
            name="Data Structures",
            code="CS301",
            class_id=self.class_obj.id,
            teacher_id=self.teacher.id,
            credits=3
        )
        
        subject = create_subject(self.db, subject_data)
        assert subject.name == "Data Structures"
        assert subject.code == "CS301"
        assert subject.teacher_id == self.teacher.id
    
    def test_subject_validation(self):
        """Test subject validation"""
        subject_data = SubjectCreate(
            name="Test Subject",
            code="TS101",
            class_id=self.class_obj.id,
            teacher_id=self.teacher.id,
            credits=3
        )
        
        # Should not raise exception
        validate_subject_data(subject_data, self.db)
        
        # Test invalid credits
        subject_data.credits = 10
        with pytest.raises(ValidationError):
            validate_subject_data(subject_data, self.db)


class TestExamOperations:
    """Test exam-related operations"""
    
    def setup_method(self):
        """Setup test data"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Create test department
        self.department = Department(
            name="Computer Science",
            code="CS"
        )
        self.db.add(self.department)
        self.db.commit()
        self.db.refresh(self.department)
        
        # Create test class
        self.class_obj = Class(
            name="CS-2024-1",
            department_id=self.department.id,
            semester=3,
            section="A"
        )
        self.db.add(self.class_obj)
        self.db.commit()
        self.db.refresh(self.class_obj)
        
        # Create test teacher
        self.teacher = User(
            username="teacher",
            email="teacher@example.com",
            first_name="Test",
            last_name="Teacher",
            hashed_password=get_password_hash("password123"),
            role=UserRole.teacher,
            department_id=self.department.id
        )
        self.db.add(self.teacher)
        self.db.commit()
        self.db.refresh(self.teacher)
        
        # Create test subject
        self.subject = Subject(
            name="Data Structures",
            code="CS301",
            class_id=self.class_obj.id,
            teacher_id=self.teacher.id,
            credits=3
        )
        self.db.add(self.subject)
        self.db.commit()
        self.db.refresh(self.subject)
    
    def teardown_method(self):
        """Cleanup test data"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_create_exam(self):
        """Test exam creation"""
        exam_data = ExamCreate(
            name="Midterm Exam",
            subject_id=self.subject.id,
            exam_type=ExamType.internal1,
            exam_date=datetime.now() + timedelta(days=7),
            duration=120,
            total_marks=100,
            questions=[]
        )
        
        exam = create_exam(self.db, exam_data)
        assert exam.name == "Midterm Exam"
        assert exam.subject_id == self.subject.id
        assert exam.exam_type == ExamType.internal1
    
    def test_exam_validation(self):
        """Test exam validation"""
        exam_data = ExamCreate(
            name="Test Exam",
            subject_id=self.subject.id,
            exam_type=ExamType.internal1,
            exam_date=datetime.now() + timedelta(days=7),
            duration=120,
            total_marks=100,
            questions=[]
        )
        
        # Should not raise exception
        validate_exam_data(exam_data, self.db)
        
        # Test past exam date
        exam_data.exam_date = datetime.now() - timedelta(days=1)
        with pytest.raises(ValidationError):
            validate_exam_data(exam_data, self.db)


class TestMarksOperations:
    """Test marks-related operations"""
    
    def setup_method(self):
        """Setup test data"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Create test department
        self.department = Department(
            name="Computer Science",
            code="CS"
        )
        self.db.add(self.department)
        self.db.commit()
        self.db.refresh(self.department)
        
        # Create test class
        self.class_obj = Class(
            name="CS-2024-1",
            department_id=self.department.id,
            semester=3,
            section="A"
        )
        self.db.add(self.class_obj)
        self.db.commit()
        self.db.refresh(self.class_obj)
        
        # Create test teacher
        self.teacher = User(
            username="teacher",
            email="teacher@example.com",
            first_name="Test",
            last_name="Teacher",
            hashed_password=get_password_hash("password123"),
            role=UserRole.teacher,
            department_id=self.department.id
        )
        self.db.add(self.teacher)
        self.db.commit()
        self.db.refresh(self.teacher)
        
        # Create test subject
        self.subject = Subject(
            name="Data Structures",
            code="CS301",
            class_id=self.class_obj.id,
            teacher_id=self.teacher.id,
            credits=3
        )
        self.db.add(self.subject)
        self.db.commit()
        self.db.refresh(self.subject)
        
        # Create test exam
        self.exam = Exam(
            name="Midterm Exam",
            subject_id=self.subject.id,
            exam_type=ExamType.internal1,
            exam_date=datetime.now() + timedelta(days=7),
            duration=120,
            total_marks=100
        )
        self.db.add(self.exam)
        self.db.commit()
        self.db.refresh(self.exam)
        
        # Create test question
        self.question = Question(
            exam_id=self.exam.id,
            question_number="1",
            max_marks=20,
            co_mapping=["CO1"],
            po_mapping=["PO1"],
            section=QuestionSection.A,
            blooms_level="L1",
            difficulty=Difficulty.easy
        )
        self.db.add(self.question)
        self.db.commit()
        self.db.refresh(self.question)
        
        # Create test student
        self.student = User(
            username="student",
            email="student@example.com",
            first_name="Test",
            last_name="Student",
            hashed_password=get_password_hash("password123"),
            role=UserRole.student,
            department_id=self.department.id,
            class_id=self.class_obj.id
        )
        self.db.add(self.student)
        self.db.commit()
        self.db.refresh(self.student)
    
    def teardown_method(self):
        """Cleanup test data"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_create_marks(self):
        """Test marks creation"""
        mark_data = MarkCreate(
            exam_id=self.exam.id,
            student_id=self.student.id,
            question_id=self.question.id,
            marks_obtained=15.0
        )
        
        mark = bulk_create_marks_db(self.db, [mark_data])
        assert len(mark['marks']) == 1
        assert mark['marks'][0].marks_obtained == 15.0
    
    def test_marks_validation(self):
        """Test marks validation"""
        mark_data = MarkCreate(
            exam_id=self.exam.id,
            student_id=self.student.id,
            question_id=self.question.id,
            marks_obtained=15.0
        )
        
        # Should not raise exception
        validate_mark_data(mark_data, self.db)
        
        # Test marks exceeding max marks
        mark_data.marks_obtained = 25.0
        with pytest.raises(ValidationError):
            validate_mark_data(mark_data, self.db)
    
    def test_marks_lock_status(self):
        """Test marks lock status"""
        # Create exam with past date
        past_exam = Exam(
            name="Past Exam",
            subject_id=self.subject.id,
            exam_type=ExamType.internal1,
            exam_date=datetime.now() - timedelta(days=10),
            duration=120,
            total_marks=100
        )
        self.db.add(past_exam)
        self.db.commit()
        self.db.refresh(past_exam)
        
        # Should raise exception for locked exam
        with pytest.raises(BusinessLogicError):
            check_marks_lock_status(past_exam.id, self.db)


class TestCOPOOperations:
    """Test CO/PO/PSO framework operations"""
    
    def setup_method(self):
        """Setup test data"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Create test department
        self.department = Department(
            name="Computer Science",
            code="CS"
        )
        self.db.add(self.department)
        self.db.commit()
        self.db.refresh(self.department)
        
        # Create test class
        self.class_obj = Class(
            name="CS-2024-1",
            department_id=self.department.id,
            semester=3,
            section="A"
        )
        self.db.add(self.class_obj)
        self.db.commit()
        self.db.refresh(self.class_obj)
        
        # Create test subject
        self.subject = Subject(
            name="Data Structures",
            code="CS301",
            class_id=self.class_obj.id,
            teacher_id=None,
            credits=3
        )
        self.db.add(self.subject)
        self.db.commit()
        self.db.refresh(self.subject)
    
    def teardown_method(self):
        """Cleanup test data"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_create_co_definition(self):
        """Test CO definition creation"""
        co_data = CODefinitionCreate(
            subject_id=self.subject.id,
            code="CO1",
            title="Understand basic data structures",
            description="Students should understand arrays, linked lists, and stacks"
        )
        
        co = create_co_definition(self.db, co_data)
        assert co.code == "CO1"
        assert co.title == "Understand basic data structures"
        assert co.subject_id == self.subject.id
    
    def test_create_po_definition(self):
        """Test PO definition creation"""
        po_data = PODefinitionCreate(
            department_id=self.department.id,
            code="PO1",
            title="Engineering Knowledge",
            description="Apply knowledge of mathematics, science, engineering fundamentals",
            type="PO"
        )
        
        po = create_po_definition(self.db, po_data)
        assert po.code == "PO1"
        assert po.title == "Engineering Knowledge"
        assert po.department_id == self.department.id
    
    def test_create_co_target(self):
        """Test CO target creation"""
        # First create CO definition
        co = CODefinition(
            subject_id=self.subject.id,
            code="CO1",
            title="Test CO",
            description="Test description"
        )
        self.db.add(co)
        self.db.commit()
        self.db.refresh(co)
        
        target_data = COTargetCreate(
            subject_id=self.subject.id,
            co_id=co.id,
            target_pct=70.0,
            l1_threshold=60.0,
            l2_threshold=70.0,
            l3_threshold=80.0
        )
        
        target = create_co_target(self.db, target_data)
        assert target.target_pct == 70.0
        assert target.co_id == co.id
    
    def test_co_validation(self):
        """Test CO validation"""
        co_data = CODefinitionCreate(
            subject_id=self.subject.id,
            code="CO2",
            title="Test CO",
            description="Test description"
        )
        
        # Should not raise exception
        validate_co_definition_data(co_data, self.db)
        
        # Test invalid code format
        co_data.code = "INVALID"
        with pytest.raises(ValidationError):
            validate_co_definition_data(co_data, self.db)


class TestAPIEndpoints:
    """Test API endpoints"""
    
    def setup_method(self):
        """Setup test data"""
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Create test admin user
        self.admin = User(
            username="admin",
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.admin,
            department_id=None
        )
        self.db.add(self.admin)
        self.db.commit()
        self.db.refresh(self.admin)
        
        # Create access token
        self.access_token = create_access_token(data={"sub": self.admin.username})
    
    def teardown_method(self):
        """Cleanup test data"""
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert "status" in response.json()
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()
    
    def test_login_endpoint(self):
        """Test login endpoint"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = client.post("/auth/login", json=login_data)
        print(f"DEBUG: Login response status: {response.status_code}")
        print(f"DEBUG: Login response body: {response.text}")
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert "user" in response.json()
    
    def test_protected_endpoint(self):
        """Test protected endpoint"""
        headers = {"Authorization": f"Bearer {self.access_token}"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["username"] == "admin"


def run_integration_tests():
    """Run all integration tests"""
    print("Running integration tests...")
    
    # Test database setup
    test_db = TestDatabaseSetup()
    test_db.setup_method()
    test_db.test_database_connection()
    test_db.test_create_tables()
    test_db.teardown_method()
    
    # Test user operations
    test_user = TestUserOperations()
    test_user.setup_method()
    test_user.test_create_user()
    test_user.test_user_validation()
    test_user.test_duplicate_username()
    test_user.teardown_method()
    
    # Test subject operations
    test_subject = TestSubjectOperations()
    test_subject.setup_method()
    test_subject.test_create_subject()
    test_subject.test_subject_validation()
    test_subject.teardown_method()
    
    # Test exam operations
    test_exam = TestExamOperations()
    test_exam.setup_method()
    test_exam.test_create_exam()
    test_exam.test_exam_validation()
    test_exam.teardown_method()
    
    # Test marks operations
    test_marks = TestMarksOperations()
    test_marks.setup_method()
    test_marks.test_create_marks()
    test_marks.test_marks_validation()
    test_marks.test_marks_lock_status()
    test_marks.teardown_method()
    
    # Test CO/PO operations
    test_copo = TestCOPOOperations()
    test_copo.setup_method()
    test_copo.test_create_co_definition()
    test_copo.test_create_po_definition()
    test_copo.test_create_co_target()
    test_copo.test_co_validation()
    test_copo.teardown_method()
    
    # Test API endpoints
    test_api = TestAPIEndpoints()
    test_api.setup_method()
    test_api.test_health_check()
    test_api.test_root_endpoint()
    test_api.test_login_endpoint()
    test_api.test_protected_endpoint()
    test_api.teardown_method()
    
    print("✅ All integration tests passed!")


if __name__ == "__main__":
    run_integration_tests()
