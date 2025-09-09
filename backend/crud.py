from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, and_, or_
from typing import List, Optional
from models import *
from schemas import *
from auth import get_password_hash
import openpyxl
from io import BytesIO
from datetime import datetime

# Department CRUD
def get_all_departments(db: Session):
    return db.query(Department).options(
        joinedload(Department.hod),
        joinedload(Department.classes),
        joinedload(Department.users)
    ).all()

def get_department_by_id(db: Session, department_id: int):
    return db.query(Department).options(
        joinedload(Department.hod),
        joinedload(Department.classes),
        joinedload(Department.users)
    ).filter(Department.id == department_id).first()

def create_department(db: Session, department: DepartmentCreate):
    db_department = Department(**department.dict())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

def update_department(db: Session, department_id: int, department: DepartmentUpdate):
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        return None
    
    update_data = department.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_department, field, value)
    
    db.commit()
    db.refresh(db_department)
    return db_department

def delete_department(db: Session, department_id: int):
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if db_department:
        # Check if department has users or classes
        users_count = db.query(User).filter(User.department_id == department_id).count()
        classes_count = db.query(Class).filter(Class.department_id == department_id).count()
        
        if users_count > 0 or classes_count > 0:
            raise ValueError("Cannot delete department with existing users or classes")
        
        db.delete(db_department)
        db.commit()
        return True
    return False

# Class CRUD
def get_all_classes(db: Session):
    return db.query(Class).options(
        joinedload(Class.department),
        joinedload(Class.students),
        joinedload(Class.subjects)
    ).all()

def get_class_by_id(db: Session, class_id: int):
    return db.query(Class).options(
        joinedload(Class.department),
        joinedload(Class.students),
        joinedload(Class.subjects)
    ).filter(Class.id == class_id).first()

def create_class(db: Session, class_data: ClassCreate):
    db_class = Class(**class_data.dict())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def update_class(db: Session, class_id: int, class_data: ClassUpdate):
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if not db_class:
        return None
    
    update_data = class_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_class, field, value)
    
    db.commit()
    db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int):
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if db_class:
        # Check if class has students or subjects
        students_count = db.query(User).filter(User.class_id == class_id).count()
        subjects_count = db.query(Subject).filter(Subject.class_id == class_id).count()
        
        if students_count > 0 or subjects_count > 0:
            raise ValueError("Cannot delete class with existing students or subjects")
        
        db.delete(db_class)
        db.commit()
        return True
    return False

# Subject CRUD
def get_all_subjects(db: Session):
    return db.query(Subject).options(
        joinedload(Subject.class_obj),
        joinedload(Subject.teacher),
        joinedload(Subject.exams)
    ).all()

def get_subject_by_id(db: Session, subject_id: int):
    return db.query(Subject).options(
        joinedload(Subject.class_obj),
        joinedload(Subject.teacher),
        joinedload(Subject.exams)
    ).filter(Subject.id == subject_id).first()

def create_subject(db: Session, subject: SubjectCreate):
    db_subject = Subject(**subject.dict())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def update_subject(db: Session, subject_id: int, subject: SubjectUpdate):
    db_subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not db_subject:
        return None
    
    update_data = subject.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_subject, field, value)
    
    db.commit()
    db.refresh(db_subject)
    return db_subject

def delete_subject(db: Session, subject_id: int):
    db_subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if db_subject:
        # Check if subject has exams
        exams_count = db.query(Exam).filter(Exam.subject_id == subject_id).count()
        
        if exams_count > 0:
            raise ValueError("Cannot delete subject with existing exams")
        
        db.delete(db_subject)
        db.commit()
        return True
    return False

