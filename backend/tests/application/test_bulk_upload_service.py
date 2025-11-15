"""
Tests for Bulk Upload Service
"""
import pytest
import pandas as pd
import io
from unittest.mock import AsyncMock, Mock, MagicMock
from decimal import Decimal
from fastapi import UploadFile

from src.application.services.bulk_upload_service import BulkUploadService
from src.domain.entities.exam import Exam
from src.domain.entities.question import Question
from src.domain.entities.mark import Mark
from src.domain.entities.user import User
from src.domain.value_objects.email import Email
from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.infrastructure.security.password_hasher import PasswordHasher


@pytest.mark.unit
@pytest.mark.service
class TestBulkUploadService:
    """Tests for bulk upload service"""
    
    @pytest.fixture
    def mock_repositories(self):
        """Create mock repositories"""
        question_repo = Mock()
        question_repo.get_by_id = AsyncMock()
        question_repo.create = AsyncMock()
        question_repo.get_by_exam = AsyncMock()
        
        exam_repo = Mock()
        exam_repo.get_by_id = AsyncMock()
        
        mark_repo = Mock()
        mark_repo.create = AsyncMock()
        
        user_repo = Mock()
        user_repo.get_student_by_roll_no = AsyncMock()
        
        return {
            'question_repo': question_repo,
            'exam_repo': exam_repo,
            'mark_repo': mark_repo,
            'user_repo': user_repo
        }
    
    @pytest.fixture
    def bulk_upload_service(self, mock_repositories):
        """Create bulk upload service instance"""
        return BulkUploadService(
            question_repository=mock_repositories['question_repo'],
            exam_repository=mock_repositories['exam_repo'],
            mark_repository=mock_repositories['mark_repo'],
            user_repository=mock_repositories['user_repo']
        )
    
    @pytest.fixture
    def exam(self):
        """Create test exam"""
        from datetime import date, timedelta
        return Exam(
            id=1,
            subject_assignment_id=1,
            name="Test Exam",
            exam_type="internal1",
            exam_date=date.today() + timedelta(days=7),
            total_marks=100.0,
            duration_minutes=120,
            status="active"
        )
    
    @pytest.fixture
    def question(self):
        """Create test question"""
        return Question(
            id=1,
            exam_id=1,
            question_no="1",
            question_text="Test question",
            section="A",
            marks_per_question=Decimal("10.0"),
            required_count=1,
            optional_count=0
        )
    
    @pytest.mark.asyncio
    async def test_upload_questions_exam_not_found(self, bulk_upload_service, mock_repositories):
        """Test uploading questions when exam doesn't exist"""
        mock_repositories['exam_repo'].get_by_id.return_value = None
        
        # Create test Excel file
        df = pd.DataFrame({
            'question_no': ['1'],
            'question_text': ['Test'],
            'section': ['A'],
            'marks_per_question': [10.0]
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        with pytest.raises(EntityNotFoundError):
            await bulk_upload_service.upload_questions_from_excel(exam_id=999, file=file)
    
    @pytest.mark.asyncio
    async def test_upload_questions_invalid_format(self, bulk_upload_service, mock_repositories, exam):
        """Test uploading questions with invalid file format"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        
        # Create invalid file
        file = UploadFile(filename="test.txt", file=io.BytesIO(b"invalid content"))
        
        with pytest.raises(ValidationError):
            await bulk_upload_service.upload_questions_from_excel(exam_id=1, file=file)
    
    @pytest.mark.asyncio
    async def test_upload_questions_missing_columns(self, bulk_upload_service, mock_repositories, exam):
        """Test uploading questions with missing required columns"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        
        # Create Excel file with missing columns
        df = pd.DataFrame({
            'question_no': ['1'],
            'question_text': ['Test']
            # Missing 'section' and 'marks_per_question'
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        with pytest.raises(ValidationError) as exc_info:
            await bulk_upload_service.upload_questions_from_excel(exam_id=1, file=file)
        
        assert "Missing required columns" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_upload_questions_success(self, bulk_upload_service, mock_repositories, exam):
        """Test successful question upload"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].create = AsyncMock()
        
        # Create valid Excel file
        df = pd.DataFrame({
            'question_no': ['1', '2'],
            'question_text': ['Question 1', 'Question 2'],
            'section': ['A', 'B'],
            'marks_per_question': [10.0, 15.0],
            'required_count': [1, 1],
            'optional_count': [0, 0],
            'blooms_level': ['L2', 'L3'],
            'difficulty': ['easy', 'medium']
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        result = await bulk_upload_service.upload_questions_from_excel(exam_id=1, file=file)
        
        assert result["total_rows"] == 2
        assert result["success_count"] == 2
        assert result["error_count"] == 0
        assert mock_repositories['question_repo'].create.call_count == 2
    
    @pytest.mark.asyncio
    async def test_upload_questions_csv(self, bulk_upload_service, mock_repositories, exam):
        """Test uploading questions from CSV file"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].create = AsyncMock()
        
        # Create CSV file
        df = pd.DataFrame({
            'question_no': ['1'],
            'question_text': ['Question 1'],
            'section': ['A'],
            'marks_per_question': [10.0]
        })
        output = io.BytesIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        file = UploadFile(filename="test.csv", file=output)
        
        result = await bulk_upload_service.upload_questions_from_excel(exam_id=1, file=file)
        
        assert result["success_count"] == 1
    
    @pytest.mark.asyncio
    async def test_upload_marks_exam_not_found(self, bulk_upload_service, mock_repositories):
        """Test uploading marks when exam doesn't exist"""
        mock_repositories['exam_repo'].get_by_id.return_value = None
        
        df = pd.DataFrame({
            'student_id': [1],
            'question_no': ['1'],
            'marks_obtained': [8.5]
        })
        # Ensure question_no is string type (pandas may convert to float)
        df['question_no'] = df['question_no'].astype(str)
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        with pytest.raises(EntityNotFoundError):
            await bulk_upload_service.upload_marks_from_excel(exam_id=999, file=file)
    
    @pytest.mark.asyncio
    async def test_upload_marks_missing_student_column(self, bulk_upload_service, mock_repositories, exam):
        """Test uploading marks without student_id or roll_no"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        
        df = pd.DataFrame({
            'question_no': ['1'],
            'marks_obtained': [8.5]
            # Missing student_id and roll_no
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        with pytest.raises(ValidationError) as exc_info:
            await bulk_upload_service.upload_marks_from_excel(exam_id=1, file=file)
        
        assert "student_id" in str(exc_info.value) or "roll_no" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_upload_marks_success_with_student_id(self, bulk_upload_service, mock_repositories, exam, question):
        """Test successful marks upload using student_id"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].get_by_exam.return_value = [question]
        mock_repositories['mark_repo'].create = AsyncMock()
        
        df = pd.DataFrame({
            'student_id': [1],
            'question_no': ['1'],
            'marks_obtained': [8.5]
        })
        # Ensure question_no is string type (pandas may convert to float)
        df['question_no'] = df['question_no'].astype(str)
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        result = await bulk_upload_service.upload_marks_from_excel(exam_id=1, file=file)
        
        # Debug: print errors if any
        if result["error_count"] > 0:
            print(f"Errors: {result['errors']}")
        
        assert result["success_count"] == 1
        assert result["error_count"] == 0
    
    @pytest.mark.asyncio
    async def test_upload_marks_success_with_roll_no(self, bulk_upload_service, mock_repositories, exam, question):
        """Test successful marks upload using roll_no"""
        password_hasher = PasswordHasher()
        student_user = User(
            id=1,
            username="student1",
            email=Email("student1@test.com"),
            first_name="Student",
            last_name="One",
            hashed_password=password_hasher.hash("password123")
        )
        
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].get_by_exam.return_value = [question]
        mock_repositories['user_repo'].get_student_by_roll_no.return_value = student_user
        mock_repositories['mark_repo'].create = AsyncMock()
        
        df = pd.DataFrame({
            'roll_no': ['ROLL001'],
            'question_no': ['1'],
            'marks_obtained': [8.5]
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        result = await bulk_upload_service.upload_marks_from_excel(exam_id=1, file=file)
        
        assert result["success_count"] == 1
        mock_repositories['user_repo'].get_student_by_roll_no.assert_called_once_with("ROLL001")
    
    @pytest.mark.asyncio
    async def test_upload_marks_invalid_question(self, bulk_upload_service, mock_repositories, exam, question):
        """Test uploading marks with invalid question number"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].get_by_exam.return_value = [question]
        
        df = pd.DataFrame({
            'student_id': [1],
            'question_no': ['999'],  # Non-existent question
            'marks_obtained': [8.5]
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        result = await bulk_upload_service.upload_marks_from_excel(exam_id=1, file=file)
        
        assert result["error_count"] == 1
        assert len(result["errors"]) > 0
    
    @pytest.mark.asyncio
    async def test_upload_marks_exceeds_max(self, bulk_upload_service, mock_repositories, exam, question):
        """Test uploading marks that exceed question maximum"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].get_by_exam.return_value = [question]
        
        df = pd.DataFrame({
            'student_id': [1],
            'question_no': ['1'],
            'marks_obtained': [15.0]  # Exceeds question max of 10.0
        })
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        file = UploadFile(filename="test.xlsx", file=output)
        
        result = await bulk_upload_service.upload_marks_from_excel(exam_id=1, file=file)
        
        assert result["error_count"] == 1
    
    @pytest.mark.asyncio
    async def test_get_upload_template_questions(self, bulk_upload_service):
        """Test getting questions upload template"""
        template = await bulk_upload_service.get_upload_template("questions")
        
        assert isinstance(template, bytes)
        assert len(template) > 0
        
        # Verify it's a valid Excel file
        df = pd.read_excel(io.BytesIO(template))
        assert 'question_no' in df.columns
        assert 'question_text' in df.columns
        assert 'section' in df.columns
        assert 'marks_per_question' in df.columns
    
    @pytest.mark.asyncio
    async def test_get_upload_template_marks(self, bulk_upload_service):
        """Test getting marks upload template"""
        template = await bulk_upload_service.get_upload_template("marks")
        
        assert isinstance(template, bytes)
        assert len(template) > 0
        
        # Verify it's a valid Excel file
        df = pd.read_excel(io.BytesIO(template))
        assert 'student_id' in df.columns or 'roll_no' in df.columns
        assert 'question_no' in df.columns
        assert 'marks_obtained' in df.columns
    
    @pytest.mark.asyncio
    async def test_get_upload_template_invalid_type(self, bulk_upload_service):
        """Test getting template with invalid type"""
        with pytest.raises(ValidationError):
            await bulk_upload_service.get_upload_template("invalid_type")

