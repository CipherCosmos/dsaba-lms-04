"""
Survey repository implementation for indirect attainment
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ....domain.repositories.survey_repository import SurveyRepository
from ....domain.entities.survey import Survey, SurveyResponse, SurveyWithResponses, SurveyQuestion
from ..models import SurveyModel, SurveyQuestionModel, SurveyResponseModel


class SurveyRepositoryImpl(SurveyRepository):
    """SQLAlchemy implementation of SurveyRepository"""

    def __init__(self, session: Session):
        self.session = session

    async def get_by_id(self, survey_id: int) -> Optional[Survey]:
        """Get survey by ID"""
        survey_model = self.session.query(SurveyModel).filter(SurveyModel.id == survey_id).first()
        if not survey_model:
            return None

        # Get questions
        questions = []
        question_models = self.session.query(SurveyQuestionModel).filter(
            SurveyQuestionModel.survey_id == survey_id
        ).order_by(SurveyQuestionModel.order_index).all()

        for qm in question_models:
            questions.append(SurveyQuestion(
                id=qm.id,
                question_text=qm.question_text,
                question_type=qm.question_type,
                options=qm.options,
                required=qm.required,
                order_index=qm.order_index
            ))

        return Survey(
            id=survey_model.id,
            title=survey_model.title,
            description=survey_model.description,
            department_id=survey_model.department_id,
            academic_year_id=survey_model.academic_year_id,
            status=survey_model.status,
            target_audience=survey_model.target_audience,
            start_date=survey_model.start_date,
            end_date=survey_model.end_date,
            created_by=survey_model.created_by,
            created_at=survey_model.created_at,
            updated_at=survey_model.updated_at,
            questions=questions
        )

    async def get_by_department(self, department_id: int, skip: int = 0, limit: int = 100) -> List[Survey]:
        """Get surveys by department"""
        survey_models = self.session.query(SurveyModel).filter(
            SurveyModel.department_id == department_id
        ).order_by(SurveyModel.created_at.desc()).offset(skip).limit(limit).all()

        surveys = []
        for sm in survey_models:
            survey = await self.get_by_id(sm.id)
            if survey:
                surveys.append(survey)

        return surveys

    async def get_active_surveys(self, department_id: int, academic_year_id: Optional[int] = None) -> List[Survey]:
        """Get active surveys for a department"""
        query = self.session.query(SurveyModel).filter(
            and_(
                SurveyModel.department_id == department_id,
                SurveyModel.status == "active"
            )
        )

        if academic_year_id:
            query = query.filter(SurveyModel.academic_year_id == academic_year_id)

        survey_models = query.order_by(SurveyModel.created_at.desc()).all()

        surveys = []
        for sm in survey_models:
            survey = await self.get_by_id(sm.id)
            if survey and survey.can_accept_responses():
                surveys.append(survey)

        return surveys

    async def create(self, survey: Survey) -> Survey:
        """Create a new survey"""
        survey_model = SurveyModel(
            title=survey.title,
            description=survey.description,
            department_id=survey.department_id,
            academic_year_id=survey.academic_year_id,
            status=survey.status,
            target_audience=survey.target_audience,
            start_date=survey.start_date,
            end_date=survey.end_date,
            created_by=survey.created_by
        )

        self.session.add(survey_model)
        self.session.flush()  # Get the ID

        # Create questions
        for question in survey.questions:
            question_model = SurveyQuestionModel(
                survey_id=survey_model.id,
                question_text=question.question_text,
                question_type=question.question_type,
                options=question.options,
                required=question.required,
                order_index=question.order_index
            )
            self.session.add(question_model)

        self.session.commit()

        # Return the created survey
        return await self.get_by_id(survey_model.id)

    async def update(self, survey: Survey) -> Survey:
        """Update an existing survey"""
        survey_model = self.session.query(SurveyModel).filter(SurveyModel.id == survey.id).first()
        if not survey_model:
            raise ValueError(f"Survey with id {survey.id} not found")

        # Update basic fields
        survey_model.title = survey.title
        survey_model.description = survey.description
        survey_model.status = survey.status
        survey_model.target_audience = survey.target_audience
        survey_model.start_date = survey.start_date
        survey_model.end_date = survey.end_date
        survey_model.updated_at = survey.updated_at

        # Update questions - delete existing and create new ones
        self.session.query(SurveyQuestionModel).filter(
            SurveyQuestionModel.survey_id == survey.id
        ).delete()

        for question in survey.questions:
            question_model = SurveyQuestionModel(
                survey_id=survey.id,
                question_text=question.question_text,
                question_type=question.question_type,
                options=question.options,
                required=question.required,
                order_index=question.order_index
            )
            self.session.add(question_model)

        self.session.commit()

        return await self.get_by_id(survey.id)

    async def delete(self, survey_id: int) -> bool:
        """Delete a survey"""
        result = self.session.query(SurveyModel).filter(SurveyModel.id == survey_id).delete()
        self.session.commit()
        return result > 0

    async def get_with_responses(self, survey_id: int) -> Optional[SurveyWithResponses]:
        """Get survey with all responses"""
        survey = await self.get_by_id(survey_id)
        if not survey:
            return None

        # Get response count
        response_count = self.session.query(func.count(SurveyResponseModel.id)).filter(
            SurveyResponseModel.survey_id == survey_id
        ).scalar()

        # Get all responses
        response_models = self.session.query(SurveyResponseModel).filter(
            SurveyResponseModel.survey_id == survey_id
        ).all()

        responses = []
        for rm in response_models:
            responses.append(SurveyResponse(
                id=rm.id,
                survey_id=rm.survey_id,
                question_id=rm.question_id,
                respondent_id=rm.respondent_id,
                response_value=rm.response_value,
                rating_value=rm.rating_value,
                submitted_at=rm.submitted_at
            ))

            # Calculate completion rate based on target audience and department
            expected_respondents = await self._calculate_expected_respondents(survey)
            completion_rate = (response_count / expected_respondents * 100) if expected_respondents > 0 else 0.0

            return SurveyWithResponses(
                **survey.dict(),
                total_responses=response_count,
                completion_rate=round(completion_rate, 2),
                responses=responses
            )

    async def save_response(self, response: SurveyResponse) -> SurveyResponse:
        """Save a survey response"""
        response_model = SurveyResponseModel(
            survey_id=response.survey_id,
            question_id=response.question_id,
            respondent_id=response.respondent_id,
            response_value=response.response_value,
            rating_value=response.rating_value,
            submitted_at=response.submitted_at
        )

        self.session.add(response_model)
        self.session.commit()

        response.id = response_model.id
        return response

    async def get_user_responses(self, survey_id: int, user_id: int) -> List[SurveyResponse]:
        """Get all responses for a user in a survey"""
        response_models = self.session.query(SurveyResponseModel).filter(
            and_(
                SurveyResponseModel.survey_id == survey_id,
                SurveyResponseModel.respondent_id == user_id
            )
        ).all()

        responses = []
        for rm in response_models:
            responses.append(SurveyResponse(
                id=rm.id,
                survey_id=rm.survey_id,
                question_id=rm.question_id,
                respondent_id=rm.respondent_id,
                response_value=rm.response_value,
                rating_value=rm.rating_value,
                submitted_at=rm.submitted_at
            ))

        return responses

    async def has_user_responded(self, survey_id: int, user_id: int) -> bool:
        """Check if user has already responded to survey"""
        count = self.session.query(func.count(SurveyResponseModel.id)).filter(
            and_(
                SurveyResponseModel.survey_id == survey_id,
                SurveyResponseModel.respondent_id == user_id
            )
        ).scalar()

        return count > 0

    async def _calculate_expected_respondents(self, survey: "Survey") -> int:
        """
        Calculate expected number of respondents based on survey target audience
        
        Args:
            survey: Survey entity
            
        Returns:
            Expected number of respondents
        """
        from ..models import StudentModel, UserModel
        
        if survey.target_audience == "students":
            # Count students in the department for the academic year
            expected_count = self.session.query(func.count(StudentModel.id)).join(
                UserModel, StudentModel.user_id == UserModel.id
            ).filter(
                StudentModel.department_id == survey.department_id,
                StudentModel.academic_year_id == survey.academic_year_id,
                UserModel.is_active == True  # Use UserModel.is_active instead of non-existent StudentModel.status
            ).scalar() or 0
            
        elif survey.target_audience == "alumni":
            # For alumni surveys, estimate based on past student enrollment
            # This is a simplified calculation - in production, you might have
            # a separate alumni table or more sophisticated logic
            expected_count = self.session.query(func.count(StudentModel.id)).filter(
                StudentModel.department_id == survey.department_id,
                StudentModel.academic_year_id < survey.academic_year_id,
                StudentModel.status == "graduated"
            ).scalar() or 0
            
        elif survey.target_audience == "employers":
            # For employer surveys, use a fixed number or calculate based on
            # companies that have recruited from this department
            # For now, using a reasonable default
            expected_count = 50  # Default estimate for employers
            
        else:
            # Unknown target audience, return conservative estimate
            expected_count = 100
        
        return max(expected_count, 1)  # Ensure at least 1 for division