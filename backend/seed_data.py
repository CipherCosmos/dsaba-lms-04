from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Department, Class, Subject, Exam, Question, Mark, UserRole, ExamType, QuestionSection, Difficulty
from auth import get_password_hash
import random
from datetime import datetime, timedelta

def create_seed_data():
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_users = db.query(User).count()
        if existing_users > 4:  # If more than basic users exist, skip seeding
            print("Seed data already exists!")
            return
            
        print("Creating seed data...")
        
        # Create departments
        departments_data = [
            {"name": "Computer Science Engineering", "code": "CSE"},
            {"name": "Electronics and Communication", "code": "ECE"},
            {"name": "Mechanical Engineering", "code": "MECH"},
            {"name": "Civil Engineering", "code": "CIVIL"}
        ]
        
        dept_objects = []
        for dept_data in departments_data:
            existing_dept = db.query(Department).filter(Department.code == dept_data["code"]).first()
            if not existing_dept:
                dept = Department(**dept_data)
                db.add(dept)
                dept_objects.append(dept)
            else:
                dept_objects.append(existing_dept)
        
        db.commit()
        
        # Create HODs for each department
        hods = []
        for i, dept in enumerate(dept_objects):
            existing_hod = db.query(User).filter(
                User.username == f"hod_{dept.code.lower()}"
            ).first()
            
            if not existing_hod:
                hod = User(
                    username=f"hod_{dept.code.lower()}",
                    email=f"hod_{dept.code.lower()}@college.edu",
                    first_name=f"HOD",
                    last_name=dept.name.split()[0],
                    hashed_password=get_password_hash("hod123"),
                    role=UserRole.hod,
                    department_id=dept.id,
                    is_active=True
                )
                db.add(hod)
                hods.append(hod)
                
                # Update department with HOD
                dept.hod_id = hod.id
            else:
                hods.append(existing_hod)
        
        db.commit()
        
        # Create classes
        classes = []
        for dept in dept_objects:
            for sem in [1, 3, 5, 7]:
                for section in ['A', 'B']:
                    existing_class = db.query(Class).filter(
                        Class.name == f"{dept.code}-{section}",
                        Class.department_id == dept.id,
                        Class.semester == sem
                    ).first()
                    
                    if not existing_class:
                        class_obj = Class(
                            name=f"{dept.code}-{section}",
                            department_id=dept.id,
                            semester=sem,
                            section=section
                        )
                        db.add(class_obj)
                        classes.append(class_obj)
                    else:
                        classes.append(existing_class)
        
        db.commit()
        
        # Create teachers
        teachers = []
        teacher_names = [
            ("John", "Smith"), ("Mary", "Johnson"), ("David", "Williams"),
            ("Sarah", "Brown"), ("Michael", "Davis"), ("Emily", "Miller"),
            ("James", "Wilson"), ("Lisa", "Moore"), ("Robert", "Taylor"),
            ("Jennifer", "Anderson")
        ]
        
        for i, (first_name, last_name) in enumerate(teacher_names):
            username = f"teacher{i+1}"
            existing_teacher = db.query(User).filter(User.username == username).first()
            
            if not existing_teacher:
                teacher = User(
                    username=username,
                    email=f"teacher{i+1}@college.edu",
                    first_name=first_name,
                    last_name=last_name,
                    hashed_password=get_password_hash("teacher123"),
                    role=UserRole.teacher,
                    department_id=dept_objects[i % len(dept_objects)].id,
                    is_active=True
                )
                db.add(teacher)
                teachers.append(teacher)
            else:
                teachers.append(existing_teacher)
        
        db.commit()
        
        # Create subjects
        subjects = []
        subject_data = [
            {"name": "Data Structures", "code": "CS301", "credits": 4, "cos": ["CO1", "CO2", "CO3", "CO4", "CO5"], "pos": ["PO1", "PO2", "PO3", "PO12"]},
            {"name": "Database Management Systems", "code": "CS302", "credits": 3, "cos": ["CO1", "CO2", "CO3", "CO4"], "pos": ["PO1", "PO2", "PO4", "PO12"]},
            {"name": "Operating Systems", "code": "CS303", "credits": 4, "cos": ["CO1", "CO2", "CO3", "CO4", "CO5"], "pos": ["PO1", "PO2", "PO3", "PO12"]},
            {"name": "Computer Networks", "code": "CS304", "credits": 3, "cos": ["CO1", "CO2", "CO3", "CO4"], "pos": ["PO1", "PO2", "PO5", "PO12"]},
            {"name": "Software Engineering", "code": "CS305", "credits": 3, "cos": ["CO1", "CO2", "CO3", "CO4"], "pos": ["PO1", "PO3", "PO9", "PO12"]},
        ]
        
        for class_obj in classes[:8]:  # Limit to first 8 classes
            for i, subj_data in enumerate(subject_data):
                subject_code = f"{class_obj.name}_{subj_data['code']}"
                existing_subject = db.query(Subject).filter(Subject.code == subject_code).first()
                
                if not existing_subject:
                    subject = Subject(
                        name=subj_data["name"],
                        code=subject_code,
                        class_id=class_obj.id,
                        teacher_id=teachers[i % len(teachers)].id,
                        cos=subj_data["cos"],
                        pos=subj_data["pos"],
                        credits=subj_data["credits"]
                    )
                    db.add(subject)
                    subjects.append(subject)
                else:
                    subjects.append(existing_subject)
        
        db.commit()
        
        # Create students
        students = []
        for class_obj in classes[:8]:  # Limit to first 8 classes
            for i in range(30):  # 30 students per class
                username = f"{class_obj.name.lower()}_student{i+1:02d}"
                existing_student = db.query(User).filter(User.username == username).first()
                
                if not existing_student:
                    student = User(
                        username=username,
                        email=f"{class_obj.name.lower()}_student{i+1:02d}@student.edu",
                        first_name=f"Student{i+1:02d}",
                        last_name=class_obj.name,
                        hashed_password=get_password_hash("student123"),
                        role=UserRole.student,
                        department_id=class_obj.department_id,
                        class_id=class_obj.id,
                        is_active=True
                    )
                    db.add(student)
                    students.append(student)
                else:
                    students.append(existing_student)
        
        db.commit()
        
        # Create exams and questions
        for subject in subjects[:10]:  # Create exams for first 10 subjects
            for exam_type in [ExamType.internal1, ExamType.internal2]:
                exam_name = f"{subject.name} - {exam_type.value.replace('internal', 'Internal ')}"
                existing_exam = db.query(Exam).filter(
                    Exam.name == exam_name,
                    Exam.subject_id == subject.id
                ).first()
                
                if not existing_exam:
                    exam = Exam(
                        name=exam_name,
                        subject_id=subject.id,
                        exam_type=exam_type,
                        exam_date=datetime.now() - timedelta(days=random.randint(30, 90)),
                        duration=180,
                        total_marks=50
                    )
                    db.add(exam)
                    db.commit()
                    db.refresh(exam)
                    
                    # Create questions for this exam
                    question_data = [
                        {"question_number": "1a", "max_marks": 10, "section": QuestionSection.A, "blooms_level": "Remember", "difficulty": Difficulty.easy},
                        {"question_number": "1b", "max_marks": 10, "section": QuestionSection.A, "blooms_level": "Understand", "difficulty": Difficulty.medium},
                        {"question_number": "2a", "max_marks": 15, "section": QuestionSection.B, "blooms_level": "Apply", "difficulty": Difficulty.medium},
                        {"question_number": "2b", "max_marks": 15, "section": QuestionSection.B, "blooms_level": "Analyze", "difficulty": Difficulty.hard},
                    ]
                    
                    questions = []
                    for q_data in question_data:
                        question = Question(
                            exam_id=exam.id,
                            question_number=q_data["question_number"],
                            max_marks=q_data["max_marks"],
                            co_mapping=subject.cos[:3],
                            po_mapping=subject.pos[:2],
                            section=q_data["section"],
                            blooms_level=q_data["blooms_level"],
                            difficulty=q_data["difficulty"]
                        )
                        db.add(question)
                        questions.append(question)
                    
                    db.commit()
                    
                    # Create marks for students
                    class_students = [s for s in students if s.class_id == subject.class_id]
                    for student in class_students:
                        for question in questions:
                            # Check if mark already exists
                            existing_mark = db.query(Mark).filter(
                                Mark.exam_id == exam.id,
                                Mark.student_id == student.id,
                                Mark.question_id == question.id
                            ).first()
                            
                            if not existing_mark:
                                # Generate realistic marks based on difficulty
                                if question.difficulty == Difficulty.easy:
                                    marks_obtained = random.uniform(0.7, 1.0) * question.max_marks
                                elif question.difficulty == Difficulty.medium:
                                    marks_obtained = random.uniform(0.5, 0.9) * question.max_marks
                                else:  # hard
                                    marks_obtained = random.uniform(0.3, 0.8) * question.max_marks
                                
                                # Add some variation for different students
                                variation = random.uniform(-0.2, 0.2)
                                marks_obtained = max(0, min(question.max_marks, marks_obtained + (variation * question.max_marks)))
                                
                                mark = Mark(
                                    exam_id=exam.id,
                                    student_id=student.id,
                                    question_id=question.id,
                                    marks_obtained=round(marks_obtained, 1)
                                )
                                db.add(mark)
        
        db.commit()
        print("Seed data created successfully!")
        
    except Exception as e:
        print(f"Error creating seed data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_seed_data()