# User CRUD
def get_all_users(db: Session):
    return db.query(User).options(
        joinedload(User.department),
        joinedload(User.student_class)
    ).all()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).options(
        joinedload(User.department),
        joinedload(User.student_class)
    ).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop('password')
    
    db_user = User(
        **user_dict,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user: UserUpdate):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None
    
    update_data = user.dict(exclude_unset=True)
    if 'password' in update_data:
        update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user:
        # Check if user has dependent records
        marks_count = db.query(Mark).filter(Mark.student_id == user_id).count()
        subjects_count = db.query(Subject).filter(Subject.teacher_id == user_id).count()
        
        if marks_count > 0 or subjects_count > 0:
            # Soft delete by deactivating instead of hard delete
            db_user.is_active = False
            db.commit()
        else:
            db.delete(db_user)
            db.commit()
        return True
    return False

# Exam CRUD
def get_all_exams(db: Session):
    return db.query(Exam).options(
        joinedload(Exam.questions),
        joinedload(Exam.subject).joinedload(Subject.class_obj),
        joinedload(Exam.marks)
    ).all()

def get_exam_by_id_db(db: Session, exam_id: int):
    return db.query(Exam).options(
        joinedload(Exam.questions),
        joinedload(Exam.subject).joinedload(Subject.class_obj),
        joinedload(Exam.marks)
    ).filter(Exam.id == exam_id).first()

def create_exam(db: Session, exam: ExamCreate):
    exam_dict = exam.dict()
    questions_data = exam_dict.pop('questions', [])
    
    # Convert exam_date string to datetime if provided
    if exam_dict.get('exam_date'):
        if isinstance(exam_dict['exam_date'], str):
            exam_dict['exam_date'] = datetime.fromisoformat(exam_dict['exam_date'].replace('Z', '+00:00'))
    
    db_exam = Exam(**exam_dict)
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    
    # Create questions
    for question_data in questions_data:
        db_question = Question(exam_id=db_exam.id, **question_data)
        db.add(db_question)
    
    db.commit()
    
    # Reload exam with questions
    return get_exam_by_id_db(db, db_exam.id)

def update_exam(db: Session, exam_id: int, exam: ExamUpdate):
    db_exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not db_exam:
        return None
    
    update_data = exam.dict(exclude_unset=True)
    
    # Handle exam_date conversion
    if 'exam_date' in update_data and update_data['exam_date']:
        if isinstance(update_data['exam_date'], str):
            update_data['exam_date'] = datetime.fromisoformat(update_data['exam_date'].replace('Z', '+00:00'))
    
    for field, value in update_data.items():
        setattr(db_exam, field, value)
    
    db.commit()
    db.refresh(db_exam)
    return db_exam

def delete_exam(db: Session, exam_id: int):
    db_exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if db_exam:
        # Delete related questions and marks first
        db.query(Mark).filter(Mark.exam_id == exam_id).delete()
        db.query(Question).filter(Question.exam_id == exam_id).delete()
        db.delete(db_exam)
        db.commit()
        return True
    return False

# Question CRUD
def create_question(db: Session, question: QuestionCreate):
    db_question = Question(**question.dict())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def get_questions_by_exam(db: Session, exam_id: int):
    return db.query(Question).filter(Question.exam_id == exam_id).all()

# Mark CRUD
def get_marks_by_exam_id(db: Session, exam_id: int):
    return db.query(Mark).options(
        joinedload(Mark.student),
        joinedload(Mark.question),
        joinedload(Mark.exam)
    ).filter(Mark.exam_id == exam_id).all()

def get_marks_by_student_id(db: Session, student_id: int):
    return db.query(Mark).options(
        joinedload(Mark.question),
        joinedload(Mark.exam).joinedload(Exam.subject)
    ).filter(Mark.student_id == student_id).all()

def get_student_marks_for_exam(db: Session, exam_id: int, student_id: int):
    return db.query(Mark).options(
        joinedload(Mark.question),
        joinedload(Mark.exam)
    ).filter(
        and_(Mark.exam_id == exam_id, Mark.student_id == student_id)
    ).all()

