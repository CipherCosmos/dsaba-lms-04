
import sys
import os
sys.path.append('/app')

from src.infrastructure.database.session import SessionLocal
from src.infrastructure.database.models import UserModel, TeacherModel, StudentModel

db = SessionLocal()

print("--- USERS ---")
users = db.query(UserModel).all()
for u in users:
    print(f"User ID: {u.id}, Username: {u.username}, Roles: {[r.role.name for r in u.user_roles]}")

print("\n--- TEACHERS ---")
teachers = db.query(TeacherModel).all()
for t in teachers:
    print(f"Teacher ID: {t.id}, User ID: {t.user_id}")

print("\n--- STUDENTS ---")
students = db.query(StudentModel).all()
for s in students:
    print(f"Student ID: {s.id}, User ID: {s.user_id}")

db.close()
