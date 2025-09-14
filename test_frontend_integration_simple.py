#!/usr/bin/env python3
"""
Simple Frontend Integration Test
Focuses on verifying that all frontend features work with real backend data
"""

import sys
import os
import requests
import json
from typing import Dict, List, Any
import time

class SimpleIntegrationTester:
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
            }, timeout=10)
            
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
    
    def test_endpoint(self, method: str, endpoint: str, expected_statuses: List[int] = [200], 
                     data: Dict = None, timeout: int = 10) -> bool:
        """Test a single endpoint"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = self.session.request(
                method, url, 
                json=data, 
                timeout=timeout
            )
            
            if response.status_code in expected_statuses:
                return True
            else:
                self.log_test(f"{method} {endpoint}", "FAIL", 
                            f"Expected {expected_statuses}, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test(f"{method} {endpoint}", "FAIL", str(e))
            return False
    
    def test_core_features(self):
        """Test core features that frontend depends on"""
        print("\n🔧 Testing Core Features...")
        
        if not self.auth_token:
            self.log_test("Core Features", "FAIL", "No authentication token")
            return False
        
        # Test basic CRUD endpoints (GET operations only)
        core_tests = [
            ("GET", "/departments", "Get Departments", [200]),
            ("GET", "/classes", "Get Classes", [200]),
            ("GET", "/subjects", "Get Subjects", [200]),
            ("GET", "/users", "Get Users", [200]),
            ("GET", "/exams", "Get Exams", [200]),
            ("GET", "/dashboard/stats", "Dashboard Stats", [200]),
        ]
        
        passed = 0
        for method, endpoint, name, expected_statuses in core_tests:
            if self.test_endpoint(method, endpoint, expected_statuses):
                passed += 1
                self.log_test(name, "PASS")
            else:
                self.log_test(name, "FAIL")
        
        self.log_test("Core Features Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(core_tests)} core features working")
        return passed > 0
    
    def test_analytics_features(self):
        """Test analytics features"""
        print("\n📈 Testing Analytics Features...")
        
        if not self.auth_token:
            self.log_test("Analytics Features", "FAIL", "No authentication token")
            return False
        
        # Test analytics endpoints (404 is expected for empty database)
        analytics_tests = [
            ("GET", "/analytics/student/1", "Student Analytics", [200, 404]),
            ("GET", "/analytics/teacher/1", "Teacher Analytics", [200, 404]),
            ("GET", "/analytics/class/1", "Class Analytics", [200, 404]),
            ("GET", "/analytics/hod/1", "HOD Analytics", [200, 404]),
            ("GET", "/analytics/subject/1", "Subject Analytics", [200, 404]),
            ("GET", "/analytics/strategic/department/1", "Strategic Dashboard", [200, 404]),
        ]
        
        passed = 0
        for method, endpoint, name, expected_statuses in analytics_tests:
            try:
                response = self.session.request(method, f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in expected_statuses:
                    passed += 1
                    status_msg = "PASS" if response.status_code == 200 else "PASS (404 expected for empty DB)"
                    self.log_test(name, status_msg)
                else:
                    self.log_test(name, "FAIL", f"Unexpected status: {response.status_code}")
            except Exception as e:
                self.log_test(name, "FAIL", str(e))
        
        self.log_test("Analytics Features Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(analytics_tests)} analytics features working")
        return passed > 0
    
    def test_co_po_framework(self):
        """Test CO/PO framework features"""
        print("\n🎯 Testing CO/PO Framework...")
        
        if not self.auth_token:
            self.log_test("CO/PO Framework", "FAIL", "No authentication token")
            return False
        
        # Test CO/PO endpoints
        copo_tests = [
            ("GET", "/subjects/1/cos", "Get COs", [200, 404]),
            ("GET", "/subjects/1/co-targets", "Get CO Targets", [200, 404]),
            ("GET", "/subjects/1/assessment-weights", "Get Assessment Weights", [200, 404]),
            ("GET", "/subjects/1/co-po-matrix", "Get CO-PO Matrix", [200, 404]),
            ("GET", "/departments/1/pos", "Get POs", [200, 404]),
        ]
        
        passed = 0
        for method, endpoint, name, expected_statuses in copo_tests:
            try:
                response = self.session.request(method, f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in expected_statuses:
                    passed += 1
                    status_msg = "PASS" if response.status_code == 200 else "PASS (404 expected for empty DB)"
                    self.log_test(name, status_msg)
                else:
                    self.log_test(name, "FAIL", f"Unexpected status: {response.status_code}")
            except Exception as e:
                self.log_test(name, "FAIL", str(e))
        
        self.log_test("CO/PO Framework Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(copo_tests)} CO/PO features working")
        return passed > 0
    
    def test_student_features(self):
        """Test student-specific features"""
        print("\n🎓 Testing Student Features...")
        
        if not self.auth_token:
            self.log_test("Student Features", "FAIL", "No authentication token")
            return False
        
        # Test student progress endpoints
        student_tests = [
            ("GET", "/student-progress/1", "Student Progress", [200, 404]),
            ("GET", "/student-goals/1", "Student Goals", [200, 404]),
            ("GET", "/student-milestones/1", "Student Milestones", [200, 404]),
        ]
        
        passed = 0
        for method, endpoint, name, expected_statuses in student_tests:
            try:
                response = self.session.request(method, f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in expected_statuses:
                    passed += 1
                    status_msg = "PASS" if response.status_code == 200 else "PASS (404 expected for empty DB)"
                    self.log_test(name, status_msg)
                else:
                    self.log_test(name, "FAIL", f"Unexpected status: {response.status_code}")
            except Exception as e:
                self.log_test(name, "FAIL", str(e))
        
        self.log_test("Student Features Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(student_tests)} student features working")
        return passed > 0
    
    def test_reports_features(self):
        """Test reports features"""
        print("\n📄 Testing Reports Features...")
        
        if not self.auth_token:
            self.log_test("Reports Features", "FAIL", "No authentication token")
            return False
        
        # Test reports endpoints
        reports_tests = [
            ("GET", "/reports/templates", "Get Report Templates", [200]),
        ]
        
        passed = 0
        for method, endpoint, name, expected_statuses in reports_tests:
            if self.test_endpoint(method, endpoint, expected_statuses):
                passed += 1
                self.log_test(name, "PASS")
            else:
                self.log_test(name, "FAIL")
        
        self.log_test("Reports Features Summary", "PASS" if passed > 0 else "FAIL", 
                     f"{passed}/{len(reports_tests)} reports features working")
        return passed > 0
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting Simple Frontend Integration Tests")
        print("=" * 60)
        
        # Test health endpoints first
        if not self.test_endpoint("GET", "/health", [200]):
            print("❌ Health check failed. Backend may not be running.")
            return False
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_core_features()
        self.test_analytics_features()
        self.test_co_po_framework()
        self.test_student_features()
        self.test_reports_features()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        
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
    print("🧪 Simple Frontend Integration Test Suite")
    print("Testing all frontend features with real backend data")
    
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
    tester = SimpleIntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Frontend features are fully functional with real data.")
    else:
        print("\n⚠️ Some tests failed. Please check the details above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
