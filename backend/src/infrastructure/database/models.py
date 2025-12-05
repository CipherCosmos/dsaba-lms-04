"""
SQLAlchemy Database Models
Maps domain entities to database tables
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, 
    Boolean, ForeignKey, Date, DECIMAL, CheckConstraint,
    UniqueConstraint, Index, JSON, and_, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .session import Base
import enum
import warnings


# ============================================
# IAM Schema - Identity & Access Management
# ============================================

class UserModel(Base):
    """User database model"""
    __tablename__ = "users"
    __table_args__ = (
        Index('idx_users_username', 'username'),
        Index('idx_users_email', 'email'),
        Index('idx_users_is_active', 'is_active'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True, index=True)
    avatar_url = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    # Note: user_roles relationship configured in __init__.py after all models are loaded
    # to resolve ambiguity with granted_by foreign key (UserRoleModel has two FKs to users.id)
    student_profile = relationship("StudentModel", back_populates="user", uselist=False)
    teacher_profile = relationship("TeacherModel", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLogModel", back_populates="user", foreign_keys="[AuditLogModel.user_id]")
    password_reset_tokens = relationship("PasswordResetTokenModel", back_populates="user", cascade="all, delete-orphan")


class PasswordResetTokenModel(Base):
    """Password reset token database model"""
    __tablename__ = "password_reset_tokens"
    __table_args__ = (
        Index('idx_reset_tokens_user', 'user_id'),
        Index('idx_reset_tokens_token', 'token'),
        Index('idx_reset_tokens_expires', 'expires_at'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("UserModel", back_populates="password_reset_tokens")


class RoleModel(Base):
    """Role database model"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user_roles = relationship("UserRoleModel", back_populates="role")
    role_permissions = relationship("RolePermissionModel", back_populates="role", cascade="all, delete-orphan")


class UserRoleModel(Base):
    """User-Role association (many-to-many)"""
    __tablename__ = "user_roles"
    __table_args__ = (
        Index('idx_user_roles_user', 'user_id'),
        Index('idx_user_roles_role', 'role_id'),
    )
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    # Note: Using primaryjoin to explicitly specify which FK to use for user relationship
    # since UserRoleModel has two FKs to users.id (user_id and granted_by)
    user = relationship(
        "UserModel", 
        back_populates="user_roles", 
        foreign_keys=[user_id],
        primaryjoin="UserRoleModel.user_id == UserModel.id"
    )
    role = relationship("RoleModel", back_populates="user_roles")
    department = relationship("DepartmentModel", foreign_keys=[department_id])


# Note: UserModel.user_roles relationship will be configured after all models are defined
# This is necessary because StudentModel and TeacherModel also reference UserModel
# and SQLAlchemy needs all models defined before configuring relationships


