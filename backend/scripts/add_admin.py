#!/usr/bin/env python3
"""
Add Admin User Script
Creates an admin user using the new Clean Architecture
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy.orm import Session
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.database.models import UserModel, RoleModel, UserRoleModel
from src.infrastructure.security.password_hasher import PasswordHasher
from src.domain.enums.user_role import UserRole
from src.domain.value_objects.email import Email

def add_admin_user():
    """Create admin user using new architecture"""
    db: Session = SessionLocal()
    
    try:
        # Check if admin role exists
        admin_role = db.query(RoleModel).filter(RoleModel.name == UserRole.ADMIN.value).first()
        if not admin_role:
            admin_role = RoleModel(name=UserRole.ADMIN.value, description="System Administrator")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
        
        # Check if admin user already exists
        existing_admin = db.query(UserModel).join(UserRoleModel).filter(
            UserRoleModel.role_id == admin_role.id
        ).first()
        
        if existing_admin:
            print(f"✅ Admin user already exists: {existing_admin.username}")
            return
        
        # Create admin user
        password_hasher = PasswordHasher()
        password = "admin123"
        hashed_password = password_hasher.hash_password(password)
        
        admin_email = Email("admin@college.edu")
        
        admin_user = UserModel(
            username="admin",
            email=admin_email.value,
            first_name="System",
            last_name="Administrator",
            hashed_password=hashed_password,
            is_active=True,
            email_verified=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Assign admin role
        user_role = UserRoleModel(
            user_id=admin_user.id,
            role_id=admin_role.id
        )
        db.add(user_role)
        db.commit()
        
        print("✅ Admin user created successfully!")
        print(f"   Username: admin")
        print(f"   Password: {password}")
        print(f"   Email: {admin_email.value}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_admin_user()

