# **FILE-SPECIFIC ISSUES & CODE-LEVEL ANALYSIS**
## **DSABA LMS - Developer Action Guide**

**Purpose:** This document provides **specific line-by-line issues** for developers to fix.  
**Format:** File → Issue → Line Number → Fix Required → Priority

---

## **🔴 CRITICAL PRIORITY FILES**

### **1. `backend/auth.py`**

#### **Issue 1: Hardcoded Secret Key**
- **Line:** 11
- **Current Code:**
  ```python
  SECRET_KEY = "your-secret-key-change-this-in-production"
  ```
- **Problem:** Anyone can forge JWT tokens
- **Severity:** 🔴 **CRITICAL SECURITY VULNERABILITY**
- **Fix:**
  ```python
  import os
  
  SECRET_KEY = os.getenv("JWT_SECRET_KEY")
  if not SECRET_KEY:
      raise RuntimeError("JWT_SECRET_KEY environment variable must be set")
  ```
- **Testing:** 
  ```bash
  # Set in .env
  JWT_SECRET_KEY=generate-random-256-bit-key-here
  
  # Test that app fails to start without it
  unset JWT_SECRET_KEY && python main.py  # Should error
  ```

#### **Issue 2: No Token Blacklist**
- **Lines:** 49-70
- **Problem:** No way to invalidate tokens after logout
- **Severity:** 🟠 **HIGH**
- **Fix:** Add Redis-based blacklist
  ```python
  import redis
  
  redis_client = redis.Redis(host='localhost', port=6379, db=0)
  
  def blacklist_token(token: str, expires_in: int):
      redis_client.setex(f"blacklist:{token}", expires_in, "1")
  
  def is_token_blacklisted(token: str) -> bool:
      return redis_client.exists(f"blacklist:{token}") > 0
  
  # In get_current_user()
  if is_token_blacklisted(credentials.credentials):
      raise HTTPException(401, "Token has been revoked")
  ```

#### **Issue 3: Weak Password Hashing**
- **Line:** 15
- **Current Code:**
  ```python
  pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
  ```
- **Problem:** No explicit rounds/cost factor
- **Severity:** 🟠 **MEDIUM**
- **Fix:**
  ```python
  pwd_context = CryptContext(
      schemes=["bcrypt"],
      deprecated="auto",
      bcrypt__rounds=14  # Increase from default 12
  )
  ```

---

### **2. `backend/database.py`**

#### **Issue 1: No Connection Pooling**
- **Lines:** 30-35
- **Current Code:**
  ```python
  if DATABASE_URL.startswith("sqlite://"):
      engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
  else:
      engine = create_engine(DATABASE_URL)
  ```
- **Problem:** Will run out of connections with 1000+ users
- **Severity:** 🔴 **CRITICAL FOR SCALE**
- **Fix:**
  ```python
  if DATABASE_URL.startswith("sqlite://"):
      # SQLite (dev only)
      engine = create_engine(
          DATABASE_URL, 
          connect_args={"check_same_thread": False}
      )
  else:
      # PostgreSQL (production)
      engine = create_engine(
          DATABASE_URL,
          pool_size=20,              # Min permanent connections
          max_overflow=40,           # Max temporary connections
          pool_timeout=30,           # Wait time before error
          pool_recycle=3600,         # Recycle connections every hour
          pool_pre_ping=True,        # Test connection before use
          echo=False,                # Disable SQL logging in prod
          connect_args={
              "application_name": "dsaba_lms",
              "connect_timeout": 10
          }
      )
  ```

#### **Issue 2: No Connection Health Check**
- **Problem:** No verification that DB is accessible
- **Severity:** 🟠 **MEDIUM**
- **Fix:** Add to `main.py` startup event
  ```python
  @app.on_event("startup")
  async def verify_database_connection():
      try:
          db = SessionLocal()
          db.execute("SELECT 1")
          db.close()
          logger.info("✅ Database connection successful")
      except Exception as e:
          logger.error(f"❌ Database connection failed: {e}")
          raise RuntimeError("Cannot connect to database") from e
  ```

---

### **3. `backend/main.py`**

