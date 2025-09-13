#!/usr/bin/env python3
"""
Test script to verify backend functionality
"""

def test_imports():
    try:
        print("🔍 Testing backend imports...")
        
        # Test basic imports
        from database import engine, SessionLocal
        print("  ✅ Database imports successful")
        
        import models
        print("  ✅ Models imports successful")
        
        import schemas
        print("  ✅ Schemas imports successful")
        
        import crud
        print("  ✅ CRUD imports successful")
        
        import analytics
        print("  ✅ Analytics imports successful")
        
        import attainment_analytics
        print("  ✅ Attainment analytics imports successful")
        
        import advanced_analytics_backend
        print("  ✅ Advanced analytics backend imports successful")
        
        import strategic_dashboard_backend
        print("  ✅ Strategic dashboard backend imports successful")
        
        from main import app
        print("  ✅ Main app imports successful")
        
        print("✅ All backend imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_database_connection():
    try:
        print("🔍 Testing database connection...")
        
        from database import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("  ✅ Database connection successful")
            
            # Test CO/PO tables
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name LIKE '%co%' OR table_name LIKE '%po%' OR table_name LIKE '%attainment%')
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            print(f"  ✅ CO/PO tables found: {tables}")
            
            if len(tables) >= 7:
                print("  ✅ All required tables present")
            else:
                print(f"  ⚠️  Expected 7+ tables, found {len(tables)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_api_endpoints():
    try:
        print("🔍 Testing API endpoints...")
        
        from main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test health endpoint
        response = client.get("/health")
        if response.status_code == 200:
            print("  ✅ Health endpoint working")
        else:
            print(f"  ❌ Health endpoint failed: {response.status_code}")
            return False
        
        # Test root endpoint
        response = client.get("/")
        if response.status_code == 200:
            print("  ✅ Root endpoint working")
        else:
            print(f"  ❌ Root endpoint failed: {response.status_code}")
            return False
        
        print("✅ API endpoints working!")
        return True
        
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False

def main():
    print("🚀 Starting backend tests...\n")
    
    tests = [
        ("Import Test", test_imports),
        ("Database Test", test_database_connection),
        ("API Test", test_api_endpoints)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"📋 Running {test_name}...")
        result = test_func()
        results.append((test_name, result))
        print()
    
    print("📊 Test Results Summary:")
    print("=" * 40)
    
    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print("=" * 40)
    if all_passed:
        print("🎉 All tests passed! Backend is ready.")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
    
    return all_passed

if __name__ == "__main__":
    main()
