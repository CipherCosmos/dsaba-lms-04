import os
import sys
sys.path.insert(0, "/app")

from sqlalchemy.orm import Session
from src.infrastructure.database.session import get_engine
from src.infrastructure.database.models import UserModel, UserRoleModel, RoleModel
import bcrypt

engine = get_engine()

# Create session
from sqlalchemy.orm import sessionmaker
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Hash password
    password = "Admin@123456"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Check if admin user already exists
    existing_admin = db.query(UserModel).filter(UserModel.username == "admin").first()
    
    if existing_admin:
        print(f"ℹ️  Admin user already exists (ID: {existing_admin.id})")
        admin = existing_admin
    else:
        # Create admin user
        admin = UserModel(
            username="admin",
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            hashed_password=hashed,
            is_active=True,
            email_verified=True
        )
        
        db.add(admin)
        db.flush()
        
        print(f"✅ Created admin user (ID: {admin.id})")
    
    # Create or get admin role
    admin_role = db.query(RoleModel).filter(RoleModel.name == "admin").first()
   
    if not admin_role:
        admin_role = RoleModel(
            name="admin",
            description="Administrator role with full system access"
        )
        db.add(admin_role)
        db.flush()
        print(f"✅ Created admin role (ID: {admin_role.id})")
    else:
        print(f"ℹ️  Admin role already exists (ID: {admin_role.id})")
    
    # Link user to role
    user_role_link = db.query(UserRoleModel).filter(
        UserRoleModel.user_id == admin.id,
        UserRoleModel.role_id == admin_role.id
    ).first()
    
    if not user_role_link:
        user_role_link = UserRoleModel(
            user_id=admin.id,
            role_id=admin_role.id,
            department_id=None
        )
        db.add(user_role_link)
        db.commit()
        print(f"✅ Linked admin user to admin role")
    else:
        db.commit()
        print(f"ℹ️  User already linked to admin role")
    
    print(f"\n✅ Setup complete!")
    print(f"   Username: admin")
    print(f"   Password: Admin@123456")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()
