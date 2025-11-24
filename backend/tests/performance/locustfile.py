"""
DSABA LMS Performance Testing with Locust
Tests API endpoints under load to ensure performance requirements are met
"""

import json
import time
from locust import HttpUser, task, between, tag
from locust.exception import StopUser


class LMSUser(HttpUser):
    """Simulates a typical LMS user behavior"""

    # Wait between 1-3 seconds between tasks
    wait_time = between(1, 3)

    def on_start(self):
        """Login and get access token on start"""
        self.login()

    def login(self):
        """Authenticate and get access token"""
        login_data = {
            "username": "testuser",
            "password": "testpass123"
        }

        with self.client.post("/api/v1/auth/login",
                            json=login_data,
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.client.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
            else:
                # If login fails, create a test user first
                self.create_test_user()
                self.login()

    def create_test_user(self):
        """Create a test user for performance testing"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "testpass123",
            "roles": ["STUDENT"],
            "department_ids": [1]
        }

        # Try to create user (ignore if already exists)
        self.client.post("/api/v1/users", json=user_data)

    @task(3)
    def get_user_profile(self):
        """Test user profile endpoint"""
        self.client.get("/api/v1/auth/me")

    @task(2)
    def list_subjects(self):
        """Test subjects listing"""
        self.client.get("/api/v1/subjects")

    @task(2)
    def get_dashboard_data(self):
        """Test dashboard data retrieval"""
        self.client.get("/api/v1/dashboard")

    @task(1)
    def get_analytics(self):
        """Test analytics endpoints"""
        self.client.get("/api/v1/analytics/dashboard")

    @task(1)
    def list_students(self):
        """Test student listing (admin/teacher only)"""
        self.client.get("/api/v1/students")

    @task(1)
    def get_academic_years(self):
        """Test academic years listing"""
        self.client.get("/api/v1/academic-years")


class TeacherUser(HttpUser):
    """Simulates a teacher user with more intensive operations"""

    wait_time = between(2, 5)

    def on_start(self):
        self.login()

    def login(self):
        """Login as teacher"""
        login_data = {
            "username": "teacher",
            "password": "teacher123"
        }

        with self.client.post("/api/v1/auth/login",
                            json=login_data,
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.client.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
            else:
                self.create_teacher_user()
                self.login()

    def create_teacher_user(self):
        """Create teacher user"""
        user_data = {
            "username": "teacher",
            "email": "teacher@example.com",
            "first_name": "Teacher",
            "last_name": "User",
            "password": "teacher123",
            "roles": ["TEACHER"],
            "department_ids": [1]
        }
        self.client.post("/api/v1/users", json=user_data)

    @task(2)
    def get_subject_assignments(self):
        """Test subject assignments listing"""
        self.client.get("/api/v1/subject-assignments")

    @task(3)
    def get_internal_marks(self):
        """Test internal marks retrieval"""
        self.client.get("/api/v1/internal-marks")

    @task(2)
    def get_final_marks(self):
        """Test final marks retrieval"""
        self.client.get("/api/v1/final-marks")

    @task(1)
    def get_co_po_attainment(self):
        """Test CO-PO attainment calculation"""
        self.client.get("/api/v1/co-po-attainment")

    @task(1)
    def generate_report(self):
        """Test report generation"""
        self.client.get("/api/v1/reports/marks-sheet")


class AdminUser(HttpUser):
    """Simulates an admin user with bulk operations"""

    wait_time = between(3, 8)

    def on_start(self):
        self.login()

    def login(self):
        """Login as admin"""
        login_data = {
            "username": "admin",
            "password": "admin123"
        }

        with self.client.post("/api/v1/auth/login",
                            json=login_data,
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.client.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
            else:
                self.create_admin_user()
                self.login()

    def create_admin_user(self):
        """Create admin user"""
        user_data = {
            "username": "admin",
            "email": "admin@example.com",
            "first_name": "Admin",
            "last_name": "User",
            "password": "admin123",
            "roles": ["ADMIN"],
            "department_ids": [1]
        }
        self.client.post("/api/v1/users", json=user_data)

    @task(2)
    def list_all_users(self):
        """Test user management"""
        self.client.get("/api/v1/users")

    @task(1)
    def get_system_analytics(self):
        """Test system-wide analytics"""
        self.client.get("/api/v1/analytics/dashboard")

    @task(1)
    def check_system_health(self):
        """Test system health endpoint"""
        self.client.get("/health")

    @task(1)
    def audit_logs(self):
        """Test audit log retrieval"""
        self.client.get("/api/v1/audit")


class ReadOnlyUser(HttpUser):
    """Simulates read-only operations (high frequency)"""

    wait_time = between(0.5, 2)

    @task(5)
    def health_check(self):
        """Frequent health checks"""
        self.client.get("/health")

    @task(3)
    def get_public_info(self):
        """Access public information"""
        self.client.get("/api/v1/academic-years")

    @task(1)
    def cache_test(self):
        """Test caching endpoints"""
        self.client.get("/cache/status")  # Assuming this endpoint exists


# Performance test configuration
# Run with: locust --headless --users 100 --spawn-rate 10 --run-time 5m --host http://localhost:8000

# Target response times (in milliseconds)
TARGET_RESPONSE_TIME_95P = 1000  # 95th percentile under 1 second
TARGET_RESPONSE_TIME_AVG = 300   # Average under 300ms

# Target throughput
TARGET_RPS = 50  # Requests per second

# Error rate target
MAX_ERROR_RATE = 0.05  # 5% maximum error rate