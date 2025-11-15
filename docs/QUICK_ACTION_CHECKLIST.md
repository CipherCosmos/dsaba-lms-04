# **QUICK ACTION CHECKLIST**
## **DSABA LMS - Critical Issues to Fix ASAP**

---

## **🔴 SECURITY ISSUES (FIX IMMEDIATELY)**

### **Priority 1: Authentication & Authorization**
- [ ] **Move JWT secret to environment variable** (`backend/auth.py:11`)
  - Current: `SECRET_KEY = "your-secret-key-change-this-in-production"`
  - Fix: Use `os.getenv("JWT_SECRET_KEY")`
  - File: `backend/auth.py`

- [ ] **Strengthen password validation** (`backend/schemas.py:31-35`)
  - Current: Only 6 characters minimum
  - Required: 12+ chars, uppercase, lowercase, number, special char
  - File: `backend/schemas.py`

- [ ] **Add security headers middleware** (`backend/main.py`)
  - Add: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS
  - File: Create new middleware in `backend/main.py`

- [ ] **Implement rate limiting** (`backend/main.py`)
  - Install: `slowapi`
  - Add: 5 login attempts/minute, 100 requests/minute for API
  - File: `backend/main.py`

- [ ] **Add CORS origin whitelist validation** (`backend/main.py:55-61`)
  - Current: Allows localhost only (good for dev)
  - Action: Add production domain before deployment
  - File: `backend/main.py`

### **Priority 2: Input Validation**
- [ ] **Add input sanitization for XSS prevention**
  - Files to sanitize: Question text, user names, comments
  - Library: Use `html.escape()` or `bleach`
  - Location: Add to validation layer

- [ ] **Validate file uploads** (`backend/main.py:966-1001`)
  - Check file size limits
  - Verify file types (Excel/CSV only)
  - Scan for malicious content
  - File: `backend/main.py`

### **Priority 3: Session Management**
- [ ] **Add JWT token blacklist** (for logout)
  - Use Redis to store revoked tokens
  - Check on each request
  - File: `backend/auth.py`

- [ ] **Implement refresh token rotation**
  - Current: Only access token
  - Add: Refresh token with longer expiry
  - File: `backend/auth.py`

---

## **🟠 DATABASE ISSUES (FIX WEEK 1-2)**

### **Schema Gaps**
- [ ] **Add Batch Management Tables**
  - Create: `batches`, `batch_years`, `semesters`
  - Migration: `backend/alembic/versions/003_add_batch_management.py`
  - Models: Update `backend/models.py`

- [ ] **Add Students & Teachers Tables**
  - Separate from generic `users` table
  - Add: `roll_no`, `batch_year_id` for students
  - Models: Update `backend/models.py`

- [ ] **Add Subject Assignments Table**
  - Replace direct `teacher_id` in subjects
  - Support: One subject, multiple teachers, multiple semesters
  - Models: Update `backend/models.py`

- [ ] **Add Sub-Questions Table**
  - Already in schema doc, not in code
  - Support: Q1 → Q1a, Q1b hierarchy
  - Models: Update `backend/models.py`

- [ ] **Add Final Marks Table**
  - Aggregated marks storage
  - Fields: I1, I2, best_internal, external, total, grade, SGPA, CGPA
  - Models: Update `backend/models.py`

- [ ] **Add Audit Log Table**
  - Track all mark changes
  - Fields: who, what, when, old_value, new_value, reason
  - Models: Update `backend/models.py`

- [ ] **Add Bulk Uploads Tracking Table**
  - Track CSV/Excel uploads
  - Store: success_count, error_count, error_log
  - Models: Update `backend/models.py`

- [ ] **Add Department Settings Table**
  - Store: internal_method (best/avg/weighted), grading_scale
  - Models: Update `backend/models.py`

