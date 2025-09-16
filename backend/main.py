from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse, Response
from sqlalchemy.orm import Session, joinedload
import uvicorn
import os
import io
from datetime import datetime
from typing import List, Optional
import logging
import json

from database import SessionLocal, engine, Base
from models import *
from schemas import *
from auth import get_current_user
from crud import *
from analytics import *
from attainment_analytics import *
from advanced_attainment_analytics import *
from advanced_analytics_backend import calculate_advanced_student_analytics
from strategic_dashboard_backend import calculate_strategic_dashboard_data
from fastapi.exceptions import RequestValidationError
from fastapi import Request
from validation import *
from error_handlers import setup_error_handlers, ErrorResponse

# Celery imports (optional)
try:
    from celery_app import app as celery_app
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    print("⚠️  Celery not available - background tasks disabled")
# Tasks imports (optional)
try:
    from tasks import generate_async_report, perform_advanced_analytics
    TASKS_AVAILABLE = True
except ImportError:
    TASKS_AVAILABLE = False
    print("⚠️  Tasks not available - background processing disabled")

# Setup logging
logging.basicConfig(level=logging.WARNING)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Internal Exam Management System", version="1.0.0")

# Setup error handlers
setup_error_handlers(app)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add cache control middleware
@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    response = await call_next(request)
    # Add cache control headers to prevent caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Last-Modified"] = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    return response

security = HTTPBearer()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Internal Exam Management System API", "status": "running", "version": "1.0.0"}

@app.get("/cache/clear")
def clear_cache():
    """Clear any server-side cache and return current timestamp"""
    return {
        "message": "Cache cleared",
        "timestamp": datetime.utcnow().isoformat(),
        "cache_bust": int(datetime.utcnow().timestamp() * 1000)
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# WebSocket manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/marks")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Marks updated: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Authentication endpoints
@app.post("/auth/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    from auth import authenticate_user, create_access_token
    
    user = authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "department_id": user.department_id,
            "class_id": user.class_id,
            "is_active": user.is_active
        }
    }

