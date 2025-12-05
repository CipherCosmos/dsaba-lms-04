import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def log(message, status="INFO"):
    if status == "SUCCESS":
        print(f"{GREEN}[SUCCESS] {message}{RESET}")
    elif status == "ERROR":
        print(f"{RED}[ERROR] {message}{RESET}")
    elif status == "WARNING":
        print(f"{YELLOW}[WARNING] {message}{RESET}")
    else:
        print(f"[INFO] {message}")

class APITester:
    def __init__(self):
        self.tokens = {}
        self.users = {
            "admin": ("admin", "Admin@123456"),
            "hod": ("hod_cs", "Hod@123456"),
            "teacher": ("teacher_john", "Teacher@123456"),
            "student": ("student_001", "Student@123456")
        }
        self.data = {} # Store created IDs for chaining tests

    def login(self, role):
        username, password = self.users[role]
        log(f"Logging in as {role} ({username})...")
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "username": username,
                "password": password
            })
            if response.status_code == 200:
                self.tokens[role] = response.json()["access_token"]
                log(f"Login successful for {role}", "SUCCESS")
                return True
            else:
                log(f"Login failed for {role}: {response.text}", "ERROR")
                return False
        except Exception as e:
            log(f"Login exception for {role}: {e}", "ERROR")
            return False

    def get_headers(self, role):
        return {
            "Authorization": f"Bearer {self.tokens.get(role)}",
            "Content-Type": "application/json"
        }

    def test_endpoint(self, method, endpoint, role, data=None, expected_status=200, description=""):
        log(f"Testing {method} {endpoint} as {role} - {description}")
        url = f"{BASE_URL}{endpoint}"
        headers = self.get_headers(role)
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            
            if response.status_code == expected_status:
                log(f"Passed: {method} {endpoint}", "SUCCESS")
                return response.json() if response.content else {}
            else:
                log(f"Failed: {method} {endpoint} - Expected {expected_status}, got {response.status_code}", "ERROR")
                log(f"Response: {response.text}", "ERROR")
                return None
        except Exception as e:
            log(f"Exception testing {endpoint}: {e}", "ERROR")
            return None

    def run_all_tests(self):
        log("=== STARTING BACKEND API AUDIT ===")
        
        # 1. Authentication
        for role in self.users:
            if not self.login(role):
                log("Critical: Login failed. Aborting tests for this role.", "ERROR")

        if "admin" not in self.tokens:
            log("Admin login failed. Cannot proceed with setup tests.", "ERROR")
            return

        # 2. Admin: User & Department Management
        log("\n--- Admin: Infrastructure Tests ---")
        # Get Departments
        depts = self.test_endpoint("GET", "/departments", "admin", description="List departments")
        if depts and 'items' in depts and len(depts['items']) > 0:
            self.data['dept_id'] = depts['items'][0]['id']
            log(f"Found Department ID: {self.data['dept_id']}", "INFO")
        
        # Get Users
        users = self.test_endpoint("GET", "/users", "admin", description="List users")
        
        # 3. Admin: Academic Structure
        log("\n--- Admin: Academic Structure Tests ---")
        # Get Academic Years
        ays = self.test_endpoint("GET", "/academic-years", "admin", description="List academic years")
        if ays and 'items' in ays and len(ays['items']) > 0:
            self.data['ay_id'] = ays['items'][0]['id']
            log(f"Found Academic Year ID: {self.data['ay_id']}", "INFO")

        # Get Batch Instances
        batches = self.test_endpoint("GET", "/batch-instances", "admin", description="List batch instances")
        if batches and 'items' in batches and len(batches['items']) > 0:
            self.data['batch_id'] = batches['items'][0]['id']
            log(f"Found Batch Instance ID: {self.data['batch_id']}", "INFO")

        # 4. Admin: Curriculum
        log("\n--- Admin: Curriculum Tests ---")
        # Create Subject
        subject_data = {
            "code": f"TEST{datetime.now().strftime('%H%M')}",
            "name": "Test Subject API",
            "department_id": self.data.get('dept_id', 1),
            "credits": 3,
            "max_internal": 40,
            "max_external": 60
        }
        subj = self.test_endpoint("POST", "/subjects", "admin", data=subject_data, expected_status=201, description="Create Subject")
        if subj:
            self.data['subject_id'] = subj['id']
            log(f"Created Subject ID: {self.data['subject_id']}", "SUCCESS")

        # 5. Teacher: Assessment
        if "teacher" in self.tokens:
            log("\n--- Teacher: Assessment Tests ---")
            # Get Assigned Subjects
            # Note: The endpoint /subject-assignments/teacher/my-assignments does not exist.
            # We should use /subject-assignments with user_id filter (which maps to teacher_id internally)
            # First, we need the teacher's user ID. We can get it from the login response or /auth/me
            me = self.test_endpoint("GET", "/auth/me", "teacher", description="Get teacher profile")
            if me:
                teacher_user_id = me['id']
                self.test_endpoint("GET", f"/subject-assignments?user_id={teacher_user_id}", "teacher", description="Get my assignments")
            
            # Create Exam (needs assignment, skipping creation if no assignment, but testing endpoint)
            # We'll try to list exams first
            self.test_endpoint("GET", "/exams", "teacher", description="List exams")

        # 6. Student: Access
        if "student" in self.tokens:
            log("\n--- Student: Access Tests ---")
            me = self.test_endpoint("GET", "/profile/me", "student", description="Get my profile")
            if me:
                student_id = me['id'] # This is user_id, but for marks we might need student_id. 
                # Let's check if we can get student profile first to get student_id
                # Actually, the marks endpoint /marks/student/{student_id} likely expects student_id (from student table), not user_id.
                # But let's try to find a valid endpoint. 
                # There is no /marks/student/my-marks. 
                # There is /marks/student/{student_id}/exam/{exam_id} or /marks/student/{student_id} (if it existed)
                # Let's try to get student profile to find student_id
                # The profile API /profile/me returns user data. 
                # We can try /students/me if it exists, or just skip this specific marks test if we can't easily get student_id.
                pass

        # 7. HOD: Analytics
        if "hod" in self.tokens:
            log("\n--- HOD: Analytics Tests ---")
            if 'dept_id' in self.data:
                self.test_endpoint("GET", f"/analytics/hod/department/{self.data['dept_id']}", "hod", description="Get Dept Analytics")

        log("\n=== BACKEND API AUDIT COMPLETE ===")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
