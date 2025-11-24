# DSABA LMS API Documentation

## Overview

The DSABA LMS (Learning Management System) provides a comprehensive REST API for managing academic data, user authentication, marks management, and analytics. This API follows RESTful principles and uses JSON for request/response payloads.

## Base URL
```
https://your-domain.com/api/v1
```

## Authentication

All API requests require authentication except for public endpoints. The API uses JWT (JSON Web Tokens) for authentication.

### Authentication Headers
```
Authorization: Bearer <access_token>
```

### Token Expiration
- Access tokens expire in 30 minutes
- Refresh tokens expire in 7 days

## Response Format

All responses follow this structure:

```json
{
  "data": <response_data>,
  "message": "Optional success message",
  "errors": null
}
```

Error responses:

```json
{
  "data": null,
  "message": "Error description",
  "errors": {
    "field": "Error details"
  }
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## Authentication Endpoints

### POST /auth/login

Authenticate user and receive access tokens.

**Request Body:**
```json
{
  "username": "teacher01",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "teacher01",
    "email": "teacher01@university.edu",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["TEACHER"],
    "departments": [1],
    "is_active": true
  }
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### GET /auth/me

Get current user information.

**Response (200):**
```json
{
  "id": 1,
  "username": "teacher01",
  "email": "teacher01@university.edu",
  "first_name": "John",
  "last_name": "Doe",
  "roles": ["TEACHER"],
  "departments": [1],
  "is_active": true,
  "last_login": "2025-11-17T10:00:00Z"
}
```

### POST /auth/logout

Logout user and invalidate tokens.

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

---

## User Management Endpoints

### POST /users

Create a new user (Admin only).

**Request Body:**
```json
{
  "username": "student001",
  "email": "student001@university.edu",
  "first_name": "Jane",
  "last_name": "Smith",
  "password": "TempPass123!",
  "roles": ["STUDENT"],
  "department_ids": [1]
}
```

**Response (201):**
```json
{
  "id": 123,
  "username": "student001",
  "email": "student001@university.edu",
  "first_name": "Jane",
  "last_name": "Smith",
  "roles": ["STUDENT"],
  "departments": [1],
  "is_active": true,
  "created_at": "2025-11-17T10:00:00Z"
}
```

### GET /users

List users with pagination and filtering.

**Query Parameters:**
- `skip` (integer, default: 0) - Number of records to skip
- `limit` (integer, default: 100, max: 200) - Number of records to return
- `is_active` (boolean) - Filter by active status
- `email_verified` (boolean) - Filter by email verification

**Response (200):**
```json
{
  "items": [
    {
      "id": 123,
      "username": "student001",
      "email": "student001@university.edu",
      "first_name": "Jane",
      "last_name": "Smith",
      "roles": ["STUDENT"],
      "is_active": true
    }
  ],
  "total": 150,
  "skip": 0,
  "limit": 100
}
```

### GET /users/{user_id}

Get user by ID.

**Response (200):**
```json
{
  "id": 123,
  "username": "student001",
  "email": "student001@university.edu",
  "first_name": "Jane",
  "last_name": "Smith",
  "roles": ["STUDENT"],
  "departments": [1],
  "is_active": true,
  "created_at": "2025-11-17T10:00:00Z",
  "updated_at": "2025-11-17T10:00:00Z"
}
```

### PUT /users/{user_id}

Update user information.

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane.doe@university.edu",
  "is_active": true
}
```

### POST /users/{user_id}/change-password

Change user password (requires old password).

**Request Body:**
```json
{
  "old_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

### POST /users/bulk

Bulk create users (Admin only, max 1000 users).

**Request Body:**
```json
{
  "users": [
    {
      "username": "student001",
      "email": "student001@university.edu",
      "first_name": "John",
      "last_name": "Doe",
      "password": "TempPass123!",
      "roles": ["STUDENT"],
      "department_ids": [1]
    },
    {
      "username": "student002",
      "email": "student002@university.edu",
      "first_name": "Jane",
      "last_name": "Smith",
      "password": "TempPass123!",
      "roles": ["STUDENT"],
      "department_ids": [1]
    }
  ]
}
```

**Response (201):**
```json
{
  "created": 2,
  "failed": 0,
  "errors": [],
  "users": [
    {
      "id": 123,
      "username": "student001",
      "email": "student001@university.edu",
      "first_name": "John",
      "last_name": "Doe",
      "roles": ["STUDENT"]
    }
  ]
}
```

---

## Academic Structure Endpoints

### GET /academic-years

List academic years.

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "2024-2025",
      "start_date": "2024-06-01",
      "end_date": "2025-05-31",
      "is_active": true
    }
  ],
  "total": 1
}
```

### GET /departments

List departments.

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Computer Science",
      "code": "CSE",
      "hod_id": 5,
      "is_active": true
    }
  ],
  "total": 5
}
```

