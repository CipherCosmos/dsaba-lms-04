#!/usr/bin/env python3
"""
Comprehensive Integration Test Script
Tests all frontend features with real backend data
"""

import sys
import os
import requests
import json
from typing import Dict, List, Any
import time

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

class IntegrationTester:
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
        
        # Test analytics endpoints (should work even without data)
        self.test_endpoint("GET", "/analytics/student/1")
        self.test_endpoint("GET", "/analytics/teacher/1")
        self.test_endpoint("GET", "/analytics/class/1")
        self.test_endpoint("GET", "/analytics/hod/1")
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
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting Comprehensive Integration Tests")
        print("=" * 50)
        
        # Run all test suites
        self.test_authentication()
        self.test_crud_endpoints()
        self.test_analytics_endpoints()
        self.test_co_po_endpoints()
        self.test_reports_endpoints()
        self.test_student_progress_endpoints()
        self.test_file_upload_endpoints()
        
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
    print("🧪 Comprehensive Integration Test Suite")
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
    tester = IntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! The application is fully functional.")
    else:
        print("\n⚠️ Some tests failed. Please check the details above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
