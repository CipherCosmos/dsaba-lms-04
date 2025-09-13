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

# Exam question schema for exam creation (without exam_id)
class ExamQuestionCreate(BaseModel):
    question_number: str
    max_marks: float = Field(..., ge=0.5)
    co_mapping: List[str] = []
    po_mapping: List[str] = []
    section: QuestionSection
    blooms_level: str
    difficulty: Difficulty

# Exam schemas
class ExamBase(BaseModel):
    name: str
    subject_id: int
    exam_type: ExamType
    exam_date: Optional[datetime] = None
    duration: Optional[int] = Field(None, ge=30, le=300)
    total_marks: float = Field(..., ge=1)

class ExamCreate(ExamBase):
    questions: List[ExamQuestionCreate] = []

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
    questions: Optional[List[ExamQuestionCreate]] = None

    @model_validator(mode='after')
    def validate_questions(self):
        if self.questions:
            total_marks = sum(q.max_marks for q in self.questions)
            if self.total_marks and self.total_marks != total_marks:
                self.total_marks = total_marks
        return self

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

# CO/PO/PSO Framework Schemas

# CO Definition schemas
class CODefinitionBase(BaseModel):
    code: str = Field(..., max_length=10)
    title: str = Field(..., max_length=200)
    description: Optional[str] = None

class CODefinitionCreate(CODefinitionBase):
    subject_id: int

class CODefinitionUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=10)
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None

class CODefinitionResponse(CODefinitionBase):
    id: int
    subject_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# PO Definition schemas
class PODefinitionBase(BaseModel):
    code: str = Field(..., max_length=10)
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    type: str = Field(default="PO", pattern="^(PO|PSO)$")

class PODefinitionCreate(PODefinitionBase):
    department_id: int

class PODefinitionUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=10)
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    type: Optional[str] = Field(None, pattern="^(PO|PSO)$")

class PODefinitionResponse(PODefinitionBase):
    id: int
    department_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# CO Target schemas
class COTargetBase(BaseModel):
    co_code: str = Field(..., max_length=10)
    target_pct: float = Field(..., ge=0, le=100)
    l1_threshold: float = Field(default=60.0, ge=0, le=100)
    l2_threshold: float = Field(default=70.0, ge=0, le=100)
    l3_threshold: float = Field(default=80.0, ge=0, le=100)

class COTargetCreate(COTargetBase):
    subject_id: int

class COTargetUpdate(BaseModel):
    co_code: Optional[str] = Field(None, max_length=10)
    target_pct: Optional[float] = Field(None, ge=0, le=100)
    l1_threshold: Optional[float] = Field(None, ge=0, le=100)
    l2_threshold: Optional[float] = Field(None, ge=0, le=100)
    l3_threshold: Optional[float] = Field(None, ge=0, le=100)

class COTargetResponse(COTargetBase):
    id: int
    subject_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Assessment Weight schemas
class AssessmentWeightBase(BaseModel):
    exam_type: ExamType
    weight_pct: float = Field(..., ge=0, le=100)

class AssessmentWeightCreate(AssessmentWeightBase):
    subject_id: int

class AssessmentWeightUpdate(BaseModel):
    exam_type: Optional[ExamType] = None
    weight_pct: Optional[float] = Field(None, ge=0, le=100)

class AssessmentWeightResponse(AssessmentWeightBase):
    id: int
    subject_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# CO-PO Matrix schemas
class COPOMatrixBase(BaseModel):
    co_code: str = Field(..., max_length=10)
    po_code: str = Field(..., max_length=10)
    strength: int = Field(..., ge=1, le=3)

class COPOMatrixCreate(COPOMatrixBase):
    subject_id: int

class COPOMatrixUpdate(BaseModel):
    co_code: Optional[str] = Field(None, max_length=10)
    po_code: Optional[str] = Field(None, max_length=10)
    strength: Optional[int] = Field(None, ge=1, le=3)

class COPOMatrixResponse(COPOMatrixBase):
    id: int
    subject_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Question CO Weight schemas
class QuestionCOWeightBase(BaseModel):
    co_code: str = Field(..., max_length=10)
    weight_pct: float = Field(..., ge=0, le=100)

class QuestionCOWeightCreate(QuestionCOWeightBase):
    question_id: int

class QuestionCOWeightUpdate(BaseModel):
    co_code: Optional[str] = Field(None, max_length=10)
    weight_pct: Optional[float] = Field(None, ge=0, le=100)

class QuestionCOWeightResponse(QuestionCOWeightBase):
    id: int
    question_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Indirect Attainment schemas
class IndirectAttainmentBase(BaseModel):
    source: str = Field(..., max_length=100)
    po_code: Optional[str] = Field(None, max_length=10)
    co_code: Optional[str] = Field(None, max_length=10)
    value_pct: float = Field(..., ge=0, le=100)
    term: Optional[str] = Field(None, max_length=20)

class IndirectAttainmentCreate(IndirectAttainmentBase):
    subject_id: int

class IndirectAttainmentUpdate(BaseModel):
    source: Optional[str] = Field(None, max_length=100)
    po_code: Optional[str] = Field(None, max_length=10)
    co_code: Optional[str] = Field(None, max_length=10)
    value_pct: Optional[float] = Field(None, ge=0, le=100)
    term: Optional[str] = Field(None, max_length=20)

class IndirectAttainmentResponse(IndirectAttainmentBase):
    id: int
    subject_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Attainment Analytics schemas
class COAttainmentDetail(BaseModel):
    co_code: str
    target_pct: float
    actual_pct: float
    level: str  # L1, L2, L3
    gap: float
    coverage: float
    evidence: List[Dict[str, Any]]  # Question details

class POAttainmentDetail(BaseModel):
    po_code: str
    direct_pct: float
    indirect_pct: float
    total_pct: float
    level: str
    gap: float
    contributing_cos: List[str]

class SubjectAttainmentResponse(BaseModel):
    subject_id: int
    subject_name: str
    co_attainment: List[COAttainmentDetail]
    po_attainment: List[POAttainmentDetail]
    blooms_distribution: Dict[str, Any]
    difficulty_mix: Dict[str, Any]
    co_coverage: float

class StudentAttainmentResponse(BaseModel):
    student_id: int
    student_name: str
    subject_id: int
    subject_name: str
    co_attainment: List[Dict[str, Any]]  # Per CO attainment by assessment
    evidence: List[Dict[str, Any]]  # Question evidence

class ClassAttainmentResponse(BaseModel):
    class_id: int
    class_name: str
    term: str
    co_attainment: List[COAttainmentDetail]
    po_attainment: List[POAttainmentDetail]
    student_count: int
    pass_rate: float

class ProgramAttainmentResponse(BaseModel):
    department_id: int
    department_name: str
    year: int
    po_attainment: List[POAttainmentDetail]
    program_kpis: Dict[str, Any]
    cohort_analysis: Dict[str, Any]

# Bulk operations schemas
class BulkCOTargetUpdate(BaseModel):
    subject_id: int
    co_targets: List[COTargetCreate]

class BulkAssessmentWeightUpdate(BaseModel):
    subject_id: int
    assessment_weights: List[AssessmentWeightCreate]

class BulkCOPOMatrixUpdate(BaseModel):
    subject_id: int
    co_po_matrix: List[COPOMatrixCreate]

class BulkQuestionCOWeightUpdate(BaseModel):
    question_id: int
    co_weights: List[QuestionCOWeightCreate]