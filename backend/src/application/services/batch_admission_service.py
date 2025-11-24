"""
Batch Admission Service
Handles annual batch admissions, bulk student import, and section allocation
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import re

from src.domain.exceptions import BusinessRuleViolationError, EntityNotFoundError, ValidationError
from src.infrastructure.database.models import (
    StudentModel,
    UserModel,
    BatchInstanceModel,
    SectionModel,
    DepartmentModel,
    AcademicYearModel,
    StudentEnrollmentModel
)


class BatchAdmissionService:
    """Service for managing batch admissions and bulk student operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_new_batch(
        self,
        department_id: int,
        batch_id: int,
        academic_year_id: int,
        admission_year: int,
        num_sections: int = 1,
        created_by: int
    ) -> BatchInstanceModel:
        """
        Create a new batch instance for annual admission
        
        Args:
            department_id: Department ID
            batch_id: Program ID (B.Tech, M.Tech, etc.)
            academic_year_id: Academic year ID
            admission_year: Year of admission (e.g., 2024)
            num_sections: Number of sections to create
            created_by: User ID creating the batch
        
        Returns:
            Created BatchInstanceModel
        """
        # Check if batch already exists
        existing = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.department_id == department_id,
            BatchInstanceModel.batch_id == batch_id,
            BatchInstanceModel.admission_year == admission_year
        ).first()
        
        if existing:
            raise BusinessRuleViolationError(
                f"Batch already exists for {admission_year} admission"
            )
        
        # Get batch to calculate expected graduation
        from src.infrastructure.database.models import BatchModel
        batch = self.db.query(BatchModel).filter(BatchModel.id == batch_id).first()
        if not batch:
            raise EntityNotFoundError(f"Batch {batch_id} not found")
        
        # Create batch instance
        batch_instance = BatchInstanceModel(
            academic_year_id=academic_year_id,
            department_id=department_id,
            batch_id=batch_id,
            admission_year=admission_year,
            current_semester=1,
            current_year=1,
            expected_graduation_year=admission_year + batch.duration_years,
            is_active=True
        )
        
        self.db.add(batch_instance)
        self.db.flush()  # Get ID
        
        # Create sections
        sections = []
        for i in range(1, num_sections + 1):
            section = SectionModel(
                batch_instance_id=batch_instance.id,
                name=chr(64 + i),  # A, B, C, etc.
                capacity=60,
                is_active=True
            )
            self.db.add(section)
            sections.append(section)
        
        self.db.commit()
        self.db.refresh(batch_instance)
        
        return batch_instance
    
    def generate_roll_number(
        self,
        department_code: str,
        admission_year: int,
        sequence: int
    ) -> str:
        """
        Generate roll number in format: DEPT/YEAR/###
        Example: CSE/2024/001
        
        Args:
            department_code: Department code (e.g., CSE, ECE)
            admission_year: Year of admission
            sequence: Sequential number
        
        Returns:
            Formatted roll number
        """
        return f"{department_code}/{admission_year}/{sequence:03d}"
    
    async def validate_bulk_students(
        self,
        students_data: List[Dict[str, Any]],
        batch_instance_id: int
    ) -> Dict[str, Any]:
        """
        Validate bulk student data before import
        
        Args:
            students_data: List of student dictionaries
            batch_instance_id: Batch instance to import into
        
        Returns:
            Validation results with errors and warnings
        """
        errors = []
        warnings = []
        valid_count = 0
        
        # Required fields
        required_fields = ['first_name', 'last_name', 'email']
        
        # Get batch instance
        batch_instance = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.id == batch_instance_id
        ).first()
        
        if not batch_instance:
            raise EntityNotFoundError(f"Batch instance {batch_instance_id} not found")
        
        # Get department code
        department = self.db.query(DepartmentModel).filter(
            DepartmentModel.id == batch_instance.department_id
        ).first()
        
        # Validate each student
        for idx, student in enumerate(students_data, 1):
            row_errors = []
            
            # Check required fields
            for field in required_fields:
                if not student.get(field):
                    row_errors.append(f"Missing {field}")
            
            # Validate email format
            email = student.get('email', '')
            if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                row_errors.append("Invalid email format")
            
            # Check for duplicate email
            if email:
                existing = self.db.query(UserModel).filter(
                    UserModel.email == email
                ).first()
                if existing:
                    row_errors.append(f"Email {email} already exists")
            
            # Validate phone (if provided)
            phone = student.get('phone')
            if phone and not re.match(r'^\+?[\d\s-]{10,}$', phone):
                warnings.append({
                    'row': idx,
                    'message': 'Invalid phone format (will be skipped)'
                })
            
            if row_errors:
                errors.append({
                    'row': idx,
                    'student': f"{student.get('first_name', '')} {student.get('last_name', '')}",
                    'errors': row_errors
                })
            else:
                valid_count += 1
        
        return {
            'total': len(students_data),
            'valid': valid_count,
            'errors': errors,
            'warnings': warnings,
            'is_valid': len(errors) == 0
        }
    
    async def bulk_admit_students(
        self,
        students_data: List[Dict[str, Any]],
        batch_instance_id: int,
        section_id: Optional[int] = None,
        auto_assign_sections: bool = True,
        admitted_by: int
    ) -> Dict[str, Any]:
        """
        Bulk admit students to a batch
        
        Args:
            students_data: List of student data dictionaries
            batch_instance_id: Batch instance ID
            section_id: Optional specific section (if not auto-assigning)
            auto_assign_sections: Auto-distribute students across sections
            admitted_by: User ID performing admission
        
        Returns:
            Summary of admission results
        """
        # Validate first
        validation = await self.validate_bulk_students(students_data, batch_instance_id)
        if not validation['is_valid']:
            raise ValidationError(
                f"Validation failed: {len(validation['errors'])} errors found"
            )
        
        # Get batch instance
        batch_instance = self.db.query(BatchInstanceModel).filter(
            BatchInstanceModel.id == batch_instance_id
        ).first()
        
        # Get department
        department = self.db.query(DepartmentModel).filter(
            DepartmentModel.id == batch_instance.department_id
        ).first()
        
        # Get sections
        if auto_assign_sections:
            sections = self.db.query(SectionModel).filter(
                SectionModel.batch_instance_id == batch_instance_id,
                SectionModel.is_active == True
            ).all()
            
            if not sections:
                raise BusinessRuleViolationError("No active sections found for batch")
        else:
            if not section_id:
                raise ValidationError("section_id required when not auto-assigning")
            sections = [self.db.query(SectionModel).filter(SectionModel.id == section_id).first()]
        
        # Get next roll number sequence
        last_student = self.db.query(StudentModel).filter(
            StudentModel.batch_instance_id == batch_instance_id
        ).order_by(StudentModel.id.desc()).first()
        
        sequence = 1
        if last_student and last_student.roll_no:
            # Extract sequence from roll number
            match = re.search(r'/(\d+)$', last_student.roll_no)
            if match:
                sequence = int(match.group(1)) + 1
        
        admitted = []
        failed = []
        section_idx = 0
        
        for student_data in students_data:
            try:
                # Create user account
                user = UserModel(
                    email=student_data['email'],
                    username=student_data['email'].split('@')[0],
                    first_name=student_data['first_name'],
                    last_name=student_data['last_name'],
                    phone=student_data.get('phone'),
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                user.set_password(student_data.get('password', 'Student@123'))  # Default password
                self.db.add(user)
                self.db.flush()
                
                # Assign role
                from src.infrastructure.database.models import UserRoleModel
                user_role = UserRoleModel(
                    user_id=user.id,
                    role_id=4,  # Student role ID
                    granted_by=admitted_by,
                    granted_at=datetime.utcnow()
                )
                self.db.add(user_role)
                
                # Generate roll number
                roll_no = self.generate_roll_number(
                    department.code,
                    batch_instance.admission_year,
                    sequence
                )
                sequence += 1
                
                # Select section (round-robin if auto-assigning)
                if auto_assign_sections:
                    selected_section = sections[section_idx % len(sections)]
                    section_idx += 1
                else:
                    selected_section = sections[0]
                
                # Create student profile
                student = StudentModel(
                    user_id=user.id,
                    roll_no=roll_no,
                    batch_instance_id=batch_instance_id,
                    section_id=selected_section.id,
                    department_id=department.id,
                    academic_year_id=batch_instance.academic_year_id,
                    current_semester_id=None,  # Will be set when semester starts
                    current_year_level=1,
                    expected_graduation_year=batch_instance.expected_graduation_year,
                    admission_date=date.today(),
                    is_detained=False,
                    backlog_count=0
                )
                self.db.add(student)
                self.db.flush()
                
                # Create admission progression record
                from src.infrastructure.database.models import StudentYearProgressionModel
                admission_record = StudentYearProgressionModel(
                    student_id=student.id,
                    from_year_level=0,  # 0 = admission
                    to_year_level=1,
                    academic_year_id=batch_instance.academic_year_id,
                    promotion_date=date.today(),
                    promotion_type='admission',
                    promoted_by=admitted_by,
                    notes=f"Admitted to {department.name} - {batch_instance.admission_year} batch"
                )
                self.db.add(admission_record)
                
                admitted.append({
                    'roll_no': roll_no,
                    'name': f"{student_data['first_name']} {student_data['last_name']}",
                    'email': student_data['email'],
                    'section': selected_section.name
                })
                
            except Exception as e:
                failed.append({
                    'student': f"{student_data.get('first_name', '')} {student_data.get('last_name', '')}",
                    'error': str(e)
                })
        
        # Commit all changes
        self.db.commit()
        
        return {
            'total': len(students_data),
            'admitted': len(admitted),
            'failed': len(failed),
            'admitted_students': admitted,
            'failed_students': failed
        }
    
    async def parse_bulk_upload_file(
        self,
        file_content: bytes,
        file_type: str
    ) -> List[Dict[str, Any]]:
        """
        Parse bulk upload file (CSV/Excel)
        
        Args:
            file_content: File content as bytes
            file_type: 'csv' or 'excel'
        
        Returns:
            List of student data dictionaries
        """
        import io
        
        if file_type == 'csv':
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_type in ['excel', 'xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValidationError(f"Unsupported file type: {file_type}")
        
        # Convert to list of dicts
        students = df.to_dict('records')
        
        # Normalize column names (lowercase, replace spaces with underscores)
        normalized = []
        for student in students:
            normalized_student = {}
            for key, value in student.items():
                normalized_key = str(key).lower().replace(' ', '_')
                # Handle NaN values
                if pd.isna(value):
                    normalized_student[normalized_key] = None
                else:
                    normalized_student[normalized_key] = value
            normalized.append(normalized_student)
        
        return normalized