def bulk_create_marks_db(db: Session, marks: List[MarkCreate]):
    try:
        db.begin()
        
        # Group marks by exam/student/question for efficient processing
        for mark_data in marks:
            # Validate mark against question max_marks
            question = db.query(Question).filter(Question.id == mark_data.question_id).first()
            if question and mark_data.marks_obtained > question.max_marks:
                raise ValueError(f"Marks {mark_data.marks_obtained} exceed max marks {question.max_marks} for question {question.question_number}")
            
            # Check if mark already exists
            existing_mark = db.query(Mark).filter(
                and_(
                    Mark.exam_id == mark_data.exam_id,
                    Mark.student_id == mark_data.student_id,
                    Mark.question_id == mark_data.question_id
                )
            ).first()
            
            if existing_mark:
                existing_mark.marks_obtained = mark_data.marks_obtained
            else:
                db_mark = Mark(**mark_data.dict())
                db.add(db_mark)
        
        db.commit()
        
        # Return all marks for the exam
        exam_id = marks[0].exam_id if marks else None
        if exam_id:
            return get_marks_by_exam_id(db, exam_id)
        return []
        
    except Exception as e:
        db.rollback()
        raise e

def update_mark(db: Session, mark_id: int, mark: MarkUpdate):
    db_mark = db.query(Mark).filter(Mark.id == mark_id).first()
    if not db_mark:
        return None
    
    # Validate mark against question max_marks
    question = db.query(Question).filter(Question.id == db_mark.question_id).first()
    if question and mark.marks_obtained > question.max_marks:
        raise ValueError(f"Marks {mark.marks_obtained} exceed max marks {question.max_marks}")
    
    db_mark.marks_obtained = mark.marks_obtained
    db.commit()
    db.refresh(db_mark)
    return db_mark

# Dashboard stats functions
def get_admin_dashboard_stats(db: Session):
    total_departments = db.query(Department).count()
    total_users = db.query(User).count()
    total_classes = db.query(Class).count()
    total_subjects = db.query(Subject).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    
    return {
        "total_departments": total_departments,
        "total_users": total_users,
        "total_classes": total_classes,
        "total_subjects": total_subjects,
        "active_users": active_users,
        "recent_activity": get_recent_activity(db)
    }

def get_hod_dashboard_stats(db: Session, department_id: int):
    dept_users = db.query(User).filter(User.department_id == department_id)
    total_students = dept_users.filter(User.role == UserRole.student).count()
    total_teachers = dept_users.filter(User.role == UserRole.teacher).count()
    
    dept_classes = db.query(Class).filter(Class.department_id == department_id).count()
    dept_subjects = db.query(Subject).join(Class).filter(Class.department_id == department_id).count()
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": dept_classes,
        "total_subjects": dept_subjects,
        "department_id": department_id
    }

def get_teacher_dashboard_stats(db: Session, teacher_id: int):
    teacher_subjects = db.query(Subject).filter(Subject.teacher_id == teacher_id).count()
    teacher_exams = db.query(Exam).join(Subject).filter(Subject.teacher_id == teacher_id).count()
    
    # Get students under teacher's subjects
    subject_ids = db.query(Subject.id).filter(Subject.teacher_id == teacher_id).subquery()
    class_ids = db.query(Subject.class_id).filter(Subject.teacher_id == teacher_id).distinct().subquery()
    total_students = db.query(User).filter(
        and_(User.role == UserRole.student, User.class_id.in_(class_ids))
    ).count()
    
    return {
        "subjects_assigned": teacher_subjects,
        "exams_configured": teacher_exams,
        "total_students": total_students,
        "teacher_id": teacher_id
    }

def get_student_dashboard_stats(db: Session, student_id: int):
    student = get_user_by_id(db, student_id)
    if not student:
        return {}
    
    # Get student's marks
    student_marks = get_marks_by_student_id(db, student_id)
    total_exams = len(set(mark.exam_id for mark in student_marks))
    
    # Get class subjects
    class_subjects = db.query(Subject).filter(Subject.class_id == student.class_id).count() if student.class_id else 0
    
    return {
        "total_exams_taken": total_exams,
        "total_subjects": class_subjects,
        "class_id": student.class_id,
        "student_id": student_id
    }

