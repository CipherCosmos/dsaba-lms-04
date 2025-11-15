#!/usr/bin/env python3
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, UserRole
from auth import get_password_hash

def add_admin_user():
    db = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
        if existing_admin:
            print(f"Admin user already exists: {existing_admin.username}")
            return

        # Create admin user
        password = "admin123"
        hashed = get_password_hash(password)
        print(f"Password: {password}")
        print(f"Hashed: {hashed}")

        admin = User(
            username="admin",
            email="admin@college.edu",
            first_name="System",
            last_name="Administrator",
            hashed_password=hashed,
            role=UserRole.admin,
            is_active=True
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"Email: admin@college.edu")

    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_admin_user()