### **Database Performance**
- [ ] **Add missing indexes** (See detailed list in main report)
  - Critical: `marks(student_id, exam_id)`, `marks(exam_id, question_id)`
  - File: Create migration `backend/alembic/versions/004_add_indexes.py`

- [ ] **Configure connection pooling** (`backend/database.py:30-35`)
  - Set: `pool_size=20`, `max_overflow=40`, `pool_pre_ping=True`
  - File: `backend/database.py`

- [ ] **Add database health check** (`backend/main.py:98-99`)
  - Check: DB connection on startup
  - Endpoint: `/health` should test DB
  - File: `backend/main.py`

### **Data Integrity**
- [ ] **Add foreign key constraints**
  - Ensure: `ondelete="CASCADE"` where appropriate
  - File: `backend/models.py` (all FK definitions)

- [ ] **Add check constraints for marks validation**
  - Ensure: `marks_obtained <= max_marks`
  - Ensure: `marks_obtained >= 0`
  - File: Add to migration

- [ ] **Remove database files from repository**
  - Delete: `backend/*.db` files
  - Add: `*.db` to `.gitignore`
  - Clean git history: `git filter-branch` or BFG Repo-Cleaner

---

## **🟡 MISSING CORE FEATURES (WEEK 2-4)**

### **Smart Marks Calculation (FR-13)**
- [ ] **Implement optional question capping logic**
  - Function: `calculate_smart_marks(student_id, exam_id, db)`
  - Logic: Sort answers by marks, take top N, cap at section max
  - File: `backend/crud.py`

- [ ] **Add sub-question total validation**
  - Ensure: Sum of sub-questions <= parent question marks
  - File: `backend/crud.py`

- [ ] **Trigger calculation on marks save**
  - Auto-run after bulk upload
  - Auto-run after manual entry
  - File: `backend/main.py` (marks endpoints)

### **Grading System (FR-16)**
- [ ] **Implement SGPA calculation**
  - Formula: Σ(grade_point × credits) / Σ(credits)
  - Trigger: On semester completion
  - File: Create `backend/grading.py`

- [ ] **Implement CGPA calculation**
  - Formula: Rolling average across semesters
  - Storage: `final_marks.cgpa`
  - File: `backend/grading.py`

- [ ] **Add grade assignment logic**
  - Based on: `dept_settings.grading_scale`
  - Grades: A+, A, B+, B, C, F
  - File: `backend/grading.py`

### **Best Internal Calculation (FR-15)**
- [ ] **Implement best_internal auto-calculation**
  - Methods: best, avg, weighted (from dept_settings)
  - Trigger: When I2 is published
  - File: Create `backend/grading.py`

### **7-Day Edit Window (FR-14)**
- [ ] **Add `editable_until` field to Exam model**
  - Set: `exam_date + 7 days`
  - Check: On every mark update
  - File: `backend/models.py`

- [ ] **Implement override for Principal/HOD**
  - Require: Override reason
  - Log: To audit table
  - File: `backend/main.py` (marks endpoints)

### **Bulk Operations**
- [ ] **Implement bulk question upload** (FR-09)
  - Support: CSV, Excel, Word
  - Parser: Pandas for CSV/Excel
  - File: Create `backend/bulk_operations.py`

- [ ] **Complete bulk marks upload** (FR-12)
  - Validation: Student IDs exist, marks <= max
  - Error reporting: Row-by-row errors
  - File: `backend/crud.py` (complete existing stub)

### **Report Generation**
- [ ] **Implement PDF question paper generation** (FR-10)
  - Library: WeasyPrint
  - Template: Jinja2
  - File: `backend/report_generator.py`

- [ ] **Implement student report card PDF**
  - Include: Marks, grades, SGPA, CGPA, CO-PO
  - File: `backend/report_generator.py`

- [ ] **Implement NBA SAR report templates**
  - Format: Excel with multiple sheets
  - File: `backend/report_generator.py`

---

## **🟢 CODE QUALITY (WEEK 5-6)**