@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Department endpoints
@app.get("/departments", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_all_departments(db)

@app.post("/departments", response_model=DepartmentResponse)
def create_department_endpoint(
    department: DepartmentCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Only admins can create departments, not HODs
    if current_user.role.value != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can create departments")
    return create_department(db, department)

@app.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department_endpoint(
    department_id: int,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only admins can update departments
    if current_user.role.value != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can update departments")
    result = update_department(db, department_id, department)
    if not result:
        raise HTTPException(status_code=404, detail="Department not found")
    return result

@app.delete("/departments/{department_id}")
def delete_department_endpoint(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only admins can delete departments
    if current_user.role.value != 'admin':
        raise HTTPException(status_code=403, detail="Only administrators can delete departments")
    
    success = delete_department(db, department_id)
    if not success:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted successfully"}

# Class endpoints
@app.get("/classes", response_model=List[ClassResponse])
def get_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_all_classes(db)

@app.post("/classes", response_model=ClassResponse)
def create_class_endpoint(
    class_data: ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return create_class(db, class_data)

@app.put("/classes/{class_id}", response_model=ClassResponse)
def update_class_endpoint(
    class_id: int,
    class_data: ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = update_class(db, class_id, class_data)
    if not result:
        raise HTTPException(status_code=404, detail="Class not found")
    return result

@app.delete("/classes/{class_id}")
def delete_class_endpoint(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_class(db, class_id)
    if not success:
        raise HTTPException(status_code=404, detail="Class not found")
    return {"message": "Class deleted successfully"}

# Subject endpoints
@app.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_all_subjects(db)

@app.post("/subjects", response_model=SubjectResponse)
def create_subject_endpoint(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return create_subject(db, subject)

@app.put("/subjects/{subject_id}", response_model=SubjectResponse)
def update_subject_endpoint(
    subject_id: int,
    subject: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = update_subject(db, subject_id, subject)
    if not result:
        raise HTTPException(status_code=404, detail="Subject not found")
    return result

@app.delete("/subjects/{subject_id}")
def delete_subject_endpoint(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_subject(db, subject_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted successfully"}

# User endpoints
@app.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return get_all_users(db)

@app.post("/users", response_model=UserResponse)
def create_user_endpoint(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only create users for their own department
    if current_user.role.value == 'hod':
        if user.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="HODs can only create users for their own department")
        # HODs cannot create other HODs or admins
        if user.role in ['hod', 'admin']:
            raise HTTPException(status_code=403, detail="HODs cannot create HOD or admin users")
    
    # Validate user data
    try:
        validate_user_data(user, db)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"message": e.message, "field": e.field})
    
    return create_user(db, user)

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only update users from their own department
    if current_user.role.value == 'hod':
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="HODs can only update users from their own department")
        # HODs cannot change user roles to HOD or admin
        if hasattr(user, 'role') and user.role in ['hod', 'admin']:
            raise HTTPException(status_code=403, detail="HODs cannot change user roles to HOD or admin")
    
    result = update_user(db, user_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result

@app.delete("/users/{user_id}")
def delete_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # HODs can only delete users from their own department
    if current_user.role.value == 'hod':
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="HODs can only delete users from their own department")
        # HODs cannot delete other HODs or admins
        if target_user.role.value in ['hod', 'admin']:
            raise HTTPException(status_code=403, detail="HODs cannot delete HOD or admin users")
    
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@app.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only reset passwords for users in their department
    if current_user.role.value == 'hod':
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user or target_user.department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="HODs can only reset passwords for users in their department")
    
    # Generate a new random password
    import secrets
    import string
    
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    # Update the user's password
    success = update_user_password(db, user_id, new_password)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Password reset successfully", "new_password": new_password}

# Exam endpoints
@app.get("/exams", response_model=List[ExamResponse])
def get_exams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_all_exams(db)

@app.get("/exams/{exam_id}", response_model=ExamResponse)
def get_exam_by_id(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = get_exam_by_id_db(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

# Exception handler for 422 errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error on {request.url.path}: {exc.errors()}")
    request_body = await request.body()
    logging.warning(f"Request body: {request_body}")
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )

@app.post("/exams", response_model=ExamResponse)
def create_exam_endpoint(
    exam: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Debug logging
    logging.warning(f"Received exam data: {exam.dict()}")
    
    # Log each question's data
    for i, question in enumerate(exam.questions or []):
        logging.warning(f"Question {i}: question_text='{question.question_text}', question_number='{question.question_number}'")

    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to create exam for this subject")

    return create_exam(db, exam)

@app.put("/exams/{exam_id}", response_model=ExamResponse)
def update_exam_endpoint(
    exam_id: int,
    exam: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the exam
    if current_user.role.value == 'teacher':
        existing_exam = get_exam_by_id_db(db, exam_id)
        if not existing_exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        subject = get_subject_by_id(db, existing_exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this exam")
    
    result = update_exam(db, exam_id, exam)
    if not result:
        raise HTTPException(status_code=404, detail="Exam not found")
    return result

@app.delete("/exams/{exam_id}")
def delete_exam_endpoint(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logging.warning(f"Delete exam request - ID: {exam_id}, User: {current_user.id}")
    
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the exam
    if current_user.role.value == 'teacher':
        existing_exam = get_exam_by_id_db(db, exam_id)
        if not existing_exam:
            logging.warning(f"Exam {exam_id} not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Exam not found")
        
        subject = get_subject_by_id(db, existing_exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            logging.warning(f"User {current_user.id} not authorized to delete exam {exam_id}")
            raise HTTPException(status_code=403, detail="Not authorized to delete this exam")
    
    logging.warning(f"Attempting to delete exam {exam_id}")
    success = delete_exam(db, exam_id)
    if not success:
        logging.warning(f"Failed to delete exam {exam_id}")
        raise HTTPException(status_code=404, detail="Exam not found")
    
    logging.warning(f"Successfully deleted exam {exam_id}")
    return {"message": "Exam deleted successfully"}

# Question endpoints
@app.get("/exams/{exam_id}/questions", response_model=List[QuestionResponse])
def get_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    return questions

@app.post("/questions", response_model=QuestionResponse)
def create_question_endpoint(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return create_question(db, question)

# Marks endpoints
@app.get("/marks/exam/{exam_id}", response_model=List[MarkResponse])
def get_marks_by_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify access to exam marks
    exam = get_exam_by_id_db(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view marks for this exam")
    elif current_user.role.value == 'student':
        # Students can only see their own marks
        return get_student_marks_for_exam(db, exam_id, current_user.id)
    
    result = get_marks_by_exam_id(db, exam_id)
    return result["marks"] if isinstance(result, dict) else result

@app.get("/marks/exam/{exam_id}/lock-status")
def get_exam_lock_status_endpoint(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get lock-in status for an exam's marks"""
    # Verify access to exam
    exam = get_exam_by_id_db(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this exam")
    
    return get_exam_lock_status(db, exam_id)

@app.get("/marks/student/{student_id}")
def get_student_marks(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Students can only see their own marks
    if current_user.role.value == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_marks_by_student_id(db, student_id)

@app.post("/marks/bulk", response_model=List[MarkResponse])
def bulk_create_marks(
    marks: List[MarkCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not marks:
        raise HTTPException(status_code=400, detail="No marks data provided")
    
    # Verify teacher owns the exam
    if current_user.role.value == 'teacher':
        exam_id = marks[0].exam_id
        exam = get_exam_by_id_db(db, exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        subject = get_subject_by_id(db, exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to enter marks for this exam")
    
    # Validate all marks data
    try:
        for mark in marks:
            validate_mark_data(mark, db)
        
        # Check if marks are locked
        check_marks_lock_status(marks[0].exam_id, db)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"message": e.message, "field": e.field})
    except BusinessLogicError as e:
        raise HTTPException(status_code=400, detail={"message": e.message, "code": e.code})
    
    # After bulk create, broadcast update via WebSocket if connected
    try:
        result = bulk_create_marks_db(db, marks)
        # For now, simple broadcast; in production, use channel-specific
        # Note: WebSocket broadcast would need to be handled asynchronously
        # await manager.broadcast(f"Marks updated for exam {marks[0].exam_id}")
        
        # Return just the marks list, not the dictionary with lock_status
        if isinstance(result, dict) and 'marks' in result:
            return result['marks']
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save marks: {str(e)}")

@app.put("/marks/{mark_id}", response_model=MarkResponse)
def update_mark_endpoint(
    mark_id: int,
    mark: MarkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = update_mark(db, mark_id, mark)
    if not result:
        raise HTTPException(status_code=404, detail="Mark not found")
    
    # Broadcast update
    # await manager.broadcast(f"Mark updated: {mark_id}")
    return result

# Analytics endpoints
@app.get("/analytics/student/{student_id}")
def get_student_analytics_endpoint(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Students can only see their own analytics
    if current_user.role.value == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_student_analytics(db, student_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Student not found or no data available")
    
    return analytics

@app.get("/analytics/teacher/{teacher_id}")
def get_teacher_analytics_endpoint(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Teachers can only see their own analytics unless admin/hod
    if current_user.role.value == 'teacher' and current_user.id != teacher_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_teacher_analytics(db, teacher_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Teacher not found or no data available")
    
    return analytics

@app.get("/analytics/class/{class_id}")
def get_class_analytics_endpoint(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'hod', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_class_analytics(db, class_id)
    return analytics

@app.get("/analytics/hod/{department_id}")
def get_hod_analytics_endpoint(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['hod', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only see their own department analytics
    if current_user.role.value == 'hod' and current_user.department_id != department_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_hod_analytics(db, department_id)
    if not analytics:
        raise HTTPException(status_code=404, detail="Department not found or no data available")
    
    return analytics

@app.get("/analytics/subject/{subject_id}")
def get_subject_analytics_endpoint(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'hod', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    analytics = get_subject_analytics(db, subject_id)
    return analytics


# CO-PO Analysis endpoints
@app.get("/analytics/co-po-mapping/{subject_id}")
def get_co_po_mapping(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get CO-PO mapping matrix for a subject"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    from report_generator import ReportGenerator
    generator = ReportGenerator(db)
    co_po_matrix = generator.get_co_po_mapping_data(subject_id)
    return co_po_matrix

@app.get("/analytics/co-attainment/{subject_id}")
def get_co_attainment_analysis(
    subject_id: int,
    exam_type: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get CO attainment analysis for a subject"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    from report_generator import ReportGenerator
    generator = ReportGenerator(db)
    analysis = generator.get_co_attainment_data(subject_id, exam_type)
    return analysis

@app.get("/analytics/po-attainment/{subject_id}")
def get_po_attainment_analysis(
    subject_id: int,
    exam_type: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get PO attainment analysis for a subject"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    from report_generator import ReportGenerator
    generator = ReportGenerator(db)
    analysis = generator.get_po_attainment_data(subject_id, exam_type)
    return analysis

@app.get("/analytics/student-performance/{subject_id}")
def get_student_performance_analysis(
    subject_id: int,
    student_id: int = None,
    exam_type: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed student performance analysis"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    from report_generator import ReportGenerator
    generator = ReportGenerator(db)
    analysis = generator.get_student_performance_data(subject_id, exam_type)
    return analysis

@app.get("/analytics/class-performance/{subject_id}")
def get_class_performance_analysis(
    subject_id: int,
    exam_type: str = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get class performance analysis with comparative charts"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    from report_generator import ReportGenerator
    generator = ReportGenerator(db)
    analysis = generator.get_class_analytics_data(subject_id, exam_type)
    return analysis

# Reports endpoints - direct generation
@app.post("/reports/generate")
def generate_report_endpoint(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['hod', 'admin', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        from report_generator import ReportGenerator
        
        # Generate report directly
        generator = ReportGenerator(db)
        
        if request.format == 'pdf':
            report_data = generator.generate_pdf_report(
                request.report_type, 
                request.filters
            )
        elif request.format == 'excel':
            report_data = generator.generate_excel_report(
                request.report_type, 
                request.filters
            )
        else:
            # Default to CSV
            report_data = generator.generate_excel_report(
                request.report_type, 
                request.filters
            )
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{request.report_type}_{timestamp}.{request.format}"
        
        # Return file response
        media_type_map = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv'
        }
        
        return Response(
            content=report_data,
            media_type=media_type_map.get(request.format, 'application/octet-stream'),
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.get("/reports/status/{task_id}")
def get_report_status(task_id: str):
    if not TASKS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Background tasks not available")
    
    task = generate_async_report.AsyncResult(task_id)
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Pending...'
        }
    elif task.state != 'FAILURE':
        response = {
            'state': task.state,
            'status': task.info.get('status', '')
        }
        if task.state == 'SUCCESS':
            response['result'] = task.result
    else:
        response = {
            'state': task.state,
            'status': str(task.info),
        }
    return response

@app.get("/reports/templates")
def get_report_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['hod', 'admin', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from report_generator import get_available_report_types
    return get_available_report_types()

@app.get("/reports/download/{task_id}")
def download_report(task_id: str):
    if not TASKS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Background tasks not available")
    
    task = generate_async_report.AsyncResult(task_id)
    if task.state != 'SUCCESS':
        raise HTTPException(status_code=400, detail="Report not ready for download")
    
    # Get the file path from task result
    result = task.result
    if not result or 'file_path' not in result:
        raise HTTPException(status_code=404, detail="Report file not found")
    
    file_path = result['file_path']
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")
    
    filename = os.path.basename(file_path)
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

# Dashboard endpoints
@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value == 'admin':
        return get_admin_dashboard_stats(db)
    elif current_user.role.value == 'hod':
        return get_hod_dashboard_stats(db, current_user.department_id)
    elif current_user.role.value == 'teacher':
        return get_teacher_dashboard_stats(db, current_user.id)
    elif current_user.role.value == 'student':
        return get_student_dashboard_stats(db, current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

# File upload/download endpoints
@app.post("/upload/marks-template")
async def upload_marks_template(
    exam_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Process Excel file and extract marks
    try:
        marks_data = process_marks_excel_upload(file, exam_id, db)
        return {"message": "Marks uploaded successfully", "processed_marks": len(marks_data)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

@app.get("/download/marks-template/{exam_id}")
def download_marks_template(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        template_data = generate_marks_template(db, exam_id)
        filename = f"marks_template_exam_{exam_id}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(template_data),
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate template: {str(e)}")

# CO/PO/PSO Framework Configuration Endpoints

# CO Definition endpoints
@app.get("/subjects/{subject_id}/cos", response_model=List[CODefinitionResponse])
def get_subject_cos(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_co_definitions_by_subject(db, subject_id)

@app.post("/subjects/{subject_id}/cos", response_model=CODefinitionResponse)
def create_subject_co(
    subject_id: int,
    co_definition: CODefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    co_definition.subject_id = subject_id
    result = create_co_definition(db, co_definition)
    create_attainment_audit(db, subject_id, f"Created CO definition: {co_definition.code}", current_user.id)
    return result

@app.put("/cos/{co_id}", response_model=CODefinitionResponse)
def update_co_definition_endpoint(
    co_id: int,
    co_definition: CODefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        existing_co = get_co_definition_by_id(db, co_id)
        if not existing_co:
            raise HTTPException(status_code=404, detail="CO definition not found")
        
        subject = get_subject_by_id(db, existing_co.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    result = update_co_definition(db, co_id, co_definition)
    if not result:
        raise HTTPException(status_code=404, detail="CO definition not found")
    
    create_attainment_audit(db, result.subject_id, f"Updated CO definition: {result.code}", current_user.id)
    return result

@app.delete("/cos/{co_id}")
def delete_co_definition_endpoint(
    co_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        existing_co = get_co_definition_by_id(db, co_id)
        if not existing_co:
            raise HTTPException(status_code=404, detail="CO definition not found")
        
        subject = get_subject_by_id(db, existing_co.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_co_definition(db, co_id)
    if not success:
        raise HTTPException(status_code=404, detail="CO definition not found")
    
    return {"message": "CO definition deleted successfully"}

# PO Definition endpoints
@app.get("/departments/{department_id}/pos", response_model=List[PODefinitionResponse])
def get_department_pos(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs and teachers can only see their own department
    if current_user.role.value in ['hod', 'teacher'] and current_user.department_id != department_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_po_definitions_by_department(db, department_id)

@app.post("/departments/{department_id}/pos", response_model=PODefinitionResponse)
def create_department_po(
    department_id: int,
    po_definition: PODefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs and teachers can only create for their own department
    if current_user.role.value in ['hod', 'teacher'] and current_user.department_id != department_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    po_definition.department_id = department_id
    return create_po_definition(db, po_definition)

@app.put("/pos/{po_id}", response_model=PODefinitionResponse)
def update_po_definition_endpoint(
    po_id: int,
    po_definition: PODefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs and teachers can only update their own department's POs
    if current_user.role.value in ['hod', 'teacher']:
        existing_po = get_po_definition_by_id(db, po_id)
        if not existing_po:
            raise HTTPException(status_code=404, detail="PO definition not found")
        
        if current_user.department_id != existing_po.department_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    result = update_po_definition(db, po_id, po_definition)
    if not result:
        raise HTTPException(status_code=404, detail="PO definition not found")
    
    return result

@app.delete("/pos/{po_id}")
def delete_po_definition_endpoint(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs and teachers can only delete their own department's POs
    if current_user.role.value in ['hod', 'teacher']:
        existing_po = get_po_definition_by_id(db, po_id)
        if not existing_po:
            raise HTTPException(status_code=404, detail="PO definition not found")
        
        if current_user.department_id != existing_po.department_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_po_definition(db, po_id)
    if not success:
        raise HTTPException(status_code=404, detail="PO definition not found")
    
    return {"message": "PO definition deleted successfully"}

# CO Target endpoints
@app.get("/subjects/{subject_id}/co-targets", response_model=List[COTargetResponse])
def get_subject_co_targets(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_co_targets_by_subject(db, subject_id)

@app.put("/subjects/{subject_id}/co-targets", response_model=List[COTargetResponse])
def bulk_update_co_targets_endpoint(
    subject_id: int,
    bulk_update: BulkCOTargetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    result = bulk_update_co_targets(db, subject_id, bulk_update.co_targets)
    create_attainment_audit(db, subject_id, f"Updated CO targets for {len(bulk_update.co_targets)} COs", current_user.id)
    return result

# Assessment Weight endpoints
@app.get("/subjects/{subject_id}/assessment-weights", response_model=List[AssessmentWeightResponse])
def get_subject_assessment_weights(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_assessment_weights_by_subject(db, subject_id)

@app.put("/subjects/{subject_id}/assessment-weights", response_model=List[AssessmentWeightResponse])
def bulk_update_assessment_weights_endpoint(
    subject_id: int,
    bulk_update: BulkAssessmentWeightUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate that weights sum to 100%
    total_weight = sum(weight.weight_pct for weight in bulk_update.assessment_weights)
    if abs(total_weight - 100.0) > 0.01:  # Allow small floating point errors
        raise HTTPException(status_code=400, detail=f"Assessment weights must sum to 100%, got {total_weight}%")
    
    result = bulk_update_assessment_weights(db, subject_id, bulk_update.assessment_weights)
    create_attainment_audit(db, subject_id, f"Updated assessment weights for {len(bulk_update.assessment_weights)} exam types", current_user.id)
    return result

# CO-PO Matrix endpoints
@app.get("/subjects/{subject_id}/co-po-matrix")
def get_subject_co_po_matrix(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_co_po_matrix_by_subject(db, subject_id)

@app.put("/subjects/{subject_id}/co-po-matrix", response_model=List[COPOMatrixResponse])
def bulk_update_co_po_matrix_endpoint(
    subject_id: int,
    bulk_update: BulkCOPOMatrixUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    result = bulk_update_co_po_matrix(db, subject_id, bulk_update.co_po_matrix)
    create_attainment_audit(db, subject_id, f"Updated CO-PO matrix with {len(bulk_update.co_po_matrix)} entries", current_user.id)
    return result

# CO-PO Mapping endpoints
@app.post("/subjects/{subject_id}/co-po-mapping")
def create_co_po_mapping(
    subject_id: int,
    mapping_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        co_id = mapping_data.get('co_id')
        mapped_pos = mapping_data.get('mapped_pos', [])
        
        if not co_id:
            raise HTTPException(status_code=400, detail="CO ID is required")
        
        # Get the CO definition
        co_definition = db.query(CODefinition).filter(CODefinition.id == co_id).first()
        if not co_definition:
            raise HTTPException(status_code=404, detail="CO not found")
        
        # Get the subject and its class to find the department
        subject = db.query(Subject).filter(Subject.id == co_definition.subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        class_obj = db.query(Class).filter(Class.id == subject.class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Delete existing mappings for this CO
        db.query(COPOMatrix).filter(COPOMatrix.co_id == co_id).delete()
        
        # Create new mappings
        for po_code in mapped_pos:
            # Find the PO definition
            po_definition = db.query(PODefinition).filter(
                PODefinition.code == po_code,
                PODefinition.department_id == class_obj.department_id
            ).first()
            
            if po_definition:
                co_po_mapping = COPOMatrix(
                    co_id=co_id,
                    po_id=po_definition.id,
                    strength=1  # Default strength
                )
                db.add(co_po_mapping)
        
        db.commit()
        return {"message": "CO-PO mapping updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update CO-PO mapping: {str(e)}")

@app.get("/subjects/{subject_id}/co-po-mapping/{co_id}")
def get_co_po_mapping(
    subject_id: int,
    co_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get existing mappings for this CO
    mappings = db.query(COPOMatrix).options(
        joinedload(COPOMatrix.po_definition)
    ).filter(COPOMatrix.co_id == co_id).all()
    
    return {
        "co_id": co_id,
        "mapped_pos": [mapping.po_definition.code for mapping in mappings]
    }

# Question CO Weight endpoints
@app.get("/questions/{question_id}/co-weights", response_model=List[QuestionCOWeightResponse])
def get_question_co_weights(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the question's exam
    if current_user.role.value == 'teacher':
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        exam = get_exam_by_id_db(db, question.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        subject = get_subject_by_id(db, exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_question_co_weights(db, question_id)

@app.put("/questions/{question_id}/co-weights", response_model=List[QuestionCOWeightResponse])
def bulk_update_question_co_weights_endpoint(
    question_id: int,
    bulk_update: BulkQuestionCOWeightUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the question's exam
    if current_user.role.value == 'teacher':
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        exam = get_exam_by_id_db(db, question.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        subject = get_subject_by_id(db, exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate that weights sum to 100%
    total_weight = sum(weight.weight_pct for weight in bulk_update.co_weights)
    if abs(total_weight - 100.0) > 0.01:  # Allow small floating point errors
        raise HTTPException(status_code=400, detail=f"CO weights must sum to 100%, got {total_weight}%")
    
    result = bulk_update_question_co_weights(db, question_id, bulk_update.co_weights)
    return result

# Indirect Attainment endpoints
@app.get("/subjects/{subject_id}/indirect-attainment", response_model=List[IndirectAttainmentResponse])
def get_subject_indirect_attainment(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_indirect_attainment_by_subject(db, subject_id)

@app.post("/subjects/{subject_id}/indirect-attainment", response_model=IndirectAttainmentResponse)
def create_indirect_attainment_endpoint(
    subject_id: int,
    indirect_attainment: IndirectAttainmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    indirect_attainment.subject_id = subject_id
    result = create_indirect_attainment(db, indirect_attainment)
    create_attainment_audit(db, subject_id, f"Added indirect attainment: {indirect_attainment.source}", current_user.id)
    return result

@app.put("/indirect-attainment/{attainment_id}", response_model=IndirectAttainmentResponse)
def update_indirect_attainment_endpoint(
    attainment_id: int,
    indirect_attainment: IndirectAttainmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        existing_attainment = get_indirect_attainment_by_id(db, attainment_id)
        if not existing_attainment:
            raise HTTPException(status_code=404, detail="Indirect attainment not found")
        
        subject = get_subject_by_id(db, existing_attainment.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    result = update_indirect_attainment(db, attainment_id, indirect_attainment)
    if not result:
        raise HTTPException(status_code=404, detail="Indirect attainment not found")
    
    return result

@app.delete("/indirect-attainment/{attainment_id}")
def delete_indirect_attainment_endpoint(
    attainment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        existing_attainment = get_indirect_attainment_by_id(db, attainment_id)
        if not existing_attainment:
            raise HTTPException(status_code=404, detail="Indirect attainment not found")
        
        subject = get_subject_by_id(db, existing_attainment.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_indirect_attainment(db, attainment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Indirect attainment not found")
    
    return {"message": "Indirect attainment deleted successfully"}

# Attainment Audit endpoints
@app.get("/subjects/{subject_id}/attainment-audit")
def get_subject_attainment_audit(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_attainment_audit_by_subject(db, subject_id)

# Advanced Attainment Analytics Endpoints

@app.get("/analytics/attainment/subject/{subject_id}", response_model=SubjectAttainmentResponse)
def get_subject_attainment_analytics(
    subject_id: int,
    exam_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive subject-level attainment analytics"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        return calculate_subject_attainment_analytics(db, subject_id, exam_type)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/analytics/attainment/student/{student_id}", response_model=StudentAttainmentResponse)
def get_student_attainment_analytics(
    student_id: int,
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive student-level attainment analytics"""
    # Students can only see their own analytics
    if current_user.role.value == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Teachers can only see students in their subjects
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        return calculate_student_attainment_analytics(db, student_id, subject_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/analytics/attainment/class/{class_id}", response_model=ClassAttainmentResponse)
def get_class_attainment_analytics(
    class_id: int,
    term: str = "2024-1",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get class-level attainment analytics for a term"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Teachers can only see classes they teach
    if current_user.role.value == 'teacher':
        subjects = db.query(Subject).filter(Subject.teacher_id == current_user.id).all()
        class_ids = [s.class_id for s in subjects]
        if class_id not in class_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        return calculate_class_attainment_analytics(db, class_id, term)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/analytics/attainment/program/{department_id}", response_model=ProgramAttainmentResponse)
def get_program_attainment_analytics(
    department_id: int,
    year: int = 2024,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get program-level attainment analytics for a department and year"""
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only see their own department
    if current_user.role.value == 'hod' and current_user.department_id != department_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        return calculate_program_attainment_analytics(db, department_id, year)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/analytics/attainment/co/{subject_id}")
def get_co_attainment_details(
    subject_id: int,
    exam_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed CO attainment analysis for a subject"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        return calculate_co_attainment_for_subject(db, subject_id, exam_type)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/analytics/attainment/po/{subject_id}")
def get_po_attainment_details(
    subject_id: int,
    exam_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed PO attainment analysis for a subject"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        return calculate_po_attainment_for_subject(db, subject_id, exam_type)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/analytics/attainment/blueprint-validation/{subject_id}")
def get_blueprint_validation(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get blueprint validation analysis for a subject"""
    if current_user.role.value not in ['admin', 'hod', 'teacher']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the subject
    if current_user.role.value == 'teacher':
        subject = get_subject_by_id(db, subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Get Bloom's distribution and difficulty analysis
        blooms_distribution = calculate_blooms_distribution(db, subject_id)
        difficulty_mix = calculate_difficulty_mix(db, subject_id)
        co_coverage = calculate_co_coverage(db, subject_id)
        
        # Validate against typical blueprint requirements
        validation_results = {
            'co_coverage': {
                'value': co_coverage,
                'target': 100.0,
                'status': 'PASS' if co_coverage >= 100 else 'FAIL',
                'message': f"CO coverage: {co_coverage}% (target: 100%)"
            },
            'blooms_distribution': blooms_distribution,
            'difficulty_mix': difficulty_mix,
            'overall_status': 'PASS' if co_coverage >= 100 else 'FAIL'
        }
        
        return validation_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in blueprint validation: {str(e)}")

# Advanced Analytics Endpoints
@app.get("/analytics/advanced/student/{student_id}")
def get_advanced_student_analytics_endpoint(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get advanced student analytics with real data"""
    try:
        # Check if user is authorized to view this student's data
        if current_user.role.value == 'student' and current_user.id != student_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this student's data")
        
        return calculate_advanced_student_analytics(db, student_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/strategic/department/{department_id}")
def get_strategic_dashboard_data_endpoint(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get strategic dashboard data with real data"""
    try:
        # Check if user is authorized to view this department's data
        if current_user.role.value in ['admin', 'hod']:
            if current_user.role.value == 'hod' and current_user.department_id != department_id:
                raise HTTPException(status_code=403, detail="Not authorized to view this department's data")
        else:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return calculate_strategic_dashboard_data(db, department_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Student Progress API endpoints
@app.get("/student-progress/{student_id}", response_model=StudentProgressResponse)
def get_student_progress(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive progress data for a student"""
    # Students can only see their own progress
    if current_user.role.value == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    progress_data = get_student_progress_data(db, student_id)
    return progress_data

@app.get("/student-goals/{student_id}", response_model=List[StudentGoalResponse])
def get_student_goals_endpoint(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all goals for a student"""
    if current_user.role.value == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_student_goals(db, student_id)

@app.post("/student-goals", response_model=StudentGoalResponse)
def create_student_goal_endpoint(
    goal: StudentGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new goal for a student"""
    if current_user.role.value == 'student' and current_user.id != goal.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return create_student_goal(db, goal)

@app.put("/student-goals/{goal_id}", response_model=StudentGoalResponse)
def update_student_goal_endpoint(
    goal_id: int,
    goal_update: StudentGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a student's goal"""
    # Get the goal to check ownership
    goal = db.query(StudentGoal).filter(StudentGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if current_user.role.value == 'student' and current_user.id != goal.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_goal = update_student_goal(db, goal_id, goal.student_id, goal_update)
    if not updated_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return updated_goal

@app.delete("/student-goals/{goal_id}")
def delete_student_goal_endpoint(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a student's goal"""
    # Get the goal to check ownership
    goal = db.query(StudentGoal).filter(StudentGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if current_user.role.value == 'student' and current_user.id != goal.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_student_goal(db, goal_id, goal.student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return {"message": "Goal deleted successfully"}

@app.get("/student-milestones/{student_id}", response_model=List[StudentMilestoneResponse])
def get_student_milestones_endpoint(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all milestones for a student"""
    if current_user.role.value == 'student' and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_student_milestones(db, student_id)

@app.post("/student-milestones", response_model=StudentMilestoneResponse)
def create_student_milestone_endpoint(
    milestone: StudentMilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new milestone for a student"""
    if current_user.role.value == 'student' and current_user.id != milestone.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return create_student_milestone(db, milestone)

@app.put("/student-milestones/{milestone_id}", response_model=StudentMilestoneResponse)
def update_student_milestone_endpoint(
    milestone_id: int,
    milestone_update: StudentMilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a student's milestone"""
    # Get the milestone to check ownership
    milestone = db.query(StudentMilestone).filter(StudentMilestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    if current_user.role.value == 'student' and current_user.id != milestone.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_milestone = update_student_milestone(db, milestone_id, milestone.student_id, milestone_update)
    if not updated_milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return updated_milestone

@app.delete("/student-milestones/{milestone_id}")
def delete_student_milestone_endpoint(
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a student's milestone"""
    # Get the milestone to check ownership
    milestone = db.query(StudentMilestone).filter(StudentMilestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    if current_user.role.value == 'student' and current_user.id != milestone.student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = delete_student_milestone(db, milestone_id, milestone.student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return {"message": "Milestone deleted successfully"}

@app.get("/reports/available-types")
async def get_available_report_types():
    """Get available report types"""
    from report_generator import get_available_report_types
    return get_available_report_types()

# Advanced Attainment Analytics Endpoints

@app.get("/analytics/advanced/student-detailed/{student_id}")
def get_student_detailed_attainment(
    student_id: int,
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed attainment analysis for a specific student"""
    try:
        data = calculate_student_detailed_attainment(db, student_id, subject_id)
        if not data:
            raise HTTPException(status_code=404, detail="Student data not found")
        return data
    except Exception as e:
        logging.error(f"Error in student detailed attainment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/advanced/class-comparison/{subject_id}")
def get_class_comparison_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get class-wise comparison analytics"""
    try:
        data = calculate_class_comparison_analytics(db, subject_id)
        if not data:
            raise HTTPException(status_code=404, detail="Class data not found")
        return data
    except Exception as e:
        logging.error(f"Error in class comparison analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/advanced/exam-comparison/{subject_id}")
def get_exam_comparison_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get exam-wise comparison and trend analytics"""
    try:
        data = calculate_exam_comparison_analytics(db, subject_id)
        if not data:
            raise HTTPException(status_code=404, detail="Exam data not found")
        return data
    except Exception as e:
        logging.error(f"Error in exam comparison analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/advanced/comprehensive/{subject_id}")
def get_comprehensive_attainment_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive attainment analytics combining all analysis types"""
    try:
        data = calculate_comprehensive_attainment_analytics(db, subject_id)
        if not data:
            raise HTTPException(status_code=404, detail="Analytics data not found")
        return data
    except Exception as e:
        logging.error(f"Error in comprehensive analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Teacher Analytics Endpoints
@app.get("/analytics/teacher/overview/{subject_id}")
def get_teacher_overview_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overview analytics for teacher dashboard"""
    try:
        from advanced_attainment_analytics import calculate_class_comparison_analytics
        from attainment_analytics import calculate_subject_attainment_analytics
        
        # Get class comparison data
        class_data = calculate_class_comparison_analytics(db, subject_id)
        if not class_data:
            raise HTTPException(status_code=404, detail="No data found for this subject")
        
        # Get subject attainment data
        subject_data = calculate_subject_attainment_analytics(db, subject_id, "all")
        
        # Calculate overview metrics
        stats = class_data.get("class_statistics", {})
        grade_dist = class_data.get("grade_distribution", {})
        
        overview = {
            "total_students": stats.get("total_students", 0),
            "average_performance": stats.get("average_attainment", 0),
            "pass_rate": stats.get("passing_rate", 0),
            "top_performers": grade_dist.get("A_grade", 0),
            "co_attainment": subject_data.co_attainment if subject_data else {},
            "grade_distribution": grade_dist,
            "performance_trend": "improving" if stats.get("average_attainment", 0) >= 70 else "needs_attention"
        }
        
        return overview
    except Exception as e:
        logging.error(f"Error in teacher overview analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/teacher/students/{subject_id}")
def get_teacher_students_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed student performance analytics"""
    try:
        from advanced_attainment_analytics import calculate_class_comparison_analytics
        
        class_data = calculate_class_comparison_analytics(db, subject_id)
        if not class_data:
            raise HTTPException(status_code=404, detail="No data found for this subject")
        
        # Get student analytics from class data
        student_analytics = class_data.get("student_analytics", {})
        
        # Convert to list format for frontend
        students = []
        for student_id, data in student_analytics.items():
            students.append({
                "id": data.get("student_id", student_id),
                "name": data.get("student_name", f"Student {student_id}"),
                "username": f"student{student_id}",
                "total_marks": data.get("total_marks", 0),
                "percentage": data.get("overall_attainment", 0),
                "grade": data.get("grade", "F"),
                "rank": data.get("rank", 0),
                "co_attainment": data.get("co_attainment", {}),
                "exam_performance": data.get("exam_performance", [])
            })
        
        # Sort by rank
        students.sort(key=lambda x: x["rank"])
        
        return students
    except Exception as e:
        logging.error(f"Error in teacher students analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/teacher/questions/{subject_id}")
def get_teacher_questions_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed question analysis"""
    try:
        # Get all exams for this subject
        exams = db.query(Exam).filter(Exam.subject_id == subject_id).all()
        if not exams:
            raise HTTPException(status_code=404, detail="No exams found for this subject")
        
        questions_analysis = []
        
        for exam in exams:
            # Get questions for this exam
            questions = db.query(Question).filter(Question.exam_id == exam.id).all()
            
            for question in questions:
                # Get marks for this question
                marks = db.query(Mark).filter(Mark.question_id == question.id).all()
                
                if marks:
                    total_marks = sum(mark.marks_obtained for mark in marks)
                    avg_marks = total_marks / len(marks)
                    success_rate = (len([m for m in marks if m.marks_obtained >= question.max_marks * 0.6]) / len(marks)) * 100
                    attempt_rate = (len(marks) / len(db.query(User).filter(User.role == 'student').all())) * 100
                    
                    # Determine difficulty
                    if success_rate >= 80:
                        difficulty = "easy"
                    elif success_rate >= 60:
                        difficulty = "medium"
                    else:
                        difficulty = "hard"
                    
                    # Get CO mapping
                    co_weights = db.query(QuestionCOWeight).filter(QuestionCOWeight.question_id == question.id).all()
                    co_mapping = [weight.co_definition.code for weight in co_weights]
                    
                    questions_analysis.append({
                        "question_id": question.id,
                        "question_text": question.question_text or f"Question {question.id}",
                        "max_marks": question.max_marks,
                        "average_marks": round(avg_marks, 2),
                        "success_rate": round(success_rate, 2),
                        "attempt_rate": round(attempt_rate, 2),
                        "difficulty": difficulty,
                        "co_mapping": co_mapping,
                        "blooms_level": "Analysis",  # Default, can be enhanced
                        "discrimination_index": round(success_rate / 100, 2)
                    })
        
        return questions_analysis
    except Exception as e:
        logging.error(f"Error in teacher questions analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/teacher/exams/{subject_id}")
def get_teacher_exams_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed exam analysis"""
    try:
        exams = db.query(Exam).filter(Exam.subject_id == subject_id).all()
        if not exams:
            raise HTTPException(status_code=404, detail="No exams found for this subject")
        
        exam_analysis = []
        
        for exam in exams:
            # Get all marks for this exam
            marks = db.query(Mark).join(Question).filter(Question.exam_id == exam.id).all()
            
            if marks:
                # Group marks by student
                student_marks = {}
                for mark in marks:
                    if mark.student_id not in student_marks:
                        student_marks[mark.student_id] = []
                    student_marks[mark.student_id].append(mark.marks_obtained)
                
                # Calculate exam statistics
                total_students = len(student_marks)
                student_percentages = []
                
                for student_id, marks_list in student_marks.items():
                    total_marks = sum(marks_list)
                    percentage = (total_marks / exam.total_marks) * 100
                    student_percentages.append(percentage)
                
                avg_percentage = sum(student_percentages) / len(student_percentages) if student_percentages else 0
                pass_rate = (len([p for p in student_percentages if p >= 40]) / len(student_percentages)) * 100 if student_percentages else 0
                excellent_rate = (len([p for p in student_percentages if p >= 80]) / len(student_percentages)) * 100 if student_percentages else 0
                
                # Get CO attainment for this exam
                co_attainment = {}
                co_weights = db.query(QuestionCOWeight).join(Question).filter(Question.exam_id == exam.id).all()
                for weight in co_weights:
                    co_code = weight.co_definition.code
                    if co_code not in co_attainment:
                        co_attainment[co_code] = 0
                    co_attainment[co_code] += weight.weight_pct
                
                exam_analysis.append({
                    "exam_id": exam.id,
                    "exam_name": exam.name,
                    "exam_type": exam.exam_type,
                    "total_students": total_students,
                    "average_percentage": round(avg_percentage, 2),
                    "pass_rate": round(pass_rate, 2),
                    "excellent_rate": round(excellent_rate, 2),
                    "co_attainment": co_attainment,
                    "date": exam.exam_date.isoformat() if exam.exam_date else None
                })
        
        return exam_analysis
    except Exception as e:
        logging.error(f"Error in teacher exams analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/teacher/heatmap/{subject_id}")
def get_teacher_heatmap_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student performance heatmap data"""
    try:
        # Get all exams for this subject
        exams = db.query(Exam).filter(Exam.subject_id == subject_id).all()
        if not exams:
            raise HTTPException(status_code=404, detail="No exams found for this subject")
        
        # Get all questions across all exams
        all_questions = []
        for exam in exams:
            questions = db.query(Question).filter(Question.exam_id == exam.id).all()
            all_questions.extend(questions)
        
        if not all_questions:
            raise HTTPException(status_code=404, detail="No questions found for this subject")
        
        # Get all students for this subject's class
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        students = db.query(User).filter(
            and_(
                User.role == 'student',
                User.class_id == subject.class_id
            )
        ).all()
        
        heatmap_data = []
        
        for student in students:
            question_scores = {}
            total_marks = 0
            max_total_marks = 0
            
            for question in all_questions:
                mark = db.query(Mark).filter(
                    and_(
                        Mark.student_id == student.id,
                        Mark.question_id == question.id
                    )
                ).first()
                
                if mark:
                    question_scores[question.id] = mark.marks_obtained
                    total_marks += mark.marks_obtained
                else:
                    question_scores[question.id] = 0
                
                max_total_marks += question.max_marks
            
            total_percentage = (total_marks / max_total_marks * 100) if max_total_marks > 0 else 0
            
            heatmap_data.append({
                "student_id": student.id,
                "student_name": f"{student.first_name} {student.last_name}",
                "question_scores": question_scores,
                "total_percentage": round(total_percentage, 2)
            })
        
        return heatmap_data
    except Exception as e:
        logging.error(f"Error in teacher heatmap analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Comprehensive Teacher Analytics Endpoints

@app.get("/analytics/teacher/comprehensive/{subject_id}")
def get_comprehensive_teacher_analytics(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics combining all analysis types"""
    try:
        # Get all analytics data
        overview = get_teacher_overview_analytics(subject_id, db, current_user)
        students = get_teacher_students_analytics(subject_id, db, current_user)
        questions = get_teacher_questions_analytics(subject_id, db, current_user)
        exams = get_teacher_exams_analytics(subject_id, db, current_user)
        attainment = get_subject_attainment_analytics(subject_id, None, db, current_user)
        performance = get_teacher_overview_analytics(subject_id, db, current_user)
        
        # Get advanced analytics
        from advanced_attainment_analytics import calculate_class_comparison_analytics, calculate_exam_comparison_analytics
        class_comparison = calculate_class_comparison_analytics(db, subject_id)
        exam_comparison = calculate_exam_comparison_analytics(db, subject_id)
        
        # Generate insights
        insights = generate_comprehensive_insights(overview, students, questions, exams, attainment, class_comparison)
        
        comprehensive_data = {
            "overview": overview,
            "students": students,
            "questions": questions,
            "exams": exams,
            "attainment": attainment,
            "performance": performance,
            "class_comparison": class_comparison,
            "exam_comparison": exam_comparison,
            "insights": insights,
            "generated_at": datetime.now().isoformat()
        }
        
        return comprehensive_data
    except Exception as e:
        logging.error(f"Error in comprehensive teacher analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/teacher/predictive/{subject_id}")
def get_predictive_teacher_analytics(
    subject_id: int,
    timeframe: str = "medium",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered predictive analytics"""
    try:
        # Get current data for predictions
        overview = get_teacher_overview_analytics(subject_id, db, current_user)
        students = get_teacher_students_analytics(subject_id, db, current_user)
        class_comparison = calculate_class_comparison_analytics(db, subject_id)
        
        # Generate predictions based on current data
        predictions = generate_predictive_analytics(overview, students, class_comparison, timeframe)
        
        return predictions
    except Exception as e:
        logging.error(f"Error in predictive teacher analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions for comprehensive analytics

def generate_comprehensive_insights(overview, students, questions, exams, attainment, class_comparison):
    """Generate comprehensive insights from all analytics data"""
    insights = []
    
    # Performance insights
    if overview.get("average_performance", 0) < 60:
        insights.append({
            "type": "warning",
            "title": "Low Class Performance",
            "message": f"Class average is {overview.get('average_performance', 0):.1f}%, below the 60% threshold",
            "recommendation": "Consider additional support sessions and review teaching methods",
            "priority": "high"
        })
    
    if overview.get("pass_rate", 0) < 70:
        insights.append({
            "type": "error",
            "title": "Low Pass Rate",
            "message": f"Pass rate is {overview.get('pass_rate', 0):.1f}%, below the 70% target",
            "recommendation": "Implement remedial classes and personalized attention for struggling students",
            "priority": "high"
        })
    
    # Student insights
    at_risk_students = [s for s in students if s.get("percentage", 0) < 50]
    if len(at_risk_students) > 0:
        insights.append({
            "type": "warning",
            "title": "At-Risk Students Identified",
            "message": f"{len(at_risk_students)} student(s) are performing below 50%",
            "recommendation": "Schedule one-on-one sessions and provide additional support",
            "priority": "medium"
        })
    
    # Question insights
    difficult_questions = [q for q in questions if q.get("success_rate", 0) < 50]
    if len(difficult_questions) > 0:
        insights.append({
            "type": "info",
            "title": "Difficult Questions Identified",
            "message": f"{len(difficult_questions)} question(s) have success rate below 50%",
            "recommendation": "Review and potentially revise these questions or provide additional practice",
            "priority": "medium"
        })
    
    # CO attainment insights
    if attainment and hasattr(attainment, 'co_attainment'):
        low_cos = [co for co in attainment.co_attainment if co.actual_pct < 60]
        if len(low_cos) > 0:
            insights.append({
                "type": "info",
                "title": "Course Outcomes Need Attention",
                "message": f"{len(low_cos)} CO(s) are below 60% attainment",
                "recommendation": "Focus on improving teaching methods for these specific learning outcomes",
                "priority": "medium"
            })
    
    return insights

def generate_predictive_analytics(overview, students, class_comparison, timeframe):
    """Generate predictive analytics based on current data"""
    predictions = {
        "student_predictions": [],
        "class_predictions": {},
        "co_predictions": [],
        "exam_predictions": [],
        "insights": [],
        "recommendations": []
    }
    
    # Student predictions
    for student in students:
        current_perf = student.get("percentage", 0)
        # Simple prediction based on current performance and trend
        predicted_perf = current_perf + (5 if current_perf > 70 else -5 if current_perf < 50 else 0)
        
        predictions["student_predictions"].append({
            "student_id": student.get("id"),
            "student_name": student.get("name"),
            "current_performance": current_perf,
            "predicted_performance": max(0, min(100, predicted_perf)),
            "confidence_level": 0.7 + (current_perf / 100) * 0.3,  # Higher confidence for better performers
            "risk_factors": ["Low performance"] if current_perf < 50 else [],
            "recommendations": ["Focus on weak areas"] if current_perf < 60 else ["Maintain current performance"],
            "intervention_needed": current_perf < 50
        })
    
    # Class predictions
    current_avg = overview.get("average_performance", 0)
    predictions["class_predictions"] = {
        "predicted_average": max(0, min(100, current_avg + 5)),
        "predicted_pass_rate": max(0, min(100, overview.get("pass_rate", 0) + 5)),
        "predicted_excellent_rate": max(0, min(100, overview.get("top_performers", 0) + 3)),
        "confidence_interval": {
            "lower": max(0, current_avg - 10),
            "upper": min(100, current_avg + 10)
        },
        "trend_direction": "improving" if current_avg >= 70 else "needs_attention"
    }
    
    # Generate insights
    if current_avg < 60:
        predictions["insights"].append({
            "type": "warning",
            "title": "Performance Decline Predicted",
            "description": "Class average is expected to remain below 60% without intervention",
            "impact": "high",
            "timeframe": "1 month"
        })
    
    # Generate recommendations
    predictions["recommendations"] = [
        {
            "category": "Teaching Strategy",
            "priority": "high" if current_avg < 60 else "medium",
            "action": "Implement peer learning groups",
            "expected_impact": "15% improvement in class average",
            "timeline": "2 weeks"
        },
        {
            "category": "Student Support",
            "priority": "high",
            "action": "Schedule one-on-one sessions with at-risk students",
            "expected_impact": "20% improvement in student retention",
            "timeline": "1 week"
        }
    ]
    
    return predictions

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)