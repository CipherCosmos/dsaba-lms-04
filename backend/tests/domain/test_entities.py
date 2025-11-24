"""
Domain Entities Tests
Tests for domain entities
"""

import pytest
from datetime import datetime, date
from decimal import Decimal
from src.domain.entities.user import User
from src.domain.entities.academic_structure import Batch, BatchYear, Semester, BatchInstance, Section
from src.domain.entities.subject import Subject
from src.domain.entities.exam import Exam
from src.domain.entities.mark import Mark
from src.domain.entities.final_mark import FinalMark
from src.domain.entities.course_outcome import CourseOutcome
from src.domain.entities.program_outcome import ProgramOutcome
from src.domain.entities.co_po_mapping import COPOMapping
from src.domain.entities.question import Question
from src.domain.entities.sub_question import SubQuestion
from src.domain.entities.survey import Survey, SurveyQuestion, SurveyResponse
from src.domain.entities.exit_exam import ExitExam, ExitExamResult
from src.domain.value_objects.email import Email
from src.domain.enums.user_role import UserRole
from src.domain.enums.exam_type import ExamType
from src.domain.exceptions import ValidationError, BusinessRuleViolationError, InvalidRangeError
from pydantic import ValidationError as PydanticValidationError


class TestUserEntity:
    """Tests for User entity"""
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_user(self):
        """Test creating a valid user"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed_password_here"
        )
        
        assert user.username == "testuser"
        assert user.email == email
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.full_name == "Test User"
        assert user.is_active is True
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_username_normalization(self):
        """Test username is normalized to lowercase"""
        email = Email("test@example.com")
        user = User(
            username="TestUser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        assert user.username == "testuser"
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_username_too_short(self):
        """Test username too short raises error"""
        email = Email("test@example.com")
        with pytest.raises(ValidationError):
            User(
                username="ab",
                email=email,
                first_name="Test",
                last_name="User",
                hashed_password="hashed"
            )
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_name_whitespace_trim(self):
        """Test name whitespace is trimmed"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="  Test  ",
            last_name="  User  ",
            hashed_password="hashed"
        )
        assert user.first_name == "Test"
        assert user.last_name == "User"
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_add_role(self):
        """Test adding role to user"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        
        user.add_role(UserRole.TEACHER)
        assert UserRole.TEACHER in user.roles
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_has_role(self):
        """Test checking if user has role"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        
        user.add_role(UserRole.TEACHER)
        assert user.has_role(UserRole.TEACHER) is True
        assert user.has_role(UserRole.STUDENT) is False
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_deactivate_user(self):
        """Test deactivating a user"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed"
        )
        
        user.deactivate()
        assert user.is_active is False
    
    @pytest.mark.unit
    @pytest.mark.domain
    def test_verify_email(self):
        """Test verifying user email"""
        email = Email("test@example.com")
        user = User(
            username="testuser",
            email=email,
            first_name="Test",
            last_name="User",
            hashed_password="hashed",
            email_verified=False
        )
        
        user.verify_email()
        assert user.email_verified is True


class TestBatchEntity:
    """Tests for Batch entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_batch(self):
        """Test creating a valid batch"""
        batch = Batch(
            name="B.Tech Computer Science",
            duration_years=4
        )

        assert batch.name == "B.Tech Computer Science"
        assert batch.duration_years == 4
        assert batch.is_active is True

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_name_validation(self):
        """Test batch name validation"""
        # Valid name
        batch = Batch(name="B.Tech", duration_years=4)
        assert batch.name == "B.Tech"

        # Name too short
        with pytest.raises(ValidationError):
            Batch(name="A", duration_years=4)

        # Name too long
        with pytest.raises(ValidationError):
            Batch(name="A" * 51, duration_years=4)

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_duration_validation(self):
        """Test batch duration validation"""
        # Valid duration
        batch = Batch(name="B.Tech", duration_years=4)
        assert batch.duration_years == 4

        # Duration too low
        with pytest.raises(InvalidRangeError):
            Batch(name="B.Tech", duration_years=0)

        # Duration too high
        with pytest.raises(InvalidRangeError):
            Batch(name="B.Tech", duration_years=7)

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_activate_deactivate(self):
        """Test batch activation/deactivation"""
        batch = Batch(name="B.Tech", duration_years=4, is_active=False)

        # Activate
        batch.activate()
        assert batch.is_active is True

        # Try to activate again (should raise error)
        with pytest.raises(BusinessRuleViolationError):
            batch.activate()

        # Deactivate
        batch.deactivate()
        assert batch.is_active is False

        # Try to deactivate again (should raise error)
        with pytest.raises(BusinessRuleViolationError):
            batch.deactivate()

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_to_dict(self):
        """Test batch to_dict method"""
        batch = Batch(
            id=1,
            name="B.Tech",
            duration_years=4,
            is_active=True
        )

        data = batch.to_dict()
        assert data["id"] == 1
        assert data["name"] == "B.Tech"
        assert data["duration_years"] == 4
        assert data["is_active"] is True


