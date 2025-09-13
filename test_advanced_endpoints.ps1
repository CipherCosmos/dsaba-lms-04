# Advanced Endpoints Testing Script
Write-Host "=== Advanced Endpoints Testing ===" -ForegroundColor Green

# Get admin token first
Write-Host "`nGetting Admin Token..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json -Depth 3
    
    $auth = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $adminToken = $auth.access_token
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    Write-Host "✅ Admin Token Retrieved" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get admin token" -ForegroundColor Red
    exit 1
}

# Test Analytics Endpoints
Write-Host "`n=== Testing Analytics Endpoints ===" -ForegroundColor Cyan

# Test Student Analytics
Write-Host "`n1. Testing Student Analytics..." -ForegroundColor Yellow
try {
    $studentAnalytics = Invoke-RestMethod -Uri "http://localhost:8000/analytics/student/1" -Method GET -Headers $headers
    Write-Host "✅ Student Analytics: PASS" -ForegroundColor Green
    Write-Host "   Analytics data retrieved successfully" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Student Analytics: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Teacher Analytics
Write-Host "`n2. Testing Teacher Analytics..." -ForegroundColor Yellow
try {
    $teacherAnalytics = Invoke-RestMethod -Uri "http://localhost:8000/analytics/teacher/19" -Method GET -Headers $headers
    Write-Host "✅ Teacher Analytics: PASS" -ForegroundColor Green
    Write-Host "   Teacher analytics data retrieved" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Teacher Analytics: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test HOD Analytics
Write-Host "`n3. Testing HOD Analytics..." -ForegroundColor Yellow
try {
    $hodAnalytics = Invoke-RestMethod -Uri "http://localhost:8000/analytics/hod/1" -Method GET -Headers $headers
    Write-Host "✅ HOD Analytics: PASS" -ForegroundColor Green
    Write-Host "   HOD analytics data retrieved" -ForegroundColor Cyan
} catch {
    Write-Host "❌ HOD Analytics: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test CO/PO Framework Endpoints
Write-Host "`n=== Testing CO/PO Framework Endpoints ===" -ForegroundColor Cyan

# Test Subject COs
Write-Host "`n4. Testing Subject COs..." -ForegroundColor Yellow
try {
    $subjectCos = Invoke-RestMethod -Uri "http://localhost:8000/subjects/1/cos" -Method GET -Headers $headers
    Write-Host "✅ Subject COs: PASS" -ForegroundColor Green
    Write-Host "   CO definitions retrieved: $($subjectCos.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Subject COs: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Department POs
Write-Host "`n5. Testing Department POs..." -ForegroundColor Yellow
try {
    $departmentPos = Invoke-RestMethod -Uri "http://localhost:8000/departments/1/pos" -Method GET -Headers $headers
    Write-Host "✅ Department POs: PASS" -ForegroundColor Green
    Write-Host "   PO definitions retrieved: $($departmentPos.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Department POs: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test CO Targets
Write-Host "`n6. Testing CO Targets..." -ForegroundColor Yellow
try {
    $coTargets = Invoke-RestMethod -Uri "http://localhost:8000/subjects/1/co-targets" -Method GET -Headers $headers
    Write-Host "✅ CO Targets: PASS" -ForegroundColor Green
    Write-Host "   CO targets retrieved: $($coTargets.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ CO Targets: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Assessment Weights
Write-Host "`n7. Testing Assessment Weights..." -ForegroundColor Yellow
try {
    $assessmentWeights = Invoke-RestMethod -Uri "http://localhost:8000/subjects/1/assessment-weights" -Method GET -Headers $headers
    Write-Host "✅ Assessment Weights: PASS" -ForegroundColor Green
    Write-Host "   Assessment weights retrieved: $($assessmentWeights.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Assessment Weights: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test CO-PO Matrix
Write-Host "`n8. Testing CO-PO Matrix..." -ForegroundColor Yellow
try {
    $coPoMatrix = Invoke-RestMethod -Uri "http://localhost:8000/subjects/1/co-po-matrix" -Method GET -Headers $headers
    Write-Host "✅ CO-PO Matrix: PASS" -ForegroundColor Green
    Write-Host "   CO-PO matrix retrieved: $($coPoMatrix.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ CO-PO Matrix: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Advanced Analytics
Write-Host "`n=== Testing Advanced Analytics Endpoints ===" -ForegroundColor Cyan

# Test Advanced Student Analytics
Write-Host "`n9. Testing Advanced Student Analytics..." -ForegroundColor Yellow
try {
    $advancedStudentAnalytics = Invoke-RestMethod -Uri "http://localhost:8000/analytics/advanced/student/1" -Method GET -Headers $headers
    Write-Host "✅ Advanced Student Analytics: PASS" -ForegroundColor Green
    Write-Host "   Advanced analytics data retrieved" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Advanced Student Analytics: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Strategic Dashboard
Write-Host "`n10. Testing Strategic Dashboard..." -ForegroundColor Yellow
try {
    $strategicDashboard = Invoke-RestMethod -Uri "http://localhost:8000/analytics/strategic/department/1" -Method GET -Headers $headers
    Write-Host "✅ Strategic Dashboard: PASS" -ForegroundColor Green
    Write-Host "   Strategic dashboard data retrieved" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Strategic Dashboard: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Attainment Analytics
Write-Host "`n11. Testing Subject Attainment Analytics..." -ForegroundColor Yellow
try {
    $attainmentAnalytics = Invoke-RestMethod -Uri "http://localhost:8000/analytics/attainment/subject/1" -Method GET -Headers $headers
    Write-Host "✅ Subject Attainment Analytics: PASS" -ForegroundColor Green
    Write-Host "   Attainment analytics data retrieved" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Subject Attainment Analytics: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Report Generation
Write-Host "`n=== Testing Report Generation ===" -ForegroundColor Cyan

# Test Report Templates
Write-Host "`n12. Testing Report Templates..." -ForegroundColor Yellow
try {
    $reportTemplates = Invoke-RestMethod -Uri "http://localhost:8000/reports/templates" -Method GET -Headers $headers
    Write-Host "✅ Report Templates: PASS" -ForegroundColor Green
    Write-Host "   Report templates retrieved: $($reportTemplates.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Report Templates: FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Advanced Endpoints Testing Complete ===" -ForegroundColor Green
Write-Host "All advanced functionality has been tested!" -ForegroundColor Green
