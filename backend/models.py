from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(enum.Enum):
    admin = "admin"
    hod = "hod"
    teacher = "teacher"
    student = "student"

class ExamType(enum.Enum):
    internal1 = "internal1"
    internal2 = "internal2"
    final = "final"

class QuestionSection(enum.Enum):
    A = "A"
    B = "B"
    C = "C"

class Difficulty(enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class POType(enum.Enum):
    PO = "PO"
    PSO = "PSO"

class AttainmentLevel(enum.Enum):
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"

class IndirectSource(enum.Enum):
    course_exit_survey = "course_exit_survey"
    employer_feedback = "employer_feedback"
    alumni_survey = "alumni_survey"
    industry_feedback = "industry_feedback"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    student_class = relationship("Class", back_populates="students", foreign_keys=[class_id])
    subjects_taught = relationship("Subject", back_populates="teacher")
    marks = relationship("Mark", back_populates="student")
    
    @property
    def name(self):
        return f"{self.first_name} {self.last_name}"

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    hod_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="department", foreign_keys=[User.department_id])
    classes = relationship("Class", back_populates="department")
    hod = relationship("User", foreign_keys=[hod_id])
    # CO/PO/PSO Framework relationships
    po_definitions = relationship("PODefinition", back_populates="department")

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    department = relationship("Department", back_populates="classes")
    students = relationship("User", back_populates="student_class", foreign_keys=[User.class_id])
    subjects = relationship("Subject", back_populates="class_obj")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cos = Column(JSON)
    pos = Column(JSON)
    credits = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    class_obj = relationship("Class", back_populates="subjects")
    teacher = relationship("User", back_populates="subjects_taught", foreign_keys=[teacher_id])
    exams = relationship("Exam", back_populates="subject")
    # CO/PO/PSO Framework relationships
    co_definitions = relationship("CODefinition", back_populates="subject")
    co_targets = relationship("COTarget", back_populates="subject")
    assessment_weights = relationship("AssessmentWeight", back_populates="subject")
    co_po_matrix = relationship("COPOMatrix", back_populates="subject")
    indirect_attainment = relationship("IndirectAttainment", back_populates="subject")
    attainment_audit = relationship("AttainmentAudit", back_populates="subject")

class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    exam_type = Column(Enum(ExamType), nullable=False)
    exam_date = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Integer, nullable=True)
    total_marks = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    subject = relationship("Subject", back_populates="exams")
    questions = relationship("Question", back_populates="exam")
    marks = relationship("Mark", back_populates="exam")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    question_number = Column(String(10), nullable=False)
    max_marks = Column(Float, nullable=False)
    co_mapping = Column(JSON)
    po_mapping = Column(JSON)
    section = Column(Enum(QuestionSection), nullable=False)
    blooms_level = Column(String(20))
    difficulty = Column(Enum(Difficulty), nullable=False)
    co_weighting_mode = Column(String(20), default="equal_split")  # "equal_split" or "custom"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    exam = relationship("Exam", back_populates="questions")
    marks = relationship("Mark", back_populates="question")
    # CO/PO/PSO Framework relationships
    co_weights = relationship("QuestionCOWeight", back_populates="question")

class Mark(Base):
    __tablename__ = "marks"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    exam = relationship("Exam", back_populates="marks")
    student = relationship("User", back_populates="marks", foreign_keys=[student_id])
    question = relationship("Question", back_populates="marks")

# CO/PO/PSO Framework Tables

class CODefinition(Base):
    __tablename__ = "co_definitions"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    code = Column(String(10), nullable=False)  # e.g., "CO1", "CO2"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    subject = relationship("Subject", back_populates="co_definitions")
    co_targets = relationship("COTarget", back_populates="co_definition")
    co_po_matrix = relationship("COPOMatrix", back_populates="co_definition")
    question_co_weights = relationship("QuestionCOWeight", back_populates="co_definition")
    indirect_attainment = relationship("IndirectAttainment", back_populates="co_definition")

class PODefinition(Base):
    __tablename__ = "po_definitions"
    
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    code = Column(String(10), nullable=False)  # e.g., "PO1", "PO2", "PSO1"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(POType), nullable=False, default=POType.PO)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    department = relationship("Department", back_populates="po_definitions")
    co_po_matrix = relationship("COPOMatrix", back_populates="po_definition")
    indirect_attainment = relationship("IndirectAttainment", back_populates="po_definition")