class PermissionModel(Base):
    """Permission database model"""
    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint('resource', 'action', name='unique_resource_action'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    role_permissions = relationship("RolePermissionModel", back_populates="permission")


class RolePermissionModel(Base):
    """Role-Permission association"""
    __tablename__ = "role_permissions"
    
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    
    # Relationships
    role = relationship("RoleModel", back_populates="role_permissions")
    permission = relationship("PermissionModel", back_populates="role_permissions")


# ============================================
# Academic Schema - Academic Structure
# ============================================

class DepartmentModel(Base):
    """Department database model"""
    __tablename__ = "departments"
    __table_args__ = (
        Index('idx_departments_code', 'code'),
        Index('idx_departments_hod', 'hod_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(10), unique=True, nullable=False, index=True)
    hod_id = Column(Integer, ForeignKey("users.id", use_alter=True, ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    hod = relationship("UserModel", foreign_keys=[hod_id], post_update=True)
    subjects = relationship("SubjectModel", back_populates="department")
    program_outcomes = relationship("ProgramOutcomeModel", back_populates="department")
    semesters = relationship("SemesterModel", back_populates="department")
    batch_instances = relationship("BatchInstanceModel", back_populates="department")


class BatchModel(Base):
    """Batch database model (B.Tech, MBA, etc.) - Program type"""
    __tablename__ = "batches"
    __table_args__ = (
        CheckConstraint('duration_years BETWEEN 1 AND 6', name='check_duration_years'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    duration_years = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    batch_instances = relationship("BatchInstanceModel", back_populates="batch", cascade="all, delete-orphan")
    batch_years = relationship("BatchYearModel", back_populates="batch", cascade="all, delete-orphan")


class BatchYearModel(Base):
    """
    Batch Year database model (Legacy)
    
    Represents a specific year instance of a batch (e.g., 2020-2024).
    Kept for backward compatibility. New code should use BatchInstance.
    """
    __tablename__ = "batch_years"
    __table_args__ = (
        UniqueConstraint('batch_id', 'start_year', 'end_year', name='unique_batch_year'),
        CheckConstraint('end_year > start_year', name='check_batch_year_order'),
        Index('idx_batch_years_batch', 'batch_id'),
        Index('idx_batch_years_current', 'is_current'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    start_year = Column(Integer, nullable=False)
    end_year = Column(Integer, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    batch = relationship("BatchModel", back_populates="batch_years")


class BatchInstanceModel(Base):
    """Batch Instance - Represents students admitted in an Academic Year for a Department and Program"""
    __tablename__ = "batch_instances"
    __table_args__ = (
        UniqueConstraint('academic_year_id', 'department_id', 'batch_id', name='unique_batch_instance'),
        CheckConstraint('current_semester BETWEEN 1 AND 12', name='check_batch_semester_range'),
        CheckConstraint('admission_year >= 2000', name='check_admission_year'),
        Index('idx_batch_instances_ay', 'academic_year_id'),
        Index('idx_batch_instances_dept', 'department_id'),
        Index('idx_batch_instances_batch', 'batch_id'),
        Index('idx_batch_instances_active', 'is_active'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)  # Program type (B.Tech, MBA)
    admission_year = Column(Integer, nullable=False)
    current_semester = Column(Integer, nullable=False, default=1)  # Tracks batch progress (1-8)
    current_year = Column(Integer, nullable=False, default=1)  # 1, 2, 3, 4 - year level of batch
    expected_graduation_year = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    academic_year = relationship("AcademicYearModel", back_populates="batch_instances")
    department = relationship("DepartmentModel", back_populates="batch_instances")
    batch = relationship("BatchModel", back_populates="batch_instances")
    sections = relationship("SectionModel", back_populates="batch_instance", cascade="all, delete-orphan")
    semesters = relationship("SemesterModel", back_populates="batch_instance", cascade="all, delete-orphan")
    students = relationship("StudentModel", back_populates="batch_instance")


class SectionModel(Base):
    """Section - Subdivision of a batch (A, B, C, etc.)"""
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint('batch_instance_id', 'section_name', name='unique_section_per_batch'),
        Index('idx_sections_batch', 'batch_instance_id'),
        Index('idx_sections_active', 'is_active'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    batch_instance_id = Column(Integer, ForeignKey("batch_instances.id", ondelete="CASCADE"), nullable=False)
    section_name = Column(String(10), nullable=False)  # A, B, C, etc.
    capacity = Column(Integer, nullable=True)  # Optional capacity limit
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    batch_instance = relationship("BatchInstanceModel", back_populates="sections")
    students = relationship("StudentModel", back_populates="section")


# ============================================
# Enums for Workflow States
# ============================================

class MarksWorkflowState(str, enum.Enum):
    """Marks workflow states"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    FROZEN = "frozen"
    PUBLISHED = "published"


class MarkComponentType(str, enum.Enum):
    """Internal marks component types"""
    IA1 = "ia1"  # Internal Assessment 1
    IA2 = "ia2"  # Internal Assessment 2
    ASSIGNMENT = "assignment"
    PRACTICAL = "practical"
    ATTENDANCE = "attendance"
    QUIZ = "quiz"
    PROJECT = "project"
    OTHER = "other"


class AcademicYearStatus(str, enum.Enum):
    """Academic year status"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    PLANNED = "planned"


# ============================================
# Academic Year Model (NEW)
# ============================================

class AcademicYearModel(Base):
    """Academic Year database model (e.g., 2024-2025)"""
    __tablename__ = "academic_years"
    __table_args__ = (
        UniqueConstraint('start_year', 'end_year', name='unique_academic_year'),
        CheckConstraint('end_year > start_year', name='check_academic_year_order'),
        Index('idx_academic_years_status', 'status'),
        Index('idx_academic_years_current', 'is_current'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    start_year = Column(Integer, nullable=False)
    end_year = Column(Integer, nullable=False)
    display_name = Column(String(20), nullable=False)  # e.g., "2024-2025"
    is_current = Column(Boolean, default=False, nullable=False)
    status = Column(SQLEnum(AcademicYearStatus), default=AcademicYearStatus.PLANNED, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    semesters = relationship("SemesterModel", back_populates="academic_year", cascade="all, delete-orphan")
    student_enrollments = relationship("StudentEnrollmentModel", back_populates="academic_year")
    subject_assignments = relationship("SubjectAssignmentModel", back_populates="academic_year_obj")
    internal_marks = relationship("InternalMarkModel", back_populates="academic_year")
    batch_instances = relationship("BatchInstanceModel", back_populates="academic_year", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<AcademicYearModel(id={self.id}, {self.display_name})>"


class SemesterModel(Base):
    """Enhanced Semester database model - linked to Batch Instance (primary) and Academic Year/Department (denormalized)"""
    __tablename__ = "semesters"
    __table_args__ = (
        UniqueConstraint('batch_instance_id', 'semester_no', name='unique_semester_batch_instance'),
        CheckConstraint('semester_no BETWEEN 1 AND 12', name='check_semester_no'),
        CheckConstraint('end_date > start_date', name='check_semester_dates'),
        Index('idx_semesters_current', 'is_current'),
        Index('idx_semesters_dept', 'department_id'),
        Index('idx_semesters_ay', 'academic_year_id'),
        Index('idx_semesters_batch_instance', 'batch_instance_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    batch_instance_id = Column(Integer, ForeignKey("batch_instances.id", ondelete="CASCADE"), nullable=True)  # Primary link
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=True)  # Denormalized for queries
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)  # Denormalized for queries
    semester_no = Column(Integer, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default='active')  # active, completed, archived
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    batch_instance = relationship("BatchInstanceModel", back_populates="semesters")
    academic_year = relationship("AcademicYearModel", back_populates="semesters")
    department = relationship("DepartmentModel", back_populates="semesters")
    student_enrollments = relationship("StudentEnrollmentModel", back_populates="semester", foreign_keys="[StudentEnrollmentModel.semester_id]")
    subjects = relationship("SubjectModel", back_populates="semester")
    final_marks = relationship("FinalMarkModel", back_populates="semester")
    internal_marks = relationship("InternalMarkModel", back_populates="semester")


# ============================================
# Student Enrollment Model (NEW)
# ============================================

class StudentEnrollmentModel(Base):
    """Student enrollment in a semester for a specific academic year"""
    __tablename__ = "student_enrollments"
    __table_args__ = (
        UniqueConstraint('student_id', 'semester_id', 'academic_year_id', name='unique_student_enrollment'),
        Index('idx_enrollments_student', 'student_id'),
        Index('idx_enrollments_semester', 'semester_id'),
        Index('idx_enrollments_ay', 'academic_year_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    roll_no = Column(String(20), nullable=False)  # Roll number for this semester
    enrollment_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    promotion_status = Column(String(20), default='pending')  # pending, promoted, retained, failed
    next_semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("StudentModel", back_populates="enrollments")
    semester = relationship("SemesterModel", foreign_keys=[semester_id], back_populates="student_enrollments")
    academic_year = relationship("AcademicYearModel", back_populates="student_enrollments")
    next_semester = relationship("SemesterModel", foreign_keys=[next_semester_id])


# ============================================
# Promotion History Model (NEW)
# ============================================

class PromotionHistoryModel(Base):
    """Track student promotions across semesters"""
    __tablename__ = "promotion_history"
    __table_args__ = (
        Index('idx_promotion_student', 'student_id'),
        Index('idx_promotion_from_sem', 'from_semester_id'),
        Index('idx_promotion_to_sem', 'to_semester_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    from_semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=False)
    to_semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=False)
    from_academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=False)
    to_academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=False)
    promotion_date = Column(Date, nullable=False)
    promotion_type = Column(String(20), default='regular')  # regular, lateral, failed, retained
    promoted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("StudentModel", back_populates="promotion_history")
    from_semester = relationship("SemesterModel", foreign_keys=[from_semester_id])
    to_semester = relationship("SemesterModel", foreign_keys=[to_semester_id])


# ============================================
# Profiles Schema - Student & Teacher Profiles
# ============================================

class StudentModel(Base):
    """Student profile database model - linked to Batch Instance + Section"""
    __tablename__ = "students"
    __table_args__ = (
        Index('idx_students_dept', 'department_id'),
        Index('idx_students_batch_instance', 'batch_instance_id'),
        Index('idx_students_section', 'section_id'),
        Index('idx_students_current_semester', 'current_semester_id'),
        Index('idx_students_ay', 'academic_year_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_no = Column(String(20), unique=True, nullable=False, index=True)
    
    # New structure: Batch Instance + Section
    batch_instance_id = Column(Integer, ForeignKey("batch_instances.id", ondelete="SET NULL"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    current_semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    
    # Denormalized fields for performance
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="SET NULL"))
    
    admission_date = Column(Date)
    
    # Year-level progression tracking
    current_year_level = Column(Integer, nullable=False, default=1)  # 1, 2, 3, 4
    expected_graduation_year = Column(Integer, nullable=True)
    is_detained = Column(Boolean, default=False)
    backlog_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("UserModel", back_populates="student_profile")
    batch_instance = relationship("BatchInstanceModel", back_populates="students")
    section = relationship("SectionModel", back_populates="students")
    current_semester = relationship("SemesterModel", foreign_keys=[current_semester_id])
    marks = relationship("MarkModel", back_populates="student")
    final_marks = relationship("FinalMarkModel", back_populates="student")
    enrollments = relationship("StudentEnrollmentModel", back_populates="student")
    internal_marks = relationship("InternalMarkModel", back_populates="student")
    promotion_history = relationship("PromotionHistoryModel", back_populates="student")
    year_progression_history = relationship("StudentYearProgressionModel", back_populates="student", cascade="all, delete-orphan")



class TeacherModel(Base):
    """Teacher profile database model"""
    __tablename__ = "teachers"
    __table_args__ = (
        Index('idx_teachers_dept', 'department_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    employee_id = Column(String(20), unique=True)
    specialization = Column(Text)
    join_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("UserModel", back_populates="teacher_profile")
    subject_assignments = relationship("SubjectAssignmentModel", back_populates="teacher")


# ============================================
# Curriculum Schema
# ============================================

class SubjectModel(Base):
    """Subject database model"""
    __tablename__ = "subjects"
    __table_args__ = (
        CheckConstraint('credits BETWEEN 1 AND 10', name='check_credits'),
        CheckConstraint('max_internal + max_external = 100', name='check_marks_sum'),
        Index('idx_subjects_code', 'code'),
        Index('idx_subjects_department', 'department_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)  # Optional: subject can be linked to semester
    credits = Column(DECIMAL(3, 1), nullable=False, default=3.0)
    max_internal = Column(DECIMAL(5, 2), default=40.0, nullable=False)
    max_external = Column(DECIMAL(5, 2), default=60.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    department = relationship("DepartmentModel", back_populates="subjects")
    semester = relationship("SemesterModel", back_populates="subjects")
    course_outcomes = relationship("CourseOutcomeModel", back_populates="subject", cascade="all, delete-orphan")
    subject_assignments = relationship("SubjectAssignmentModel", back_populates="subject")


class SubjectAssignmentModel(Base):
    """Subject assignment to teacher and class/semester
    
    NOTE: class_id is now optional (deprecated). In new architecture, 
    class/batch instance is derived from semester.batch_instance_id.
    Kept for backward compatibility with existing data.
    """
    __tablename__ = "subject_assignments"
    __table_args__ = (
        # Updated unique constraint: class_id is optional, so we use semester + subject + teacher
        UniqueConstraint('subject_id', 'semester_id', 'teacher_id', name='unique_assignment'),
        Index('idx_assignments_subject', 'subject_id'),
        Index('idx_assignments_teacher', 'teacher_id'),
        Index('idx_assignments_semester', 'semester_id'),
        Index('idx_assignments_ay', 'academic_year_id'),
        Index('idx_assignments_composite', 'teacher_id', 'semester_id', 'academic_year_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(Integer, nullable=False)  # Keep for backward compatibility
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=True)  # New FK
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    subject = relationship("SubjectModel", back_populates="subject_assignments")
    teacher = relationship("TeacherModel", back_populates="subject_assignments")
    exams = relationship("ExamModel", back_populates="subject_assignment")
    final_marks = relationship("FinalMarkModel", back_populates="subject_assignment")
    academic_year_obj = relationship("AcademicYearModel", back_populates="subject_assignments", foreign_keys=[academic_year_id])
    internal_marks = relationship("InternalMarkModel", back_populates="subject_assignment")


class ProgramOutcomeModel(Base):
    """Program Outcome (PO/PSO) database model"""
    __tablename__ = "program_outcomes"
    __table_args__ = (
        UniqueConstraint('department_id', 'code', name='unique_po_code'),
        CheckConstraint("type IN ('PO', 'PSO')", name='check_po_type'),
        Index('idx_po_department', 'department_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(10), nullable=False)
    type = Column(String(10), nullable=False, default='PO')
    title = Column(String(200), nullable=False)
    description = Column(Text)
    target_attainment = Column(DECIMAL(5, 2), default=70.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    department = relationship("DepartmentModel", back_populates="program_outcomes")
    co_po_mappings = relationship("COPOMappingModel", back_populates="program_outcome")


class CourseOutcomeModel(Base):
    """Course Outcome (CO) database model"""
    __tablename__ = "course_outcomes"
    __table_args__ = (
        UniqueConstraint('subject_id', 'code', name='unique_co_code'),
        Index('idx_co_subject', 'subject_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(10), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    target_attainment = Column(DECIMAL(5, 2), default=70.0)
    l1_threshold = Column(DECIMAL(5, 2), default=60.0)
    l2_threshold = Column(DECIMAL(5, 2), default=70.0)
    l3_threshold = Column(DECIMAL(5, 2), default=80.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    subject = relationship("SubjectModel", back_populates="course_outcomes")
    co_po_mappings = relationship("COPOMappingModel", back_populates="course_outcome", cascade="all, delete-orphan")
    question_co_mappings = relationship("QuestionCOMappingModel", back_populates="course_outcome")


class COPOMappingModel(Base):
    """CO-PO mapping database model"""
    __tablename__ = "co_po_mappings"
    __table_args__ = (
        UniqueConstraint('co_id', 'po_id', name='unique_co_po'),
        CheckConstraint('strength BETWEEN 1 AND 3', name='check_strength'),
        Index('idx_co_po_co', 'co_id'),
        Index('idx_co_po_po', 'po_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    co_id = Column(Integer, ForeignKey("course_outcomes.id", ondelete="CASCADE"), nullable=False)
    po_id = Column(Integer, ForeignKey("program_outcomes.id", ondelete="CASCADE"), nullable=False)
    strength = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course_outcome = relationship("CourseOutcomeModel", back_populates="co_po_mappings")
    program_outcome = relationship("ProgramOutcomeModel", back_populates="co_po_mappings")


# ============================================
# Assessment Schema - Exams, Questions, Marks
# ============================================

class ExamModel(Base):
    """Exam database model"""
    __tablename__ = "exams"
    __table_args__ = (
        UniqueConstraint('subject_assignment_id', 'exam_type', name='unique_subject_exam_type'),
        CheckConstraint("exam_type IN ('internal1', 'internal2', 'external')", name='check_exam_type'),
        CheckConstraint("status IN ('draft', 'active', 'locked', 'published')", name='check_status'),
        Index('idx_exams_assignment', 'subject_assignment_id'),
        Index('idx_exams_type', 'exam_type'),
        Index('idx_exams_date', 'exam_date'),
        Index('idx_exams_status', 'status'),
        Index('idx_exams_assignment_type', 'subject_assignment_id', 'exam_type'),
        Index('idx_exams_created_by', 'created_by'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subject_assignment_id = Column(Integer, ForeignKey("subject_assignments.id", ondelete="CASCADE"), nullable=False)
    exam_type = Column(String(20), nullable=False)
    exam_date = Column(Date, nullable=False)
    duration_minutes = Column(Integer)
    total_marks = Column(DECIMAL(5, 2), nullable=False)
    instructions = Column(Text)
    status = Column(String(20), default='draft', nullable=False)
    question_paper_url = Column(String(500))
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    subject_assignment = relationship("SubjectAssignmentModel", back_populates="exams")
    questions = relationship("QuestionModel", back_populates="exam", cascade="all, delete-orphan")
    marks = relationship("MarkModel", back_populates="exam", cascade="all, delete-orphan")


class QuestionModel(Base):
    """Question database model"""
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("section IN ('A', 'B', 'C')", name='check_section'),
        CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name='check_difficulty'),
        # Note: Regex constraint removed for SQLite compatibility
        # Blooms level validation should be done at application level
        # CheckConstraint("blooms_level ~ '^L[1-6]$'", name='check_blooms_level'),
        Index('idx_questions_exam', 'exam_id'),
        Index('idx_questions_section', 'exam_id', 'section'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_no = Column(String(10), nullable=False)
    question_text = Column(Text, nullable=False)
    section = Column(String(1), nullable=False)
    marks_per_question = Column(DECIMAL(5, 2), nullable=False)
    required_count = Column(Integer, default=1)
    optional_count = Column(Integer, default=0)
    blooms_level = Column(String(10))
    difficulty = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    exam = relationship("ExamModel", back_populates="questions")
    sub_questions = relationship("SubQuestionModel", back_populates="question", cascade="all, delete-orphan")
    marks = relationship("MarkModel", back_populates="question")
    question_co_mappings = relationship("QuestionCOMappingModel", back_populates="question", cascade="all, delete-orphan")


class SubQuestionModel(Base):
    """Sub-question database model"""
    __tablename__ = "sub_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    sub_no = Column(String(10), nullable=False)
    sub_text = Column(Text)
    marks = Column(DECIMAL(5, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    question = relationship("QuestionModel", back_populates="sub_questions")
    marks = relationship("MarkModel", back_populates="sub_question")


class QuestionCOMappingModel(Base):
    """Question-CO mapping database model"""
    __tablename__ = "question_co_mappings"
    __table_args__ = (
        CheckConstraint('weight_pct BETWEEN 0 AND 100', name='check_weight_pct'),
        Index('idx_question_co_question', 'question_id'),
        Index('idx_question_co_co', 'co_id'),
    )
    
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True)
    co_id = Column(Integer, ForeignKey("course_outcomes.id", ondelete="CASCADE"), primary_key=True)
    weight_pct = Column(DECIMAL(5, 2), default=100.0, nullable=False)
    
    # Relationships
    question = relationship("QuestionModel", back_populates="question_co_mappings")
    course_outcome = relationship("CourseOutcomeModel", back_populates="question_co_mappings")


class MarkModel(Base):
    """Individual mark entry database model"""
    __tablename__ = "marks"
    __table_args__ = (
        CheckConstraint('marks_obtained >= 0', name='check_marks_non_negative'),
        Index('idx_marks_exam_student', 'exam_id', 'student_id'),
        Index('idx_marks_student', 'student_id'),
        Index('idx_marks_question', 'question_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    sub_question_id = Column(Integer, ForeignKey("sub_questions.id", ondelete="SET NULL"), nullable=True)
    marks_obtained = Column(DECIMAL(5, 2), default=0, nullable=False)
    entered_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    entered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    exam = relationship("ExamModel", back_populates="marks")
    student = relationship("StudentModel", back_populates="marks")
    question = relationship("QuestionModel", back_populates="marks")
    sub_question = relationship("SubQuestionModel", back_populates="marks")
    audit_logs = relationship("MarkAuditLogModel", back_populates="mark")


class FinalMarkModel(Base):
    """Final aggregated marks database model"""
    __tablename__ = "final_marks"
    __table_args__ = (
        UniqueConstraint('student_id', 'subject_assignment_id', 'semester_id', name='unique_final_mark'),
        CheckConstraint("grade IN ('A+', 'A', 'B+', 'B', 'C', 'D', 'F')", name='check_grade'),
        CheckConstraint("status IN ('draft', 'published', 'locked')", name='check_status'),
        Index('idx_final_marks_student', 'student_id'),
        Index('idx_final_marks_semester', 'semester_id'),
        Index('idx_final_marks_subject', 'subject_assignment_id'),
        Index('idx_final_marks_status', 'status'),
        Index('idx_final_marks_composite', 'student_id', 'semester_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_assignment_id = Column(Integer, ForeignKey("subject_assignments.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    
    # Internal assessments
    internal_1 = Column(DECIMAL(5, 2), default=0)
    internal_2 = Column(DECIMAL(5, 2), default=0)
    best_internal = Column(DECIMAL(5, 2), default=0)
    
    # External assessment
    external = Column(DECIMAL(5, 2), default=0)
    
    # Final calculation
    total = Column(DECIMAL(5, 2), default=0)
    percentage = Column(DECIMAL(5, 2), default=0)
    grade = Column(String(2), default='F')
    
    # GPA
    sgpa = Column(DECIMAL(3, 2))
    cgpa = Column(DECIMAL(3, 2))
    
    # CO attainment
    co_attainment = Column(JSON, default={})
    
    # Status
    status = Column(String(20), default='draft')
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True))
    editable_until = Column(Date)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    student = relationship("StudentModel", back_populates="final_marks")
    subject_assignment = relationship("SubjectAssignmentModel", back_populates="final_marks")
    semester = relationship("SemesterModel", back_populates="final_marks")


# ============================================
# Internal Marks Model (NEW - Enhanced)
# ============================================

class InternalMarkModel(Base):
    """Internal marks with workflow states"""
    __tablename__ = "internal_marks"
    __table_args__ = (
        UniqueConstraint('student_id', 'subject_assignment_id', 'component_type', name='unique_internal_mark'),
        Index('idx_internal_marks_student', 'student_id'),
        Index('idx_internal_marks_subject', 'subject_assignment_id'),
        Index('idx_internal_marks_workflow', 'workflow_state'),
        Index('idx_internal_marks_semester', 'semester_id'),
        Index('idx_internal_marks_ay', 'academic_year_id'),
        Index('idx_internal_marks_composite', 'student_id', 'semester_id', 'academic_year_id'),
        Index('idx_internal_marks_workflow_subject', 'workflow_state', 'subject_assignment_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_assignment_id = Column(Integer, ForeignKey("subject_assignments.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    
    # Component details
    component_type = Column(SQLEnum(MarkComponentType), nullable=False)
    marks_obtained = Column(DECIMAL(5, 2), default=0, nullable=False)
    max_marks = Column(DECIMAL(5, 2), nullable=False)
    
    # Workflow
    workflow_state = Column(SQLEnum(MarksWorkflowState), default=MarksWorkflowState.DRAFT, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    frozen_at = Column(DateTime(timezone=True), nullable=True)
    frozen_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    entered_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    entered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    notes = Column(Text, nullable=True)
    
    # Relationships
    student = relationship("StudentModel", back_populates="internal_marks")
    subject_assignment = relationship("SubjectAssignmentModel", back_populates="internal_marks")
    semester = relationship("SemesterModel", back_populates="internal_marks")
    academic_year = relationship("AcademicYearModel", back_populates="internal_marks")
    entered_by_user = relationship("UserModel", foreign_keys=[entered_by])
    submitted_by_user = relationship("UserModel", foreign_keys=[submitted_by])
    approved_by_user = relationship("UserModel", foreign_keys=[approved_by])
    rejected_by_user = relationship("UserModel", foreign_keys=[rejected_by])
    frozen_by_user = relationship("UserModel", foreign_keys=[frozen_by])
    audit_logs = relationship("MarksWorkflowAuditModel", back_populates="internal_mark", cascade="all, delete-orphan")


# ============================================
# Audit Schema - Audit Trail & Logs
# ============================================

class MarkAuditLogModel(Base):
    """Mark change audit log"""
    __tablename__ = "mark_audit_logs"
    __table_args__ = (
        CheckConstraint("change_type IN ('edit', 'override', 'recalculation')", name='check_change_type'),
        Index('idx_mark_audit_mark', 'mark_id'),
        Index('idx_mark_audit_user', 'changed_by'),
        Index('idx_mark_audit_timestamp', 'changed_at'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    mark_id = Column(Integer, ForeignKey("marks.id", ondelete="CASCADE"))
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    field_changed = Column(String(50), nullable=False)
    old_value = Column(DECIMAL(5, 2))
    new_value = Column(DECIMAL(5, 2))
    reason = Column(Text)
    change_type = Column(String(20))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    mark = relationship("MarkModel", back_populates="audit_logs")


class MarksWorkflowAuditModel(Base):
    """Audit log for marks workflow state changes"""
    __tablename__ = "marks_workflow_audit"
    __table_args__ = (
        Index('idx_workflow_audit_mark', 'internal_mark_id'),
        Index('idx_workflow_audit_user', 'changed_by'),
        Index('idx_workflow_audit_date', 'changed_at'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    internal_mark_id = Column(Integer, ForeignKey("internal_marks.id", ondelete="CASCADE"), nullable=False)
    old_state = Column(String(20), nullable=True)
    new_state = Column(String(20), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(Text, nullable=True)
    change_metadata = Column(JSON, nullable=True)  # Additional context (renamed from 'metadata' - reserved word)
    
    # Relationships
    internal_mark = relationship("InternalMarkModel", back_populates="audit_logs")
    changed_by_user = relationship("UserModel")


class AuditLogModel(Base):
    """System-wide audit log"""
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index('idx_audit_log_user', 'user_id'),
        Index('idx_audit_log_created', 'created_at'),
        Index('idx_audit_log_action', 'action'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(100), nullable=False)
    resource = Column(String(100))
    resource_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("UserModel", back_populates="audit_logs", foreign_keys=[user_id])


# ============================================
# Indirect Attainment Schema
# ============================================

class SurveyModel(Base):
    """Survey database model for indirect attainment"""
    __tablename__ = "surveys"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'active', 'closed')", name='check_survey_status'),
        Index('idx_surveys_department', 'department_id'),
        Index('idx_surveys_academic_year', 'academic_year_id'),
        Index('idx_surveys_status', 'status'),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default='draft', nullable=False)
    target_audience = Column(String(50), default='students')  # students, alumni, employers
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("DepartmentModel")
    academic_year = relationship("AcademicYearModel")
    questions = relationship("SurveyQuestionModel", back_populates="survey", cascade="all, delete-orphan")
    responses = relationship("SurveyResponseModel", back_populates="survey", cascade="all, delete-orphan")


class SurveyQuestionModel(Base):
    """Survey question database model"""
    __tablename__ = "survey_questions"
    __table_args__ = (
        CheckConstraint("question_type IN ('rating', 'text', 'multiple_choice', 'yes_no')", name='check_question_type'),
        Index('idx_survey_questions_survey', 'survey_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)
    options = Column(JSON, nullable=True)  # For multiple choice questions
    required = Column(Boolean, default=True, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    survey = relationship("SurveyModel", back_populates="questions")
    responses = relationship("SurveyResponseModel", back_populates="question", cascade="all, delete-orphan")


class SurveyResponseModel(Base):
    """Survey response database model"""
    __tablename__ = "survey_responses"
    __table_args__ = (
        UniqueConstraint('survey_id', 'respondent_id', name='unique_survey_response'),
        Index('idx_survey_responses_survey', 'survey_id'),
        Index('idx_survey_responses_respondent', 'respondent_id'),
        Index('idx_survey_responses_question', 'question_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("survey_questions.id", ondelete="CASCADE"), nullable=False)
    respondent_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    response_value = Column(Text, nullable=True)  # Text response or selected option
    rating_value = Column(Integer, nullable=True)  # For rating questions (1-5)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    survey = relationship("SurveyModel", back_populates="responses")
    question = relationship("SurveyQuestionModel", back_populates="responses")
    respondent = relationship("UserModel")


class ExitExamModel(Base):
    """Exit exam database model for indirect attainment"""
    __tablename__ = "exit_exams"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'active', 'completed')", name='check_exit_exam_status'),
        Index('idx_exit_exams_department', 'department_id'),
        Index('idx_exit_exams_academic_year', 'academic_year_id'),
        Index('idx_exit_exams_status', 'status'),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default='draft', nullable=False)
    exam_date = Column(Date, nullable=True)
    total_questions = Column(Integer, default=0, nullable=False)
    passing_score = Column(DECIMAL(5, 2), default=50.0, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("DepartmentModel")
    academic_year = relationship("AcademicYearModel")
    results = relationship("ExitExamResultModel", back_populates="exit_exam", cascade="all, delete-orphan")


class ExitExamResultModel(Base):
    """Exit exam result database model"""
    __tablename__ = "exit_exam_results"
    __table_args__ = (
        UniqueConstraint('exit_exam_id', 'student_id', name='unique_exit_exam_result'),
        Index('idx_exit_exam_results_exam', 'exit_exam_id'),
        Index('idx_exit_exam_results_student', 'student_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    exit_exam_id = Column(Integer, ForeignKey("exit_exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    score = Column(DECIMAL(5, 2), nullable=False)
    max_score = Column(DECIMAL(5, 2), nullable=False)
    percentage = Column(DECIMAL(5, 2), nullable=False)
    passed = Column(Boolean, default=False, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    exit_exam = relationship("ExitExamModel", back_populates="results")
    student = relationship("StudentModel")


# ============================================
# Department Settings
# ============================================

class DepartmentSettingsModel(Base):
    """Department-specific settings"""
    __tablename__ = "department_settings"
    __table_args__ = (
        CheckConstraint("internal_method IN ('best', 'avg', 'weighted')", name='check_internal_method'),
    )

    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True)
    internal_method = Column(String(20), default='best', nullable=False)
    grading_scale = Column(JSON, default={
        "A+": 90, "A": 80, "B+": 70, "B": 60, "C": 50, "D": 40, "F": 0
    })
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ============================================
# Configure Relationships After All Models Defined
# ============================================


# ============================================================================
# STUDENT YEAR PROGRESSION TRACKING
# ============================================================================

class StudentYearProgressionModel(Base):
    """
    Track student progression through academic year levels
    
    Year Level System:
    - Year 1 (Level 1): Semesters 1-2
    - Year 2 (Level 2): Semesters 3-4
    - Year 3 (Level 3): Semesters 5-6
    - Year 4 (Level 4): Semesters 7-8
    """
    __tablename__ = "student_year_progression"
    __table_args__ = (
        Index('idx_progression_student', 'student_id'),
        Index('idx_progression_year', 'academic_year_id'),
        Index('idx_progression_from_to', 'from_year_level', 'to_year_level'),
    )
    
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    from_year_level = Column(Integer, nullable=False)  # 1, 2, 3, 4 (or 0 for admission)
    to_year_level = Column(Integer, nullable=False)    # 1, 2, 3, 4
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    promotion_date = Column(Date, nullable=False, server_default=func.current_date())
    promotion_type = Column(String(20), default='regular')  # regular, repeat, detained, promoted_with_backlogs
    promoted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Performance summary at time of promotion
    cgpa = Column(DECIMAL(3, 2), nullable=True)
    sgpa = Column(DECIMAL(3, 2), nullable=True)  # SGPA of last semester completed
    total_credits_earned = Column(Integer, nullable=True)
    backlogs_count = Column(Integer, default=0)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    student = relationship("StudentModel", back_populates="year_progression_history")
    academic_year = relationship("AcademicYearModel")
    promoter = relationship("UserModel", foreign_keys=[promoted_by])


# Configure UserModel.user_roles relationship after all models are defined
# This resolves the ambiguity with the granted_by foreign key
# UserRoleModel has two FKs to users.id (user_id and granted_by)
# We configure this at the end to ensure all models are loaded first
UserModel.user_roles = relationship(
    "UserRoleModel",
    back_populates="user",
    foreign_keys=[UserRoleModel.user_id],
    cascade="all, delete-orphan"
)