### **Refactoring**
- [ ] **Split `main.py` into routers** (1918 lines → modular)
  - Create: `backend/routers/auth.py`, `departments.py`, `users.py`, etc.
  - Import: In `main.py`
  - File: Create `backend/routers/` directory

- [ ] **Extract authorization decorators**
  - Current: Repeated 50+ times
  - Create: `@requires_roles('admin', 'hod')`
  - File: Create `backend/decorators.py`

- [ ] **Extract query helpers**
  - Current: Repeated `joinedload` options
  - Create: Reusable query functions
  - File: `backend/crud.py`

### **Error Handling**
- [ ] **Add try-except to database operations**
  - Catch: IntegrityError, SQLAlchemyError
  - Rollback: On error
  - File: All functions in `backend/crud.py`

- [ ] **Add validation for foreign key existence**
  - Check: Subject exists before creating exam
  - Check: Student exists before creating mark
  - File: All create endpoints in `backend/main.py`

- [ ] **Add global exception handler**
  - Catch: Unhandled exceptions
  - Log: To error tracking service
  - File: `backend/error_handlers.py` (expand existing)

### **Logging**
- [ ] **Replace print statements with logging**
  - Found: Multiple print() calls
  - Use: Python logging module
  - File: All backend files

- [ ] **Implement structured logging**
  - Format: JSON logs
  - Include: user_id, request_id, timestamp
  - File: Create `backend/logging_config.py`

### **Code Cleanup**
- [ ] **Remove commented code**
  - Search: `# TODO`, dead code
  - Action: Delete or uncomment
  - Files: All backend/frontend files

- [ ] **Fix wildcard imports**
  - Current: `from models import *` (multiple files)
  - Fix: Import specific classes
  - Files: `backend/crud.py`, `backend/main.py`, etc.

- [ ] **Add type hints**
  - Missing: Many functions lack return type hints
  - Add: Type annotations for clarity
  - Files: All Python files

---

## **🔵 PERFORMANCE OPTIMIZATIONS (WEEK 5-6)**

### **Backend**
- [ ] **Implement Redis caching**
  - Cache: Analytics results
  - TTL: 1 hour for CO-PO data
  - File: Create `backend/cache.py`

- [ ] **Add pagination to list endpoints**
  - Endpoints: `/exams`, `/users`, `/subjects`
  - Params: `skip`, `limit`
  - File: `backend/main.py`

- [ ] **Optimize N+1 queries**
  - Use: `selectinload`, `joinedload` properly
  - Check: All list queries
  - File: `backend/crud.py`

- [ ] **Setup Celery workers**
  - Tasks: Report generation, analytics calculation
  - Workers: 2-4 workers
  - File: Configure `docker-compose.yml`

### **Frontend**
- [ ] **Implement code splitting**
  - Lazy load: Dashboard components
  - Config: `vite.config.ts`
  - File: `vite.config.ts`

- [ ] **Add React.memo for expensive components**
  - Optimize: Student lists, mark grids
  - File: All large list components

- [ ] **Implement request deduplication**
  - Use: Redux RTK Query or React Query
  - Replace: Current axios calls
  - Files: All slice files in `src/store/slices/`

- [ ] **Add error boundaries**
  - Catch: Component errors
  - Display: Fallback UI
  - File: Create `src/components/ErrorBoundary.tsx`

---

## **🟣 TESTING (WEEK 7-8)**

### **Backend Tests**
- [ ] **Write unit tests for critical functions**
  - Test: Smart marks calculation
  - Test: Grade calculation
  - Test: Authorization logic
  - File: Create `backend/tests/` directory

- [ ] **Write integration tests**
  - Test: Complete exam workflow
  - Test: Marks entry workflow
  - File: `backend/tests/test_integration.py` (expand existing)

- [ ] **Setup pytest configuration**
  - Config: Test database
  - Fixtures: Sample data
  - File: `backend/pytest.ini`