#### **Issue 1: God Object (Too Large)**
- **Lines:** 1-1918 (entire file)
- **Problem:** 100+ endpoints in one file, hard to maintain
- **Severity:** 🟠 **HIGH TECHNICAL DEBT**
- **Fix:** Split into routers
  ```
  backend/
    routers/
      __init__.py
      auth.py          # Lines 130-161
      departments.py   # Lines 163-207
      classes.py       # Lines 209-250
      subjects.py      # Lines 252-293
      users.py         # Lines 295-404
      exams.py         # Lines 406-512
      questions.py     # Lines 514-533
      marks.py         # Lines 535-656
      analytics.py     # Lines 658-844
      copo.py          # Lines 1004-1685
      reports.py       # Lines 846-945
      students.py      # Lines 1763-1909
  ```
  
  **Example `routers/auth.py`:**
  ```python
  from fastapi import APIRouter, Depends
  from sqlalchemy.orm import Session
  
  router = APIRouter(prefix="/auth", tags=["Authentication"])
  
  @router.post("/login", response_model=TokenResponse)
  def login(credentials: LoginRequest, db: Session = Depends(get_db)):
      # Move login logic here
      pass
  ```
  
  **Update `main.py`:**
  ```python
  from routers import auth, departments, users, exams, marks
  
  app.include_router(auth.router)
  app.include_router(departments.router)
  app.include_router(users.router)
  # ... etc
  ```

#### **Issue 2: No Security Headers**
- **Lines:** 64-73 (middleware section)
- **Problem:** Missing critical security headers
- **Severity:** 🔴 **HIGH SECURITY RISK**
- **Fix:** Add security headers middleware
  ```python
  @app.middleware("http")
  async def add_security_headers(request: Request, call_next):
      response = await call_next(request)
      
      # Prevent MIME type sniffing
      response.headers["X-Content-Type-Options"] = "nosniff"
      
      # Prevent clickjacking
      response.headers["X-Frame-Options"] = "DENY"
      
      # Enable XSS filter
      response.headers["X-XSS-Protection"] = "1; mode=block"
      
      # Force HTTPS
      response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
      
      # Content Security Policy
      response.headers["Content-Security-Policy"] = (
          "default-src 'self'; "
          "script-src 'self' 'unsafe-inline'; "
          "style-src 'self' 'unsafe-inline'; "
          "img-src 'self' data: https:;"
      )
      
      # Referrer policy
      response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
      
      # Permissions policy
      response.headers["Permissions-Policy"] = (
          "geolocation=(), microphone=(), camera=()"
      )
      
      return response
  ```

#### **Issue 3: No Rate Limiting**
- **Problem:** Vulnerable to brute force and DDoS
- **Severity:** 🔴 **CRITICAL**
- **Fix:** Add slowapi
  ```python
  from slowapi import Limiter, _rate_limit_exceeded_handler
  from slowapi.util import get_remote_address
  from slowapi.errors import RateLimitExceeded
  
  limiter = Limiter(key_func=get_remote_address)
  app.state.limiter = limiter
  app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
  
  @app.post("/auth/login")
  @limiter.limit("5/minute")  # Max 5 login attempts per minute
  def login(...):
      pass
  
  @app.get("/exams")
  @limiter.limit("100/minute")  # Max 100 requests per minute
  def get_exams(...):
      pass
  ```

#### **Issue 4: Duplicate Authorization Checks**
- **Lines:** 174-176, 219-221, 262-264, etc. (50+ instances)
- **Current Pattern:**
  ```python
  if current_user.role.value not in ['admin', 'hod']:
      raise HTTPException(status_code=403, detail="Not authorized")
  ```
- **Problem:** Repeated code, hard to maintain
- **Severity:** 🟡 **MEDIUM TECHNICAL DEBT**
- **Fix:** Create decorator
  ```python
  # In backend/decorators.py
  from functools import wraps
  from fastapi import HTTPException
  
  def requires_roles(*allowed_roles):
      def decorator(func):
          @wraps(func)
          async def wrapper(*args, current_user=None, **kwargs):
              if current_user is None:
                  raise HTTPException(401, "Not authenticated")
              
              if current_user.role.value not in allowed_roles:
                  raise HTTPException(403, f"Requires one of: {', '.join(allowed_roles)}")
              
              return await func(*args, current_user=current_user, **kwargs)
          return wrapper
      return decorator
  
  # Usage
  @app.get("/departments")
  @requires_roles('admin', 'hod')
  def get_departments(...):
      pass
  ```

