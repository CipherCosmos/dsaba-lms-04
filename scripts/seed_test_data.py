#!/usr/bin/env python3
"""
Database Seeding Script for Test Data
Creates realistic test data for all features
"""

import sys
import os
import asyncio
from datetime import datetime, timedelta
import random

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Department, Class, Subject, User, Exam, Question, Mark, CODefinition, PODefinition, COTarget, AssessmentWeight, COPOMatrix, QuestionCOWeight, IndirectAttainment, StudentGoal, StudentMilestone
from crud import create_department, create_class, create_subject, create_user, create_exam, create_question, create_mark

# Database configuration
DATABASE_URL = "sqlite:///./test_exam_management.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_test_data():
    """Create comprehensive test data"""
    print("🌱 Creating test data...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 1. Create Departments
        print("Creating departments...")
        departments = []
        dept_data = [
            {"name": "Computer Science Engineering", "code": "CSE", "description": "Computer Science and Engineering Department"},
            {"name": "Information Technology", "code": "IT", "description": "Information Technology Department"},
            {"name": "Electronics and Communication", "code": "ECE", "description": "Electronics and Communication Engineering"},
            {"name": "Mechanical Engineering", "code": "ME", "description": "Mechanical Engineering Department"},
        ]
        
        for dept_info in dept_data:
            dept = create_department(db, dept_info)
            departments.append(dept)
        
        # 2. Create Users (Admin, HODs, Teachers, Students)
        print("Creating users...")
        users = []
        
        # Admin user
        admin = create_user(db, {
            "username": "admin",
            "email": "admin@university.edu",
            "first_name": "System",
            "last_name": "Administrator",
            "role": "admin",
            "department_id": departments[0].id,
            "is_active": True
        })
        users.append(admin)
        
        # HOD users
        for i, dept in enumerate(departments):
            hod = create_user(db, {
                "username": f"hod_{dept.code.lower()}",
                "email": f"hod.{dept.code.lower()}@university.edu",
                "first_name": f"HOD",
                "last_name": dept.name.split()[0],
                "role": "hod",
                "department_id": dept.id,
                "is_active": True
            })
            users.append(hod)
        
        # Teacher users
        teachers = []
        for i in range(8):
            dept = departments[i % len(departments)]
            teacher = create_user(db, {
                "username": f"teacher_{i+1}",
                "email": f"teacher{i+1}@university.edu",
                "first_name": f"Teacher{i+1}",
                "last_name": f"Faculty",
                "role": "teacher",
                "department_id": dept.id,
                "is_active": True
            })
            users.append(teacher)
            teachers.append(teacher)
        
        # Student users
        students = []
        for i in range(50):
            dept = departments[i % len(departments)]
            student = create_user(db, {
                "username": f"student_{i+1:03d}",
                "email": f"student{i+1:03d}@university.edu",
                "first_name": f"Student{i+1}",
                "last_name": f"Learner",
                "role": "student",
                "department_id": dept.id,
                "is_active": True
            })
            users.append(student)
            students.append(student)
        
        # 3. Create Classes
        print("Creating classes...")
        classes = []
        class_data = [
            {"name": "CSE-A", "year": 1, "section": "A", "department_id": departments[0].id},
            {"name": "CSE-B", "year": 1, "section": "B", "department_id": departments[0].id},
            {"name": "CSE-A", "year": 2, "section": "A", "department_id": departments[0].id},
            {"name": "CSE-B", "year": 2, "section": "B", "department_id": departments[0].id},
            {"name": "IT-A", "year": 1, "section": "A", "department_id": departments[1].id},
            {"name": "IT-B", "year": 1, "section": "B", "department_id": departments[1].id},
            {"name": "ECE-A", "year": 1, "section": "A", "department_id": departments[2].id},
            {"name": "ME-A", "year": 1, "section": "A", "department_id": departments[3].id},
        ]
        
        for class_info in class_data:
            class_obj = create_class(db, class_info)
            classes.append(class_obj)
        
        # 4. Create Subjects
        print("Creating subjects...")
        subjects = []
        subject_data = [
            {"name": "Data Structures", "code": "CS201", "credits": 3, "teacher_id": teachers[0].id, "class_id": classes[0].id, "department_id": departments[0].id},
            {"name": "Algorithms", "code": "CS301", "credits": 4, "teacher_id": teachers[1].id, "class_id": classes[2].id, "department_id": departments[0].id},
            {"name": "Database Systems", "code": "CS401", "credits": 3, "teacher_id": teachers[2].id, "class_id": classes[3].id, "department_id": departments[0].id},
            {"name": "Web Development", "code": "IT301", "credits": 3, "teacher_id": teachers[3].id, "class_id": classes[4].id, "department_id": departments[1].id},
            {"name": "Digital Electronics", "code": "EC201", "credits": 3, "teacher_id": teachers[4].id, "class_id": classes[6].id, "department_id": departments[2].id},
            {"name": "Thermodynamics", "code": "ME201", "credits": 3, "teacher_id": teachers[5].id, "class_id": classes[7].id, "department_id": departments[3].id},
        ]
        
        for subject_info in subject_data:
            subject = create_subject(db, subject_info)
            subjects.append(subject)
        
        # 5. Create COs for subjects
        print("Creating Course Outcomes...")
        co_templates = [
            {"code": "CO1", "description": "Understand fundamental concepts", "level": "Remember"},
            {"code": "CO2", "description": "Apply knowledge to solve problems", "level": "Apply"},
            {"code": "CO3", "description": "Analyze and evaluate solutions", "level": "Analyze"},
            {"code": "CO4", "description": "Create innovative solutions", "level": "Create"},
        ]
        
        for subject in subjects:
            for co_template in co_templates:
                co = CODefinition(
                    subject_id=subject.id,
                    code=co_template["code"],
                    description=co_template["description"],
                    level=co_template["level"],
                    created_at=datetime.utcnow()
                )
                db.add(co)
        
        # 6. Create POs for departments
        print("Creating Program Outcomes...")
        po_templates = [
            {"code": "PO1", "description": "Engineering Knowledge", "type": "PO"},
            {"code": "PO2", "description": "Problem Analysis", "type": "PO"},
            {"code": "PO3", "description": "Design/Development of Solutions", "type": "PO"},
            {"code": "PO4", "description": "Investigation of Complex Problems", "type": "PO"},
            {"code": "PSO1", "description": "Professional Skills", "type": "PSO"},
            {"code": "PSO2", "description": "Industry Readiness", "type": "PSO"},
        ]
        
        for dept in departments:
            for po_template in po_templates:
                po = PODefinition(
                    department_id=dept.id,
                    code=po_template["code"],
                    description=po_template["description"],
                    type=po_template["type"],
                    created_at=datetime.utcnow()
                )
                db.add(po)
        
        # 7. Create Exams
        print("Creating exams...")
        exams = []
        exam_types = ["Internal", "External", "Assignment", "Quiz"]
        
        for subject in subjects:
            for i, exam_type in enumerate(exam_types):
                exam = create_exam(db, {
                    "name": f"{exam_type} Exam {i+1}",
                    "subject_id": subject.id,
                    "exam_type": exam_type,
                    "total_marks": 100,
                    "duration_minutes": 180,
                    "exam_date": datetime.utcnow() + timedelta(days=i*7),
                    "is_published": True
                })
                exams.append(exam)
        
        # 8. Create Questions for exams
        print("Creating questions...")
        for exam in exams:
            for i in range(5):  # 5 questions per exam
                question = create_question(db, {
                    "exam_id": exam.id,
                    "question_text": f"Question {i+1}: Explain the concept and provide examples.",
                    "max_marks": 20,
                    "question_type": "descriptive",
                    "difficulty_level": random.choice(["Easy", "Medium", "Hard"]),
                    "co_mapping": f"CO{i+1}"
                })
        
        # 9. Create Marks for students
        print("Creating marks...")
        for exam in exams:
            subject_students = [s for s in students if s.department_id == exam.subject.department_id]
            for student in subject_students[:10]:  # First 10 students
                # Create marks for each question
                total_marks = 0
                for question in exam.questions:
                    marks_obtained = random.randint(10, question.max_marks)
                    total_marks += marks_obtained
                    
                    mark = create_mark(db, {
                        "student_id": student.id,
                        "exam_id": exam.id,
                        "question_id": question.id,
                        "marks_obtained": marks_obtained,
                        "max_marks": question.max_marks,
                        "is_locked": False
                    })
        
        # 10. Create Student Goals and Milestones
        print("Creating student goals and milestones...")
        for student in students[:20]:  # First 20 students
            # Create goals
            goals = [
                {"title": "Achieve 85% overall", "description": "Maintain overall percentage above 85%", "target_value": 85, "current_value": random.randint(70, 90)},
                {"title": "Top 5 in class", "description": "Be in top 5 students of the class", "target_value": 5, "current_value": random.randint(1, 10)},
                {"title": "All COs above 70%", "description": "Achieve all course outcomes above 70%", "target_value": 70, "current_value": random.randint(60, 80)},
            ]
            
            for goal_data in goals:
                goal = StudentGoal(
                    student_id=student.id,
                    title=goal_data["title"],
                    description=goal_data["description"],
                    target_value=goal_data["target_value"],
                    current_value=goal_data["current_value"],
                    status="active",
                    created_at=datetime.utcnow()
                )
                db.add(goal)
            
            # Create milestones
            milestones = [
                {"title": "Complete all assignments", "description": "Submit all pending assignments", "target_date": datetime.utcnow() + timedelta(days=30), "status": "pending"},
                {"title": "Prepare for mid-term", "description": "Complete mid-term exam preparation", "target_date": datetime.utcnow() + timedelta(days=15), "status": "in_progress"},
                {"title": "Project submission", "description": "Complete and submit final project", "target_date": datetime.utcnow() + timedelta(days=45), "status": "pending"},
            ]
            
            for milestone_data in milestones:
                milestone = StudentMilestone(
                    student_id=student.id,
                    title=milestone_data["title"],
                    description=milestone_data["description"],
                    target_date=milestone_data["target_date"],
                    status=milestone_data["status"],
                    created_at=datetime.utcnow()
                )
                db.add(milestone)
        
        db.commit()
        print("✅ Test data created successfully!")
        
        # Print summary
        print(f"\n📊 Data Summary:")
        print(f"  Departments: {len(departments)}")
        print(f"  Users: {len(users)} (1 admin, {len(departments)} HODs, {len(teachers)} teachers, {len(students)} students)")
        print(f"  Classes: {len(classes)}")
        print(f"  Subjects: {len(subjects)}")
        print(f"  Exams: {len(exams)}")
        print(f"  Questions: {sum(len(exam.questions) for exam in exams)}")
        print(f"  Marks: {len(db.query(Mark).all())}")
        print(f"  COs: {len(db.query(CODefinition).all())}")
        print(f"  POs: {len(db.query(PODefinition).all())}")
        print(f"  Goals: {len(db.query(StudentGoal).all())}")
        print(f"  Milestones: {len(db.query(StudentMilestone).all())}")
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()
