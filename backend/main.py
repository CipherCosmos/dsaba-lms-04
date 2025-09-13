from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
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
from advanced_analytics_backend import calculate_advanced_student_analytics
from strategic_dashboard_backend import calculate_strategic_dashboard_data
from fastapi.exceptions import RequestValidationError
from fastapi import Request

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    # Check if username or email already exists
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
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

    # Log incoming data for debugging
    logging.warning(f"Received exam data: {json.dumps(exam.dict(), default=str)}")

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
    if current_user.role.value not in ['teacher', 'admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify teacher owns the exam
    if current_user.role.value == 'teacher':
        existing_exam = get_exam_by_id_db(db, exam_id)
        if not existing_exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        subject = get_subject_by_id(db, existing_exam.subject_id)
        if not subject or subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this exam")
    
    success = delete_exam(db, exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
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
    
    return get_marks_by_exam_id(db, exam_id)

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
    
    # After bulk create, broadcast update via WebSocket if connected
    try:
        result = bulk_create_marks_db(db, marks)
        # For now, simple broadcast; in production, use channel-specific
        # Note: WebSocket broadcast would need to be handled asynchronously
        # await manager.broadcast(f"Marks updated for exam {marks[0].exam_id}")
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
    db: Session = Depends(get_db)
):
    """Get CO-PO mapping matrix for a subject - Temporary: No auth for teachers"""
    print(f"DEBUG CO-PO-MAPPING: Temporarily allowing access to subject {subject_id}")
    
    # Temporarily remove authentication for teachers as requested
    # TODO: Implement proper teacher authentication later
    co_po_matrix = get_co_po_matrix_by_subject(db, subject_id)
    return co_po_matrix

@app.get("/analytics/co-attainment/{subject_id}")
def get_co_attainment_analysis(
    subject_id: int,
    exam_type: str = "all",
    db: Session = Depends(get_db)
):
    """Get CO attainment analysis for a subject - Temporary: No auth for teachers"""
    print(f"DEBUG CO-ATTAINMENT: Temporarily allowing access to subject {subject_id}, exam type {exam_type}")
    
    # Temporarily remove authentication for teachers as requested
    # TODO: Implement proper teacher authentication later
    analysis = get_co_attainment_analysis_db(db, subject_id, exam_type)
    return analysis

@app.get("/analytics/po-attainment/{subject_id}")
def get_po_attainment_analysis(
    subject_id: int,
    exam_type: str = "all",
    db: Session = Depends(get_db)
):
    """Get PO attainment analysis for a subject - Temporary: No auth for teachers"""
    print(f"DEBUG PO-ATTAINMENT: Temporarily allowing access to subject {subject_id}, exam type {exam_type}")
    
    # Temporarily remove authentication for teachers as requested
    # TODO: Implement proper teacher authentication later
    analysis = get_po_attainment_analysis_db(db, subject_id, exam_type)
    return analysis

@app.get("/analytics/student-performance/{subject_id}")
def get_student_performance_analysis(
    subject_id: int,
    student_id: int = None,
    exam_type: str = "all",
    db: Session = Depends(get_db)
):
    """Get detailed student performance analysis - Temporary: No auth for teachers"""
    print(f"DEBUG STUDENT-PERFORMANCE: Temporarily allowing access to subject {subject_id}, student {student_id}, exam type {exam_type}")
    
    # Temporarily remove authentication for teachers as requested
    # TODO: Implement proper teacher authentication later
    analysis = get_student_performance_analysis_db(db, subject_id, student_id, exam_type)
    return analysis

@app.get("/analytics/class-performance/{subject_id}")
def get_class_performance_analysis(
    subject_id: int,
    exam_type: str = "all",
    db: Session = Depends(get_db)
):
    """Get class performance analysis with comparative charts - Temporary: No auth for teachers"""
    print(f"DEBUG CLASS-PERFORMANCE: Temporarily allowing access to subject {subject_id}, exam type {exam_type}")
    
    # Temporarily remove authentication for teachers as requested
    # TODO: Implement proper teacher authentication later
    analysis = get_class_performance_analysis_db(db, subject_id, exam_type)
    return analysis

# Reports endpoints - now async
@app.post("/reports/generate")
def generate_report_endpoint(
    request: ReportGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['hod', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not TASKS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Background tasks not available")
    
    # Trigger async task
    task = generate_async_report.delay(request.report_type, request.filters, request.format)
    
    return {
        "task_id": task.id,
        "status": "started",
        "message": "Report generation started asynchronously. Poll /reports/status/{task_id} for updates."
    }

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
    if current_user.role.value not in ['hod', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_available_report_templates()

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
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only see their own department
    if current_user.role.value == 'hod' and current_user.department_id != department_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return get_po_definitions_by_department(db, department_id)

@app.post("/departments/{department_id}/pos", response_model=PODefinitionResponse)
def create_department_po(
    department_id: int,
    po_definition: PODefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only create for their own department
    if current_user.role.value == 'hod' and current_user.department_id != department_id:
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
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only update their own department's POs
    if current_user.role.value == 'hod':
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
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # HODs can only delete their own department's POs
    if current_user.role.value == 'hod':
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
@app.get("/subjects/{subject_id}/co-po-matrix", response_model=List[COPOMatrixResponse])
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
                    co_code=co_definition.code,
                    po_code=po_code,
                    mapping_strength=1.0  # Default strength
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
    mappings = db.query(COPOMatrix).filter(COPOMatrix.co_id == co_id).all()
    
    return {
        "co_id": co_id,
        "mapped_pos": [mapping.po_code for mapping in mappings]
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)