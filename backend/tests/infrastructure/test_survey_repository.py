"""
Test survey repository implementation
"""

import pytest
from datetime import date
from unittest.mock import Mock, AsyncMock
from sqlalchemy.orm import Session

from src.infrastructure.database.repositories.survey_repository_impl import SurveyRepositoryImpl
from src.domain.entities.survey import Survey, SurveyQuestion, SurveyWithResponses
from src.infrastructure.database.models import SurveyModel, SurveyQuestionModel, SurveyResponseModel, StudentModel, UserModel


class TestSurveyRepositoryImpl:
    """Test survey repository implementation"""

    @pytest.fixture
    def mock_session(self):
        """Create mock SQLAlchemy session"""
        return Mock(spec=Session)

    @pytest.fixture
    def survey_repo(self, mock_session):
        """Create survey repository instance"""
        return SurveyRepositoryImpl(mock_session)

    @pytest.fixture
    def sample_survey(self):
        """Create sample survey entity"""
        return Survey(
            id=1,
            title="Student Feedback Survey",
            description="End of semester feedback",
            department_id=1,
            academic_year_id=1,
            status="active",
            target_audience="students",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            created_by=1,
            questions=[
                SurveyQuestion(
                    id=1,
                    question_text="How would you rate the course?",
                    question_type="rating",
                    required=True,
                    order_index=1
                )
            ]
        )

    @pytest.fixture
    def sample_student_models(self):
        """Create sample student models for testing"""
        return [
            Mock(spec=StudentModel, id=1),
            Mock(spec=StudentModel, id=2),
            Mock(spec=StudentModel, id=3),
        ]

    @pytest.mark.asyncio
    async def test_calculate_expected_respondents_students(self, survey_repo, sample_survey, sample_student_models):
        """Test expected respondents calculation for students"""
        # Mock the query for student count
        survey_repo.session.query.return_value.join.return_value.filter.return_value.scalar.return_value = len(sample_student_models)
        
        expected_count = await survey_repo._calculate_expected_respondents(sample_survey)
        
        assert expected_count == len(sample_student_models)
        # Verify the query was called with correct filters
        survey_repo.session.query.assert_called()

    @pytest.mark.asyncio
    async def test_calculate_expected_respondents_alumni(self, survey_repo, sample_student_models):
        """Test expected respondents calculation for alumni"""
        survey = Survey(
            id=1,
            title="Alumni Survey",
            description="Feedback from graduated students",
            department_id=1,
            academic_year_id=1,
            status="active",
            target_audience="alumni",
            questions=[]
        )
        
        # Mock the query for alumni count
        survey_repo.session.query.return_value.filter.return_value.scalar.return_value = 25
        
        expected_count = await survey_repo._calculate_expected_respondents(survey)
        
        assert expected_count == 25

    @pytest.mark.asyncio
    async def test_calculate_expected_respondents_employers(self, survey_repo):
        """Test expected respondents calculation for employers"""
        survey = Survey(
            id=1,
            title="Employer Survey",
            description="Feedback from employers",
            department_id=1,
            academic_year_id=1,
            status="active",
            target_audience="employers",
            questions=[]
        )
        
        expected_count = await survey_repo._calculate_expected_respondents(survey)
        
        # Should use default value for employers
        assert expected_count == 50

    @pytest.mark.asyncio
    async def test_calculate_expected_respondents_unknown_audience(self, survey_repo):
        """Test expected respondents calculation for unknown audience"""
        survey = Survey(
            id=1,
            title="Unknown Audience Survey",
            description="Survey for unknown audience",
            department_id=1,
            academic_year_id=1,
            status="active",
            target_audience="unknown",
            questions=[]
        )
        
        expected_count = await survey_repo._calculate_expected_respondents(survey)
        
        # Should use conservative estimate
        assert expected_count == 100

    @pytest.mark.asyncio
    async def test_calculate_expected_respondents_minimum_value(self, survey_repo):
        """Test that minimum value is enforced"""
        survey = Survey(
            id=1,
            title="Empty Survey",
            description="Survey with no respondents expected",
            department_id=1,
            academic_year_id=1,
            status="active",
            target_audience="students",
            questions=[]
        )
        
        # Mock zero count
        survey_repo.session.query.return_value.join.return_value.filter.return_value.scalar.return_value = 0
        
        expected_count = await survey_repo._calculate_expected_respondents(survey)
        
        # Should return at least 1
        assert expected_count == 1

    @pytest.mark.asyncio
    async def test_get_with_responses_completion_rate_calculation(self, survey_repo, sample_survey, sample_student_models):
        """Test completion rate calculation in get_with_responses"""
        # Mock survey retrieval
        survey_repo.get_by_id = AsyncMock(return_value=sample_survey)
        
        # Mock response count
        survey_repo.session.query.return_value.filter.return_value.scalar.return_value = 15
        
        # Mock expected respondents calculation
        survey_repo._calculate_expected_respondents = AsyncMock(return_value=20)
        
        # Mock response models
        mock_response_models = [Mock(spec=SurveyResponseModel) for _ in range(15)]
        survey_repo.session.query.return_value.filter.return_value.all.return_value = mock_response_models
        
        # Mock StudentModel to avoid import issues
        import sys
        from unittest.mock import MagicMock
        sys.modules['src.infrastructure.database.models'] = MagicMock()
        sys.modules['src.infrastructure.database.models'].StudentModel = Mock
        sys.modules['src.infrastructure.database.models'].UserModel = Mock
        
        result = await survey_repo.get_with_responses(1)
        
        # Verify completion rate calculation
        expected_completion_rate = (15 / 20) * 100  # 75%
        assert result.completion_rate == round(expected_completion_rate, 2)
        assert result.total_responses == 15
        
        # Verify the helper method was called
        survey_repo._calculate_expected_respondents.assert_called_once_with(sample_survey)

    @pytest.mark.asyncio
    async def test_get_with_responses_zero_expected_respondents(self, survey_repo, sample_survey):
        """Test completion rate when expected respondents is 0"""
        # Mock survey retrieval
        survey_repo.get_by_id = AsyncMock(return_value=sample_survey)
        
        # Mock response count
        survey_repo.session.query.return_value.filter.return_value.scalar.return_value = 5
        
        # Mock expected respondents as 0
        survey_repo._calculate_expected_respondents = AsyncMock(return_value=0)
        
        # Mock response models
        mock_response_models = [Mock(spec=SurveyResponseModel) for _ in range(5)]
        survey_repo.session.query.return_value.filter.return_value.all.return_value = mock_response_models
        
        # Mock models to avoid import issues
        import sys
        from unittest.mock import MagicMock
        sys.modules['src.infrastructure.database.models'] = MagicMock()
        sys.modules['src.infrastructure.database.models'].StudentModel = Mock
        sys.modules['src.infrastructure.database.models'].UserModel = Mock
        
        result = await survey_repo.get_with_responses(1)
        
        # Should handle division by zero gracefully
        assert result.completion_rate == 0.0

    @pytest.mark.asyncio
    async def test_completion_rate_precision(self, survey_repo, sample_survey):
        """Test that completion rate is properly rounded"""
        # Mock survey retrieval
        survey_repo.get_by_id = AsyncMock(return_value=sample_survey)
        
        # Mock response count that results in repeating decimal
        survey_repo.session.query.return_value.filter.return_value.scalar.return_value = 1
        
        # Mock expected respondents that results in 33.333...%
        survey_repo._calculate_expected_respondents = AsyncMock(return_value=3)
        
        # Mock response models
        mock_response_models = [Mock(spec=SurveyResponseModel)]
        survey_repo.session.query.return_value.filter.return_value.all.return_value = mock_response_models
        
        # Mock models to avoid import issues
        import sys
        from unittest.mock import MagicMock
        sys.modules['src.infrastructure.database.models'] = MagicMock()
        sys.modules['src.infrastructure.database.models'].StudentModel = Mock
        sys.modules['src.infrastructure.database.models'].UserModel = Mock
        
        result = await survey_repo.get_with_responses(1)
        
        # Should be rounded to 2 decimal places
        expected_rate = round((1 / 3) * 100, 2)
        assert result.completion_rate == expected_rate