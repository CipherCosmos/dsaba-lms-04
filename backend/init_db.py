from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Department, Class, Subject, UserRole
from auth import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

def init_database():
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print("Database already initialized!")
            return
            
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            first_name="System",
            last_name="Administrator",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.admin,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Create sample department
        dept = db.query(Department).filter(Department.name == "Computer Science Engineering").first()
        if not dept:
            dept = Department(
                name="Computer Science Engineering",
                code="CSE"
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        else:
            print("Sample department already exists")
        
        # Create HOD user
        hod_user = db.query(User).filter(User.username == "hod").first()
        if not hod_user:
            hod_user = User(
                username="hod",
                email="hod@example.com",
                first_name="John",
                last_name="Doe",
                hashed_password=get_password_hash("hod123"),
                role=UserRole.hod,
                department_id=dept.id,
                is_active=True
            )
            db.add(hod_user)
            db.commit()
            db.refresh(hod_user)
        else:
            print("HOD user already exists")
        
        # Update department with HOD
        dept.hod_id = hod_user.id
        db.commit()
        
        # Create sample class
        sample_class = db.query(Class).filter(
            Class.name == "CSE-A",
            Class.department_id == dept.id,
            Class.section == "A"
        ).first()
        if not sample_class:
            sample_class = Class(
                name="CSE-A",
                department_id=dept.id,
                semester=5,
                section="A"
            )
            db.add(sample_class)
            db.commit()
            db.refresh(sample_class)
        else:
            print("Sample class already exists")
        
        # Create teacher user
        teacher_user = db.query(User).filter(User.username == "teacher").first()
        if not teacher_user:
            teacher_user = User(
                username="teacher",
                email="teacher@example.com",
                first_name="Jane",
                last_name="Smith",
                hashed_password=get_password_hash("teacher123"),
                role=UserRole.teacher,
                department_id=dept.id,
                is_active=True
            )
            db.add(teacher_user)
            db.commit()
            db.refresh(teacher_user)
        else:
            print("Teacher user already exists")
        
        # Create sample subject
        sample_subject = db.query(Subject).filter(Subject.code == "CS501").first()
        if not sample_subject:
            sample_subject = Subject(
                name="Data Structures",
                code="CS501",
                class_id=sample_class.id,
                teacher_id=teacher_user.id,
                cos=["CO1", "CO2", "CO3", "CO4", "CO5"],
                pos=["PO1", "PO2", "PO3", "PO12"],
                credits=4
            )
            db.add(sample_subject)
            db.commit()
            db.refresh(sample_subject)
        else:
            print("Sample subject already exists")
        
        # Create student user
        student_user = db.query(User).filter(User.username == "student").first()
        if not student_user:
            student_user = User(
                username="student",
                email="student@example.com",
                first_name="Alice",
                last_name="Johnson",
                hashed_password=get_password_hash("student123"),
                role=UserRole.student,
                department_id=dept.id,
                class_id=sample_class.id,
                is_active=True
            )
            db.add(student_user)
            db.commit()
        else:
            print("Student user already exists")
        
        print("Database initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()