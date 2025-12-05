import os
import sys
sys.path.insert(0, "/app")

from sqlalchemy.orm import Session
from src.infrastructure.database.session import get_engine
from src.infrastructure.database.models import (
    UserModel, UserRoleModel, RoleModel, DepartmentModel,
    AcademicYearModel, BatchModel, BatchInstanceModel
)
import bcrypt
from datetime import datetime

engine = get_engine()
SessionLocal = lambda: __import__('sqlalchemy.orm', fromlist=['sessionmaker']).sessionmaker(bind=engine)()
db = SessionLocal()

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_or_get_role(name, description):
    role = db.query(RoleModel).filter(RoleModel.name == name).first()
    if not role:
        role = RoleModel(name=name, description=description)
        db.add(role)
        db.flush()
        print(f"✅ Created role: {name} (ID: {role.id})")
    else:
        print(f"ℹ️  Role exists: {name} (ID: {role.id})")
    return role

def create_user(username, email, first_name, last_name, password, role_name):
    user = db.query(UserModel).filter(UserModel.username == username).first()
    
    if user:
        print(f"ℹ️  User exists: {username} (ID: {user.id})")
        return user
    
    user = UserModel(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        hashed_password=hash_password(password),
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.flush()
    
    role = db.query(RoleModel).filter(RoleModel.name == role_name).first()
    if role:
        user_role = UserRoleModel(user_id=user.id, role_id=role.id)
        db.add(user_role)
    
    print(f"✅ Created user: {username} ({role_name}) - ID: {user.id}")
    return user

def create_department(code, name):
    dept = db.query(DepartmentModel).filter(DepartmentModel.code == code).first()
    if dept:
        print(f"ℹ️  Department exists: {name} (ID: {dept.id})")
        return dept
    
    dept = DepartmentModel(
        code=code,
        name=name,
        is_active=True
    )
    db.add(dept)
    db.flush()
    print(f"✅ Created department: {name} (ID: {dept.id})")
    return dept

def create_academic_year(year, is_current=False):
    ay = db.query(AcademicYearModel).filter(AcademicYearModel.display_name == year).first()
    if ay:
        print(f"ℹ️  Academic year exists: {year} (ID: {ay.id})")
        return ay
    
    start_year = int(year.split('-')[0])
    end_year = int(year.split('-')[1])
    
    ay = AcademicYearModel(
        display_name=year,
        start_year=start_year,
        end_year=end_year,
        start_date=datetime(start_year, 6, 1),
        end_date=datetime(end_year, 5, 31),
        is_current=is_current,
        status='active' if is_current else 'planned'
    )
    db.add(ay)
    db.flush()
    print(f"✅ Created academic year: {year} (ID: {ay.id})")
    return ay

try:
    print("=" * 60)
    print("CREATING TEST DATA FOR COMPREHENSIVE TESTING")
    print("=" * 60)
    
    # Create roles
    print("\n[1/5] Creating Roles...")
    admin_role = create_or_get_role("admin", "Administrator with full access")
    hod_role = create_or_get_role("hod", "Head of Department")
    teacher_role = create_or_get_role("teacher", "Teacher/Faculty")
    student_role = create_or_get_role("student", "Student")
    
    # Create users
    print("\n[2/5] Creating Test Users...")
    admin = create_user("admin", "admin@example.com", "Admin", "User", "Admin@123456", "admin")
    hod = create_user("hod_cs", "hod.cs@example.com", "Dr. Rajesh", "Kumar", "Hod@123456", "hod")
    teacher = create_user("teacher_john", "john.teacher@example.com", "John", "Doe", "Teacher@123456", "teacher")
    student = create_user("student_001", "student001@example.com", "Alice", "Smith", "Student@123456", "student")
    
    # Create departments
    print("\n[3/5] Creating Departments...")
    cs_dept = create_department("CSE", "Computer Science & Engineering")
    ece_dept = create_department("ECE", "Electronics & Communication Engineering")
    
    # Link HOD to CS department
    from src.infrastructure.database.models import TeacherModel
    hod_teacher = db.query(TeacherModel).filter(TeacherModel.user_id == hod.id).first()
    if not hod_teacher:
        hod_teacher = TeacherModel(
            user_id=hod.id,
            employee_id="HOD001",
            department_id=cs_dept.id
        )
        db.add(hod_teacher)
        print(f"✅ Created teacher profile for HOD")
    
    # Create academic year
    print("\n[4/5] Creating Academic Year...")
    ay_2024 = create_academic_year("2024-2025", is_current=True)
    
    # Create batches (Program Types)
    print("\n[5/5] Creating Batches & Instances...")
    btech_batch = db.query(BatchModel).filter(BatchModel.name == "B.Tech").first()
    if not btech_batch:
        btech_batch = BatchModel(
            name="B.Tech",
            duration_years=4,
            is_active=True
        )
        db.add(btech_batch)
        db.flush()
        print(f"✅ Created Batch Program: B.Tech (ID: {btech_batch.id})")
    
    # Create Batch Instance (Class of 2024-2028)
    batch_instance = db.query(BatchInstanceModel).filter(
        BatchInstanceModel.academic_year_id == ay_2024.id,
        BatchInstanceModel.department_id == cs_dept.id,
        BatchInstanceModel.batch_id == btech_batch.id
    ).first()
    
    if not batch_instance:
        batch_instance = BatchInstanceModel(
            academic_year_id=ay_2024.id,
            department_id=cs_dept.id,
            batch_id=btech_batch.id,
            admission_year=2024,
            current_semester=1,
            current_year=1,
            is_active=True
        )
        db.add(batch_instance)
        db.flush()
        print(f"✅ Created Batch Instance: B.Tech CSE 2024 (ID: {batch_instance.id})")
    else:
        print(f"ℹ️  Batch Instance exists (ID: {batch_instance.id})")
    
    db.commit()
    
    print("\n" + "=" * 60)
    print("TEST DATA CREATION COMPLETE!")
    print("=" * 60)
    print("\n📋 Test Credentials:")
    print("   Admin:   admin / Admin@123456")
    print("   HOD:     hod_cs / Hod@123456")
    print("   Teacher: teacher_john / Teacher@123456")
    print("   Student: student_001 / Student@123456")
    print("=" * 60)
    
except Exception as e:
    db.rollback()
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