class TestBatchYearEntity:
    """Tests for BatchYear entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_batch_year(self):
        """Test creating a valid batch year"""
        batch_year = BatchYear(
            batch_id=1,
            start_year=2024,
            end_year=2028
        )

        assert batch_year.batch_id == 1
        assert batch_year.start_year == 2024
        assert batch_year.end_year == 2028
        assert batch_year.is_current is False

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_year_date_validation(self):
        """Test batch year date validation"""
        # Valid dates
        batch_year = BatchYear(batch_id=1, start_year=2024, end_year=2028)
        assert batch_year.start_year == 2024

        # End before start
        with pytest.raises(ValidationError):
            BatchYear(batch_id=1, start_year=2028, end_year=2024)

        # Start year too early
        with pytest.raises(ValidationError):
            BatchYear(batch_id=1, start_year=1999, end_year=2003)

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_year_mark_current(self):
        """Test marking batch year as current"""
        batch_year = BatchYear(batch_id=1, start_year=2024, end_year=2028)

        batch_year.mark_as_current()
        assert batch_year.is_current is True

        batch_year.unmark_as_current()
        assert batch_year.is_current is False


class TestSemesterEntity:
    """Tests for Semester entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_semester(self):
        """Test creating a valid semester"""
        semester = Semester(
            semester_no=1,
            batch_instance_id=1,
            academic_year_id=1,
            department_id=1
        )

        assert semester.semester_no == 1
        assert semester.batch_instance_id == 1
        assert semester.display_name == "Semester 1"
        assert semester.is_current is False

    @pytest.mark.unit
    @pytest.mark.domain
    def test_semester_no_validation(self):
        """Test semester number validation"""
        # Valid semester
        semester = Semester(semester_no=1, batch_instance_id=1)
        assert semester.semester_no == 1

        # Semester too low
        with pytest.raises(InvalidRangeError):
            Semester(semester_no=0, batch_instance_id=1)

        # Semester too high
        with pytest.raises(InvalidRangeError):
            Semester(semester_no=13, batch_instance_id=1)

    @pytest.mark.unit
    @pytest.mark.domain
    def test_semester_dates_validation(self):
        """Test semester dates validation"""
        start = date(2024, 1, 1)
        end = date(2024, 6, 30)

        semester = Semester(
            semester_no=1,
            batch_instance_id=1,
            start_date=start,
            end_date=end
        )

        assert semester.start_date == start
        assert semester.end_date == end

        # End before start
        with pytest.raises(ValidationError):
            Semester(
                semester_no=1,
                batch_instance_id=1,
                start_date=end,
                end_date=start
            )

    @pytest.mark.unit
    @pytest.mark.domain
    def test_semester_current_operations(self):
        """Test semester current status operations"""
        semester = Semester(semester_no=1, batch_instance_id=1)

        semester.mark_as_current()
        assert semester.is_current is True

        semester.unmark_as_current()
        assert semester.is_current is False

    @pytest.mark.unit
    @pytest.mark.domain
    def test_semester_date_operations(self):
        """Test semester date operations"""
        semester = Semester(semester_no=1, batch_instance_id=1)

        start = date(2024, 1, 1)
        end = date(2024, 6, 30)
        semester.set_dates(start, end)

        assert semester.start_date == start
        assert semester.end_date == end

    @pytest.mark.unit
    @pytest.mark.domain
    def test_semester_active_on_date(self):
        """Test checking if semester is active on a date"""
        start = date(2024, 1, 1)
        end = date(2024, 6, 30)

        semester = Semester(
            semester_no=1,
            batch_instance_id=1,
            start_date=start,
            end_date=end
        )

        # Date within range
        assert semester.is_active_on(date(2024, 3, 15)) is True

        # Date before start
        assert semester.is_active_on(date(2023, 12, 31)) is False

        # Date after end
        assert semester.is_active_on(date(2024, 7, 1)) is False

        # No dates set
        semester_no_dates = Semester(semester_no=1, batch_instance_id=1)
        assert semester_no_dates.is_active_on(date(2024, 3, 15)) is False