#### **Issue 5: No Request Size Limit**
- **Problem:** Large payloads can exhaust memory
- **Severity:** 🟠 **MEDIUM**
- **Fix:**
  ```python
  @app.middleware("http")
  async def limit_request_size(request: Request, call_next):
      content_length = request.headers.get('content-length')
      if content_length:
          content_length = int(content_length)
          MAX_SIZE = 10 * 1024 * 1024  # 10MB
          if content_length > MAX_SIZE:
              raise HTTPException(413, "Request too large")
      return await call_next(request)
  ```

---

### **4. `backend/models.py`**

#### **Issue 1: Missing Batches Table**
- **Problem:** Cannot track B.Tech, MBA, etc.
- **Severity:** 🔴 **CRITICAL FEATURE GAP**
- **Fix:** Add to models
  ```python
  class Batch(Base):
      __tablename__ = "batches"
      
      id = Column(Integer, primary_key=True, index=True)
      name = Column(String(50), nullable=False)  # "B.Tech", "MBA"
      duration_years = Column(Integer, nullable=False)
      is_active = Column(Boolean, default=True)
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      
      __table_args__ = (
          CheckConstraint('duration_years BETWEEN 2 AND 5', name='check_duration'),
      )
      
      batch_years = relationship("BatchYear", back_populates="batch")
  ```

#### **Issue 2: Missing BatchYear Table**
- **Problem:** Cannot track 2023-27, 2024-28 admissions
- **Severity:** 🔴 **CRITICAL FEATURE GAP**
- **Fix:**
  ```python
  class BatchYear(Base):
      __tablename__ = "batch_years"
      
      id = Column(Integer, primary_key=True, index=True)
      batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
      start_year = Column(Integer, nullable=False)
      end_year = Column(Integer, nullable=False)
      is_current = Column(Boolean, default=False)
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      
      __table_args__ = (
          CheckConstraint('end_year > start_year', name='check_year_order'),
          UniqueConstraint('batch_id', 'start_year', name='unique_batch_year'),
      )
      
      batch = relationship("Batch", back_populates="batch_years")
      semesters = relationship("Semester", back_populates="batch_year")
      students = relationship("Student", back_populates="batch_year")
  ```

#### **Issue 3: Missing Semester Table**
- **Problem:** No academic calendar
- **Severity:** 🔴 **CRITICAL**
- **Fix:**
  ```python
  class Semester(Base):
      __tablename__ = "semesters"
      
      id = Column(Integer, primary_key=True, index=True)
      batch_year_id = Column(Integer, ForeignKey("batch_years.id", ondelete="CASCADE"))
      semester_no = Column(Integer, nullable=False)
      is_current = Column(Boolean, default=False)
      start_date = Column(Date)
      end_date = Column(Date)
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      
      __table_args__ = (
          CheckConstraint('semester_no BETWEEN 1 AND 8', name='check_semester_no'),
          CheckConstraint('end_date > start_date', name='check_semester_dates'),
          UniqueConstraint('batch_year_id', 'semester_no', name='unique_semester'),
      )
      
      batch_year = relationship("BatchYear", back_populates="semesters")
  ```

