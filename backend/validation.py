"""
Comprehensive validation and error handling module for the exam management system.
"""

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import *
from schemas import *
import re
from datetime import datetime, timedelta


class ValidationError(Exception):
    """Custom validation error with detailed message"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class BusinessLogicError(Exception):
    """Custom business logic error"""
    def __init__(self, message: str, code: str = None):
        self.message = message
        self.code = code
        super().__init__(self.message)


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password: str) -> bool:
    """Validate password strength"""
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long", "password")
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError("Password must contain at least one uppercase letter", "password")
    
    if not re.search(r'[a-z]', password):
        raise ValidationError("Password must contain at least one lowercase letter", "password")
    
    if not re.search(r'\d', password):
        raise ValidationError("Password must contain at least one digit", "password")
    
    return True


def validate_user_data(user_data: Union[UserCreate, UserUpdate], db: Session) -> None:
    """Validate user data comprehensively"""
    if isinstance(user_data, UserCreate):
        # Check username uniqueness
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise ValidationError("Username already exists", "username")
        
        # Check email uniqueness
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise ValidationError("Email already exists", "email")
        
        # Validate password
        validate_password_strength(user_data.password)
    
    # Validate email format
    if hasattr(user_data, 'email') and user_data.email:
        if not validate_email(user_data.email):
            raise ValidationError("Invalid email format", "email")
    
    # Validate role-specific requirements
    if hasattr(user_data, 'role') and user_data.role:
        if user_data.role == UserRole.student and not user_data.class_id:
            raise ValidationError("Students must be assigned to a class", "class_id")
        
        if user_data.role in [UserRole.teacher, UserRole.hod] and not user_data.department_id:
            raise ValidationError("Teachers and HODs must be assigned to a department", "department_id")


def validate_department_data(department_data: Union[DepartmentCreate, DepartmentUpdate], db: Session) -> None:
    """Validate department data"""
    if isinstance(department_data, DepartmentCreate):
        # Check name uniqueness
        existing_name = db.query(Department).filter(Department.name == department_data.name).first()
        if existing_name:
            raise ValidationError("Department name already exists", "name")
        
        # Check code uniqueness
        existing_code = db.query(Department).filter(Department.code == department_data.code).first()
        if existing_code:
            raise ValidationError("Department code already exists", "code")
    
    # Validate HOD assignment
    if hasattr(department_data, 'hod_id') and department_data.hod_id:
        hod = db.query(User).filter(
            User.id == department_data.hod_id,
            User.role == UserRole.hod
        ).first()
        if not hod:
            raise ValidationError("HOD user not found or not a HOD", "hod_id")


def validate_class_data(class_data: Union[ClassCreate, ClassUpdate], db: Session) -> None:
    """Validate class data"""
    # Validate department exists
    if hasattr(class_data, 'department_id') and class_data.department_id:
        department = db.query(Department).filter(Department.id == class_data.department_id).first()
        if not department:
            raise ValidationError("Department not found", "department_id")
    
    # Validate semester range
    if hasattr(class_data, 'semester') and class_data.semester:
        if not (1 <= class_data.semester <= 8):
            raise ValidationError("Semester must be between 1 and 8", "semester")
    
    # Check for duplicate class in same department
    if isinstance(class_data, ClassCreate):
        existing_class = db.query(Class).filter(
            Class.name == class_data.name,
            Class.department_id == class_data.department_id,
            Class.semester == class_data.semester,
            Class.section == class_data.section
        ).first()
        if existing_class:
            raise ValidationError("Class with same name, semester, and section already exists in this department", "name")


def validate_subject_data(subject_data: Union[SubjectCreate, SubjectUpdate], db: Session) -> None:
    """Validate subject data"""
    # Validate class exists
    if hasattr(subject_data, 'class_id') and subject_data.class_id:
        class_obj = db.query(Class).filter(Class.id == subject_data.class_id).first()
        if not class_obj:
            raise ValidationError("Class not found", "class_id")
    
    # Validate teacher exists and is a teacher
    if hasattr(subject_data, 'teacher_id') and subject_data.teacher_id:
        teacher = db.query(User).filter(
            User.id == subject_data.teacher_id,
            User.role == UserRole.teacher
        ).first()
        if not teacher:
            raise ValidationError("Teacher not found or not a teacher", "teacher_id")
    
    # Check code uniqueness
    if isinstance(subject_data, SubjectCreate):
        existing_code = db.query(Subject).filter(Subject.code == subject_data.code).first()
        if existing_code:
            raise ValidationError("Subject code already exists", "code")
    
    # Validate credits range
    if hasattr(subject_data, 'credits') and subject_data.credits:
        if not (1 <= subject_data.credits <= 6):
            raise ValidationError("Credits must be between 1 and 6", "credits")


def validate_exam_data(exam_data: Union[ExamCreate, ExamUpdate], db: Session) -> None:
    """Validate exam data"""
    # Validate subject exists
    if hasattr(exam_data, 'subject_id') and exam_data.subject_id:
        subject = db.query(Subject).filter(Subject.id == exam_data.subject_id).first()
        if not subject:
            raise ValidationError("Subject not found", "subject_id")
    
    # Validate exam date is not in the past (for creation)
    if isinstance(exam_data, ExamCreate) and exam_data.exam_date:
        if exam_data.exam_date < datetime.now():
            raise ValidationError("Exam date cannot be in the past", "exam_date")
    
    # Validate duration range
    if hasattr(exam_data, 'duration') and exam_data.duration:
        if not (30 <= exam_data.duration <= 300):  # 30 minutes to 5 hours
            raise ValidationError("Duration must be between 30 and 300 minutes", "duration")
    
    # Validate total marks
    if hasattr(exam_data, 'total_marks') and exam_data.total_marks:
        if exam_data.total_marks <= 0:
            raise ValidationError("Total marks must be positive", "total_marks")


def validate_question_data(question_data: Union[QuestionCreate, QuestionUpdate], db: Session) -> None:
    """Validate question data"""
    # Validate exam exists
    if hasattr(question_data, 'exam_id') and question_data.exam_id:
        exam = db.query(Exam).filter(Exam.id == question_data.exam_id).first()
        if not exam:
            raise ValidationError("Exam not found", "exam_id")
    
    # Validate max marks
    if hasattr(question_data, 'max_marks') and question_data.max_marks:
        if question_data.max_marks <= 0:
            raise ValidationError("Max marks must be positive", "max_marks")
    
    # Validate question number format
    if hasattr(question_data, 'question_number') and question_data.question_number:
        if not re.match(r'^[A-C]?\d+[a-z]?$', question_data.question_number):
            raise ValidationError("Question number must be in format like '1', 'A1', '2a', etc.", "question_number")


def validate_mark_data(mark_data: Union[MarkCreate, MarkUpdate], db: Session) -> None:
    """Validate mark data"""
    if isinstance(mark_data, MarkCreate):
        # Validate exam exists
        exam = db.query(Exam).filter(Exam.id == mark_data.exam_id).first()
        if not exam:
            raise ValidationError("Exam not found", "exam_id")
        
        # Validate student exists and is a student
        student = db.query(User).filter(
            User.id == mark_data.student_id,
            User.role == UserRole.student
        ).first()
        if not student:
            raise ValidationError("Student not found or not a student", "student_id")
        
        # Validate question exists and belongs to exam
        question = db.query(Question).filter(
            Question.id == mark_data.question_id,
            Question.exam_id == mark_data.exam_id
        ).first()
        if not question:
            raise ValidationError("Question not found or doesn't belong to this exam", "question_id")
        
        # Validate marks don't exceed max marks
        if mark_data.marks_obtained > question.max_marks:
            raise ValidationError(f"Marks obtained ({mark_data.marks_obtained}) cannot exceed max marks ({question.max_marks})", "marks_obtained")
        
        # Validate marks are not negative
        if mark_data.marks_obtained < 0:
            raise ValidationError("Marks obtained cannot be negative", "marks_obtained")
    
    if isinstance(mark_data, MarkUpdate):
        # Validate marks are not negative
        if hasattr(mark_data, 'marks_obtained') and mark_data.marks_obtained is not None:
            if mark_data.marks_obtained < 0:
                raise ValidationError("Marks obtained cannot be negative", "marks_obtained")


def validate_co_definition_data(co_data: Union[CODefinitionCreate, CODefinitionUpdate], db: Session) -> None:
    """Validate CO definition data"""
    if isinstance(co_data, CODefinitionCreate):
        # Validate subject exists
        subject = db.query(Subject).filter(Subject.id == co_data.subject_id).first()
        if not subject:
            raise ValidationError("Subject not found", "subject_id")
        
        # Check code uniqueness within subject
        existing_code = db.query(CODefinition).filter(
            CODefinition.subject_id == co_data.subject_id,
            CODefinition.code == co_data.code
        ).first()
        if existing_code:
            raise ValidationError("CO code already exists for this subject", "code")
    
    # Validate code format
    if hasattr(co_data, 'code') and co_data.code:
        if not re.match(r'^CO\d+$', co_data.code):
            raise ValidationError("CO code must be in format 'CO1', 'CO2', etc.", "code")


def validate_po_definition_data(po_data: Union[PODefinitionCreate, PODefinitionUpdate], db: Session) -> None:
    """Validate PO definition data"""
    if isinstance(po_data, PODefinitionCreate):
        # Validate department exists
        department = db.query(Department).filter(Department.id == po_data.department_id).first()
        if not department:
            raise ValidationError("Department not found", "department_id")
        
        # Check code uniqueness within department
        existing_code = db.query(PODefinition).filter(
            PODefinition.department_id == po_data.department_id,
            PODefinition.code == po_data.code
        ).first()
        if existing_code:
            raise ValidationError("PO code already exists for this department", "code")
    
    # Validate code format
    if hasattr(po_data, 'code') and po_data.code:
        if not re.match(r'^(PO|PSO)\d+$', po_data.code):
            raise ValidationError("PO code must be in format 'PO1', 'PO2', 'PSO1', etc.", "code")


def validate_co_target_data(target_data: Union[COTargetCreate, COTargetUpdate], db: Session) -> None:
    """Validate CO target data"""
    if isinstance(target_data, COTargetCreate):
        # Validate subject exists
        subject = db.query(Subject).filter(Subject.id == target_data.subject_id).first()
        if not subject:
            raise ValidationError("Subject not found", "subject_id")
        
        # Validate CO exists and belongs to subject
        co = db.query(CODefinition).filter(
            CODefinition.id == target_data.co_id,
            CODefinition.subject_id == target_data.subject_id
        ).first()
        if not co:
            raise ValidationError("CO not found or doesn't belong to this subject", "co_id")
    
    # Validate percentage ranges
    if hasattr(target_data, 'target_pct') and target_data.target_pct is not None:
        if not (0 <= target_data.target_pct <= 100):
            raise ValidationError("Target percentage must be between 0 and 100", "target_pct")
    
    if hasattr(target_data, 'l1_threshold') and target_data.l1_threshold is not None:
        if not (0 <= target_data.l1_threshold <= 100):
            raise ValidationError("L1 threshold must be between 0 and 100", "l1_threshold")
    
    if hasattr(target_data, 'l2_threshold') and target_data.l2_threshold is not None:
        if not (0 <= target_data.l2_threshold <= 100):
            raise ValidationError("L2 threshold must be between 0 and 100", "l2_threshold")
    
    if hasattr(target_data, 'l3_threshold') and target_data.l3_threshold is not None:
        if not (0 <= target_data.l3_threshold <= 100):
            raise ValidationError("L3 threshold must be between 0 and 100", "l3_threshold")


def validate_assessment_weight_data(weight_data: Union[AssessmentWeightCreate, AssessmentWeightUpdate], db: Session) -> None:
    """Validate assessment weight data"""
    if isinstance(weight_data, AssessmentWeightCreate):
        # Validate subject exists
        subject = db.query(Subject).filter(Subject.id == weight_data.subject_id).first()
        if not subject:
            raise ValidationError("Subject not found", "subject_id")
    
    # Validate weight percentage
    if hasattr(weight_data, 'weight_pct') and weight_data.weight_pct is not None:
        if not (0 <= weight_data.weight_pct <= 100):
            raise ValidationError("Weight percentage must be between 0 and 100", "weight_pct")


def validate_co_po_matrix_data(matrix_data: Union[COPOMatrixCreate, COPOMatrixUpdate], db: Session) -> None:
    """Validate CO-PO matrix data"""
    if isinstance(matrix_data, COPOMatrixCreate):
        # Validate subject exists
        subject = db.query(Subject).filter(Subject.id == matrix_data.subject_id).first()
        if not subject:
            raise ValidationError("Subject not found", "subject_id")
        
        # Validate CO exists and belongs to subject
        co = db.query(CODefinition).filter(
            CODefinition.id == matrix_data.co_id,
            CODefinition.subject_id == matrix_data.subject_id
        ).first()
        if not co:
            raise ValidationError("CO not found or doesn't belong to this subject", "co_id")
        
        # Validate PO exists
        po = db.query(PODefinition).filter(PODefinition.id == matrix_data.po_id).first()
        if not po:
            raise ValidationError("PO not found", "po_id")
    
    # Validate strength
    if hasattr(matrix_data, 'strength') and matrix_data.strength is not None:
        if not (1 <= matrix_data.strength <= 3):
            raise ValidationError("Strength must be between 1 and 3", "strength")


def validate_question_co_weight_data(weight_data: Union[QuestionCOWeightCreate, QuestionCOWeightUpdate], db: Session) -> None:
    """Validate question CO weight data"""
    if isinstance(weight_data, QuestionCOWeightCreate):
        # Validate question exists
        question = db.query(Question).filter(Question.id == weight_data.question_id).first()
        if not question:
            raise ValidationError("Question not found", "question_id")
        
        # Validate CO exists
        co = db.query(CODefinition).filter(CODefinition.id == weight_data.co_id).first()
        if not co:
            raise ValidationError("CO not found", "co_id")
    
    # Validate weight percentage
    if hasattr(weight_data, 'weight_pct') and weight_data.weight_pct is not None:
        if not (0 <= weight_data.weight_pct <= 100):
            raise ValidationError("Weight percentage must be between 0 and 100", "weight_pct")


def validate_indirect_attainment_data(attainment_data: Union[IndirectAttainmentCreate, IndirectAttainmentUpdate], db: Session) -> None:
    """Validate indirect attainment data"""
    if isinstance(attainment_data, IndirectAttainmentCreate):
        # Validate subject exists
        subject = db.query(Subject).filter(Subject.id == attainment_data.subject_id).first()
        if not subject:
            raise ValidationError("Subject not found", "subject_id")
    
    # Validate PO exists if provided
    if hasattr(attainment_data, 'po_id') and attainment_data.po_id:
        po = db.query(PODefinition).filter(PODefinition.id == attainment_data.po_id).first()
        if not po:
            raise ValidationError("PO not found", "po_id")
    
    # Validate CO exists if provided
    if hasattr(attainment_data, 'co_id') and attainment_data.co_id:
        co = db.query(CODefinition).filter(CODefinition.id == attainment_data.co_id).first()
        if not co:
            raise ValidationError("CO not found", "co_id")
    
    # Validate value percentage
    if hasattr(attainment_data, 'value_pct') and attainment_data.value_pct is not None:
        if not (0 <= attainment_data.value_pct <= 100):
            raise ValidationError("Value percentage must be between 0 and 100", "value_pct")


def check_marks_lock_status(exam_id: int, db: Session) -> None:
    """Check if marks are locked for an exam"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise ValidationError("Exam not found", "exam_id")
    
    if exam.exam_date:
        lock_in_period = timedelta(days=7)
        lock_date = exam.exam_date + lock_in_period
        now = datetime.now(exam.exam_date.tzinfo)
        
        if now > lock_date:
            raise BusinessLogicError("Marks are locked - 7-day lock-in period has expired", "MARKS_LOCKED")


def validate_bulk_operation_data(operation_type: str, data: List[Any], db: Session) -> None:
    """Validate bulk operation data"""
    if not data:
        raise ValidationError("No data provided for bulk operation", "data")
    
    # Validate each item in the bulk operation
    for i, item in enumerate(data):
        try:
            if operation_type == "co_targets":
                validate_co_target_data(item, db)
            elif operation_type == "assessment_weights":
                validate_assessment_weight_data(item, db)
            elif operation_type == "co_po_matrix":
                validate_co_po_matrix_data(item, db)
            elif operation_type == "question_co_weights":
                validate_question_co_weight_data(item, db)
        except ValidationError as e:
            raise ValidationError(f"Item {i+1}: {e.message}", e.field)


def handle_validation_error(error: ValidationError) -> HTTPException:
    """Convert ValidationError to HTTPException"""
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={
            "message": error.message,
            "field": error.field
        }
    )


def handle_business_logic_error(error: BusinessLogicError) -> HTTPException:
    """Convert BusinessLogicError to HTTPException"""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "message": error.message,
            "code": error.code
        }
    )
