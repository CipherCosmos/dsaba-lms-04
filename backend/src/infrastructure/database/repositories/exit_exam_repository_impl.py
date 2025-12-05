"""
Exit exam repository implementation for indirect attainment
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ....domain.repositories.exit_exam_repository import ExitExamRepository
from ....domain.entities.exit_exam import ExitExam, ExitExamResult, ExitExamWithResults
from ..models import ExitExamModel, ExitExamResultModel


class ExitExamRepositoryImpl(ExitExamRepository):
    """SQLAlchemy implementation of ExitExamRepository"""

    def __init__(self, session: Session):
        self.session = session

    async def get_by_id(self, exit_exam_id: int) -> Optional[ExitExam]:
        """Get exit exam by ID"""
        exam_model = self.session.query(ExitExamModel).filter(ExitExamModel.id == exit_exam_id).first()
        if not exam_model:
            return None

        return ExitExam(
            id=exam_model.id,
            title=exam_model.title,
            description=exam_model.description,
            department_id=exam_model.department_id,
            academic_year_id=exam_model.academic_year_id,
            status=exam_model.status,
            exam_date=exam_model.exam_date,
            total_questions=exam_model.total_questions,
            passing_score=exam_model.passing_score,
            created_by=exam_model.created_by,
            created_at=exam_model.created_at,
            updated_at=exam_model.updated_at,
            results=[]  # Will be loaded separately if needed
        )

    async def get_by_department(self, department_id: int, skip: int = 0, limit: int = 100) -> List[ExitExam]:
        """Get exit exams by department"""
        exam_models = self.session.query(ExitExamModel).filter(
            ExitExamModel.department_id == department_id
        ).order_by(ExitExamModel.created_at.desc()).offset(skip).limit(limit).all()

        exams = []
        for em in exam_models:
            exam = await self.get_by_id(em.id)
            if exam:
                exams.append(exam)

        return exams

    async def get_active_exams(self, department_id: int, academic_year_id: Optional[int] = None) -> List[ExitExam]:
        """Get active exit exams for a department"""
        query = self.session.query(ExitExamModel).filter(
            and_(
                ExitExamModel.department_id == department_id,
                ExitExamModel.status == "active"
            )
        )

        if academic_year_id:
            query = query.filter(ExitExamModel.academic_year_id == academic_year_id)

        exam_models = query.order_by(ExitExamModel.created_at.desc()).all()

        exams = []
        for em in exam_models:
            exam = await self.get_by_id(em.id)
            if exam:
                exams.append(exam)

        return exams

    async def create(self, exit_exam: ExitExam) -> ExitExam:
        """Create a new exit exam"""
        exam_model = ExitExamModel(
            title=exit_exam.title,
            description=exit_exam.description,
            department_id=exit_exam.department_id,
            academic_year_id=exit_exam.academic_year_id,
            status=exit_exam.status,
            exam_date=exit_exam.exam_date,
            total_questions=exit_exam.total_questions,
            passing_score=exit_exam.passing_score,
            created_by=exit_exam.created_by
        )

        self.session.add(exam_model)
        self.session.commit()

        return await self.get_by_id(exam_model.id)

    async def update(self, exit_exam: ExitExam) -> ExitExam:
        """Update an existing exit exam"""
        exam_model = self.session.query(ExitExamModel).filter(ExitExamModel.id == exit_exam.id).first()
        if not exam_model:
            raise ValueError(f"Exit exam with id {exit_exam.id} not found")

        exam_model.title = exit_exam.title
        exam_model.description = exit_exam.description
        exam_model.status = exit_exam.status
        exam_model.exam_date = exit_exam.exam_date
        exam_model.total_questions = exit_exam.total_questions
        exam_model.passing_score = exit_exam.passing_score
        exam_model.updated_at = exit_exam.updated_at

        self.session.commit()

        return await self.get_by_id(exit_exam.id)

    async def delete(self, exit_exam_id: int) -> bool:
        """Delete an exit exam"""
        result = self.session.query(ExitExamModel).filter(ExitExamModel.id == exit_exam_id).delete()
        self.session.commit()
        return result > 0

    async def get_with_results(self, exit_exam_id: int) -> Optional[ExitExamWithResults]:
        """Get exit exam with all results"""
        exam = await self.get_by_id(exit_exam_id)
        if not exam:
            return None

        # Get all results
        result_models = self.session.query(ExitExamResultModel).filter(
            ExitExamResultModel.exit_exam_id == exit_exam_id
        ).all()

        results = []
        for rm in result_models:
            results.append(ExitExamResult(
                id=rm.id,
                exit_exam_id=rm.exit_exam_id,
                student_id=rm.student_id,
                score=rm.score,
                max_score=rm.max_score,
                percentage=rm.percentage,
                passed=rm.passed,
                submitted_at=rm.submitted_at
            ))

        # Calculate aggregated statistics
        total_students = len(results)
        pass_rate = exam.calculate_pass_rate() if results else 0.0
        average_score = exam.calculate_average_score() if results else 0.0

        exam_data = exam.dict()
        exam_data.pop("results", None)

        return ExitExamWithResults(
            **exam_data,
            total_students=total_students,
            pass_rate=pass_rate,
            average_score=average_score,
            results=results
        )

    async def save_result(self, result: ExitExamResult) -> ExitExamResult:
        """Save an exit exam result"""
        result_model = ExitExamResultModel(
            exit_exam_id=result.exit_exam_id,
            student_id=result.student_id,
            score=result.score,
            max_score=result.max_score,
            percentage=result.percentage,
            passed=result.passed,
            submitted_at=result.submitted_at
        )

        self.session.add(result_model)
        self.session.commit()

        result.id = result_model.id
        return result

    async def get_student_result(self, exit_exam_id: int, student_id: int) -> Optional[ExitExamResult]:
        """Get result for a specific student in an exit exam"""
        result_model = self.session.query(ExitExamResultModel).filter(
            and_(
                ExitExamResultModel.exit_exam_id == exit_exam_id,
                ExitExamResultModel.student_id == student_id
            )
        ).first()

        if not result_model:
            return None

        return ExitExamResult(
            id=result_model.id,
            exit_exam_id=result_model.exit_exam_id,
            student_id=result_model.student_id,
            score=result_model.score,
            max_score=result_model.max_score,
            percentage=result_model.percentage,
            passed=result_model.passed,
            submitted_at=result_model.submitted_at
        )

    async def has_student_taken_exam(self, exit_exam_id: int, student_id: int) -> bool:
        """Check if student has already taken the exit exam"""
        count = self.session.query(func.count(ExitExamResultModel.id)).filter(
            and_(
                ExitExamResultModel.exit_exam_id == exit_exam_id,
                ExitExamResultModel.student_id == student_id
            )
        ).scalar()

        return count > 0