#### **Issue 4: Missing SubQuestion Table**
- **Lines:** N/A (doesn't exist)
- **Problem:** Cannot handle Q1 → Q1a, Q1b hierarchy
- **Severity:** 🟠 **MEDIUM**
- **Fix:**
  ```python
  class SubQuestion(Base):
      __tablename__ = "sub_questions"
      
      id = Column(Integer, primary_key=True, index=True)
      question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
      sub_no = Column(String(10), nullable=False)  # "1a", "1b", "1c"
      sub_text = Column(Text)
      marks = Column(Float, nullable=False)
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      
      question = relationship("Question", back_populates="sub_questions")
      marks_entries = relationship("Mark", back_populates="sub_question")
  
  # Update Question model
  class Question(Base):
      # ... existing fields ...
      sub_questions = relationship("SubQuestion", back_populates="question", cascade="all, delete-orphan")
  
  # Update Mark model
  class Mark(Base):
      # ... existing fields ...
      sub_question_id = Column(Integer, ForeignKey("sub_questions.id"), nullable=True)
      sub_question = relationship("SubQuestion", back_populates="marks_entries")
  ```

#### **Issue 5: Missing FinalMarks Table**
- **Problem:** No aggregated marks storage
- **Severity:** 🔴 **CRITICAL**
- **Fix:**
  ```python
  class FinalMark(Base):
      __tablename__ = "final_marks"
      
      id = Column(Integer, primary_key=True, index=True)
      student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
      subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
      semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)
      
      # Internal assessments
      internal_1 = Column(Float, default=0)
      internal_2 = Column(Float, default=0)
      best_internal = Column(Float, default=0)
      
      # External assessment
      external = Column(Float, default=0)
      
      # Final calculation
      total = Column(Float, default=0)
      percentage = Column(Float, default=0)
      grade = Column(String(2), default='F')
      
      # GPA
      sgpa = Column(Float)
      cgpa = Column(Float)
      
      # CO attainment
      co_attainment = Column(JSON, default={})
      
      # Status
      status = Column(String(20), default='draft')
      is_published = Column(Boolean, default=False)
      published_at = Column(DateTime(timezone=True))
      
      # Editability
      editable_until = Column(Date)
      
      created_at = Column(DateTime(timezone=True), server_default=func.now())
      updated_at = Column(DateTime(timezone=True), onupdate=func.now())
  ```

#### **Issue 6: Missing MarkAuditLog Table**
- **Problem:** No change tracking (compliance issue)
- **Severity:** 🔴 **CRITICAL**
- **Fix:**
  ```python
  class MarkAuditLog(Base):
      __tablename__ = "mark_audit_log"
      
      id = Column(Integer, primary_key=True, index=True)
      mark_id = Column(Integer, ForeignKey("marks.id"))
      changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
      
      field_changed = Column(String(50), nullable=False)
      old_value = Column(Float)
      new_value = Column(Float)
      
      reason = Column(Text)  # Required for overrides
      change_type = Column(String(20))  # 'edit', 'override', 'recalculation'
      
      timestamp = Column(DateTime(timezone=True), server_default=func.now())
      
      mark = relationship("Mark")
      changed_by = relationship("User", foreign_keys=[changed_by_id])
  ```

#### **Issue 7: Missing Indexes**
- **Problem:** Slow queries on large datasets
- **Severity:** 🔴 **HIGH (Performance)**
- **Fix:** Add after model definitions
  ```python
  # Add to each model's __table_args__
  
  # In Mark model
  __table_args__ = (
      Index('idx_marks_student_exam', 'student_id', 'exam_id'),
      Index('idx_marks_exam_question', 'exam_id', 'question_id'),
      Index('idx_marks_student_subject', 'student_id', 'exam_id'),
  )
  
  # In Question model
  __table_args__ = (
      Index('idx_questions_exam_section', 'exam_id', 'section'),
      Index('idx_questions_exam', 'exam_id'),
  )
  
  # In Exam model
  __table_args__ = (
      Index('idx_exams_subject_type', 'subject_id', 'exam_type'),
      Index('idx_exams_date', 'exam_date'),
  )
  
  # In User model
  __table_args__ = (
      Index('idx_users_dept_role', 'department_id', 'role'),
      Index('idx_users_email', 'email'),  # Already exists, verify
  )
  ```

---

### **5. `backend/schemas.py`**

#### **Issue 1: Weak Password Validation**
- **Lines:** 31-35
- **Current Code:**
  ```python
  @field_validator('password')
  def validate_password(cls, v):
      if len(v) < 6:  # TOO WEAK
          raise ValueError('Password must be at least 6 characters long')
      return v
  ```
- **Problem:** 6 characters is insufficient
- **Severity:** 🔴 **CRITICAL SECURITY**
- **Fix:**
  ```python
  import re
  
  @field_validator('password')
  def validate_password(cls, v):
      if len(v) < 12:
          raise ValueError('Password must be at least 12 characters long')
      
      if not re.search(r'[A-Z]', v):
          raise ValueError('Password must contain at least one uppercase letter')
      
      if not re.search(r'[a-z]', v):
          raise ValueError('Password must contain at least one lowercase letter')
      
      if not re.search(r'[0-9]', v):
          raise ValueError('Password must contain at least one number')
      
      if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
          raise ValueError('Password must contain at least one special character')
      
      # Check for common passwords
      common_passwords = ['password123', 'admin123', 'welcome123']
      if v.lower() in common_passwords:
          raise ValueError('Password is too common')
      
      return v
  ```

#### **Issue 2: Duplicate from_attributes**
- **Lines:** 59-60, 93-94, 125-126 (multiple occurrences)
- **Current Code:**
  ```python
  class Config:
      from_attributes = True
      from_attributes = True  # DUPLICATE
  ```
- **Problem:** Redundant configuration
- **Severity:** 🟢 **LOW (Code quality)**
- **Fix:** Remove duplicates
  ```python
  class Config:
      from_attributes = True
  ```

---

### **6. `backend/crud.py`**

#### **Issue 1: Missing Smart Marks Calculation**
- **Problem:** No function to cap optional questions
- **Severity:** 🔴 **CRITICAL FEATURE**
- **Fix:** Add to crud.py
  ```python
  def calculate_smart_marks(student_id: int, exam_id: int, db: Session) -> Dict[str, float]:
      """
      Calculate marks with smart capping:
      - Best N of optional questions
      - Sub-questions sum to parent max
      - Section totals capped
      """
      exam = db.query(Exam).filter(Exam.id == exam_id).first()
      questions = db.query(Question).filter(Question.exam_id == exam_id).all()
      
      section_totals = {}
      
      for section in ['A', 'B', 'C']:
          section_questions = [q for q in questions if q.section == section]
          if not section_questions:
              continue
          
          # Get student answers for this section
          answers = db.query(Mark).filter(
              Mark.student_id == student_id,
              Mark.exam_id == exam_id,
              Mark.question_id.in_([q.id for q in section_questions])
          ).all()
          
          # Check if section has optional questions
          first_q = section_questions[0]
          required = first_q.required_count or len(section_questions)
          answered = len(answers)
          
          if answered > required:
              # Sort answers by marks_obtained (descending)
              sorted_answers = sorted(answers, key=lambda x: x.marks_obtained, reverse=True)
              
              # Take top N required
              valid_answers = sorted_answers[:required]
              
              # Calculate total
              section_total = sum(a.marks_obtained for a in valid_answers)
              
              # Cap at section maximum
              section_max = required * first_q.marks_per_qn
              section_total = min(section_total, section_max)
              
              section_totals[section] = section_total
              
              # Log capping action
              logger.info(f"Capped Section {section} for Student {student_id}: {answered} answered, {required} required, total: {section_total}/{section_max}")
          else:
              # No capping needed
              section_total = sum(a.marks_obtained for a in answers)
              section_totals[section] = section_total
      
      return section_totals
  ```

#### **Issue 2: No Try-Except in Database Operations**
- **Multiple functions lack error handling**
- **Severity:** 🟠 **MEDIUM**
- **Example Fix:**
  ```python
  def create_department(db: Session, department: DepartmentCreate):
      try:
          db_department = Department(**department.dict())
          db.add(db_department)
          db.commit()
          db.refresh(db_department)
          return db_department
      except IntegrityError as e:
          db.rollback()
          if 'unique' in str(e).lower():
              raise HTTPException(409, "Department with this code already exists")
          raise HTTPException(400, f"Database integrity error: {str(e)}")
      except SQLAlchemyError as e:
          db.rollback()
          logger.error(f"Database error in create_department: {e}")
          raise HTTPException(500, "Database error occurred")
      except Exception as e:
          db.rollback()
          logger.error(f"Unexpected error in create_department: {e}")
          raise HTTPException(500, "An unexpected error occurred")
  ```

#### **Issue 3: N+1 Query Problem**
- **Lines:** Multiple functions with loops
- **Example:** `get_all_students()`
- **Severity:** 🟠 **MEDIUM (Performance)**
- **Fix:** Use joinedload
  ```python
  def get_all_students(db: Session):
      # BAD: N+1 queries
      students = db.query(User).filter(User.role == UserRole.student).all()
      for student in students:
          marks = student.marks  # Triggers separate query per student
      
      # GOOD: Single query with joins
      students = db.query(User).options(
          joinedload(User.marks).joinedload(Mark.exam),
          joinedload(User.student_class).joinedload(Class.department)
      ).filter(User.role == UserRole.student).all()
      
      return students
  ```

---

### **7. `backend/report_generator.py`**

#### **Issue 1: Bare Except Clauses**
- **Lines:** 516, 1398, 1595, 1805, 2508, 2731
- **Current Pattern:**
  ```python
  try:
      # some operation
  except:  # BAD: Catches everything including KeyboardInterrupt
      pass
  ```
- **Severity:** 🟠 **MEDIUM**
- **Fix:**
  ```python
  try:
      # some operation
  except Exception as e:
      logger.error(f"Error in report generation: {e}")
      raise HTTPException(500, f"Report generation failed: {str(e)}")
  ```

---

### **8. `.gitignore` (MISSING ENTRIES)**

#### **Issue: Database Files Tracked**
- **Problem:** `*.db` files in repository
- **Severity:** 🔴 **CRITICAL**
- **Fix:** Add to `.gitignore`
  ```gitignore
  # Database files
  *.db
  *.sqlite
  *.sqlite3
  
  # Python
  __pycache__/
  *.py[cod]
  *$py.class
  *.so
  .Python
  env/
  venv/
  ENV/
  
  # Environment variables
  .env
  .env.local
  .env.*.local
  
  # IDEs
  .vscode/
  .idea/
  *.swp
  *.swo
  *~
  
  # OS
  .DS_Store
  Thumbs.db
  
  # Logs
  *.log
  logs/
  
  # Uploads
  uploads/
  media/
  
  # Reports
  reports/*.pdf
  reports/*.xlsx
  
  # Testing
  .pytest_cache/
  .coverage
  htmlcov/
  ```

#### **Action:** Clean Git History
```bash
# Remove .db files from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/*.db" \
  --prune-empty --tag-name-filter cat -- --all

# Or use BFG Repo-Cleaner (faster)
bfg --delete-files '*.db'
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## **🟠 HIGH PRIORITY FILES**

### **9. `src/main.tsx`**

#### **Issue: No Error Boundary**
- **Problem:** Single component error crashes app
- **Severity:** 🟠 **MEDIUM**
- **Fix:**
  ```typescript
  // Create src/components/ErrorBoundary.tsx
  import React from 'react';
  
  interface Props {
      children: React.ReactNode;
  }
  
  interface State {
      hasError: boolean;
      error?: Error;
  }
  
  class ErrorBoundary extends React.Component<Props, State> {
      constructor(props: Props) {
          super(props);
          this.state = { hasError: false };
      }
      
      static getDerivedStateFromError(error: Error): State {
          return { hasError: true, error };
      }
      
      componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
          console.error('Error caught by boundary:', error, errorInfo);
          // Send to error tracking service (e.g., Sentry)
      }
      
      render() {
          if (this.state.hasError) {
              return (
                  <div className="error-fallback">
                      <h1>Something went wrong</h1>
                      <p>{this.state.error?.message}</p>
                      <button onClick={() => window.location.reload()}>
                          Reload Page
                      </button>
                  </div>
              );
          }
          
          return this.props.children;
      }
  }
  
  // Update src/main.tsx
  ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
          <ErrorBoundary>
              <Provider store={store}>
                  <BrowserRouter>
                      <App />
                  </BrowserRouter>
              </Provider>
          </ErrorBoundary>
      </React.StrictMode>
  );
  ```

---

### **10. `vite.config.ts`**

#### **Issue: No Code Splitting**
- **Problem:** Large bundle size
- **Severity:** 🟠 **MEDIUM (Performance)**
- **Fix:**
  ```typescript
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  
  export default defineConfig({
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
            'vendor-charts': ['chart.js', 'react-chartjs-2'],
            'vendor-ui': ['lucide-react'],
            
            // Feature chunks
            'analytics': [
              './src/pages/Teacher/TeacherAnalytics.tsx',
              './src/pages/Student/StudentAnalytics.tsx',
              './src/pages/HOD/HODAnalytics.tsx',
            ],
            'marks-entry': [
              './src/pages/Teacher/MarksEntry.tsx',
              './src/pages/Teacher/MarksEntryEnhanced.tsx',
            ],
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,  // Remove console.logs in production
          drop_debugger: true,
        }
      }
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    }
  })
  ```

---

## **🟡 MEDIUM PRIORITY ISSUES**

### **Print Statements (361 instances)**

**Severity:** 🟡 **LOW (Code quality)**

**Files with print statements:**
- `backend/main.py`: 2 instances
- `backend/database.py`: 1 instance
- `backend/add_admin.py`: 8 instances
- `backend/seed_data.py`: 4 instances
- `backend/advanced_analytics_backend.py`: 10 instances
- `backend/crud.py`: 5 instances
- `backend/analytics.py`: 6 instances
- Many frontend files

**Fix Pattern:**
```python
# Instead of:
print("⚠️  Celery not available")

