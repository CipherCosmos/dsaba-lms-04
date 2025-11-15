#!/usr/bin/env python3
"""
Initialize Database Script
Creates initial database structure and admin user using new architecture
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy.orm import Session
from src.infrastructure.database.session import SessionLocal, create_tables
from src.infrastructure.database.models import (
    UserModel, DepartmentModel, ClassModel, SubjectModel,
    RoleModel, UserRoleModel, SemesterModel, BatchModel, BatchYearModel
)
from src.infrastructure.security.password_hasher import PasswordHasher
from src.domain.enums.user_role import UserRole
from src.domain.value_objects.email import Email

def init_database():
    """Initialize database with basic structure"""
    # Create tables
    create_tables()
    print("✅ Database tables created")
    
    db: Session = SessionLocal()
    
    try:
        # Check if already initialized
        admin_user = db.query(UserModel).filter(UserModel.username == "admin").first()
        if admin_user:
            print("✅ Database already initialized!")
            return
        
        password_hasher = PasswordHasher()
        
        # Create roles
        roles_data = [
            {"name": UserRole.ADMIN.value, "description": "System Administrator"},
            {"name": UserRole.PRINCIPAL.value, "description": "Principal"},
            {"name": UserRole.HOD.value, "description": "Head of Department"},
            {"name": UserRole.TEACHER.value, "description": "Teacher"},
            {"name": UserRole.STUDENT.value, "description": "Student"},
        ]
        
        role_objects = {}
        for role_data in roles_data:
            role = RoleModel(**role_data)
            db.add(role)
            role_objects[role_data["name"]] = role
        
        db.commit()
        print("✅ Roles created")
        
        # Create admin user
        admin_email = Email("admin@college.edu")
        admin_user = UserModel(
            username="admin",
            email=admin_email.value,
            first_name="System",
            last_name="Administrator",
            hashed_password=password_hasher.hash_password("admin123"),
            is_active=True,
            email_verified=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Assign admin role
        admin_role_assignment = UserRoleModel(
            user_id=admin_user.id,
            role_id=role_objects[UserRole.ADMIN.value].id
        )
        db.add(admin_role_assignment)
        db.commit()
        print("✅ Admin user created (username: admin, password: admin123)")
        
        # Create sample department
        dept = DepartmentModel(
            name="Computer Science Engineering",
            code="CSE"
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        print("✅ Sample department created")
        
        print("\n✅ Database initialized successfully!")
        print("   Admin credentials:")
        print("   - Username: admin")
        print("   - Password: admin123")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()

