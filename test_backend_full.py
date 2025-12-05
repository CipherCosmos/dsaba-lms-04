import requests
import json
import random
import string
import time
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# Colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

class ComprehensiveTester:
    def __init__(self):
        self.tokens = {}
        self.data = {}
        self.users = {
            "admin": ("admin", "Admin@123456"),
            "hod": ("hod_cs", "Hod@123456"),
            "teacher": ("teacher_john", "Teacher@123456"),
            "student": ("student_001", "Student@123456")
        }
        self.suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

    def log(self, msg, type="INFO"):
        if type == "SUCCESS":
            print(f"{GREEN}[SUCCESS] {msg}{RESET}")
        elif type == "ERROR":
            print(f"{RED}[ERROR] {msg}{RESET}")
        elif type == "WARNING":
            print(f"{YELLOW}[WARNING] {msg}{RESET}")
        elif type == "header":
            print(f"\n{BLUE}{'='*60}\n{msg}\n{'='*60}{RESET}")
        elif type == "subheader":
            print(f"\n{BLUE}--- {msg} ---{RESET}")
        else:
            print(f"[INFO] {msg}")

    def request(self, method, endpoint, role="admin", data=None, params=None, expected_status=200):
        headers = {
            "Authorization": f"Bearer {self.tokens.get(role, '')}",
            "Content-Type": "application/json"
        }
        url = f"{BASE_URL}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, params=params)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            
            if response.status_code == expected_status:
                self.log(f"{method} {endpoint} - OK", "SUCCESS")
                try:
                    return response.json()
                except:
                    return response.text
            elif response.status_code == 201 and expected_status == 201:
                self.log(f"{method} {endpoint} - Created", "SUCCESS")
                return response.json()
            else:
                self.log(f"{method} {endpoint} - Failed (Expected {expected_status}, Got {response.status_code})", "ERROR")
                self.log(f"Response: {response.text}", "ERROR")
                return None
        except Exception as e:
            self.log(f"Exception in {method} {endpoint}: {e}", "ERROR")
            return None

    def run(self):
        self.log("STARTING COMPREHENSIVE BACKEND TEST", "header")
        
        # 1. AUTHENTICATION
        self.log("Authentication Module", "subheader")
        for role, creds in self.users.items():
            res = requests.post(f"{BASE_URL}/auth/login", json={"username": creds[0], "password": creds[1]})
            if res.status_code == 200:
                self.tokens[role] = res.json()["access_token"]
                self.log(f"Login {role}: Success", "SUCCESS")
                # Get User ID
                me = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {self.tokens[role]}"}).json()
                self.data[f"{role}_id"] = me['id']
            else:
                self.log(f"Login {role}: Failed", "ERROR")
                return

        # 2. INFRASTRUCTURE (Admin)
        self.log("Infrastructure Module", "subheader")
        
        # Departments
        dept_data = {"name": f"Test Dept {self.suffix}", "code": f"TD{self.suffix}", "is_active": True}
        dept = self.request("POST", "/departments", "admin", dept_data, expected_status=201)
        if dept:
            self.data['dept_id'] = dept['id']
        
        # Academic Year
        ay_data = {"name": f"AY 2025-{self.suffix}", "start_date": "2025-01-01", "end_date": "2025-12-31", "is_current": False, "display_name": f"2025-{self.suffix}"}
        # Note: Academic Year creation might fail if fields differ, using simplified check or listing existing
        ays = self.request("GET", "/academic-years", "admin")
        if ays and 'items' in ays and len(ays['items']) > 0:
            self.data['ay_id'] = ays['items'][0]['id']
            self.log(f"Using existing Academic Year ID: {self.data['ay_id']}")
        
        # Batch Instances
        batches = self.request("GET", "/batch-instances", "admin")
        if batches and 'items' in batches and len(batches['items']) > 0:
            self.data['batch_id'] = batches['items'][0]['id']
            self.log(f"Using existing Batch ID: {self.data['batch_id']}")

        # 3. CURRICULUM (Admin)
        self.log("Curriculum Module", "subheader")
        
        # Create Subject
        subj_data = {
            "name": f"Advanced Testing {self.suffix}",
            "code": f"CS{self.suffix}",
            "department_id": self.data.get('dept_id', 1),
            "credits": 4,
            "semester": 1,
            "type": "Theory",
            "max_internal": 40,
            "max_external": 60
        }
        subj = self.request("POST", "/subjects", "admin", subj_data, expected_status=201)
        if subj:
            self.data['subject_id'] = subj['id']
        
        # Add Course Outcomes (COs)
        if 'subject_id' in self.data:
            co_data = {
                "subject_id": self.data['subject_id'],
                "code": "CO1",
                "title": "Understanding Software Testing Principles",
                "description": "Students will be able to understand the fundamental principles of software testing and its importance in the SDLC. This description is long enough.",
                "target_attainment": 70,
                "l1_threshold": 40,
                "l2_threshold": 60,
                "l3_threshold": 80,
                "bloom_level": "L2"
            }
            co = self.request("POST", "/course-outcomes", "admin", co_data, expected_status=201)
            if co:
                self.data['co_id'] = co['id']

        # 4. PLANNING (HOD/Admin)
        self.log("Planning Module", "subheader")
        
        # Get Semesters
        semesters = self.request("GET", "/academic/semesters", "admin")
        if semesters and 'items' in semesters and len(semesters['items']) > 0:
            self.data['semester_id'] = semesters['items'][0]['id']
            self.log(f"Using existing Semester ID: {self.data['semester_id']}")
        else:
            # Create Semester Chain
            self.log("No semesters found, creating academic structure...", "WARNING")
            
            # 1. Ensure Batch exists
            if 'batch_id' not in self.data:
                batch_data = {"name": f"B.Tech CSE {self.suffix}", "duration_years": 4}
                batch = self.request("POST", "/academic/batches", "admin", batch_data, expected_status=201)
                if batch:
                    self.data['batch_id'] = batch['id']
            
            # 2. Ensure Batch Year exists
            if 'batch_id' in self.data:
                # Check for existing batch years
                by_list = self.request("GET", f"/academic/batches/{self.data['batch_id']}/batch-years", "admin")
                if by_list and len(by_list) > 0:
                     self.data['batch_year_id'] = by_list[0]['id']
                else:
                    by_data = {
                        "batch_id": self.data['batch_id'],
                        "start_year": 2025,
                        "end_year": 2029,
                        "is_current": True
                    }
                    by = self.request("POST", "/academic/batch-years", "admin", by_data, expected_status=201)
                    if by:
                        self.data['batch_year_id'] = by['id']
            
            # 3. Create Semester
            if 'batch_id' in self.data:
                # We need batch_instance_id. 
                # Wait, batch_id from /academic/batches is likely Batch (program type).
                # BatchInstance is different.
                # We need to create a BatchInstance first if we don't have one.
                # The test script earlier checked /batch-instances and got 'batch_id' (which was actually batch_instance id).
                # Let's verify what self.data['batch_id'] holds.
                # In Step 2 (Infra), we did:
                # batches = self.request("GET", "/batch-instances", "admin")
                # self.data['batch_id'] = batches['items'][0]['id']
                # So self.data['batch_id'] IS a BatchInstance ID.
                
                sem_data = {
                    "batch_instance_id": self.data['batch_id'],
                    "semester_no": 1,
                    "start_date": "2025-01-01",
                    "end_date": "2025-06-01",
                    "is_current": True
                }
                sem = self.request("POST", "/academic/semesters", "admin", sem_data, expected_status=201)
                if sem:
                    self.data['semester_id'] = sem['id']
                    self.log(f"Created Semester ID: {self.data['semester_id']}")

        # Get Teacher Profile ID
        # Login as teacher to get profile
        me_teacher = self.request("GET", "/auth/me", "teacher")
        if me_teacher:
            # Try to get teacher profile ID from /profile/me
            profile = self.request("GET", "/profile/me", "teacher")
            self.log(f"Teacher Profile Response: {json.dumps(profile)}")
            if profile:
                if 'teacher_id' in profile and profile['teacher_id']:
                     teacher_id = profile['teacher_id']
                     self.log(f"Found Teacher Profile ID: {teacher_id}")
                     self.data['teacher_id'] = teacher_id
                else:
                     self.log("Teacher profile ID not found. Creating profile...", "WARNING")
                     # Create Teacher Profile
                     t_data = {
                         "user_id": me_teacher['id'],
                         "department_id": self.data.get('dept_id', 1),
                         "employee_id": f"EMP{self.suffix}",
                         "specialization": "Computer Science",
                         "join_date": "2024-01-01"
                     }
                     teacher = self.request("POST", "/teachers", "admin", t_data, expected_status=201)
                     if teacher:
                         self.data['teacher_id'] = teacher['id']
                         self.log(f"Created Teacher Profile ID: {self.data['teacher_id']}")

        # Check Student Profile
        me_student = self.request("GET", "/auth/me", "student")
        if me_student:
            profile = self.request("GET", "/profile/me", "student")
            if profile:
                if 'student_id' in profile and profile['student_id']:
                    self.data['student_id'] = profile['student_id']
                    self.log(f"Found Student Profile ID: {self.data['student_id']}")
                else:
                    self.log("Student profile ID not found. Creating profile...", "WARNING")
                    # Create Student Profile
                    s_data = {
                        "user_id": me_student['id'],
                        "roll_no": f"CS24{self.suffix}",
                        "batch_instance_id": self.data.get('batch_id', 1),
                        "department_id": self.data.get('dept_id', 1),
                        "current_year_level": 1,
                        "admission_date": "2024-08-01"
                    }
                    student = self.request("POST", "/students", "admin", s_data, expected_status=201)
                    if student:
                        self.data['student_id'] = student['id']
                        self.log(f"Created Student Profile ID: {self.data['student_id']}")

        # Assign Subject to Teacher
        if 'subject_id' in self.data and 'teacher_id' in self.data and 'semester_id' in self.data:
            assign_data = {
                "subject_id": self.data['subject_id'],
                "teacher_id": self.data['teacher_id'],
                "semester_id": self.data['semester_id'], 
                "academic_year": "2025",
                "academic_year_id": self.data.get('ay_id', 1)
            }
            assign = self.request("POST", "/subject-assignments", "admin", assign_data, expected_status=201)
            if assign:
                self.data['assignment_id'] = assign['id']

        # 5. ASSESSMENT (Teacher)
        self.log("Assessment Module", "subheader")
        
        # Create Exam
        if 'assignment_id' in self.data:
            exam_data = {
                "name": f"Internal 1 {self.suffix}",
                "exam_type": "internal1",
                "exam_date": "2025-06-01",
                "max_marks": 20,
                "subject_assignment_id": self.data['assignment_id'],
                "description": "Test Exam",
                "total_marks": 20
            }
            exam = self.request("POST", "/exams", "teacher", exam_data, expected_status=201)
            if exam:
                self.data['exam_id'] = exam['id']
                
                # Add Question
                q_data = {
                    "exam_id": self.data['exam_id'],
                    "question_no": "1",
                    "question_text": "What is testing?",
                    "section": "A",
                    "marks_per_question": 5,
                    "required_count": 1,
                    "optional_count": 0,
                    "blooms_level": "L1",
                    "difficulty": "medium"
                }
                q = self.request("POST", "/questions", "teacher", q_data, expected_status=201)
                if q:
                    self.data['question_id'] = q['id']
                    
                    # Add CO Mapping
                    if 'co_id' in self.data:
                        mapping_data = {
                            "question_id": self.data['question_id'],
                            "co_id": self.data['co_id'],
                            "weight_pct": 100
                        }
                        self.request("POST", "/questions/co-mapping", "teacher", mapping_data, expected_status=201)

        # 6. ANALYTICS (All)
        self.log("Analytics Module", "subheader")
        
        self.request("GET", "/dashboard/stats", "admin")
        self.request("GET", "/dashboard/stats", "teacher")
        
        if 'student_id' in self.data:
            self.request("GET", "/dashboard/stats", "student")
        else:
            self.log("Skipping Student Dashboard test (No Profile)", "WARNING")
        
        if 'dept_id' in self.data:
            self.request("GET", f"/analytics/hod/department/{self.data['dept_id']}", "hod")

        self.log("TEST COMPLETE", "header")

if __name__ == "__main__":
    tester = ComprehensiveTester()
    tester.run()
