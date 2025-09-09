from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
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
from fastapi.exceptions import RequestValidationError
from fastapi import Request

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
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return create_department(db, department)

@app.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department_endpoint(
    department_id: int,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
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
    if current_user.role.value not in ['admin', 'hod']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
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
    
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

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
    
    return bulk_create_marks_db(db, marks)

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

# Reports endpoints
@app.post("/reports/generate")
async def generate_report_endpoint(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ['hod', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        report_data = generate_report(db, request.report_type, request.filters, request.format)
        
        if request.format == 'pdf':
            content_type = 'application/pdf'
            filename = f"{request.report_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
        else:
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            filename = f"{request.report_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(report_data),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

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
        marks_data = await process_marks_excel_upload(file, exam_id, db)
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)