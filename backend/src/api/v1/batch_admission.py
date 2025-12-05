"""
Batch Admission API Endpoints
Handles new batch creation and bulk student admissions
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from datetime import date

from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session
from src.api.v1.auth import get_current_user
from src.domain.entities.user import User as UserEntity
from src.application.services.batch_admission_service import BatchAdmissionService
from src.domain.exceptions import BusinessRuleViolationError, EntityNotFoundError, ValidationError

router = APIRouter(prefix="/batch-admission", tags=["Batch Admission"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CreateBatchRequest(BaseModel):
    """Request to create a new batch"""
    department_id: int = Field(..., gt=0)
    batch_id: int = Field(..., gt=0, description="Program ID (B.Tech, M.Tech, etc.)")
    academic_year_id: int = Field(..., gt=0)
    admission_year: int = Field(..., ge=2000, le=2100)
    num_sections: int = Field(1, ge=1, le=10, description="Number of sections to create")


class BatchResponse(BaseModel):
    """Batch instance response"""
    id: int
    department_id: int
    batch_id: int
    admission_year: int
    current_year: int
    expected_graduation_year: int
    num_sections: int

    class Config:
        from_attributes = True


class StudentDataModel(BaseModel):
    """Individual student data for bulk admission"""
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: Optional[str] = None


class BulkAdmitRequest(BaseModel):
    """Request for bulk student admission"""
    batch_instance_id: int
    students: List[StudentDataModel]
    section_id: Optional[int] = None
    auto_assign_sections: bool = True


class ValidationResponse(BaseModel):
    """Validation result response"""
    total: int
    valid: int
    is_valid: bool
    errors: List[dict]
    warnings: List[dict]


class BulkAdmissionResponse(BaseModel):
    """Bulk admission result"""
    total: int
    admitted: int
    failed: int
    admitted_students: List[dict]
    failed_students: List[dict]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/create-batch", response_model=BatchResponse)
async def create_new_batch(
    request: CreateBatchRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Create a new batch instance for annual admission
    
    **Permissions**: Admin, Principal
    """
    if current_user.role not in ["admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Principal can create batches"
        )
    
    try:
        service = BatchAdmissionService(db)
        batch_instance = service.create_new_batch(
            department_id=request.department_id,
            batch_id=request.batch_id,
            academic_year_id=request.academic_year_id,
            admission_year=request.admission_year,
            num_sections=request.num_sections,
            created_by=current_user.id
        )
        
        return BatchResponse(
            id=batch_instance.id,
            department_id=batch_instance.department_id,
            batch_id=batch_instance.batch_id,
            admission_year=batch_instance.admission_year,
            current_year=batch_instance.current_year,
            expected_graduation_year=batch_instance.expected_graduation_year,
            num_sections=request.num_sections
        )
    
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/validate-students", response_model=ValidationResponse)
async def validate_bulk_students(
    request: BulkAdmitRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Validate bulk student data before admission
    
    **Permissions**: Admin, Principal, HOD
    """
    if current_user.role not in ["admin", "principal", "hod"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        service = BatchAdmissionService(db)
        students_data = [s.dict() for s in request.students]
        validation = await service.validate_bulk_students(
            students_data=students_data,
            batch_instance_id=request.batch_instance_id
        )
        return ValidationResponse(**validation)
    
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/bulk-admit", response_model=BulkAdmissionResponse)
async def bulk_admit_students(
    request: BulkAdmitRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Bulk admit students to a batch
    
    **Permissions**: Admin, Principal
    """
    if current_user.role not in ["admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Principal can admit students"
        )
    
    try:
        service = BatchAdmissionService(db)
        students_data = [s.dict() for s in request.students]
        result = await service.bulk_admit_students(
            students_data=students_data,
            batch_instance_id=request.batch_instance_id,
            section_id=request.section_id,
            auto_assign_sections=request.auto_assign_sections,
            admitted_by=current_user.id
        )
        return BulkAdmissionResponse(**result)
    
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except BusinessRuleViolationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/upload-file")
async def upload_bulk_admission_file(
    batch_instance_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Upload CSV/Excel file for bulk student admission
    
    **Permissions**: Admin, Principal
    
    **File Format**: CSV or Excel with columns:
    - first_name (required)
    - last_name (required)
    - email (required)
    - phone (optional)
    - password (optional, defaults to Student@123)
    """
    if current_user.role not in ["admin", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Principal can upload admission files"
        )
    
    # Validate file type
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in ['csv', 'xlsx', 'xls']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        service = BatchAdmissionService(db)
        students_data = await service.parse_bulk_upload_file(
            file_content=content,
            file_type=file_extension
        )
        
        # Validate
        validation = await service.validate_bulk_students(
            students_data=students_data,
            batch_instance_id=batch_instance_id
        )
        
        if not validation['is_valid']:
            return {
                "status": "validation_failed",
                "validation": validation,
                "message": f"Found {len(validation['errors'])} validation errors. Fix and re-upload."
            }
        
        # Auto-admit if valid
        result = await service.bulk_admit_students(
            students_data=students_data,
            batch_instance_id=batch_instance_id,
            auto_assign_sections=True,
            admitted_by=current_user.id
        )
        
        return {
            "status": "success",
            "result": result,
            "message": f"Successfully admitted {result['admitted']} students"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )


@router.get("/template")
async def download_admission_template(
    current_user: UserEntity = Depends(get_current_user)
):
    """
    Download CSV template for bulk student admission
    
    **Permissions**: Any authenticated user
    """
    import io
    import csv
    from fastapi.responses import StreamingResponse
    
    # Create CSV template
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow(['first_name', 'last_name', 'email', 'phone', 'password'])
    
    # Example row
    writer.writerow(['John', 'Doe', 'john.doe@example.com', '+919876543210', 'Student@123'])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bulk_admission_template.csv"}
    )