class TestBatchInstanceEntity:
    """Tests for BatchInstance entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_batch_instance(self):
        """Test creating a valid batch instance"""
        batch_instance = BatchInstance(
            academic_year_id=1,
            department_id=1,
            batch_id=1,
            admission_year=2024
        )

        assert batch_instance.academic_year_id == 1
        assert batch_instance.department_id == 1
        assert batch_instance.batch_id == 1
        assert batch_instance.admission_year == 2024
        assert batch_instance.current_semester == 1
        assert batch_instance.is_active is True

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_instance_admission_year_validation(self):
        """Test admission year validation"""
        # Valid year
        batch_instance = BatchInstance(
            academic_year_id=1,
            department_id=1,
            batch_id=1,
            admission_year=2024
        )
        assert batch_instance.admission_year == 2024

        # Year too early
        with pytest.raises(ValidationError):
            BatchInstance(
                academic_year_id=1,
                department_id=1,
                batch_id=1,
                admission_year=1999
            )

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_instance_current_semester_validation(self):
        """Test current semester validation"""
        # Valid semester
        batch_instance = BatchInstance(
            academic_year_id=1,
            department_id=1,
            batch_id=1,
            admission_year=2024,
            current_semester=3
        )
        assert batch_instance.current_semester == 3

        # Semester too low
        with pytest.raises(InvalidRangeError):
            BatchInstance(
                academic_year_id=1,
                department_id=1,
                batch_id=1,
                admission_year=2024,
                current_semester=0
            )

        # Semester too high
        with pytest.raises(InvalidRangeError):
            BatchInstance(
                academic_year_id=1,
                department_id=1,
                batch_id=1,
                admission_year=2024,
                current_semester=13
            )

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_instance_promotion(self):
        """Test batch instance semester promotion"""
        batch_instance = BatchInstance(
            academic_year_id=1,
            department_id=1,
            batch_id=1,
            admission_year=2024,
            current_semester=3
        )

        batch_instance.promote_to_next_semester()
        assert batch_instance.current_semester == 4

        # Try to promote beyond max
        batch_instance.set_current_semester(12)
        with pytest.raises(BusinessRuleViolationError):
            batch_instance.promote_to_next_semester()

    @pytest.mark.unit
    @pytest.mark.domain
    def test_batch_instance_activate_deactivate(self):
        """Test batch instance activation/deactivation"""
        batch_instance = BatchInstance(
            academic_year_id=1,
            department_id=1,
            batch_id=1,
            admission_year=2024,
            is_active=False
        )

        batch_instance.activate()
        assert batch_instance.is_active is True

        with pytest.raises(BusinessRuleViolationError):
            batch_instance.activate()

        batch_instance.deactivate()
        assert batch_instance.is_active is False

        with pytest.raises(BusinessRuleViolationError):
            batch_instance.deactivate()


class TestSectionEntity:
    """Tests for Section entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_section(self):
        """Test creating a valid section"""
        section = Section(
            batch_instance_id=1,
            section_name="A"
        )

        assert section.batch_instance_id == 1
        assert section.section_name == "A"
        assert section.is_active is True

    @pytest.mark.unit
    @pytest.mark.domain
    def test_section_name_validation(self):
        """Test section name validation"""
        # Valid name
        section = Section(batch_instance_id=1, section_name="B")
        assert section.section_name == "B"

        # Empty name
        with pytest.raises(ValidationError):
            Section(batch_instance_id=1, section_name="")

        # Name too long
        with pytest.raises(ValidationError):
            Section(batch_instance_id=1, section_name="ABC")

        # Invalid format (not single letter)
        with pytest.raises(ValidationError):
            Section(batch_instance_id=1, section_name="AB")

    @pytest.mark.unit
    @pytest.mark.domain
    def test_section_capacity_validation(self):
        """Test section capacity validation"""
        # Valid capacity
        section = Section(batch_instance_id=1, section_name="A", capacity=60)
        assert section.capacity == 60

        # Zero capacity
        with pytest.raises(ValidationError):
            Section(batch_instance_id=1, section_name="A", capacity=0)

    @pytest.mark.unit
    @pytest.mark.domain
    def test_section_activate_deactivate(self):
        """Test section activation/deactivation"""
        section = Section(
            batch_instance_id=1,
            section_name="A",
            is_active=False
        )

        section.activate()
        assert section.is_active is True

        with pytest.raises(BusinessRuleViolationError):
            section.activate()

        section.deactivate()
        assert section.is_active is False

        with pytest.raises(BusinessRuleViolationError):
            section.deactivate()

    @pytest.mark.unit
    @pytest.mark.domain
    def test_section_capacity_operations(self):
        """Test section capacity operations"""
        section = Section(batch_instance_id=1, section_name="A")

        section.set_capacity(50)
        assert section.capacity == 50


