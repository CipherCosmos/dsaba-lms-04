#!/usr/bin/env python3
"""
Check what users exist in the database
"""

import requests
import json

def check_users():
    base_url = "http://localhost:8000"
    
    # First authenticate
    auth_response = requests.post(f"{base_url}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    if auth_response.status_code != 200:
        print(f"❌ Authentication failed: {auth_response.status_code}")
        return
    
    token = auth_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ Authenticated successfully")
    
    # Get all users
    response = requests.get(f"{base_url}/users", headers=headers)
    if response.status_code == 200:
        users = response.json()
        print(f"\n📊 Found {len(users)} users:")
        for user in users:
            print(f"  ID: {user['id']}, Username: {user['username']}, Role: {user['role']}, Name: {user['first_name']} {user['last_name']}")
        
        # Find students and teachers
        students = [u for u in users if u['role'] == 'student']
        teachers = [u for u in users if u['role'] == 'teacher']
        
        print(f"\n👨‍🎓 Students: {len(students)}")
        for student in students[:5]:  # Show first 5
            print(f"  ID: {student['id']}, Username: {student['username']}")
        
        print(f"\n👨‍🏫 Teachers: {len(teachers)}")
        for teacher in teachers[:5]:  # Show first 5
            print(f"  ID: {teacher['id']}, Username: {teacher['username']}")
        
        # Test analytics with actual user IDs
        if students:
            student_id = students[0]['id']
            print(f"\n🧪 Testing analytics with student ID {student_id}:")
            response = requests.get(f"{base_url}/analytics/student/{student_id}", headers=headers)
            print(f"  Student analytics: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"  Data: {data}")
        
        if teachers:
            teacher_id = teachers[0]['id']
            print(f"\n🧪 Testing analytics with teacher ID {teacher_id}:")
            response = requests.get(f"{base_url}/analytics/teacher/{teacher_id}", headers=headers)
            print(f"  Teacher analytics: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"  Data: {data}")
    else:
        print(f"❌ Failed to get users: {response.status_code}")

if __name__ == "__main__":
    check_users()