class COTarget(Base):
    __tablename__ = "co_targets"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    co_id = Column(Integer, ForeignKey("co_definitions.id"), nullable=False)
    co_code = Column(String(10), nullable=False)  # Keep for reference
    target_pct = Column(Float, nullable=False)  # Target percentage (e.g., 70%)
    l1_threshold = Column(Float, nullable=False, default=60.0)  # L1 level threshold
    l2_threshold = Column(Float, nullable=False, default=70.0)  # L2 level threshold
    l3_threshold = Column(Float, nullable=False, default=80.0)  # L3 level threshold
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    subject = relationship("Subject", back_populates="co_targets")
    co_definition = relationship("CODefinition", back_populates="co_targets")

class AssessmentWeight(Base):
    __tablename__ = "assessment_weights"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    exam_type = Column(Enum(ExamType), nullable=False)
    weight_pct = Column(Float, nullable=False)  # Weight percentage (e.g., 25.0 for 25%)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    subject = relationship("Subject", back_populates="assessment_weights")

class COPOMatrix(Base):
    __tablename__ = "co_po_matrix"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    co_id = Column(Integer, ForeignKey("co_definitions.id"), nullable=False)
    po_id = Column(Integer, ForeignKey("po_definitions.id"), nullable=False)
    co_code = Column(String(10), nullable=False)  # Keep for reference
    po_code = Column(String(10), nullable=False)  # Keep for reference
    strength = Column(Integer, nullable=False)  # 1, 2, or 3
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    subject = relationship("Subject", back_populates="co_po_matrix")
    co_definition = relationship("CODefinition", back_populates="co_po_matrix")
    po_definition = relationship("PODefinition", back_populates="co_po_matrix")

class QuestionCOWeight(Base):
    __tablename__ = "question_co_weights"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    co_id = Column(Integer, ForeignKey("co_definitions.id"), nullable=False)
    co_code = Column(String(10), nullable=False)  # Keep for reference
    weight_pct = Column(Float, nullable=False)  # Weight percentage for this CO in this question
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    question = relationship("Question", back_populates="co_weights")
    co_definition = relationship("CODefinition", back_populates="question_co_weights")

class IndirectAttainment(Base):
    __tablename__ = "indirect_attainment"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    po_id = Column(Integer, ForeignKey("po_definitions.id"), nullable=True)  # Optional PO mapping
    co_id = Column(Integer, ForeignKey("co_definitions.id"), nullable=True)  # Optional CO mapping
    source = Column(Enum(IndirectSource), nullable=False)
    po_code = Column(String(10), nullable=True)  # Keep for reference
    co_code = Column(String(10), nullable=True)  # Keep for reference
    value_pct = Column(Float, nullable=False)  # Attainment percentage
    term = Column(String(20), nullable=True)  # Academic term/semester
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    subject = relationship("Subject", back_populates="indirect_attainment")
    po_definition = relationship("PODefinition", back_populates="indirect_attainment")
    co_definition = relationship("CODefinition", back_populates="indirect_attainment")

class AttainmentAudit(Base):
    __tablename__ = "attainment_audit"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    change = Column(Text, nullable=False)  # Description of change
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    subject = relationship("Subject", back_populates="attainment_audit")
    user = relationship("User", foreign_keys=[user_id])

class StudentGoal(Base):
    __tablename__ = "student_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, default=0)
    deadline = Column(DateTime(timezone=True))
    status = Column(String(20), default="active")  # active, completed, paused, cancelled
    goal_type = Column(String(50), nullable=False)  # academic, attendance, co_attainment, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    student = relationship("User", foreign_keys=[student_id])

class StudentMilestone(Base):
    __tablename__ = "student_milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    achieved = Column(Boolean, default=False)
    achieved_date = Column(DateTime(timezone=True))
    milestone_type = Column(String(50), nullable=False)  # grade, performance, attendance, etc.
    criteria = Column(JSON)  # Store criteria for achievement
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    student = relationship("User", foreign_keys=[student_id])