class TestSubjectEntity:
    """Tests for Subject entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_subject(self):
        """Test creating a valid subject"""
        subject = Subject(
            code="CS101",
            name="Data Structures",
            department_id=1,
            credits=4.0,
            max_internal=40.0,
            max_external=60.0
        )

        assert subject.code == "CS101"
        assert subject.name == "Data Structures"
        assert subject.credits == 4.0

    @pytest.mark.unit
    @pytest.mark.domain
    def test_subject_credits_validation(self):
        """Test subject credits validation"""
        # Valid credits
        subject = Subject(
            code="CS101",
            name="Data Structures",
            department_id=1,
            credits=3.0
        )
        assert subject.credits == 3.0

        # Credits too low
        with pytest.raises(ValidationError):
            Subject(
                code="CS101",
                name="Data Structures",
                department_id=1,
                credits=0.5
            )

        # Credits too high
        with pytest.raises(ValidationError):
            Subject(
                code="CS101",
                name="Data Structures",
                department_id=1,
                credits=11.0
            )

    @pytest.mark.unit
    @pytest.mark.domain
    def test_subject_marks_validation(self):
        """Test subject marks validation"""
        # Valid marks
        subject = Subject(
            code="CS101",
            name="Data Structures",
            department_id=1,
            credits=4.0,
            max_internal=40.0,
            max_external=60.0
        )
        assert subject.max_internal == 40.0
        assert subject.max_external == 60.0

        # Marks don't sum to 100
        with pytest.raises(ValidationError):
            Subject(
                code="CS101",
                name="Data Structures",
                department_id=1,
                credits=4.0,
                max_internal=50.0,
                max_external=60.0
            )


class TestCourseOutcomeEntity:
    """Tests for CourseOutcome entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_course_outcome(self):
        """Test creating a valid course outcome"""
        co = CourseOutcome(
            id=1,
            subject_id=1,
            code="CO1",
            title="Understand Data Structures",
            description="Students will understand fundamental data structures"
        )

        assert co.subject_id == 1
        assert co.code == "CO1"
        assert co.title == "Understand Data Structures"

    @pytest.mark.unit
    @pytest.mark.domain
    def test_course_outcome_thresholds(self):
        """Test course outcome thresholds"""
        co = CourseOutcome(
            id=1,
            subject_id=1,
            code="CO1",
            title="Understand Data Structures Fundamentals",
            description="Students will understand fundamental data structures",
            l1_threshold=Decimal("60.0"),
            l2_threshold=Decimal("70.0"),
            l3_threshold=Decimal("80.0")
        )

        assert co.l1_threshold == Decimal("60.0")
        assert co.l2_threshold == Decimal("70.0")
        assert co.l3_threshold == Decimal("80.0")