- [ ] **Run load tests**
  - Tool: Locust
  - Target: 1000 concurrent users
  - File: Create `backend/locustfile.py`

### **Frontend Tests**
- [ ] **Write component tests**
  - Tool: Jest + React Testing Library
  - Test: Login, MarksEntry, ExamConfig
  - File: Create `*.test.tsx` files

- [ ] **Write E2E tests**
  - Tool: Cypress or Playwright
  - Test: Teacher workflow, Student workflow
  - File: Create `cypress/e2e/` directory

- [ ] **Add test coverage reporting**
  - Target: 80% coverage
  - Tool: Jest coverage
  - File: Update `package.json`

---

## **🟤 DEVOPS & DEPLOYMENT (WEEK 8-10)**

### **Docker & Containers**
- [ ] **Create production Dockerfile**
  - Multi-stage build
  - Optimize: Image size
  - File: Create `backend/Dockerfile.prod`

- [ ] **Add health checks to docker-compose**
  - Check: DB, Redis, Backend
  - File: `backend/docker-compose.yml`

- [ ] **Configure environment variable validation**
  - Check: Required vars on startup
  - File: `backend/main.py` (startup event)

### **CI/CD**
- [ ] **Setup GitHub Actions**
  - Jobs: Test, Lint, Build, Deploy
  - File: Create `.github/workflows/ci.yml`

- [ ] **Add pre-commit hooks**
  - Run: Linters, formatters
  - Tool: pre-commit
  - File: Create `.pre-commit-config.yaml`

- [ ] **Setup staging environment**
  - Deploy: Auto-deploy on push to develop
  - File: `.github/workflows/deploy-staging.yml`

### **Monitoring**
- [ ] **Setup Sentry error tracking**
  - Integrate: Backend + Frontend
  - File: `backend/main.py`, `src/main.tsx`

- [ ] **Add Prometheus metrics**
  - Metrics: Request count, duration, errors
  - File: Create `backend/metrics.py`

- [ ] **Setup log aggregation**
  - Tool: ELK stack or CloudWatch
  - File: Configure in deployment

- [ ] **Create uptime monitoring**
  - Tool: UptimeRobot or Pingdom
  - Monitor: `/health` endpoint

---

## **📚 DOCUMENTATION (WEEK 9-10)**

- [ ] **Write API documentation**
  - Expand: Swagger auto-docs
  - Add: Usage examples
  - File: Create `docs/API.md`

- [ ] **Create deployment guide**
  - Include: Step-by-step production setup
  - File: Create `docs/DEPLOYMENT.md`

- [ ] **Write architecture documentation**
  - Diagram: System architecture
  - Explain: Data flows
  - File: Create `docs/ARCHITECTURE.md`

- [ ] **Create troubleshooting runbook**
  - Common issues: Solutions
  - File: Create `docs/RUNBOOK.md`

- [ ] **Update README.md**
  - Include: Setup, development, testing instructions
  - File: `README.md`

---

## **DAILY PROGRESS TRACKING**

### **Day 1-2: Security**
- [ ] Move secrets to environment
- [ ] Add security headers
- [ ] Implement rate limiting
- [ ] Strengthen password validation

### **Day 3-4: Database Schema**
- [ ] Create migration for batch/year/semester
- [ ] Create migration for students/teachers
- [ ] Add missing indexes
- [ ] Configure connection pooling

### **Day 5-7: Core Features**
- [ ] Implement smart marks calculation
- [ ] Add 7-day edit window
- [ ] Implement grading system
- [ ] Add sub-question support

### **Week 2: Bulk Operations & Reports**
- [ ] Complete bulk question upload
- [ ] Complete bulk marks upload
- [ ] Implement PDF generation
- [ ] Test end-to-end workflows

### **Week 3: Code Quality**
- [ ] Split main.py into routers
- [ ] Extract authorization decorators
- [ ] Add error handling
- [ ] Implement logging

