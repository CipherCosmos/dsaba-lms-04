"""
Bulk Upload Service
Business logic for bulk uploads (questions, marks)
"""

import pandas as pd
import io
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
from fastapi import UploadFile

from src.domain.repositories.question_repository import IQuestionRepository
from src.domain.repositories.exam_repository import IExamRepository
from src.domain.repositories.mark_repository import IMarkRepository
from src.domain.repositories.user_repository import IUserRepository
from src.domain.entities.question import Question
from src.domain.entities.mark import Mark
from src.domain.exceptions import EntityNotFoundError, ValidationError


class BulkUploadService:
    """
    Bulk upload service
    
    Handles bulk uploads for questions and marks
    """
    
    def __init__(
        self,
        question_repository: IQuestionRepository,
        exam_repository: IExamRepository,
        mark_repository: IMarkRepository,
        user_repository: IUserRepository
    ):
        self.question_repository = question_repository
        self.exam_repository = exam_repository
        self.mark_repository = mark_repository
        self.user_repository = user_repository
    
    async def upload_questions_from_excel(
        self,
        exam_id: int,
        file: UploadFile
    ) -> Dict[str, Any]:
        """
        Upload questions from Excel/CSV file
        
        Expected format:
        - question_no, question_text, section, marks_per_question, required_count, optional_count, blooms_level, difficulty
        
        Args:
            exam_id: Exam ID
            file: Uploaded file (Excel or CSV)
        
        Returns:
            Upload result with success/failure counts
        """
        # Verify exam exists
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        
        # Read file content
        content = await file.read()
        
        # Parse based on file extension
        file_ext = file.filename.split('.')[-1].lower()
        
        try:
            if file_ext in ['xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(content))
            elif file_ext == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            else:
                raise ValidationError(f"Unsupported file format: {file_ext}", field="file")
        except Exception as e:
            raise ValidationError(f"Failed to parse file: {str(e)}", field="file")
        
        # Validate required columns
        required_columns = ['question_no', 'question_text', 'section', 'marks_per_question']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValidationError(
                f"Missing required columns: {', '.join(missing_columns)}",
                field="file"
            )
        
        # Process questions
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Create question
                question = Question(
                    id=None,
                    exam_id=exam_id,
                    question_no=str(row['question_no']),
                    question_text=str(row['question_text']),
                    section=str(row['section']).upper(),
                    marks_per_question=Decimal(str(row['marks_per_question'])),
                    required_count=int(row.get('required_count', 1)),
                    optional_count=int(row.get('optional_count', 0)),
                    blooms_level=str(row.get('blooms_level', '')) if pd.notna(row.get('blooms_level')) else None,
                    difficulty=str(row.get('difficulty', '')).lower() if pd.notna(row.get('difficulty')) else None
                )
                
                await self.question_repository.create(question)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append({
                    "row": index + 2,  # +2 for header and 0-index
                    "error": str(e)
                })
        
        return {
            "total_rows": len(df),
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors[:10]  # Limit to first 10 errors
        }
    
    async def upload_marks_from_excel(
        self,
        exam_id: int,
        file: UploadFile
    ) -> Dict[str, Any]:
        """
        Upload marks from Excel/CSV file
        
        Expected format:
        - student_id or roll_no, question_no, marks_obtained, sub_question_id (optional)
        
        Args:
            exam_id: Exam ID
            file: Uploaded file (Excel or CSV)
        
        Returns:
            Upload result with success/failure counts
        """
        # Verify exam exists
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        
        # Read file content
        content = await file.read()
        
        # Parse based on file extension
        file_ext = file.filename.split('.')[-1].lower()
        
        try:
            if file_ext in ['xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(content))
            elif file_ext == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            else:
                raise ValidationError(f"Unsupported file format: {file_ext}", field="file")
        except Exception as e:
            raise ValidationError(f"Failed to parse file: {str(e)}", field="file")
        
        # Validate required columns - support both student_id and roll_no
        has_student_id = 'student_id' in df.columns
        has_roll_no = 'roll_no' in df.columns
        
        if not has_student_id and not has_roll_no:
            raise ValidationError(
                "Missing required column: either 'student_id' or 'roll_no' must be present",
                field="file"
            )
        
        required_columns = ['question_no', 'marks_obtained']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValidationError(
                f"Missing required columns: {', '.join(missing_columns)}",
                field="file"
            )
        
        # Get exam questions for validation
        questions = await self.question_repository.get_by_exam(exam_id)
        question_map = {q.question_no: q for q in questions}
        
        # Process marks
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Get student_id - either directly or by roll_no
                if has_student_id and pd.notna(row.get('student_id')):
                    student_id = int(row['student_id'])
                elif has_roll_no and pd.notna(row.get('roll_no')):
                    roll_no = str(row['roll_no'])
                    student = await self.user_repository.get_student_by_roll_no(roll_no)
                    if not student:
                        raise ValidationError(f"Student with roll_no '{roll_no}' not found", field="roll_no")
                    student_id = student.id
                else:
                    raise ValidationError("Either 'student_id' or 'roll_no' must be provided", field="student_id")
                
                # Normalize question_no (handle pandas float conversion: 1.0 -> "1")
                question_no_raw = row['question_no']
                if isinstance(question_no_raw, float) and question_no_raw.is_integer():
                    question_no = str(int(question_no_raw))
                else:
                    question_no = str(question_no_raw)
                marks_obtained = Decimal(str(row['marks_obtained']))
                
                # Find question
                question = question_map.get(question_no)
                if not question:
                    raise ValidationError(f"Question {question_no} not found in exam", field="question_no")
                
                # Validate marks
                if marks_obtained < 0:
                    raise ValidationError("Marks cannot be negative", field="marks_obtained")
                
                if marks_obtained > question.marks_per_question:
                    raise ValidationError(
                        f"Marks ({marks_obtained}) exceed question max ({question.marks_per_question})",
                        field="marks_obtained"
                    )
                
                # Create mark
                mark = Mark(
                    id=None,
                    exam_id=exam_id,
                    student_id=student_id,
                    question_id=question.id,
                    marks_obtained=marks_obtained,
                    sub_question_id=int(row['sub_question_id']) if pd.notna(row.get('sub_question_id')) else None
                )
                
                await self.mark_repository.create(mark)
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append({
                    "row": index + 2,
                    "error": str(e)
                })
        
        return {
            "total_rows": len(df),
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors[:10]
        }
    
    async def get_upload_template(
        self,
        upload_type: str
    ) -> bytes:
        """
        Get upload template file
        
        Args:
            upload_type: Type of upload ("questions" or "marks")
        
        Returns:
            Template file bytes (Excel format)
        """
        if upload_type == "questions":
            # Create template DataFrame with example structure
            df = pd.DataFrame({
                'question_no': ['1', '2', '3'],
                'question_text': [
                    'Enter question text here',
                    'Enter question text here',
                    'Enter question text here'
                ],
                'section': ['A', 'B', 'C'],
                'marks_per_question': [10.0, 15.0, 20.0],
                'required_count': [1, 1, 1],
                'optional_count': [0, 0, 0],
                'blooms_level': ['L2', 'L3', 'L4'],
                'difficulty': ['easy', 'medium', 'hard']
            })
        elif upload_type == "marks":
            df = pd.DataFrame({
                'student_id': [0, 0, 0],  # Replace with actual student_id or use roll_no
                'roll_no': ['ROLL001', 'ROLL002', 'ROLL003'],  # Alternative to student_id
                'question_no': ['1', '1', '2'],
                'marks_obtained': [0.0, 0.0, 0.0],  # Replace with actual marks
                'sub_question_id': [None, None, None]  # Optional: for sub-questions
            })
        else:
            raise ValidationError(f"Unknown upload type: {upload_type}", field="upload_type")
        
        # Convert to Excel bytes
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        return output.getvalue()

