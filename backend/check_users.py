#!/usr/bin/env python3
"""
Check users in database
"""

from database import engine
from sqlalchemy import text

def check_users():
    try:
        with engine.connect() as conn:
            # Check all users
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            total_users = result.scalar()
            print(f"Total users: {total_users}")
            
            # Check users by role
            result = conn.execute(text("SELECT role, COUNT(*) FROM users GROUP BY role"))
            roles = result.fetchall()
            for role, count in roles:
                print(f"{role}: {count}")
            
            # Check if admin exists
            result = conn.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'"))
            admin_count = result.scalar()
            print(f"Admin users: {admin_count}")
            
            if admin_count == 0:
                print("⚠️  No admin user found - creating one...")
                from auth import get_password_hash
                from models import User, UserRole
                from sqlalchemy.orm import sessionmaker
                
                SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
                db = SessionLocal()
                
                admin = User(
                    username="admin",
                    email="admin@college.edu",
                    first_name="Admin",
                    last_name="User",
                    hashed_password=get_password_hash("admin123"),
                    role=UserRole.admin,
                    is_active=True
                )
                db.add(admin)
                db.commit()
                print("✅ Admin user created")
                db.close()
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_users()