# Use:
import logging
logger = logging.getLogger(__name__)
logger.warning("Celery not available - background tasks disabled")
```

---

### **Wildcard Imports (26 instances)**

**Severity:** 🟡 **LOW (Code quality)**

**Files:**
- `backend/validation.py`: Lines 8-9
- `backend/main.py`: Lines 15-20
- `backend/crud.py`: Lines 4-5
- `backend/analytics.py`: Line 3
- Others

**Fix Pattern:**
```python
# Instead of:
from models import *
from schemas import *

# Use:
from models import User, Department, Class, Subject, Exam, Question, Mark
from schemas import UserCreate, UserUpdate, UserResponse
```

---

## **📋 QUICK REFERENCE: FILES TO CREATE**

### **New Files Needed**

1. **`backend/decorators.py`**
   - Authorization decorators
   - Department scope decorators
   - Rate limiting decorators

2. **`backend/cache.py`**
   - Redis client setup
   - Cache helper functions
   - TTL configurations

3. **`backend/grading.py`**
   - SGPA calculation
   - CGPA calculation
   - Grade assignment logic
   - Best internal calculation

4. **`backend/bulk_operations.py`**
   - Bulk question upload
   - Bulk marks upload
   - CSV/Excel parsing
   - Validation

5. **`backend/config.py`**
   - Environment-based settings
   - Feature flags
   - Constants

6. **`backend/logging_config.py`**
   - Structured JSON logging
   - Log formatting
   - Log levels

7. **`backend/routers/`** (directory)
   - Split main.py into 12 router files

8. **`.env.example`**
   - Template for environment variables

9. **`backend/tests/`** (directory)
   - Unit tests
   - Integration tests
   - Fixtures

10. **`cypress/`** (directory)
    - E2E tests for frontend

---

## **📊 FILE COMPLEXITY METRICS**

| File | Lines | Functions | Complexity | Priority |
|------|-------|-----------|------------|----------|
| `backend/main.py` | 1,918 | 100+ | Very High | 🔴 Split |
| `backend/crud.py` | 1,476 | 50+ | High | 🟠 Refactor |
| `backend/report_generator.py` | 2,800+ | 30+ | Very High | 🟠 Refactor |
| `backend/models.py` | 318 | N/A | Medium | 🟡 Extend |
| `backend/schemas.py` | 639 | N/A | Medium | 🟢 OK |

---

## **🎯 DEVELOPER ACTION PLAN**

### **Day 1: Security**
1. Fix `backend/auth.py` (JWT secret, token blacklist)
2. Update `backend/schemas.py` (password validation)
3. Add security headers to `backend/main.py`

### **Day 2: Database**
1. Update `backend/database.py` (connection pooling)
2. Add new models to `backend/models.py`
3. Create migration scripts

### **Day 3-4: Core Features**
1. Implement smart marks calculation in `backend/crud.py`
2. Create `backend/grading.py`
3. Add audit logging

### **Day 5: Code Quality**
1. Split `backend/main.py` into routers
2. Create `backend/decorators.py`
3. Fix wildcard imports

### **Week 2: Testing & Documentation**
1. Write unit tests
2. Write integration tests
3. Update documentation

---

**This document provides specific, actionable fixes for every critical issue.**  
**Developers can work through this file systematically to improve the codebase.**

**Last Updated:** November 14, 2025  
**Version:** 1.0

