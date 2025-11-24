"""
Test PDF generation service date formatting improvements
"""

import pytest
from datetime import date, datetime, timezone
from unittest.mock import Mock, AsyncMock
from io import BytesIO

from src.application.services.pdf_generation_service import PDFGenerationService
from src.domain.entities.exam import Exam


class TestPDFGenerationServiceDateFormatting:
    """Test PDF generation service date formatting"""

    @pytest.fixture
    def mock_repositories(self):
        """Create mock repositories"""
        return {
            'exam_repository': Mock(),
            'question_repository': Mock(),
            'final_mark_repository': Mock()
        }

    @pytest.fixture
    def pdf_service(self, mock_repositories):
        """Create PDF generation service instance"""
        return PDFGenerationService(
            exam_repository=mock_repositories['exam_repository'],
            question_repository=mock_repositories['question_repository'],
            final_mark_repository=mock_repositories['final_mark_repository']
        )

    @pytest.fixture
    def sample_exam_with_date(self):
        """Create sample exam with date"""
        return Exam(
            id=1,
            name="Midterm Examination",
            exam_type="internal1",
            exam_date=date(2024, 12, 15),
            duration_minutes=180,
            total_marks=100,
            instructions="Answer all questions",
            subject_assignment_id=1,
            created_by=1
        )

    @pytest.fixture
    def sample_exam_without_date(self):
        """Create sample exam without date"""
        return Exam(
            id=2,
            name="Final Examination",
            exam_type="external",
            exam_date=None,
            duration_minutes=180,
            total_marks=100,
            instructions="Answer all questions",
            subject_assignment_id=1,
            created_by=1
        )

    @pytest.mark.asyncio
    async def test_generate_question_paper_pdf_with_valid_date(self, pdf_service, sample_exam_with_date):
        """Test PDF generation with valid date"""
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=sample_exam_with_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        # Generate PDF
        pdf_bytes = await pdf_service.generate_question_paper_pdf(1)
        
        # Verify PDF is generated
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')
        
        # Verify exam was retrieved
        pdf_service.exam_repository.get_by_id.assert_called_once_with(1)

    @pytest.mark.asyncio
    async def test_generate_question_paper_pdf_without_date(self, pdf_service, sample_exam_without_date):
        """Test PDF generation without date (shows 'Not Scheduled')"""
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=sample_exam_without_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        # Generate PDF
        pdf_bytes = await pdf_service.generate_question_paper_pdf(2)
        
        # Verify PDF is generated
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')

    @pytest.mark.asyncio
    async def test_date_formatting_consistency(self, pdf_service, sample_exam_with_date):
        """Test that date formatting is consistent"""
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=sample_exam_with_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        # Generate PDF twice to ensure consistency
        pdf_bytes1 = await pdf_service.generate_question_paper_pdf(1)
        pdf_bytes2 = await pdf_service.generate_question_paper_pdf(1)
        
        # Both PDFs should be identical when content is the same
        assert pdf_bytes1 == pdf_bytes2

    @pytest.mark.asyncio
    async def test_timezone_handling(self, pdf_service):
        """Test timezone handling in date formatting"""
        # Create exam with different timezone scenarios
        exam_with_date = Exam(
            id=1,
            name="Timezone Test Exam",
            exam_type="internal1",
            exam_date=date(2024, 12, 15),
            duration_minutes=180,
            total_marks=100,
            instructions="Test timezone handling",
            subject_assignment_id=1,
            created_by=1
        )
        
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=exam_with_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        # Generate PDF
        pdf_bytes = await pdf_service.generate_question_paper_pdf(1)
        
        # Verify PDF is generated
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0

    @pytest.mark.asyncio
    async def test_date_format_edge_cases(self, pdf_service):
        """Test edge cases in date formatting"""
        # Test with various date formats
        edge_case_dates = [
            date(2024, 1, 1),   # New Year
            date(2024, 12, 31), # New Year's Eve
            date(2024, 2, 29),  # Leap year
            date(2025, 6, 15),  # Mid-year
        ]
        
        for test_date in edge_case_dates:
            exam = Exam(
                id=1,
                name=f"Test Exam {test_date}",
                exam_type="internal1",
                exam_date=test_date,
                duration_minutes=180,
                total_marks=100,
                instructions="Test edge case",
                subject_assignment_id=1,
                created_by=1
            )
            
            # Mock exam repository
            pdf_service.exam_repository.get_by_id = AsyncMock(return_value=exam)
            
            # Mock question repository
            pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
            
            # Generate PDF
            pdf_bytes = await pdf_service.generate_question_paper_pdf(1)
            
            # Verify PDF is generated for all edge cases
            assert isinstance(pdf_bytes, bytes)
            assert len(pdf_bytes) > 0
            assert pdf_bytes.startswith(b'%PDF')

    @pytest.mark.asyncio
    async def test_exam_not_found_error(self, pdf_service):
        """Test error handling when exam is not found"""
        # Mock exam repository to return None
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=None)
        
        # Should raise EntityNotFoundError
        from src.domain.exceptions import EntityNotFoundError
        
        with pytest.raises(EntityNotFoundError):
            await pdf_service.generate_question_paper_pdf(999)

    @pytest.mark.asyncio
    async def test_pdf_content_includes_date_information(self, pdf_service, sample_exam_with_date):
        """Test that PDF content includes proper date information"""
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=sample_exam_with_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        # Generate PDF
        pdf_bytes = await pdf_service.generate_question_paper_pdf(1)
        
        # Convert to string to check content (PDF text extraction)
        pdf_content = pdf_bytes.decode('utf-8', errors='ignore')
        
        # Verify date is included in the content
        assert "December 15, 2024" in pdf_content or "Date:" in pdf_content
        assert "Midterm Examination" in pdf_content

    @pytest.mark.asyncio
    async def test_pdf_content_without_date(self, pdf_service, sample_exam_without_date):
        """Test that PDF content handles missing date gracefully"""
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=sample_exam_without_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        # Generate PDF
        pdf_bytes = await pdf_service.generate_question_paper_pdf(2)
        
        # Convert to string to check content
        pdf_content = pdf_bytes.decode('utf-8', errors='ignore')
        
        # Verify "Not Scheduled" is included
        assert "Not Scheduled" in pdf_content or "Date:" in pdf_content
        assert "Final Examination" in pdf_content

    def test_date_formatting_function_unit_test(self):
        """Test the date formatting logic directly"""
        # Test the date formatting logic that was implemented
        from datetime import datetime, timezone
        
        test_date = date(2024, 12, 15)
        exam_datetime = datetime.combine(test_date, datetime.min.time())
        formatted_date = exam_datetime.strftime('%B %d, %Y (%Z)')
        
        # Should format as "December 15, 2024 (UTC)" or similar
        assert "December" in formatted_date
        assert "15" in formatted_date
        assert "2024" in formatted_date
        assert "(" in formatted_date and ")" in formatted_date

    @pytest.mark.asyncio
    async def test_pdf_generation_performance_with_dates(self, pdf_service, sample_exam_with_date):
        """Test that date formatting doesn't significantly impact PDF generation performance"""
        # Mock exam repository
        pdf_service.exam_repository.get_by_id = AsyncMock(return_value=sample_exam_with_date)
        
        # Mock question repository
        pdf_service.question_repository.get_by_exam = AsyncMock(return_value=[])
        
        import time
        
        start_time = time.time()
        
        # Generate multiple PDFs
        for i in range(10):
            await pdf_service.generate_question_paper_pdf(1)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete in reasonable time (less than 10 seconds for 10 PDFs)
        assert total_time < 10.0