class TestProgramOutcomeEntity:
    """Tests for ProgramOutcome entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_program_outcome(self):
        """Test creating a valid program outcome"""
        po = ProgramOutcome(
            id=1,
            department_id=1,
            code="PO1",
            type="PO",
            title="Engineering Knowledge and Problem Solving",
            description="Apply knowledge of mathematics, science, engineering fundamentals and an engineering specialization to the solution of complex engineering problems"
        )

        assert po.department_id == 1
        assert po.code == "PO1"
        assert po.type == "PO"

    @pytest.mark.unit
    @pytest.mark.domain
    def test_program_outcome_type_validation(self):
        """Test program outcome type validation"""
        # Valid type
        po = ProgramOutcome(
            id=1,
            department_id=1,
            code="PO1",
            type="PO",
            title="Engineering Knowledge and Problem Solving",
            description="Apply knowledge of mathematics, science, engineering fundamentals and an engineering specialization to the solution of complex engineering problems"
        )
        assert po.type == "PO"

        # Invalid type - this will raise ValueError, not ValidationError
        with pytest.raises(ValueError):
            ProgramOutcome(
                id=1,
                department_id=1,
                code="PO1",
                type="INVALID",
                title="Engineering Knowledge and Problem Solving",
                description="Apply knowledge of mathematics, science, engineering fundamentals and an engineering specialization to the solution of complex engineering problems"
            )


class TestCOPOMappingEntity:
    """Tests for CO-PO Mapping entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_co_po_mapping(self):
        """Test creating a valid CO-PO mapping"""
        mapping = COPOMapping(
            id=1,
            co_id=1,
            po_id=1,
            strength=2
        )

        assert mapping.co_id == 1
        assert mapping.po_id == 1
        assert mapping.strength == 2

    @pytest.mark.unit
    @pytest.mark.domain
    def test_co_po_mapping_strength_validation(self):
        """Test CO-PO mapping strength validation"""
        # Valid strength
        mapping = COPOMapping(id=1, co_id=1, po_id=1, strength=3)
        assert mapping.strength == 3

        # Strength too low - this will raise ValueError, not ValidationError
        with pytest.raises(ValueError):
            COPOMapping(id=1, co_id=1, po_id=1, strength=0)

        # Strength too high - this will raise ValueError, not ValidationError
        with pytest.raises(ValueError):
            COPOMapping(id=1, co_id=1, po_id=1, strength=4)


class TestExamEntity:
    """Tests for Exam entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_exam(self):
        """Test creating a valid exam"""
        exam = Exam(
            subject_assignment_id=1,
            name="Midterm Exam",
            exam_type=ExamType.INTERNAL_1,
            exam_date=date(2024, 3, 15),
            total_marks=100.0
        )

        assert exam.subject_assignment_id == 1
        assert exam.name == "Midterm Exam"
        assert exam.exam_type == ExamType.INTERNAL_1
        assert exam.status == "draft"

    @pytest.mark.unit
    @pytest.mark.domain
    def test_exam_type_validation(self):
        """Test exam type validation"""
        # Valid type
        exam = Exam(
            subject_assignment_id=1,
            name="Test",
            exam_type=ExamType.EXTERNAL,
            exam_date=date(2024, 3, 15),
            total_marks=100.0
        )
        assert exam.exam_type == ExamType.EXTERNAL


class TestQuestionEntity:
    """Tests for Question entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_question(self):
        """Test creating a valid question"""
        question = Question(
            id=1,
            exam_id=1,
            question_no="1",
            question_text="What is data structure?",
            section="A",
            marks_per_question=10.0
        )

        assert question.exam_id == 1
        assert question.question_no == "1"
        assert question.section == "A"

    @pytest.mark.unit
    @pytest.mark.domain
    def test_question_section_validation(self):
        """Test question section validation"""
        # Valid section
        question = Question(
            id=1,
            exam_id=1,
            question_no="1",
            question_text="What is the difference between stack and queue data structures?",
            section="B",
            marks_per_question=5.0
        )
        assert question.section == "B"

        # Invalid section - this will raise ValueError, not ValidationError
        with pytest.raises(ValueError):
            Question(
                id=1,
                exam_id=1,
                question_no="1",
                question_text="What is the difference between stack and queue data structures?",
                section="D",
                marks_per_question=5.0
            )