### GET /batch-instances

List batch instances (classes).

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "batch_id": 1,
      "academic_year_id": 1,
      "name": "CSE 2024 A",
      "section": "A",
      "semester": 3,
      "department_id": 1,
      "student_count": 65
    }
  ],
  "total": 12
}
```

---

## Subject Management Endpoints

### GET /subjects

List subjects with filtering.

**Query Parameters:**
- `department_id` (integer) - Filter by department
- `semester` (integer) - Filter by semester
- `academic_year_id` (integer) - Filter by academic year

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Data Structures",
      "code": "CSE201",
      "department_id": 1,
      "semester": 3,
      "credits": 4,
      "course_type": "THEORY",
      "is_active": true
    }
  ],
  "total": 25
}
```

### GET /subject-assignments

List subject assignments (teacher-subject mappings).

**Query Parameters:**
- `teacher_id` (integer) - Filter by teacher
- `batch_instance_id` (integer) - Filter by class
- `subject_id` (integer) - Filter by subject

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "teacher_id": 5,
      "subject_id": 1,
      "batch_instance_id": 1,
      "academic_year_id": 1,
      "is_active": true,
      "assigned_at": "2024-06-01T00:00:00Z"
    }
  ],
  "total": 45
}
```

---

## Marks Management Endpoints

### POST /internal-marks

Create or update internal marks.

**Request Body:**
```json
{
  "student_id": 123,
  "subject_assignment_id": 1,
  "exam_type": "IA1",
  "marks_obtained": 18.5,
  "max_marks": 20,
  "assessment_date": "2024-09-15"
}
```

**Response (201):**
```json
{
  "id": 456,
  "student_id": 123,
  "subject_assignment_id": 1,
  "exam_type": "IA1",
  "marks_obtained": 18.5,
  "max_marks": 20.0,
  "percentage": 92.5,
  "grade": "A",
  "assessment_date": "2024-09-15",
  "status": "ENTERED"
}
```

### GET /internal-marks

List internal marks with filtering.

**Query Parameters:**
- `student_id` (integer) - Filter by student
- `subject_assignment_id` (integer) - Filter by subject assignment
- `exam_type` (string) - IA1, IA2, ASSIGNMENT, etc.
- `batch_instance_id` (integer) - Filter by class

**Response (200):**
```json
{
  "items": [
    {
      "id": 456,
      "student_id": 123,
      "subject_assignment_id": 1,
      "exam_type": "IA1",
      "marks_obtained": 18.5,
      "max_marks": 20.0,
      "percentage": 92.5,
      "grade": "A",
      "assessment_date": "2024-09-15",
      "status": "ENTERED"
    }
  ],
  "total": 120,
  "skip": 0,
  "limit": 100
}
```

### POST /final-marks

Create or update final marks (combines internal and external).

**Request Body:**
```json
{
  "student_id": 123,
  "subject_assignment_id": 1,
  "semester_id": 3,
  "internal_1": 18.5,
  "internal_2": 17.0,
  "external": 55.0,
  "best_internal_method": "best",
  "max_internal": 40,
  "max_external": 60
}
```

**Response (201):**
```json
{
  "id": 789,
  "student_id": 123,
  "subject_assignment_id": 1,
  "semester_id": 3,
  "internal_1": 18.5,
  "internal_2": 17.0,
  "best_internal": 18.5,
  "external": 55.0,
  "total": 73.5,
  "percentage": 73.5,
  "grade": "B+",
  "sgpa": 7.8,
  "cgpa": 7.6,
  "status": "DRAFT",
  "is_published": false
}
```

### PUT /final-marks/{final_mark_id}/publish

Publish final marks (make visible to students).

**Response (200):**
```json
{
  "id": 789,
  "student_id": 123,
  "subject_assignment_id": 1,
  "semester_id": 3,
  "total": 73.5,
  "percentage": 73.5,
  "grade": "B+",
  "is_published": true,
  "published_at": "2024-11-17T10:00:00Z"
}
```

---

## CO-PO Framework Endpoints

### GET /course-outcomes

List course outcomes (COs).

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "subject_id": 1,
      "code": "CO1",
      "description": "Understand basic data structures",
      "bloom_level": "UNDERSTAND",
      "weightage": 20
    }
  ],
  "total": 12
}
```

