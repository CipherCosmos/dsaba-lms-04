# Comprehensive Endpoint Testing Script
Write-Host "=== Internal Exam Management System - Endpoint Testing ===" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET
    Write-Host "✅ Health Check: PASS" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Cyan
    Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Health Check: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Root Endpoint
Write-Host "`n2. Testing Root Endpoint..." -ForegroundColor Yellow
try {
    $root = Invoke-RestMethod -Uri "http://localhost:8000/" -Method GET
    Write-Host "✅ Root Endpoint: PASS" -ForegroundColor Green
    Write-Host "   Message: $($root.message)" -ForegroundColor Cyan
    Write-Host "   Status: $($root.status)" -ForegroundColor Cyan
    Write-Host "   Version: $($root.version)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Root Endpoint: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Authentication - Admin Login
Write-Host "`n3. Testing Admin Authentication..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json -Depth 3
    
    $auth = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Admin Login: PASS" -ForegroundColor Green
    Write-Host "   Token Type: $($auth.token_type)" -ForegroundColor Cyan
    Write-Host "   User Role: $($auth.user.role)" -ForegroundColor Cyan
    Write-Host "   User ID: $($auth.user.id)" -ForegroundColor Cyan
    
    $adminToken = $auth.access_token
} catch {
    Write-Host "❌ Admin Login: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    $adminToken = $null
}

# Test 4: Get Current User Info (if login successful)
if ($adminToken) {
    Write-Host "`n4. Testing Get Current User Info..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $userInfo = Invoke-RestMethod -Uri "http://localhost:8000/auth/me" -Method GET -Headers $headers
        Write-Host "✅ Get User Info: PASS" -ForegroundColor Green
        Write-Host "   Username: $($userInfo.username)" -ForegroundColor Cyan
        Write-Host "   Role: $($userInfo.role)" -ForegroundColor Cyan
        Write-Host "   Email: $($userInfo.email)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Get User Info: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Get All Users (Admin only)
if ($adminToken) {
    Write-Host "`n5. Testing Get All Users..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $users = Invoke-RestMethod -Uri "http://localhost:8000/users" -Method GET -Headers $headers
        Write-Host "✅ Get All Users: PASS" -ForegroundColor Green
        Write-Host "   Total Users: $($users.Count)" -ForegroundColor Cyan
        Write-Host "   First User: $($users[0].username) ($($users[0].role))" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Get All Users: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Get All Departments
if ($adminToken) {
    Write-Host "`n6. Testing Get All Departments..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $departments = Invoke-RestMethod -Uri "http://localhost:8000/departments" -Method GET -Headers $headers
        Write-Host "✅ Get All Departments: PASS" -ForegroundColor Green
        Write-Host "   Total Departments: $($departments.Count)" -ForegroundColor Cyan
        if ($departments.Count -gt 0) {
            Write-Host "   First Department: $($departments[0].name) ($($departments[0].code))" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "❌ Get All Departments: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 7: Get All Classes
if ($adminToken) {
    Write-Host "`n7. Testing Get All Classes..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $classes = Invoke-RestMethod -Uri "http://localhost:8000/classes" -Method GET -Headers $headers
        Write-Host "✅ Get All Classes: PASS" -ForegroundColor Green
        Write-Host "   Total Classes: $($classes.Count)" -ForegroundColor Cyan
        if ($classes.Count -gt 0) {
            Write-Host "   First Class: $($classes[0].name) (Semester $($classes[0].semester))" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "❌ Get All Classes: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 8: Get All Subjects
if ($adminToken) {
    Write-Host "`n8. Testing Get All Subjects..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $subjects = Invoke-RestMethod -Uri "http://localhost:8000/subjects" -Method GET -Headers $headers
        Write-Host "✅ Get All Subjects: PASS" -ForegroundColor Green
        Write-Host "   Total Subjects: $($subjects.Count)" -ForegroundColor Cyan
        if ($subjects.Count -gt 0) {
            Write-Host "   First Subject: $($subjects[0].name) ($($subjects[0].code))" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "❌ Get All Subjects: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 9: Get All Exams
if ($adminToken) {
    Write-Host "`n9. Testing Get All Exams..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $exams = Invoke-RestMethod -Uri "http://localhost:8000/exams" -Method GET -Headers $headers
        Write-Host "✅ Get All Exams: PASS" -ForegroundColor Green
        Write-Host "   Total Exams: $($exams.Count)" -ForegroundColor Cyan
        if ($exams.Count -gt 0) {
            Write-Host "   First Exam: $($exams[0].name) ($($exams[0].exam_type))" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "❌ Get All Exams: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 10: Dashboard Stats
if ($adminToken) {
    Write-Host "`n10. Testing Dashboard Stats..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $adminToken"
        }
        $dashboard = Invoke-RestMethod -Uri "http://localhost:8000/dashboard/stats" -Method GET -Headers $headers
        Write-Host "✅ Dashboard Stats: PASS" -ForegroundColor Green
        Write-Host "   Stats Available: $($dashboard.stats -ne $null)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Dashboard Stats: FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 11: Teacher Login
Write-Host "`n11. Testing Teacher Authentication..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "teacher1"
        password = "teacher123"
    } | ConvertTo-Json -Depth 3
    
    $teacherAuth = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Teacher Login: PASS" -ForegroundColor Green
    Write-Host "   User Role: $($teacherAuth.user.role)" -ForegroundColor Cyan
    Write-Host "   User ID: $($teacherAuth.user.id)" -ForegroundColor Cyan
    
    $teacherToken = $teacherAuth.access_token
} catch {
    Write-Host "❌ Teacher Login: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    $teacherToken = $null
}

# Test 12: Student Login
Write-Host "`n12. Testing Student Authentication..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "cse-a_student01"
        password = "student123"
    } | ConvertTo-Json -Depth 3
    
    $studentAuth = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Student Login: PASS" -ForegroundColor Green
    Write-Host "   User Role: $($studentAuth.user.role)" -ForegroundColor Cyan
    Write-Host "   User ID: $($studentAuth.user.id)" -ForegroundColor Cyan
    
    $studentToken = $studentAuth.access_token
} catch {
    Write-Host "❌ Student Login: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    $studentToken = $null
}

# Test 13: HOD Login
Write-Host "`n13. Testing HOD Authentication..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "hod_cse"
        password = "hod123"
    } | ConvertTo-Json -Depth 3
    
    $hodAuth = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ HOD Login: PASS" -ForegroundColor Green
    Write-Host "   User Role: $($hodAuth.user.role)" -ForegroundColor Cyan
    Write-Host "   User ID: $($hodAuth.user.id)" -ForegroundColor Cyan
    
    $hodToken = $hodAuth.access_token
} catch {
    Write-Host "❌ HOD Login: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    $hodToken = $null
}

Write-Host "`n=== Endpoint Testing Complete ===" -ForegroundColor Green
Write-Host "Backend is running and responding to requests!" -ForegroundColor Green
