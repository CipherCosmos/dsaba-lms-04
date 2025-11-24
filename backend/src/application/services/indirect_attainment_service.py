"""
Indirect attainment service for handling surveys, exit exams, and attainment calculations
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal

from ...domain.repositories.survey_repository import SurveyRepository
from ...domain.repositories.exit_exam_repository import ExitExamRepository
from ...domain.entities.survey import Survey, SurveyResponse, SurveyWithResponses
from ...domain.entities.exit_exam import ExitExam, ExitExamResult, ExitExamWithResults


class IndirectAttainmentService:
    """Service for managing indirect attainment through surveys and exit exams"""

    def __init__(
        self,
        survey_repository: SurveyRepository,
        exit_exam_repository: ExitExamRepository
    ):
        self.survey_repository = survey_repository
        self.exit_exam_repository = exit_exam_repository

    # Survey Management Methods

    async def create_survey(self, survey_data: Dict[str, Any]) -> Survey:
        """Create a new survey"""
        survey = Survey(**survey_data)
        return await self.survey_repository.create(survey)

    async def get_survey(self, survey_id: int) -> Optional[Survey]:
        """Get survey by ID"""
        return await self.survey_repository.get_by_id(survey_id)

    async def get_surveys_by_department(self, department_id: int, skip: int = 0, limit: int = 100) -> List[Survey]:
        """Get surveys for a department"""
        return await self.survey_repository.get_by_department(department_id, skip, limit)

    async def get_active_surveys(self, department_id: int, academic_year_id: Optional[int] = None) -> List[Survey]:
        """Get active surveys for a department"""
        return await self.survey_repository.get_active_surveys(department_id, academic_year_id)

    async def update_survey(self, survey_id: int, survey_data: Dict[str, Any]) -> Survey:
        """Update an existing survey"""
        existing_survey = await self.survey_repository.get_by_id(survey_id)
        if not existing_survey:
            raise ValueError(f"Survey with id {survey_id} not found")

        # Update fields
        for key, value in survey_data.items():
            if hasattr(existing_survey, key):
                setattr(existing_survey, key, value)

        return await self.survey_repository.update(existing_survey)

    async def delete_survey(self, survey_id: int) -> bool:
        """Delete a survey"""
        return await self.survey_repository.delete(survey_id)

    async def submit_survey_response(self, survey_id: int, user_id: int, responses: List[Dict[str, Any]]) -> List[SurveyResponse]:
        """Submit responses for a survey"""
        survey = await self.survey_repository.get_by_id(survey_id)
        if not survey:
            raise ValueError(f"Survey with id {survey_id} not found")

        if not survey.can_accept_responses():
            raise ValueError("Survey is not accepting responses")

        # Check if user has already responded
        if await self.survey_repository.has_user_responded(survey_id, user_id):
            raise ValueError("User has already responded to this survey")

        saved_responses = []
        for response_data in responses:
            response = SurveyResponse(
                survey_id=survey_id,
                question_id=response_data["question_id"],
                respondent_id=user_id,
                response_value=response_data.get("response_value"),
                rating_value=response_data.get("rating_value")
            )
            saved_response = await self.survey_repository.save_response(response)
            saved_responses.append(saved_response)

        return saved_responses

    async def get_survey_analytics(self, survey_id: int) -> Optional[Dict[str, Any]]:
        """Get analytics for a survey"""
        survey_with_responses = await self.survey_repository.get_with_responses(survey_id)
        if not survey_with_responses:
            return None

        # Calculate response statistics
        question_stats = {}
        for question in survey_with_responses.questions:
            question_responses = [
                r for r in survey_with_responses.responses
                if r.question_id == question.id
            ]

            if question.question_type == "rating":
                ratings = [r.rating_value for r in question_responses if r.rating_value is not None]
                avg_rating = sum(ratings) / len(ratings) if ratings else 0
                question_stats[question.id] = {
                    "question_text": question.question_text,
                    "response_count": len(question_responses),
                    "average_rating": avg_rating
                }
            else:
                response_counts = {}
                for response in question_responses:
                    value = response.response_value or str(response.rating_value)
                    response_counts[value] = response_counts.get(value, 0) + 1

                question_stats[question.id] = {
                    "question_text": question.question_text,
                    "response_count": len(question_responses),
                    "response_distribution": response_counts
                }

        return {
            "survey_id": survey_id,
            "total_responses": survey_with_responses.total_responses,
            "completion_rate": survey_with_responses.completion_rate,
            "question_statistics": question_stats
        }

    # Exit Exam Management Methods

    async def create_exit_exam(self, exam_data: Dict[str, Any]) -> ExitExam:
        """Create a new exit exam"""
        exit_exam = ExitExam(**exam_data)
        return await self.exit_exam_repository.create(exit_exam)

    async def get_exit_exam(self, exam_id: int) -> Optional[ExitExam]:
        """Get exit exam by ID"""
        return await self.exit_exam_repository.get_by_id(exam_id)

    async def get_exit_exams_by_department(self, department_id: int, skip: int = 0, limit: int = 100) -> List[ExitExam]:
        """Get exit exams for a department"""
        return await self.exit_exam_repository.get_by_department(department_id, skip, limit)

    async def get_active_exit_exams(self, department_id: int, academic_year_id: Optional[int] = None) -> List[ExitExam]:
        """Get active exit exams for a department"""
        return await self.exit_exam_repository.get_active_exams(department_id, academic_year_id)

    async def update_exit_exam(self, exam_id: int, exam_data: Dict[str, Any]) -> ExitExam:
        """Update an existing exit exam"""
        existing_exam = await self.exit_exam_repository.get_by_id(exam_id)
        if not existing_exam:
            raise ValueError(f"Exit exam with id {exam_id} not found")

        # Update fields
        for key, value in exam_data.items():
            if hasattr(existing_exam, key):
                setattr(existing_exam, key, value)

        return await self.exit_exam_repository.update(existing_exam)

    async def delete_exit_exam(self, exam_id: int) -> bool:
        """Delete an exit exam"""
        return await self.exit_exam_repository.delete(exam_id)

    async def submit_exit_exam_result(self, exam_id: int, student_id: int, score: Decimal, max_score: Decimal) -> ExitExamResult:
        """Submit result for an exit exam"""
        exam = await self.exit_exam_repository.get_by_id(exam_id)
        if not exam:
            raise ValueError(f"Exit exam with id {exam_id} not found")

        if not exam.is_active():
            raise ValueError("Exit exam is not active")

        # Check if student has already taken the exam
        if await self.exit_exam_repository.has_student_taken_exam(exam_id, student_id):
            raise ValueError("Student has already taken this exit exam")

        percentage = (score / max_score) * 100 if max_score > 0 else Decimal(0)
        passed = percentage >= exam.passing_score

        result = ExitExamResult(
            exit_exam_id=exam_id,
            student_id=student_id,
            score=score,
            max_score=max_score,
            percentage=percentage,
            passed=passed
        )

        return await self.exit_exam_repository.save_result(result)

    async def get_exit_exam_analytics(self, exam_id: int) -> Optional[Dict[str, Any]]:
        """Get analytics for an exit exam"""
        exam_with_results = await self.exit_exam_repository.get_with_results(exam_id)
        if not exam_with_results:
            return None

        return {
            "exam_id": exam_id,
            "total_students": exam_with_results.total_students,
            "pass_rate": exam_with_results.pass_rate,
            "average_score": exam_with_results.average_score,
            "passing_score": exam_with_results.passing_score
        }

    # Indirect Attainment Calculation Methods

    async def calculate_indirect_attainment(self, department_id: int, academic_year_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Calculate indirect attainment combining survey and exit exam data
        This is a simplified calculation - in practice, this would be more complex
        """
        # Get active surveys and exit exams
        surveys = await self.get_active_surveys(department_id, academic_year_id)
        exit_exams = await self.get_active_exit_exams(department_id, academic_year_id)

        survey_scores = []
        exit_exam_scores = []

        # Calculate survey-based attainment
        for survey in surveys:
            analytics = await self.get_survey_analytics(survey.id)
            if analytics and analytics["total_responses"] > 0:
                # Simplified: average rating as attainment percentage
                avg_attainment = 0
                for q_stat in analytics["question_statistics"].values():
                    if "average_rating" in q_stat:
                        # Convert 1-5 rating to percentage (assuming 5 is 100%)
                        avg_attainment += (q_stat["average_rating"] / 5) * 100
                    else:
                        # For other question types, assume 70% if responses exist
                        avg_attainment += 70

                if analytics["question_statistics"]:
                    avg_attainment /= len(analytics["question_statistics"])
                    survey_scores.append(avg_attainment)

        # Calculate exit exam-based attainment
        for exam in exit_exams:
            analytics = await self.get_exit_exam_analytics(exam.id)
            if analytics and analytics["total_students"] > 0:
                exit_exam_scores.append(analytics["average_score"])

        # Combine scores (weighted average)
        indirect_attainment = 0
        total_weight = 0

        if survey_scores:
            survey_avg = sum(survey_scores) / len(survey_scores)
            indirect_attainment += survey_avg * 0.6  # 60% weight for surveys
            total_weight += 0.6

        if exit_exam_scores:
            exam_avg = sum(exit_exam_scores) / len(exit_exam_scores)
            indirect_attainment += exam_avg * 0.4  # 40% weight for exit exams
            total_weight += 0.4

        if total_weight == 0:
            return {
                "indirect_attainment": 0,
                "survey_count": len(surveys),
                "exit_exam_count": len(exit_exams),
                "message": "No indirect attainment data available"
            }

        indirect_attainment /= total_weight

        return {
            "indirect_attainment": round(indirect_attainment, 2),
            "survey_count": len(surveys),
            "exit_exam_count": len(exit_exams),
            "survey_scores": survey_scores,
            "exit_exam_scores": exit_exam_scores
        }