def get_recent_activity(db: Session, limit: int = 10):
    # Get recent users, exams, and marks
    recent_users = db.query(User).order_by(desc(User.created_at)).limit(limit).all()
    recent_exams = db.query(Exam).order_by(desc(Exam.created_at)).limit(limit).all()
    
    activities = []
    
    for user in recent_users[-5:]:  # Last 5
        activities.append({
            "type": "user_created",
            "message": f"New {user.role.value} user '{user.first_name} {user.last_name}' registered",
            "timestamp": user.created_at
        })
    
    for exam in recent_exams[-5:]:  # Last 5
        activities.append({
            "type": "exam_created",
            "message": f"New exam '{exam.name}' created",
            "timestamp": exam.created_at
        })
    
    # Sort by timestamp descending
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activities[:limit]

# Excel/File processing functions
def generate_marks_template(db: Session, exam_id: int) -> bytes:
    """Generate Excel template for marks entry"""
    exam = get_exam_by_id_db(db, exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    # Get students for the exam's class
    subject = get_subject_by_id(db, exam.subject_id)
    if not subject:
        raise ValueError("Subject not found")
    
    students = db.query(User).filter(
        and_(User.role == UserRole.student, User.class_id == subject.class_id)
    ).order_by(User.first_name, User.last_name).all()
    
    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Marks Entry"
    
    # Headers
    headers = ["Student ID", "Student Name", "Email"]
    for question in exam.questions:
        headers.append(f"Q{question.question_number} ({question.max_marks})")
    headers.append("Total")
    
    # Write headers
    for col, header in enumerate(headers, 1):
        ws.cell(row=1, column=col, value=header)
    
    # Write student data
    for row, student in enumerate(students, 2):
        ws.cell(row=row, column=1, value=student.id)
        ws.cell(row=row, column=2, value=f"{student.first_name} {student.last_name}")
        ws.cell(row=row, column=3, value=student.email)
        
        # Leave question columns empty for data entry
        # Add total formula
        question_cols = len(exam.questions)
        total_col = 4 + question_cols
        if question_cols > 0:
            start_col = openpyxl.utils.get_column_letter(4)
            end_col = openpyxl.utils.get_column_letter(3 + question_cols)
            ws.cell(row=row, column=total_col, value=f"=SUM({start_col}{row}:{end_col}{row})")
    
    # Save to bytes
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()

async def process_marks_excel_upload(file, exam_id: int, db: Session) -> List[MarkCreate]:
    """Process uploaded Excel file and return marks data"""
    content = await file.read()
    wb = openpyxl.load_workbook(BytesIO(content))
    ws = wb.active
    
    exam = get_exam_by_id_db(db, exam_id)
    if not exam:
        raise ValueError("Exam not found")
    
    marks_data = []
    
    # Read headers to identify question columns
    headers = [cell.value for cell in ws[1]]
    question_columns = {}
    
    for i, header in enumerate(headers):
        if header and header.startswith('Q'):
            # Extract question number from header like "Q1a (10)"
            question_num = header.split('(')[0].replace('Q', '').strip()
            question = db.query(Question).filter(
                and_(Question.exam_id == exam_id, Question.question_number == question_num)
            ).first()
            if question:
                question_columns[i] = question.id
    
    # Process each row (skip header)
    for row_num in range(2, ws.max_row + 1):
        student_id = ws.cell(row=row_num, column=1).value
        if not student_id:
            continue
            
        for col_idx, question_id in question_columns.items():
            marks_value = ws.cell(row=row_num, column=col_idx + 1).value
            if marks_value is not None:
                try:
                    marks_obtained = float(marks_value)
                    marks_data.append(MarkCreate(
                        exam_id=exam_id,
                        student_id=int(student_id),
                        question_id=question_id,
                        marks_obtained=marks_obtained
                    ))
                except (ValueError, TypeError):
                    continue  # Skip invalid marks
    
    return marks_data