#!/usr/bin/env python3
"""
Integration Test with Authentication
Tests all frontend features with proper authentication
"""

import sys
import os
import requests
import json
from typing import Dict, List, Any
import time

class AuthenticatedIntegrationTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        self.auth_token = None
        
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
    
    def authenticate(self, username: str = "admin", password: str = "admin123"):
        """Authenticate and get token"""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json={
                "username": username,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("Authentication", "PASS", f"Authenticated as {username}")
                return True
            else:
                self.log_test("Authentication", "FAIL", f"Login failed: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Authentication", "FAIL", str(e))
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
    
    def test_health_endpoints(self):
        """Test health and basic endpoints"""
        print("\n🔐 Testing Health Endpoints...")
        
        # Test health check (no auth required)
        if self.test_endpoint("GET", "/health"):
            self.log_test("Health Check", "PASS")
        else:
            self.log_test("Health Check", "FAIL")
            return False
        
        # Test root endpoint (no auth required)
        if self.test_endpoint("GET", "/"):
            self.log_test("Root Endpoint", "PASS")
        else:
            self.log_test("Root Endpoint", "FAIL")
            return False
        
        return True
    
    def test_authenticated_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n🔒 Testing Authenticated Endpoints...")
        
        if not self.auth_token:
            self.log_test("Authenticated Endpoints", "FAIL", "No authentication token")
            return False
        
        # Test dashboard stats
        if self.test_endpoint("GET", "/dashboard/stats"):
            self.log_test("Dashboard Stats", "PASS")
        else:
            self.log_test("Dashboard Stats", "FAIL")
        
        # Test departments
        if self.test_endpoint("GET", "/departments"):
            self.log_test("Get Departments", "PASS")
        else:
            self.log_test("Get Departments", "FAIL")
        
        # Test classes
        if self.test_endpoint("GET", "/classes"):
            self.log_test("Get Classes", "PASS")
        else:
            self.log_test("Get Classes", "FAIL")
        
        # Test subjects
        if self.test_endpoint("GET", "/subjects"):
            self.log_test("Get Subjects", "PASS")
        else:
            self.log_test("Get Subjects", "FAIL")
        
        # Test users
        if self.test_endpoint("GET", "/users"):
            self.log_test("Get Users", "PASS")
        else:
            self.log_test("Get Users", "FAIL")
        
        # Test exams
        if self.test_endpoint("GET", "/exams"):
            self.log_test("Get Exams", "PASS")
        else:
            self.log_test("Get Exams", "FAIL")
        
        return True
    
    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n📈 Testing Analytics Endpoints...")
        
        if not self.auth_token:
            self.log_test("Analytics Endpoints", "FAIL", "No authentication token")
            return False
        
        # Test analytics endpoints
        analytics_tests = [
            ("GET", "/analytics/student/1", "Student Analytics"),
            ("GET", "/analytics/teacher/1", "Teacher Analytics"),
            ("GET", "/analytics/class/1", "Class Analytics"),
            ("GET", "/analytics/hod/1", "HOD Analytics"),
            ("GET", "/analytics/subject/1", "Subject Analytics"),
            ("GET", "/analytics/strategic/department/1", "Strategic Dashboard"),
        ]
        
        passed = 0
        for method, endpoint, name in analytics_tests:
            if self.test_endpoint(method, endpoint):
                passed += 1
                self.log_test(name, "PASS")
            else:
                self.log_test(name, "FAIL")
        
        self.log_test("Analytics Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(analytics_tests)} analytics endpoints working")
        return passed > 0
    
    def test_crud_operations(self):
        """Test CRUD operations"""
        print("\n📊 Testing CRUD Operations...")
        
        if not self.auth_token:
            self.log_test("CRUD Operations", "FAIL", "No authentication token")
            return False
        
        # Test creating a department
        dept_data = {
            "name": "Test Department",
            "code": "TEST",
            "description": "Test department for integration testing"
        }
        
        if self.test_endpoint("POST", "/departments", 200, dept_data):
            self.log_test("Create Department", "PASS")
        else:
            self.log_test("Create Department", "FAIL")
        
        # Test creating a class
        class_data = {
            "name": "Test Class",
            "year": 1,
            "section": "A",
            "department_id": 1
        }
        
        if self.test_endpoint("POST", "/classes", 200, class_data):
            self.log_test("Create Class", "PASS")
        else:
            self.log_test("Create Class", "FAIL")
        
        return True
    
    def test_co_po_framework(self):
        """Test CO/PO framework endpoints"""
        print("\n🎯 Testing CO/PO Framework...")
        
        if not self.auth_token:
            self.log_test("CO/PO Framework", "FAIL", "No authentication token")
            return False
        
        # Test CO endpoints
        co_tests = [
            ("GET", "/subjects/1/cos", "Get COs"),
            ("GET", "/subjects/1/co-targets", "Get CO Targets"),
            ("GET", "/subjects/1/assessment-weights", "Get Assessment Weights"),
            ("GET", "/subjects/1/co-po-matrix", "Get CO-PO Matrix"),
        ]
        
        passed = 0
        for method, endpoint, name in co_tests:
            if self.test_endpoint(method, endpoint):
                passed += 1
                self.log_test(name, "PASS")
            else:
                self.log_test(name, "FAIL")
        
        # Test PO endpoints
        po_tests = [
            ("GET", "/departments/1/pos", "Get POs"),
        ]
        
        for method, endpoint, name in po_tests:
            if self.test_endpoint(method, endpoint):
                passed += 1
                self.log_test(name, "PASS")
            else:
                self.log_test(name, "FAIL")
        
        self.log_test("CO/PO Framework Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(co_tests + po_tests)} CO/PO endpoints working")
        return passed > 0
    
    def test_reports_endpoints(self):
        """Test reports endpoints"""
        print("\n📄 Testing Reports...")
        
        if not self.auth_token:
            self.log_test("Reports", "FAIL", "No authentication token")
            return False
        
        # Test report templates
        if self.test_endpoint("GET", "/reports/templates"):
            self.log_test("Get Report Templates", "PASS")
        else:
            self.log_test("Get Report Templates", "FAIL")
        
        # Test report generation (should fail without proper data)
        if self.test_endpoint("POST", "/reports/generate", 422):
            self.log_test("Report Generation Validation", "PASS")
        else:
            self.log_test("Report Generation Validation", "FAIL")
        
        return True
    
    def test_student_progress_endpoints(self):
        """Test student progress endpoints"""
        print("\n🎓 Testing Student Progress...")
        
        if not self.auth_token:
            self.log_test("Student Progress", "FAIL", "No authentication token")
            return False
        
        progress_tests = [
            ("GET", "/student-progress/1", "Get Student Progress"),
            ("GET", "/student-goals/1", "Get Student Goals"),
            ("GET", "/student-milestones/1", "Get Student Milestones"),
        ]
        
        passed = 0
        for method, endpoint, name in progress_tests:
            if self.test_endpoint(method, endpoint):
                passed += 1
                self.log_test(name, "PASS")
            else:
                self.log_test(name, "FAIL")
        
        self.log_test("Student Progress Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(progress_tests)} progress endpoints working")
        return passed > 0
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting Authenticated Integration Tests")
        print("=" * 50)
        
        # Test health endpoints first
        if not self.test_health_endpoints():
            print("❌ Health endpoints failed. Backend may not be running.")
            return False
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with authenticated tests.")
            return False
        
        # Run all test suites
        self.test_authenticated_endpoints()
        self.test_analytics_endpoints()
        self.test_crud_operations()
        self.test_co_po_framework()
        self.test_reports_endpoints()
        self.test_student_progress_endpoints()
        
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
    print("Testing all frontend features with proper authentication")
    
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