### GET /program-outcomes

List program outcomes (POs).

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "department_id": 1,
      "code": "PO1",
      "description": "Engineering knowledge",
      "category": "FOUNDATION"
    }
  ],
  "total": 12
}
```

### POST /co-po-mappings

Create CO-PO mapping.

**Request Body:**
```json
{
  "course_outcome_id": 1,
  "program_outcome_id": 1,
  "correlation_level": "MODERATE",
  "justification": "Data structures knowledge supports engineering fundamentals"
}
```

### GET /co-po-attainment

Get CO-PO attainment analysis.

**Query Parameters:**
- `batch_instance_id` (integer) - Filter by class
- `subject_id` (integer) - Filter by subject
- `academic_year_id` (integer) - Filter by academic year

**Response (200):**
```json
{
  "summary": {
    "total_students": 65,
    "average_attainment": 78.5,
    "co_count": 5,
    "po_count": 12
  },
  "co_attainment": [
    {
      "co_id": 1,
      "co_code": "CO1",
      "attainment_percentage": 85.2,
      "threshold_met": true
    }
  ],
  "po_attainment": [
    {
      "po_id": 1,
      "po_code": "PO1",
      "attainment_percentage": 76.8,
      "threshold_met": true
    }
  ]
}
```

---

## Analytics Endpoints

### GET /analytics/dashboard

Get dashboard analytics.

**Query Parameters:**
- `department_id` (integer) - Filter by department
- `academic_year_id` (integer) - Filter by academic year

**Response (200):**
```json
{
  "student_stats": {
    "total_students": 1250,
    "active_students": 1200,
    "dropout_rate": 2.5
  },
  "performance_stats": {
    "average_sgpa": 7.2,
    "pass_percentage": 89.5,
    "distinction_percentage": 25.3
  },
  "subject_stats": {
    "total_subjects": 45,
    "average_pass_rate": 87.2
  }
}
```

### GET /analytics/student-progress

Get student progress analytics.

**Query Parameters:**
- `student_id` (integer) - Specific student
- `batch_instance_id` (integer) - Filter by class

**Response (200):**
```json
{
  "student_id": 123,
  "semesters": [
    {
      "semester": 1,
      "sgpa": 7.8,
      "cgpa": 7.8,
      "subjects_passed": 6,
      "total_subjects": 6
    },
    {
      "semester": 2,
      "sgpa": 7.5,
      "cgpa": 7.65,
      "subjects_passed": 5,
      "total_subjects": 6
    }
  ],
  "trends": {
    "cgpa_trend": "stable",
    "performance_category": "good"
  }
}
```

---

## Reports Endpoints

### GET /reports/marks-sheet

Generate marks sheet report.

**Query Parameters:**
- `batch_instance_id` (integer, required) - Class ID
- `subject_assignment_id` (integer) - Specific subject
- `format` (string) - pdf, excel, csv

**Response (200):**
Returns file download.

### GET /reports/grade-distribution

Get grade distribution report.

**Query Parameters:**
- `batch_instance_id` (integer) - Filter by class
- `subject_id` (integer) - Filter by subject
- `academic_year_id` (integer) - Filter by academic year

**Response (200):**
```json
{
  "distribution": {
    "O": 15,
    "A+": 28,
    "A": 35,
    "B+": 42,
    "B": 30,
    "C": 18,
    "F": 7
  },
  "statistics": {
    "mean": 7.2,
    "median": 7.1,
    "mode": "B+",
    "standard_deviation": 0.8
  }
}
```

### POST /pdf-generation/generate

Generate PDF reports.

**Request Body:**
```json
{
  "report_type": "marks_sheet",
  "batch_instance_id": 1,
  "subject_assignment_id": 5,
  "include_grades": true,
  "include_attendance": false
}
```

**Response (200):**
```json
{
  "pdf_url": "/api/v1/pdf-generation/download/abc123",
  "filename": "marks_sheet_CSE201_2024.pdf",
  "generated_at": "2024-11-17T10:00:00Z"
}
```

---

## Bulk Operations Endpoints

### POST /bulk-uploads/marks

Bulk upload marks from Excel/CSV.

**Request Body (Form Data):**
- `file`: Excel or CSV file
- `subject_assignment_id`: Subject assignment ID
- `exam_type`: IA1, IA2, EXTERNAL, etc.

**Response (200):**
```json
{
  "uploaded": 65,
  "failed": 2,
  "errors": [
    {
      "row": 5,
      "student_id": "ST001",
      "error": "Invalid marks format"
    }
  ]
}
```

### POST /bulk-uploads/users

Bulk upload users from Excel/CSV.

**Request Body (Form Data):**
- `file`: Excel or CSV file
- `role`: STUDENT, TEACHER, etc.
- `department_id`: Department ID

**Response (200):**
```json
{
  "created": 50,
  "failed": 3,
  "errors": [
    {
      "row": 10,
      "username": "user001",
      "error": "Username already exists"
    }
  ]
}
```

---

## System Endpoints

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "app_name": "DSABA LMS",
  "version": "2.0.0",
  "environment": "development",
  "timestamp": "2024-11-17T10:00:00Z"
}
```

