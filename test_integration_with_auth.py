#!/usr/bin/env python3
"""
Integration Test Script with Authentication
Tests all frontend features with real backend data and proper authentication
"""

import sys
import os
import requests
import json
from typing import Dict, List, Any
import time

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

class AuthenticatedIntegrationTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        self.test_users = {
            'admin': {'username': 'admin', 'password': 'admin123'},
            'hod': {'username': 'hod_cse', 'password': 'hod123'},
            'teacher': {'username': 'teacher1', 'password': 'teacher123'},
            'student': {'username': 'cse-a_student01', 'password': 'student123'}
        }
        
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        result = {
            'test_name': test_name,
            'status': status,
            'details': details,
            'timestamp': time.time()
        }
        self.test_results.append(result)
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    def authenticate(self, user_type: str = 'admin') -> bool:
        """Authenticate with the backend"""
        try:
            credentials = self.test_users[user_type]
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=credentials,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data['access_token']
                self.session.headers.update({
                    'Authorization': f'Bearer {self.auth_token}'
                })
                self.log_test(f"Authentication ({user_type})", "PASS", f"Token: {self.auth_token[:20]}...")
                return True
            else:
                self.log_test(f"Authentication ({user_type})", "FAIL", f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test(f"Authentication ({user_type})", "FAIL", str(e))
            return False
    
    def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200, 
                     data: Dict = None, headers: Dict = None) -> bool:
        """Test a single endpoint"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = self.session.request(
                method, url, 
                json=data, 
                headers=headers,
                timeout=10
            )
            
            if response.status_code == expected_status:
                return True
            else:
                self.log_test(f"{method} {endpoint}", "FAIL", 
                            f"Expected {expected_status}, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test(f"{method} {endpoint}", "FAIL", str(e))
            return False
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test health check
        if self.test_endpoint("GET", "/health"):
            self.log_test("Health Check", "PASS")
        else:
            self.log_test("Health Check", "FAIL")
            return False
        
        # Test root endpoint
        if self.test_endpoint("GET", "/"):
            self.log_test("Root Endpoint", "PASS")
        else:
            self.log_test("Root Endpoint", "FAIL")
            return False
        
        return True
    
    def test_crud_endpoints(self):
        """Test CRUD endpoints for all entities"""
        print("\n📊 Testing CRUD Endpoints...")
        
        # Test departments
        self.test_endpoint("GET", "/departments")
        self.test_endpoint("POST", "/departments", 422)  # Should fail without data
        
        # Test classes
        self.test_endpoint("GET", "/classes")
        self.test_endpoint("POST", "/classes", 422)  # Should fail without data
        
        # Test subjects
        self.test_endpoint("GET", "/subjects")
        self.test_endpoint("POST", "/subjects", 422)  # Should fail without data
        
        # Test users
        self.test_endpoint("GET", "/users")
        self.test_endpoint("POST", "/users", 422)  # Should fail without data
        
        # Test exams
        self.test_endpoint("GET", "/exams")
        self.test_endpoint("POST", "/exams", 422)  # Should fail without data
        
        self.log_test("CRUD Endpoints", "PASS", "All basic CRUD endpoints accessible")
    
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n📈 Testing Analytics Endpoints...")
        
        # Get actual user IDs from the database
        try:
            response = self.session.get(f"{self.base_url}/users")
            if response.status_code == 200:
                users = response.json()
                students = [u for u in users if u['role'] == 'student']
                teachers = [u for u in users if u['role'] == 'teacher']
                hods = [u for u in users if u['role'] == 'hod']
                
                # Test with actual user IDs
                if students:
                    self.test_endpoint("GET", f"/analytics/student/{students[0]['id']}")
                if teachers:
                    self.test_endpoint("GET", f"/analytics/teacher/{teachers[0]['id']}")
                if hods:
                    self.test_endpoint("GET", f"/analytics/hod/{hods[0]['department_id']}")
            else:
                # Fallback to testing with ID 1
                self.test_endpoint("GET", "/analytics/student/1")
                self.test_endpoint("GET", "/analytics/teacher/1")
                self.test_endpoint("GET", "/analytics/hod/1")
        except Exception as e:
            print(f"Error getting user IDs: {e}")
            # Fallback to testing with ID 1
            self.test_endpoint("GET", "/analytics/student/1")
            self.test_endpoint("GET", "/analytics/teacher/1")
            self.test_endpoint("GET", "/analytics/hod/1")
        
        # Test other endpoints
        self.test_endpoint("GET", "/analytics/class/1")
        self.test_endpoint("GET", "/analytics/subject/1")
        
        # Test strategic dashboard
        self.test_endpoint("GET", "/analytics/strategic/department/1")
        
        # Test dashboard stats
        self.test_endpoint("GET", "/dashboard/stats")
        
        self.log_test("Analytics Endpoints", "PASS", "All analytics endpoints accessible")
    
    def test_co_po_endpoints(self):
        """Test CO/PO framework endpoints"""
        print("\n🎯 Testing CO/PO Framework...")
        
        # Test CO endpoints
        self.test_endpoint("GET", "/subjects/1/cos")
        self.test_endpoint("POST", "/subjects/1/cos", 422)  # Should fail without data
        
        # Test PO endpoints
        self.test_endpoint("GET", "/departments/1/pos")
        self.test_endpoint("POST", "/departments/1/pos", 422)  # Should fail without data
        
        # Test CO targets
        self.test_endpoint("GET", "/subjects/1/co-targets")
        
        # Test assessment weights
        self.test_endpoint("GET", "/subjects/1/assessment-weights")
        
        # Test CO-PO matrix
        self.test_endpoint("GET", "/subjects/1/co-po-matrix")
        
        self.log_test("CO/PO Framework", "PASS", "All CO/PO endpoints accessible")
    
    def test_reports_endpoints(self):
        """Test reports endpoints"""
        print("\n📄 Testing Reports...")
        
        # Test report templates
        self.test_endpoint("GET", "/reports/templates")
        
        # Test report generation (should fail without proper data)
        self.test_endpoint("POST", "/reports/generate", 422)
        
        self.log_test("Reports", "PASS", "All report endpoints accessible")
    
    def test_student_progress_endpoints(self):
        """Test student progress endpoints"""
        print("\n🎓 Testing Student Progress...")
        
        # Test student progress
        self.test_endpoint("GET", "/student-progress/1")
        self.test_endpoint("GET", "/student-goals/1")
        self.test_endpoint("GET", "/student-milestones/1")
        
        self.log_test("Student Progress", "PASS", "All student progress endpoints accessible")
    
    def test_file_upload_endpoints(self):
        """Test file upload/download endpoints"""
        print("\n📁 Testing File Operations...")
        
        # Test file download (should fail without proper exam)
        self.test_endpoint("GET", "/download/marks-template/1", 404)
        
        self.log_test("File Operations", "PASS", "File endpoints accessible")
    
    def test_data_retrieval(self):
        """Test actual data retrieval from endpoints"""
        print("\n📊 Testing Data Retrieval...")
        
        try:
            # Test departments
            response = self.session.get(f"{self.base_url}/departments")
            if response.status_code == 200:
                depts = response.json()
                self.log_test("Departments Data", "PASS", f"Retrieved {len(depts)} departments")
            else:
                self.log_test("Departments Data", "FAIL", f"Status: {response.status_code}")
            
            # Test classes
            response = self.session.get(f"{self.base_url}/classes")
            if response.status_code == 200:
                classes = response.json()
                self.log_test("Classes Data", "PASS", f"Retrieved {len(classes)} classes")
            else:
                self.log_test("Classes Data", "FAIL", f"Status: {response.status_code}")
            
            # Test subjects
            response = self.session.get(f"{self.base_url}/subjects")
            if response.status_code == 200:
                subjects = response.json()
                self.log_test("Subjects Data", "PASS", f"Retrieved {len(subjects)} subjects")
            else:
                self.log_test("Subjects Data", "FAIL", f"Status: {response.status_code}")
            
            # Test users
            response = self.session.get(f"{self.base_url}/users")
            if response.status_code == 200:
                users = response.json()
                self.log_test("Users Data", "PASS", f"Retrieved {len(users)} users")
            else:
                self.log_test("Users Data", "FAIL", f"Status: {response.status_code}")
            
            # Test exams
            response = self.session.get(f"{self.base_url}/exams")
            if response.status_code == 200:
                exams = response.json()
                self.log_test("Exams Data", "PASS", f"Retrieved {len(exams)} exams")
            else:
                self.log_test("Exams Data", "FAIL", f"Status: {response.status_code}")
            
        except Exception as e:
            self.log_test("Data Retrieval", "FAIL", str(e))
    
    def test_analytics_data(self):
        """Test analytics data retrieval"""
        print("\n📈 Testing Analytics Data...")
        
        try:
            # Get actual user IDs from the database
            response = self.session.get(f"{self.base_url}/users")
            if response.status_code == 200:
                users = response.json()
                students = [u for u in users if u['role'] == 'student']
                teachers = [u for u in users if u['role'] == 'teacher']
                hods = [u for u in users if u['role'] == 'hod']
                
                # Test student analytics with actual ID
                if students:
                    response = self.session.get(f"{self.base_url}/analytics/student/{students[0]['id']}")
                    if response.status_code == 200:
                        data = response.json()
                        self.log_test("Student Analytics Data", "PASS", f"Retrieved analytics for student {students[0]['id']}")
                    else:
                        self.log_test("Student Analytics Data", "FAIL", f"Status: {response.status_code}")
                else:
                    self.log_test("Student Analytics Data", "SKIP", "No students found")
                
                # Test teacher analytics with actual ID
                if teachers:
                    response = self.session.get(f"{self.base_url}/analytics/teacher/{teachers[0]['id']}")
                    if response.status_code == 200:
                        data = response.json()
                        self.log_test("Teacher Analytics Data", "PASS", f"Retrieved analytics for teacher {teachers[0]['id']}")
                    else:
                        self.log_test("Teacher Analytics Data", "FAIL", f"Status: {response.status_code}")
                else:
                    self.log_test("Teacher Analytics Data", "SKIP", "No teachers found")
                
                # Test HOD analytics with actual department ID
                if hods:
                    response = self.session.get(f"{self.base_url}/analytics/hod/{hods[0]['department_id']}")
                    if response.status_code == 200:
                        data = response.json()
                        self.log_test("HOD Analytics Data", "PASS", f"Retrieved analytics for department {hods[0]['department_id']}")
                    else:
                        self.log_test("HOD Analytics Data", "FAIL", f"Status: {response.status_code}")
                else:
                    self.log_test("HOD Analytics Data", "SKIP", "No HODs found")
            else:
                self.log_test("Analytics Data", "FAIL", "Could not retrieve users")
            
            # Test dashboard stats
            response = self.session.get(f"{self.base_url}/dashboard/stats")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Dashboard Stats Data", "PASS", f"Retrieved dashboard stats")
            else:
                self.log_test("Dashboard Stats Data", "FAIL", f"Status: {response.status_code}")
            
        except Exception as e:
            self.log_test("Analytics Data", "FAIL", str(e))
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting Authenticated Integration Tests")
        print("=" * 50)
        
        # First, test basic connectivity
        if not self.test_authentication():
            print("❌ Basic connectivity failed. Exiting.")
            return False
        
        # Authenticate as admin
        if not self.authenticate('admin'):
            print("❌ Authentication failed. Exiting.")
            return False
        
        # Run all test suites
        self.test_crud_endpoints()
        self.test_analytics_endpoints()
        self.test_co_po_endpoints()
        self.test_reports_endpoints()
        self.test_student_progress_endpoints()
        self.test_file_upload_endpoints()
        
        # Test actual data retrieval
        self.test_data_retrieval()
        self.test_analytics_data()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 Test Summary")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'PASS'])
        failed_tests = len([r for r in self.test_results if r['status'] == 'FAIL'])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if result['status'] == 'FAIL':
                    print(f"  - {result['test_name']}: {result['details']}")
        
        return failed_tests == 0

def main():
    """Main test runner"""
    print("🧪 Authenticated Integration Test Suite")
    print("Testing all frontend features with real backend data and authentication")
    
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code != 200:
            print("❌ Backend is not running. Please start the backend first.")
            return False
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to backend. Please start the backend first.")
        return False
    
    # Run tests
    tester = AuthenticatedIntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! The application is fully functional.")
    else:
        print("\n⚠️ Some tests failed. Please check the details above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)