class TestMarkEntity:
    """Tests for Mark entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_mark(self):
        """Test creating a valid mark"""
        mark = Mark(
            exam_id=1,
            student_id=1,
            question_id=1,
            marks_obtained=8.5
        )

        assert mark.exam_id == 1
        assert mark.student_id == 1
        assert mark.marks_obtained == 8.5

    @pytest.mark.unit
    @pytest.mark.domain
    def test_mark_validation(self):
        """Test mark validation"""
        # Valid marks
        mark = Mark(
            exam_id=1,
            student_id=1,
            question_id=1,
            marks_obtained=10.0
        )
        assert mark.marks_obtained == 10.0

        # Negative marks
        with pytest.raises(ValidationError):
            Mark(
                exam_id=1,
                student_id=1,
                question_id=1,
                marks_obtained=-1.0
            )


class TestFinalMarkEntity:
    """Tests for FinalMark entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_final_mark(self):
        """Test creating a valid final mark"""
        final_mark = FinalMark(
            id=1,
            student_id=1,
            subject_assignment_id=1,
            semester_id=1,
            internal_1=Decimal("18.0"),
            internal_2=Decimal("19.0"),
            external=Decimal("55.0")
        )

        assert final_mark.student_id == 1
        assert final_mark.internal_1 == Decimal("18.0")
        assert final_mark.internal_2 == Decimal("19.0")
        assert final_mark.external == Decimal("55.0")

    @pytest.mark.unit
    @pytest.mark.domain
    def test_final_mark_calculations(self):
        """Test final mark calculations"""
        final_mark = FinalMark(
            id=1,
            student_id=1,
            subject_assignment_id=1,
            semester_id=1,
            internal_1=Decimal("18.0"),
            internal_2=Decimal("19.0"),
            best_internal=Decimal("19.0"),  # Set best_internal explicitly
            external=Decimal("55.0"),
            total=Decimal("74.0")  # Set total explicitly
        )

        # Test best internal calculation (should be max of internal_1 and internal_2)
        best_internal = final_mark.calculate_best_internal()
        assert best_internal == Decimal("19.0")

        # Test total calculation (best_internal + external)
        total = final_mark.calculate_total(Decimal("40.0"), Decimal("60.0"))
        assert total == Decimal("74.0")

        # Test percentage calculation
        percentage = final_mark.calculate_percentage(Decimal("100.0"))
        assert percentage == Decimal("74.0")


class TestSurveyEntity:
    """Tests for Survey entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_survey(self):
        """Test creating a valid survey"""
        survey = Survey(
            title="Student Feedback",
            description="Course feedback survey",
            department_id=1,
            academic_year_id=1
        )

        assert survey.title == "Student Feedback"
        assert survey.status == "draft"
        assert survey.target_audience == "students"

    @pytest.mark.unit
    @pytest.mark.domain
    def test_survey_status_operations(self):
        """Test survey status operations"""
        # Valid status
        survey = Survey(
            title="Test Survey",
            department_id=1,
            academic_year_id=1,
            status="active"
        )
        assert survey.status == "active"

        # Test is_active method
        assert survey.is_active() is True

        # Test with draft status
        draft_survey = Survey(
            title="Draft Survey",
            department_id=1,
            academic_year_id=1,
            status="draft"
        )
        assert draft_survey.is_active() is False


class TestSurveyQuestionEntity:
    """Tests for SurveyQuestion entity"""

    @pytest.mark.unit
    @pytest.mark.domain
    def test_create_survey_question(self):
        """Test creating a valid survey question"""
        question = SurveyQuestion(
            question_text="Rate the course",
            question_type="rating",
            required=True
        )

        assert question.question_type == "rating"
        assert question.required is True

    @pytest.mark.unit
    @pytest.mark.domain
    def test_survey_question_creation(self):
        """Test survey question creation"""
        # Valid question types
        text_question = SurveyQuestion(
            question_text="What is your feedback?",
            question_type="text"
        )
        assert text_question.question_type == "text"

        rating_question = SurveyQuestion(
            question_text="Rate the course",
            question_type="rating",
            required=True
        )
        assert rating_question.question_type == "rating"
        assert rating_question.required is True



