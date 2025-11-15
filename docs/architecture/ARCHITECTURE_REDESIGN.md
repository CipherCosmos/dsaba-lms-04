# **DSABA LMS - SYSTEM ARCHITECTURE REDESIGN**
## **From Monolithic to Clean Architecture**

**Version:** 2.0  
**Date:** November 14, 2025  
**Status:** Design Phase  

---

## **TABLE OF CONTENTS**

1. [Architecture Overview](#architecture-overview)
2. [Design Principles](#design-principles)
3. [System Layers](#system-layers)
4. [Module Structure](#module-structure)
5. [Database Architecture](#database-architecture)
6. [API Design](#api-design)
7. [Security Architecture](#security-architecture)
8. [Scalability Design](#scalability-design)
9. [Deployment Architecture](#deployment-architecture)

---

## **ARCHITECTURE OVERVIEW**

### **Current State (Monolithic)**
```
backend/
  main.py (1918 lines - GOD OBJECT)
  models.py (all models)
  schemas.py (all schemas)
  crud.py (all operations)
  analytics.py
  auth.py
  
frontend/
  src/
    pages/ (50+ files)
    components/
    store/
```

**Problems:**
- Single main.py with 100+ endpoints
- No separation of concerns
- Tight coupling
- Hard to test
- Difficult to scale
- No clear boundaries

---

### **New Architecture (Clean + Modular)**

```
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Nginx)                     │
│                    Load Balancer + Routing                   │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   FastAPI Backend (8000)  │      │   Static CDN (Frontend)  │
│   ├─ API Layer           │      │   ├─ React Build         │
│   ├─ Service Layer       │      │   ├─ Nginx Server        │
│   ├─ Domain Layer        │      │   └─ Service Worker      │
│   ├─ Data Access Layer   │      └──────────────────────────┘
│   └─ Infrastructure      │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│         Shared Infrastructure               │
│  ┌─────────┬──────────┬──────────┬────────┐│
│  │PostgreSQL│  Redis   │  Celery  │ S3/Minio││
│  │(Primary) │ (Cache)  │(Workers) │ (Files)││
│  └─────────┴──────────┴──────────┴────────┘│
└─────────────────────────────────────────────┘
```

---

## **DESIGN PRINCIPLES**

### **1. Clean Architecture (Uncle Bob)**

**Layers (Outside → Inside):**
```
┌─────────────────────────────────────────────┐
│         🌐 Presentation Layer               │  ← API Routes, Controllers
│              (FastAPI Routers)              │
├─────────────────────────────────────────────┤
│         🎯 Application Layer                │  ← Use Cases, Services
│          (Business Logic)                   │
├─────────────────────────────────────────────┤
│         🏛️ Domain Layer                     │  ← Entities, Value Objects
│        (Core Business Models)               │
├─────────────────────────────────────────────┤
│         💾 Data Access Layer                │  ← Repositories, ORMs
│           (Database)                        │
├─────────────────────────────────────────────┤
│         🔧 Infrastructure Layer             │  ← External Services
│    (Email, Storage, Cache, Queue)          │
└─────────────────────────────────────────────┘
```

**Dependency Rule:** 
- Inner layers NEVER depend on outer layers
- Business logic independent of frameworks
- Easy to test, easy to maintain

---

### **2. Domain-Driven Design (DDD)**

**Bounded Contexts:**
1. **Authentication & Authorization** (IAM)
2. **Academic Structure** (Batches, Years, Semesters)
3. **User Management** (Students, Teachers, HODs, Admins)
4. **Curriculum Management** (Subjects, COs, POs)
5. **Assessment Management** (Exams, Questions, Marks)
6. **Analytics & Reporting** (CO-PO Attainment, Reports)

**Aggregates:**
- `User Aggregate` (User + Roles + Permissions)
- `Exam Aggregate` (Exam + Questions + SubQuestions)
- `Assessment Aggregate` (Marks + FinalMarks + Audit)
- `AcademicStructure Aggregate` (Batch + BatchYear + Semester)

---

### **3. SOLID Principles**

**S - Single Responsibility**
- Each class/module does ONE thing
- `ExamService` only handles exam logic
- `MarkRepository` only handles mark data access

**O - Open/Closed**
- Open for extension, closed for modification
- Use interfaces and dependency injection

**L - Liskov Substitution**
- Abstractions properly implemented
- Repository interfaces interchangeable

**I - Interface Segregation**
- Small, focused interfaces
- `IReadRepository`, `IWriteRepository` separate

**D - Dependency Inversion**
- Depend on abstractions, not concretions
- Service Layer depends on Repository Interface

---

### **4. Repository Pattern**

```python
# Interface (abstract)
class IRepository(ABC):
    @abstractmethod
    async def get_by_id(self, id: int):
        pass
    
    @abstractmethod
    async def create(self, entity):
        pass

# Implementation
class UserRepository(IRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_id(self, id: int):
        return self.db.query(User).filter(User.id == id).first()
```

---

### **5. Service Layer Pattern**

```python
class ExamService:
    def __init__(
        self,
        exam_repo: IExamRepository,
        question_repo: IQuestionRepository,
        auth_service: IAuthService
    ):
        self.exam_repo = exam_repo
        self.question_repo = question_repo
        self.auth_service = auth_service
    
    async def create_exam(self, exam_data, current_user):
        # Business logic here
        self.auth_service.check_permission(current_user, "exam:create")
        # ...
```

---

## **NEW FOLDER STRUCTURE**

### **Backend (Clean Architecture)**

```
backend/
├── src/
│   ├── __init__.py
│   │
│   ├── main.py                          # Application entry point (minimal)
│   ├── config.py                        # Configuration management
│   ├── dependencies.py                  # Dependency injection container
│   │
│   ├── api/                             # 🌐 Presentation Layer
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                  # Auth endpoints
│   │   │   ├── users.py                 # User endpoints
│   │   │   ├── departments.py
│   │   │   ├── academic_structure.py    # Batches/Years/Semesters
│   │   │   ├── subjects.py
│   │   │   ├── exams.py
│   │   │   ├── questions.py
│   │   │   ├── marks.py
│   │   │   ├── analytics.py
│   │   │   ├── reports.py
│   │   │   └── copo.py
│   │   ├── middleware/
│   │   │   ├── authentication.py
│   │   │   ├── authorization.py
│   │   │   ├── error_handler.py
│   │   │   ├── rate_limiter.py
│   │   │   └── logging.py
│   │   └── dependencies.py              # API-level dependencies
│   │
│   ├── application/                     # 🎯 Application Layer
│   │   ├── __init__.py
│   │   ├── services/                    # Business logic services
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── exam_service.py
│   │   │   ├── marks_service.py
│   │   │   ├── grading_service.py
│   │   │   ├── copo_service.py
│   │   │   ├── analytics_service.py
│   │   │   └── report_service.py
│   │   ├── use_cases/                   # Use case implementations
│   │   │   ├── __init__.py
│   │   │   ├── create_exam_use_case.py
│   │   │   ├── submit_marks_use_case.py
│   │   │   ├── calculate_grades_use_case.py
│   │   │   └── generate_report_use_case.py
│   │   └── dto/                         # Data Transfer Objects
│   │       ├── __init__.py
│   │       ├── auth_dto.py
│   │       ├── exam_dto.py
│   │       ├── marks_dto.py
│   │       └── analytics_dto.py
│   │
│   ├── domain/                          # 🏛️ Domain Layer (Core)
│   │   ├── __init__.py
│   │   ├── entities/                    # Domain entities
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── department.py
│   │   │   ├── academic_structure.py    # Batch, BatchYear, Semester
│   │   │   ├── subject.py
│   │   │   ├── exam.py
│   │   │   ├── question.py
│   │   │   ├── mark.py
│   │   │   └── copo.py
│   │   ├── value_objects/               # Immutable value objects
│   │   │   ├── __init__.py
│   │   │   ├── email.py
│   │   │   ├── password.py
│   │   │   ├── grade.py
│   │   │   ├── marks.py
│   │   │   └── academic_year.py
│   │   ├── enums/                       # Domain enumerations
│   │   │   ├── __init__.py
│   │   │   ├── user_role.py
│   │   │   ├── exam_type.py
│   │   │   ├── question_section.py
│   │   │   └── attainment_level.py
│   │   ├── aggregates/                  # Domain aggregates
│   │   │   ├── __init__.py
│   │   │   ├── user_aggregate.py
│   │   │   ├── exam_aggregate.py
│   │   │   └── assessment_aggregate.py
│   │   ├── repositories/                # Repository interfaces
│   │   │   ├── __init__.py
│   │   │   ├── base_repository.py
│   │   │   ├── user_repository.py
│   │   │   ├── exam_repository.py
│   │   │   ├── marks_repository.py
│   │   │   └── analytics_repository.py
│   │   └── exceptions/                  # Domain exceptions
│   │       ├── __init__.py
│   │       ├── base.py
│   │       ├── auth_exceptions.py
│   │       ├── validation_exceptions.py
│   │       └── business_exceptions.py
│   │
│   ├── infrastructure/                  # 🔧 Infrastructure Layer
│   │   ├── __init__.py
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── session.py               # Database session management
│   │   │   ├── base.py                  # SQLAlchemy base
│   │   │   ├── models.py                # SQLAlchemy models (separate from domain)
│   │   │   ├── migrations/              # Alembic migrations
│   │   │   └── repositories/            # Repository implementations
│   │   │       ├── __init__.py
│   │   │       ├── user_repository_impl.py
│   │   │       ├── exam_repository_impl.py
│   │   │       └── marks_repository_impl.py
│   │   ├── cache/
│   │   │   ├── __init__.py
│   │   │   ├── redis_client.py
│   │   │   └── cache_service.py
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   ├── s3_storage.py
│   │   │   └── local_storage.py
│   │   ├── email/
│   │   │   ├── __init__.py
│   │   │   └── email_service.py
│   │   ├── queue/
│   │   │   ├── __init__.py
│   │   │   ├── celery_config.py
│   │   │   └── tasks.py
│   │   ├── security/
│   │   │   ├── __init__.py
│   │   │   ├── jwt_handler.py
│   │   │   ├── password_hasher.py
│   │   │   └── permission_checker.py
│   │   └── external/
│   │       ├── __init__.py
│   │       └── notification_service.py
│   │
│   ├── shared/                          # Shared utilities
│   │   ├── __init__.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── date_utils.py
│   │   │   ├── string_utils.py
│   │   │   └── validation_utils.py
│   │   ├── constants.py
│   │   └── types.py
│   │
│   └── tests/                           # Tests mirroring structure
│       ├── unit/
│       │   ├── domain/
│       │   ├── application/
│       │   └── infrastructure/
│       ├── integration/
│       │   ├── api/
│       │   └── database/
│       └── e2e/
│
├── alembic/                             # Database migrations
│   ├── versions/
│   └── env.py
│
├── scripts/                             # Utility scripts
│   ├── seed_database.py
│   ├── migrate_data.py
│   └── setup.py
│
├── requirements/                        # Split requirements
│   ├── base.txt
│   ├── dev.txt
│   ├── test.txt
│   └── prod.txt
│
├── .env.example
├── .env.local
├── pyproject.toml
├── pytest.ini
├── docker-compose.yml
└── Dockerfile
```

---

### **Frontend (Feature-Based)**

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── features/                        # Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── PasswordStrength.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useLogin.ts
│   │   │   ├── services/
│   │   │   │   └── auth-api.ts
│   │   │   ├── store/
│   │   │   │   └── authSlice.ts
│   │   │   ├── types/
│   │   │   │   └── auth.types.ts
│   │   │   └── utils/
│   │   │       └── token-storage.ts
│   │   │
│   │   ├── academic-structure/
│   │   │   ├── components/
│   │   │   │   ├── BatchManager.tsx
│   │   │   │   ├── BatchYearManager.tsx
│   │   │   │   └── SemesterManager.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── types/
│   │   │
│   │   ├── users/
│   │   │   ├── components/
│   │   │   │   ├── UserList.tsx
│   │   │   │   ├── UserForm.tsx
│   │   │   │   └── UserDetails.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useUsers.ts
│   │   │   ├── services/
│   │   │   │   └── user-api.ts
│   │   │   ├── store/
│   │   │   │   └── userSlice.ts
│   │   │   └── types/
│   │   │       └── user.types.ts
│   │   │
│   │   ├── exams/
│   │   │   ├── components/
│   │   │   │   ├── ExamList.tsx
│   │   │   │   ├── ExamCreationWizard.tsx
│   │   │   │   ├── QuestionBuilder.tsx
│   │   │   │   └── ExamConfiguration.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── types/
│   │   │
│   │   ├── marks/
│   │   │   ├── components/
│   │   │   │   ├── MarksEntryGrid.tsx
│   │   │   │   ├── BulkUpload.tsx
│   │   │   │   └── MarksSummary.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── types/
│   │   │
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── COPODashboard.tsx
│   │   │   │   ├── AttainmentCharts.tsx
│   │   │   │   └── PerformanceMetrics.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── types/
│   │   │
│   │   └── reports/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── store/
│   │       └── types/
│   │
│   ├── shared/                          # Shared across features
│   │   ├── components/
│   │   │   ├── ui/                      # Reusable UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── PageContainer.tsx
│   │   │   └── common/
│   │   │       ├── ErrorBoundary.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── Breadcrumbs.tsx
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── usePagination.ts
│   │   ├── utils/
│   │   │   ├── api-client.ts
│   │   │   ├── date-formatter.ts
│   │   │   ├── validators.ts
│   │   │   └── permissions.ts
│   │   ├── constants/
│   │   │   ├── routes.ts
│   │   │   ├── api-endpoints.ts
│   │   │   └── app-constants.ts
│   │   └── types/
│   │       ├── common.types.ts
│   │       └── api.types.ts
│   │
│   ├── core/                            # Core functionality
│   │   ├── api/
│   │   │   ├── axios-instance.ts
│   │   │   ├── interceptors.ts
│   │   │   └── error-handler.ts
│   │   ├── store/
│   │   │   ├── index.ts
│   │   │   └── root-reducer.ts
│   │   ├── router/
│   │   │   ├── index.tsx
│   │   │   ├── routes.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── config/
│   │       ├── environment.ts
│   │       └── app-config.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   ├── variables.css
│   │   └── themes/
│   │       ├── light.css
│   │       └── dark.css
│   │
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .env.local
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

---

## **DATABASE ARCHITECTURE**

### **Schema Organization (Modular)**

```sql
-- ============================================
-- MODULE: Identity & Access Management (IAM)
-- ============================================

CREATE SCHEMA iam;

CREATE TABLE iam.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE iam.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- admin, hod, teacher, student
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE iam.user_roles (
    user_id INT REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id INT REFERENCES iam.roles(id) ON DELETE CASCADE,
    department_id INT NULL,  -- Scope
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by INT REFERENCES iam.users(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE iam.permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(50) NOT NULL,  -- exam, marks, report
    action VARCHAR(50) NOT NULL,     -- create, read, update, delete
    description TEXT,
    UNIQUE (resource, action)
);

CREATE TABLE iam.role_permissions (
    role_id INT REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- MODULE: Academic Structure
-- ============================================

CREATE SCHEMA academic;

CREATE TABLE academic.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    hod_id INT REFERENCES iam.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE academic.batches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,  -- B.Tech, MBA
    duration_years INT NOT NULL CHECK (duration_years BETWEEN 2 AND 5),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE academic.batch_years (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES academic.batches(id) ON DELETE CASCADE,
    start_year INT NOT NULL,
    end_year INT NOT NULL CHECK (end_year > start_year),
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (batch_id, start_year)
);

CREATE TABLE academic.semesters (
    id SERIAL PRIMARY KEY,
    batch_year_id INT REFERENCES academic.batch_years(id) ON DELETE CASCADE,
    semester_no INT NOT NULL CHECK (semester_no BETWEEN 1 AND 12),
    is_current BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE CHECK (end_date > start_date),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (batch_year_id, semester_no)
);

CREATE TABLE academic.classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    department_id INT REFERENCES academic.departments(id),
    semester_id INT REFERENCES academic.semesters(id),
    section VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULE: User Profiles
-- ============================================

CREATE SCHEMA profiles;

CREATE TABLE profiles.students (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES iam.users(id) ON DELETE CASCADE,
    roll_no VARCHAR(20) UNIQUE NOT NULL,
    department_id INT REFERENCES academic.departments(id),
    batch_year_id INT REFERENCES academic.batch_years(id),
    current_semester_id INT REFERENCES academic.semesters(id),
    class_id INT REFERENCES academic.classes(id),
    admission_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profiles.teachers (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES iam.users(id) ON DELETE CASCADE,
    department_id INT REFERENCES academic.departments(id),
    employee_id VARCHAR(20) UNIQUE,
    specialization TEXT,
    join_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULE: Curriculum
-- ============================================

CREATE SCHEMA curriculum;

CREATE TABLE curriculum.subjects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id INT REFERENCES academic.departments(id),
    credits DECIMAL(3,1) NOT NULL,
    max_internal DECIMAL(5,2) DEFAULT 40,
    max_external DECIMAL(5,2) DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE curriculum.subject_assignments (
    id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES curriculum.subjects(id),
    teacher_id INT REFERENCES profiles.teachers(id),
    class_id INT REFERENCES academic.classes(id),
    semester_id INT REFERENCES academic.semesters(id),
    academic_year INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (subject_id, class_id, semester_id, academic_year)
);

CREATE TABLE curriculum.program_outcomes (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES academic.departments(id),
    code VARCHAR(10) NOT NULL,  -- PO1, PO2, PSO1
    type VARCHAR(10) NOT NULL CHECK (type IN ('PO', 'PSO')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_attainment DECIMAL(5,2) DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (department_id, code)
);

CREATE TABLE curriculum.course_outcomes (
    id SERIAL PRIMARY KEY,
    subject_id INT REFERENCES curriculum.subjects(id),
    code VARCHAR(10) NOT NULL,  -- CO1, CO2
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (subject_id, code)
);

CREATE TABLE curriculum.co_po_mapping (
    id SERIAL PRIMARY KEY,
    co_id INT REFERENCES curriculum.course_outcomes(id) ON DELETE CASCADE,
    po_id INT REFERENCES curriculum.program_outcomes(id) ON DELETE CASCADE,
    strength INT NOT NULL CHECK (strength BETWEEN 1 AND 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (co_id, po_id)
);

-- ============================================
-- MODULE: Assessment
-- ============================================

CREATE SCHEMA assessment;

CREATE TABLE assessment.exams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject_assignment_id INT REFERENCES curriculum.subject_assignments(id),
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('internal1', 'internal2', 'external')),
    exam_date DATE NOT NULL,
    duration_minutes INT,
    total_marks DECIMAL(5,2) NOT NULL,
    instructions TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'locked', 'published')),
    question_paper_url VARCHAR(500),
    created_by INT REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (subject_assignment_id, exam_type)
);

CREATE TABLE assessment.questions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES assessment.exams(id) ON DELETE CASCADE,
    question_no VARCHAR(10) NOT NULL,
    question_text TEXT NOT NULL,
    section CHAR(1) NOT NULL CHECK (section IN ('A','B','C')),
    marks_per_question DECIMAL(5,2) NOT NULL,
    required_count INT DEFAULT 1,
    optional_count INT DEFAULT 0,
    blooms_level VARCHAR(10) CHECK (blooms_level ~ '^L[1-6]$'),
    difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assessment.sub_questions (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES assessment.questions(id) ON DELETE CASCADE,
    sub_no VARCHAR(10) NOT NULL,  -- 1a, 1b
    sub_text TEXT,
    marks DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assessment.question_co_mapping (
    question_id INT REFERENCES assessment.questions(id) ON DELETE CASCADE,
    co_id INT REFERENCES curriculum.course_outcomes(id) ON DELETE CASCADE,
    weight_pct DECIMAL(5,2) NOT NULL DEFAULT 100,
    PRIMARY KEY (question_id, co_id)
);

CREATE TABLE assessment.marks (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES assessment.exams(id) ON DELETE CASCADE,
    student_id INT REFERENCES profiles.students(id) ON DELETE CASCADE,
    question_id INT REFERENCES assessment.questions(id),
    sub_question_id INT REFERENCES assessment.sub_questions(id),
    marks_obtained DECIMAL(5,2) DEFAULT 0 CHECK (marks_obtained >= 0),
    entered_by INT REFERENCES iam.users(id),
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assessment.final_marks (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES profiles.students(id) ON DELETE CASCADE,
    subject_assignment_id INT REFERENCES curriculum.subject_assignments(id),
    semester_id INT REFERENCES academic.semesters(id),
    internal_1 DECIMAL(5,2) DEFAULT 0,
    internal_2 DECIMAL(5,2) DEFAULT 0,
    best_internal DECIMAL(5,2) DEFAULT 0,
    external DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(5,2) DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    grade CHAR(2) DEFAULT 'F',
    sgpa DECIMAL(3,2),
    cgpa DECIMAL(3,2),
    co_attainment JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    editable_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (student_id, subject_assignment_id, semester_id)
);

-- ============================================
-- MODULE: Audit & Compliance
-- ============================================

CREATE SCHEMA audit;

CREATE TABLE audit.mark_changes (
    id SERIAL PRIMARY KEY,
    mark_id INT REFERENCES assessment.marks(id),
    changed_by INT REFERENCES iam.users(id),
    field_changed VARCHAR(50) NOT NULL,
    old_value DECIMAL(5,2),
    new_value DECIMAL(5,2),
    reason TEXT,
    change_type VARCHAR(20) CHECK (change_type IN ('edit', 'override', 'recalculation')),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit.system_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES iam.users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id INT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MODULE: Reports & Analytics
-- ============================================

CREATE SCHEMA reporting;

CREATE TABLE reporting.report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    template_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reporting.generated_reports (
    id SERIAL PRIMARY KEY,
    template_id INT REFERENCES reporting.report_templates(id),
    generated_by INT REFERENCES iam.users(id),
    file_path VARCHAR(500),
    parameters JSONB,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- IAM indexes
CREATE INDEX idx_users_email ON iam.users(email);
CREATE INDEX idx_users_username ON iam.users(username);
CREATE INDEX idx_user_roles_user ON iam.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON iam.user_roles(role_id);

-- Academic indexes
CREATE INDEX idx_batch_years_current ON academic.batch_years(is_current);
CREATE INDEX idx_semesters_current ON academic.semesters(is_current);
CREATE INDEX idx_classes_department ON academic.classes(department_id);

-- Profile indexes
CREATE INDEX idx_students_dept ON profiles.students(department_id);
CREATE INDEX idx_students_batch_year ON profiles.students(batch_year_id);
CREATE INDEX idx_teachers_dept ON profiles.teachers(department_id);

-- Assessment indexes
CREATE INDEX idx_marks_exam_student ON assessment.marks(exam_id, student_id);
CREATE INDEX idx_marks_student_exam ON assessment.marks(student_id, exam_id);
CREATE INDEX idx_questions_exam ON assessment.questions(exam_id);
CREATE INDEX idx_final_marks_student ON assessment.final_marks(student_id);
CREATE INDEX idx_final_marks_semester ON assessment.final_marks(semester_id);

-- Audit indexes
CREATE INDEX idx_audit_timestamp ON audit.mark_changes(changed_at);
CREATE INDEX idx_system_logs_user ON audit.system_logs(user_id);
CREATE INDEX idx_system_logs_created ON audit.system_logs(created_at);
```

---

## **API DESIGN (RESTful + Clean)**

### **API Versioning**
```
/api/v1/auth/login
/api/v1/users
/api/v1/academic/batches
/api/v1/assessment/exams
```

### **Resource Naming Conventions**
```
✅ GOOD:
/api/v1/departments              # Plural nouns
/api/v1/departments/5            # Resource ID
/api/v1/departments/5/subjects   # Sub-resources

❌ BAD:
/api/v1/getDepartments          # Verbs in URL
/api/v1/department              # Singular
/api/v1/dept                    # Abbreviations
```

### **HTTP Methods (RESTful)**
```
GET    /api/v1/exams           # List all
GET    /api/v1/exams/5         # Get one
POST   /api/v1/exams           # Create
PUT    /api/v1/exams/5         # Full update
PATCH  /api/v1/exams/5         # Partial update
DELETE /api/v1/exams/5         # Delete
```

### **Response Format (Consistent)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Internal Exam 1"
  },
  "meta": {
    "timestamp": "2025-11-14T12:00:00Z",
    "version": "1.0"
  }
}

// Error format
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-14T12:00:00Z",
    "request_id": "abc-123"
  }
}
```

---

## **SECURITY ARCHITECTURE**

### **Authentication Flow**
```
┌──────────┐                ┌──────────┐                ┌─────────┐
│  Client  │                │   API    │                │  Redis  │
└────┬─────┘                └────┬─────┘                └────┬────┘
     │                           │                           │
     │ 1. POST /auth/login       │                           │
     ├──────────────────────────>│                           │
     │    {username, password}   │                           │
     │                           │                           │
     │                           │ 2. Verify credentials     │
     │                           │    (bcrypt hash)          │
     │                           │                           │
     │                           │ 3. Generate JWT           │
     │                           │    + Refresh Token        │
     │                           │                           │
     │                           │ 4. Store refresh token    │
     │                           ├──────────────────────────>│
     │                           │                           │
     │ 5. Return tokens          │                           │
     │<──────────────────────────┤                           │
     │ {access_token,            │                           │
     │  refresh_token}           │                           │
     │                           │                           │
     │ 6. API request            │                           │
     ├──────────────────────────>│                           │
     │ Authorization: Bearer JWT │                           │
     │                           │                           │
     │                           │ 7. Validate JWT           │
     │                           │                           │
     │                           │ 8. Check blacklist        │
     │                           ├──────────────────────────>│
     │                           │<──────────────────────────┤
     │                           │                           │
     │ 9. Return data            │                           │
     │<──────────────────────────┤                           │
```

### **Authorization (RBAC + ABAC)**
```python
@requires_permission("exam:create")
@requires_department_scope
async def create_exam(
    exam_data: ExamCreateDTO,
    current_user: User = Depends(get_current_user)
):
    # Permission checked before entry
    # Department scope validated
    pass
```

---

## **DEPLOYMENT ARCHITECTURE**

### **Production Setup (Kubernetes)**
```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (AWS ALB)               │
│                  HTTPS Termination + SSL                 │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
┌─────────────────┐    ┌─────────────────┐
│  API Gateway    │    │   Frontend Pod  │
│   (Nginx)       │    │   (React Build)  │
│  Port: 80       │    │   Port: 80      │
└────────┬────────┘    └─────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│FastAPI 1│ │FastAPI 2│ │FastAPI 3│  ← Horizontal scaling
│ Pod     │ │ Pod     │ │ Pod     │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┴───────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    ┌─────────┐      ┌──────────┐
    │PostgreSQL│      │  Redis   │
    │(RDS/Managed)    │  Cluster │
    │  Master  │      └──────────┘
    │    +     │
    │ 2 Replicas│
    └──────────┘
         │
         ▼
    ┌──────────┐
    │  Celery  │
    │ Workers  │
    │  (3-5)   │
    └──────────┘
```

---

**NEXT STEPS:**
1. Review this architecture
2. I'll refactor the entire codebase according to this design
3. Create all new files with proper structure
4. Migrate existing code to new architecture
5. Setup proper testing

Ready to proceed with the implementation?

