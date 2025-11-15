"""
Tests for PDF Generation Service
"""
import pytest
from unittest.mock import AsyncMock, Mock
from datetime import date, timedelta
from decimal import Decimal

from src.application.services.pdf_generation_service import PDFGenerationService
from src.domain.entities.exam import Exam
from src.domain.entities.question import Question
from src.domain.entities.final_mark import FinalMark
from src.domain.exceptions import EntityNotFoundError


@pytest.mark.unit
@pytest.mark.service
class TestPDFGenerationService:
    """Tests for PDF generation service"""
    
    @pytest.fixture
    def mock_repositories(self):
        """Create mock repositories"""
        exam_repo = Mock()
        exam_repo.get_by_id = AsyncMock()
        
        question_repo = Mock()
        question_repo.get_by_exam = AsyncMock()
        
        final_mark_repo = Mock()
        final_mark_repo.get_by_student_semester = AsyncMock(return_value=[])
        
        return {
            'exam_repo': exam_repo,
            'question_repo': question_repo,
            'final_mark_repo': final_mark_repo
        }
    
    @pytest.fixture
    def pdf_service(self, mock_repositories):
        """Create PDF generation service instance"""
        return PDFGenerationService(
            exam_repository=mock_repositories['exam_repo'],
            question_repository=mock_repositories['question_repo'],
            final_mark_repository=mock_repositories['final_mark_repo']
        )
    
    @pytest.fixture
    def exam(self):
        """Create test exam"""
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
    def questions(self):
        """Create test questions"""
        return [
            Question(
                id=1,
                exam_id=1,
                question_no="1",
                question_text="What is Python?",
                section="A",
                marks_per_question=Decimal("10.0"),
                required_count=1,
                optional_count=0
            ),
            Question(
                id=2,
                exam_id=1,
                question_no="2",
                question_text="Explain OOP concepts.",
                section="B",
                marks_per_question=Decimal("15.0"),
                required_count=1,
                optional_count=0
            )
        ]
    
    @pytest.mark.asyncio
    async def test_generate_question_paper_pdf_exam_not_found(self, pdf_service, mock_repositories):
        """Test generating question paper when exam doesn't exist"""
        mock_repositories['exam_repo'].get_by_id.return_value = None
        
        with pytest.raises(EntityNotFoundError):
            await pdf_service.generate_question_paper_pdf(exam_id=999)
    
    @pytest.mark.asyncio
    async def test_generate_question_paper_pdf_success(self, pdf_service, mock_repositories, exam, questions):
        """Test successful question paper PDF generation"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].get_by_exam.return_value = questions
        
        pdf_bytes = await pdf_service.generate_question_paper_pdf(exam_id=1)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # Verify it's a valid PDF (starts with PDF header)
        assert pdf_bytes.startswith(b'%PDF')
    
    @pytest.mark.asyncio
    async def test_generate_question_paper_pdf_no_questions(self, pdf_service, mock_repositories, exam):
        """Test generating question paper with no questions"""
        mock_repositories['exam_repo'].get_by_id.return_value = exam
        mock_repositories['question_repo'].get_by_exam.return_value = []
        
        pdf_bytes = await pdf_service.generate_question_paper_pdf(exam_id=1)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
    
    @pytest.mark.asyncio
    async def test_generate_student_report_card_pdf_student_not_found(self, pdf_service, mock_repositories):
        """Test generating report card when student doesn't exist"""
        mock_repositories['final_mark_repo'].get_by_student_semester = AsyncMock(return_value=[])
        
        with pytest.raises(EntityNotFoundError):
            await pdf_service.generate_student_report_card_pdf(
                student_id=999,
                semester_id=1
            )
    
    @pytest.mark.asyncio
    async def test_generate_student_report_card_pdf_success(self, pdf_service, mock_repositories):
        """Test successful student report card PDF generation"""
        from src.domain.entities.final_mark import FinalMark
        
        final_marks = [
            FinalMark(
                id=1,
                student_id=1,
                subject_assignment_id=1,
                semester_id=1,
                internal_1=Decimal("35.0"),
                internal_2=Decimal("38.0"),
                external=Decimal("55.0"),
                total=Decimal("128.0"),
                percentage=Decimal("85.33"),
                grade="A",
                sgpa=Decimal("9.0")
            )
        ]
        
        mock_repositories['final_mark_repo'].get_by_student_semester = AsyncMock(return_value=final_marks)
        
        pdf_bytes = await pdf_service.generate_student_report_card_pdf(
            student_id=1,
            semester_id=1
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
    
    @pytest.mark.asyncio
    async def test_generate_co_po_report_pdf(self, pdf_service):
        """Test generating CO-PO report PDF"""
        # Mock data for CO-PO report
        co_attainment_data = {
            "co_attainment": {
                "CO1": {
                    "code": "CO1",
                    "title": "Understand data structures",
                    "attainment_percentage": 75.5,
                    "target_attainment": 70.0,
                    "status": "achieved"
                }
            }
        }
        
        pdf_bytes = await pdf_service.generate_co_po_report_pdf(
            subject_id=1,
            co_attainment_data=co_attainment_data
        )
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')