### **Week 4: Performance**
- [ ] Setup Redis caching
- [ ] Add pagination
- [ ] Optimize queries
- [ ] Setup Celery workers

### **Week 5-6: Testing**
- [ ] Write backend unit tests
- [ ] Write integration tests
- [ ] Write frontend tests
- [ ] Run load tests

### **Week 7-8: DevOps**
- [ ] Setup CI/CD
- [ ] Configure monitoring
- [ ] Deploy staging
- [ ] Load test staging

### **Week 9-10: Final Polish**
- [ ] Fix bugs from testing
- [ ] Complete documentation
- [ ] Production deployment
- [ ] Post-deployment monitoring

---

## **VERIFICATION CHECKLIST (Before Production)**

### **Security Audit**
- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] CSRF protected
- [ ] Rate limiting enabled
- [ ] Security headers present
- [ ] HTTPS enforced

### **Performance Audit**
- [ ] Database indexed properly
- [ ] Connection pooling configured
- [ ] Caching implemented
- [ ] Pagination on large lists
- [ ] N+1 queries eliminated
- [ ] Load tested for 1000+ users
- [ ] Frontend optimized (code splitting, lazy loading)

### **Functionality Audit**
- [ ] All documented features implemented
- [ ] Smart marks calculation working
- [ ] Grading system functional
- [ ] 7-day edit window enforced
- [ ] Bulk uploads working
- [ ] Reports generating correctly
- [ ] CO-PO analytics accurate

### **Data Integrity Audit**
- [ ] Foreign key constraints
- [ ] Check constraints
- [ ] Audit logging enabled
- [ ] Backup strategy implemented
- [ ] Data migration successful
- [ ] No orphaned records

### **Testing Audit**
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load tests passing (1000 users)
- [ ] Security tests passing
- [ ] Regression tests passing

### **DevOps Audit**
- [ ] CI/CD pipeline working
- [ ] Staging environment live
- [ ] Monitoring configured
- [ ] Logging aggregated
- [ ] Error tracking enabled
- [ ] Alerting configured
- [ ] Backup automation working
- [ ] Disaster recovery plan documented

### **Documentation Audit**
- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Architecture documented
- [ ] Runbook complete
- [ ] README updated
- [ ] Code comments adequate

---

## **EMERGENCY HOTFIXES (If Production Now)**

If you need to deploy to production **immediately** (not recommended), fix these first:

1. **CRITICAL (1 day):**
   - [ ] Move JWT secret to environment
   - [ ] Add security headers
   - [ ] Remove .db files from repo
   - [ ] Configure DB connection pooling
   - [ ] Add rate limiting to login endpoint

2. **HIGH (3 days):**
   - [ ] Implement smart marks calculation
   - [ ] Add missing indexes
   - [ ] Setup error logging
   - [ ] Add try-except to CRUD operations
   - [ ] Test with 100 concurrent users

3. **MEDIUM (1 week):**
   - [ ] Implement caching
   - [ ] Setup monitoring
   - [ ] Write critical unit tests
   - [ ] Document deployment process

---

## **RESOURCE ESTIMATES**

### **Team Required:**
- 2 Backend Developers (Python/FastAPI)
- 2 Frontend Developers (React/TypeScript)
- 1 DevOps Engineer
- 1 QA Engineer
- 1 Technical Lead/Architect

### **Timeline:**
- **Minimal Viable Production:** 4 weeks (security + core features)
- **Feature Complete:** 8 weeks (all documented features)
- **Production Ready:** 10 weeks (tested, monitored, documented)

### **Infrastructure Budget (Monthly):**
- **Development:** $100 (lightweight cloud instances)
- **Staging:** $300 (production-like environment)
- **Production (1000 users):** $1,200 (scaled instances, DB replicas)

---

**Last Updated:** November 14, 2025  
**Version:** 1.0  
**Status:** Comprehensive assessment complete, action plan ready for execution

