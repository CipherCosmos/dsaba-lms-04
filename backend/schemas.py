from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    hod = "hod"
    teacher = "teacher"
    student = "student"

class ExamType(str, Enum):
    internal1 = "internal1"
    internal2 = "internal2"
    final = "final"

class QuestionSection(str, Enum):
    A = "A"
    B = "B"
    C = "C"

class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

# Authentication schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    department_id: Optional[int] = None
    class_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    class_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    
    @field_validator('password')
    def validate_password(cls, v):
        if v and len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        from_attributes = True

# Department schemas
class DepartmentBase(BaseModel):
    name: str
    code: str
    hod_id: Optional[int] = None
    
    @field_validator('code')
    def validate_code(cls, v):
        if len(v) > 10:
            raise ValueError('Department code must be 10 characters or less')
        return v.upper()

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    hod_id: Optional[int] = None
    
    @field_validator('code')
    def validate_code(cls, v):
        if v and len(v) > 10:
            raise ValueError('Department code must be 10 characters or less')
        return v.upper() if v else v

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        from_attributes = True

# Class schemas
class ClassBase(BaseModel):
    name: str
    department_id: int
    semester: int = Field(..., ge=1, le=8)
    section: str
    
    @field_validator('section')
    def validate_section(cls, v):
        return v.upper()

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    semester: Optional[int] = Field(None, ge=1, le=8)
    section: Optional[str] = None
    
    @field_validator('section')
    def validate_section(cls, v):
        return v.upper() if v else v

class ClassResponse(ClassBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        from_attributes = True

# Subject schemas
class SubjectBase(BaseModel):
    name: str
    code: str
    class_id: int
    teacher_id: Optional[int] = None
    cos: List[str] = []
    pos: List[str] = []
    credits: int = Field(default=3, ge=1, le=6)

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    class_id: Optional[int] = None
    teacher_id: Optional[int] = None
    cos: Optional[List[str]] = None
    pos: Optional[List[str]] = None
    credits: Optional[int] = Field(None, ge=1, le=6)

class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        from_attributes = True

# Question schemas
class QuestionBase(BaseModel):
    question_number: str
    max_marks: float = Field(..., ge=0.5)
    co_mapping: List[str] = []
    po_mapping: List[str] = []
    section: QuestionSection
    blooms_level: str
    difficulty: Difficulty

class QuestionCreate(QuestionBase):
    exam_id: int

class QuestionUpdate(BaseModel):
    question_number: Optional[str] = None
    max_marks: Optional[float] = Field(None, ge=0.5)
    co_mapping: Optional[List[str]] = None
    po_mapping: Optional[List[str]] = None
    section: Optional[QuestionSection] = None
    blooms_level: Optional[str] = None
    difficulty: Optional[Difficulty] = None

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        from_attributes = True

# Exam schemas
class ExamBase(BaseModel):
    name: str
    subject_id: int
    exam_type: ExamType
    exam_date: Optional[datetime] = None
    duration: Optional[int] = Field(None, ge=30, le=300)
    total_marks: float = Field(..., ge=1)

class ExamCreate(ExamBase):
    questions: List[QuestionCreate] = []
    
    @model_validator(mode='after')
    def validate_questions(self):
        if self.questions:
            total_marks = sum(q.max_marks for q in self.questions)
            if self.total_marks != total_marks:
                self.total_marks = total_marks
        return self

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    subject_id: Optional[int] = None
    exam_type: Optional[ExamType] = None
    exam_date: Optional[datetime] = None
    duration: Optional[int] = Field(None, ge=30, le=300)
    total_marks: Optional[float] = Field(None, ge=1)

class ExamResponse(ExamBase):
    id: int
    created_at: datetime
    questions: List[QuestionResponse] = []
    
    class Config:
        from_attributes = True
        from_attributes = True

# Mark schemas
class MarkBase(BaseModel):
    exam_id: int
    student_id: int
    question_id: int
    marks_obtained: float = Field(..., ge=0)

class MarkCreate(MarkBase):
    pass

class MarkUpdate(BaseModel):
    marks_obtained: float = Field(..., ge=0)

class MarkResponse(MarkBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        from_attributes = True

# Analytics schemas
class StudentAnalyticsResponse(BaseModel):
    percentage: float
    rank: int
    total_marks: float
    performance_trend: List[Dict[str, Any]]
    co_attainment: Dict[str, float]
    po_attainment: Dict[str, float]

class TeacherAnalyticsResponse(BaseModel):
    class_performance: Dict[str, Any]
    question_analysis: List[Dict[str, Any]]
    co_po_attainment: Dict[str, Any]

class HODAnalyticsResponse(BaseModel):
    department_overview: Dict[str, Any]
    subject_performance: List[Dict[str, Any]]
    teacher_performance: List[Dict[str, Any]]

# Report schemas
class ReportGenerateRequest(BaseModel):
    report_type: str
    filters: Dict[str, Any] = {}
    format: str = Field(default="pdf", pattern="^(pdf|excel)$")
    
class ReportTemplate(BaseModel):
    id: str
    name: str
    description: str
    filters: List[str]

# Dashboard schemas
class DashboardStats(BaseModel):
    stats: Dict[str, Any]
    recent_activity: List[Dict[str, Any]] = []

# File upload schemas
class FileUploadResponse(BaseModel):
    message: str
    processed_records: int = 0
    errors: List[str] = []