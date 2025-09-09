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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    exam = relationship("Exam", back_populates="questions")
    marks = relationship("Mark", back_populates="question")

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