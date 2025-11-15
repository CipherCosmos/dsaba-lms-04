#!/usr/bin/env python3
"""
Add Admin User Script
Creates an admin user using the new Clean Architecture
"""
import sys
import os

# Add app directory to path (for Docker container)
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from sqlalchemy.orm import Session
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.database.models import UserModel, RoleModel, UserRoleModel
import bcrypt

def add_admin_user():
    """Create admin user using new architecture"""
    db: Session = SessionLocal()
    
    try:
        # Check if admin role exists
        admin_role = db.query(RoleModel).filter(RoleModel.name == "admin").first()
        if not admin_role:
            admin_role = RoleModel(name="admin", description="System Administrator")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
        
        # Check if admin user already exists
        existing_admin = db.query(UserModel).join(
            UserRoleModel, UserModel.id == UserRoleModel.user_id
        ).filter(
            UserRoleModel.role_id == admin_role.id
        ).first()
        
        if existing_admin:
            print(f"✅ Admin user already exists: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            return
        
        # Create admin user
        password = "admin123"
        # Hash password using bcrypt directly
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        admin_email = "admin@college.edu"
        
        admin_user = UserModel(
            username="admin",
            email=admin_email,
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
        print(f"   Email: {admin_email}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_admin_user()

