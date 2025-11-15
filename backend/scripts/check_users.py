#!/usr/bin/env python3
"""
Check Users Script
Lists users in database using new architecture
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy.orm import Session
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.database.models import UserModel, UserRoleModel, RoleModel
from src.domain.enums.user_role import UserRole

def check_users():
    """Check users in database"""
    db: Session = SessionLocal()
    
    try:
        # Get total users
        total_users = db.query(UserModel).count()
        print(f"📊 Total users: {total_users}")
        
        # Get users by role
        roles = db.query(RoleModel).all()
        for role in roles:
            count = db.query(UserRoleModel).filter(UserRoleModel.role_id == role.id).count()
            print(f"   {role.name}: {count}")
        
        # Check if admin exists
        admin_role = db.query(RoleModel).filter(RoleModel.name == UserRole.ADMIN.value).first()
        if admin_role:
            admin_count = db.query(UserRoleModel).filter(UserRoleModel.role_id == admin_role.id).count()
            print(f"   Admin users: {admin_count}")
            
            if admin_count == 0:
                print("⚠️  No admin user found!")
                print("   Run: python scripts/add_admin.py")
        else:
            print("⚠️  Admin role not found!")
        
        # List some users
        print("\n📋 Sample users:")
        users = db.query(UserModel).limit(10).all()
        for user in users:
            user_roles = db.query(RoleModel).join(UserRoleModel).filter(
                UserRoleModel.user_id == user.id
            ).all()
            roles_str = ", ".join([r.name for r in user_roles])
            print(f"   - {user.username} ({roles_str}) - {user.email}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_users()