### POST /cache/clear

Clear application cache (Admin only).

**Response (200):**
```json
{
  "message": "Cache cleared",
  "timestamp": "2024-11-17T10:00:00Z",
  "cache_bust": 1731837600000
}
```

---

## Error Handling

### Validation Errors (422)

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### Business Logic Errors (400)

```json
{
  "detail": "Cannot publish marks: Final marks calculation incomplete"
}
```

### Not Found Errors (404)

```json
{
  "detail": "User with ID 123 not found"
}
```

### Authentication Errors (401)

```json
{
  "detail": "Invalid or expired token",
  "headers": {
    "WWW-Authenticate": "Bearer"
  }
}
```

---

## Rate Limiting

- General API: 1000 requests per hour per IP
- Authentication endpoints: 10 requests per minute per IP
- File upload endpoints: 50 requests per hour per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1637088000
```

---

## File Upload Specifications

### Supported Formats
- **Images**: JPG, PNG, GIF (max 5MB)
- **Documents**: PDF, DOC, DOCX (max 10MB)
- **Spreadsheets**: XLS, XLSX, CSV (max 5MB)

### Bulk Upload Templates

#### Student Marks Template (CSV):
```csv
student_id,marks_obtained,max_marks,exam_type,assessment_date
ST001,18.5,20,IA1,2024-09-15
ST002,16.0,20,IA1,2024-09-15
```

#### User Upload Template (CSV):
```csv
username,email,first_name,last_name,password,department_id
student001,student001@univ.edu,John,Doe,TempPass123!,1
student002,student002@univ.edu,Jane,Smith,TempPass123!,1
```

---

## Webhooks (Future Feature)

The API supports webhooks for real-time notifications:

### Supported Events
- `marks.published` - When final marks are published
- `user.created` - When a new user is created
- `grade.updated` - When student grades are updated

### Webhook Payload Example
```json
{
  "event": "marks.published",
  "timestamp": "2024-11-17T10:00:00Z",
  "data": {
    "subject_assignment_id": 1,
    "batch_instance_id": 1,
    "published_by": 5,
    "student_count": 65
  }
}
```

---

## SDKs and Libraries

### JavaScript/TypeScript Client
```javascript
import { DSABALMSClient } from '@dsaba/lms-client';

const client = new DSABALMSClient({
  baseURL: 'https://api.your-domain.com/api/v1',
  token: 'your-jwt-token'
});

// Example usage
const marks = await client.marks.listInternalMarks({
  student_id: 123,
  subject_assignment_id: 1
});
```

### Python Client
```python
from dsaba_lms_client import DSABALMSClient

client = DSABALMSClient(
    base_url='https://api.your-domain.com/api/v1',
    token='your-jwt-token'
)

# Example usage
marks = client.marks.list_internal_marks(
    student_id=123,
    subject_assignment_id=1
)
```

---

## Changelog

### Version 1.0.0
- Initial release
- Complete CRUD operations for all entities
- CO-PO framework implementation
- Comprehensive analytics and reporting
- Bulk operations support
- JWT authentication
- Role-based access control

For more details, visit the [GitHub Repository](https://github.com/your-org/dsaba-lms) or contact the development team.