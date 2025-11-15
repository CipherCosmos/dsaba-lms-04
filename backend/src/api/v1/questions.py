"""
Question API Endpoints
CRUD operations for Questions
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List

from src.application.services.question_service import QuestionService
from src.application.dto.question_dto import (
    CreateQuestionRequest,
    UpdateQuestionRequest,
    QuestionResponse,
    QuestionListResponse,
    CreateQuestionCOMappingRequest,
    QuestionCOMappingResponse
)
from src.api.dependencies import get_current_user, get_exam_repository
from src.domain.entities.user import User
from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.infrastructure.database.repositories.question_repository_impl import QuestionRepository
from src.infrastructure.database.repositories.exam_repository_impl import ExamRepository
from src.infrastructure.database.repositories.course_outcome_repository_impl import CourseOutcomeRepository
from src.infrastructure.database.models import QuestionCOMappingModel
from src.infrastructure.database.session import get_db
from sqlalchemy.orm import Session
from decimal import Decimal


def get_question_service(
    db: Session = Depends(get_db),
    exam_repo: ExamRepository = Depends(get_exam_repository)
) -> QuestionService:
    """Get question service instance"""
    question_repo = QuestionRepository(db)
    return QuestionService(question_repo, exam_repo)


# Create router
router = APIRouter(
    prefix="/questions",
    tags=["Questions"],
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
    }
)


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    request: CreateQuestionRequest,
    service: QuestionService = Depends(get_question_service),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new question
    
    - **exam_id**: Exam ID
    - **question_no**: Question number (e.g., "1", "2a")
    - **question_text**: Question text/content
    - **section**: Section (A, B, or C)
    - **marks_per_question**: Marks for this question
    - **required_count**: Number of required answers (default 1)
    - **optional_count**: Number of optional answers (default 0)
    - **blooms_level**: Bloom's taxonomy level (L1-L6, optional)
    - **difficulty**: Difficulty level (easy, medium, hard, optional)
    """
    try:
        question = await service.create_question(
            exam_id=request.exam_id,
            question_no=request.question_no,
            question_text=request.question_text,
            section=request.section,
            marks_per_question=request.marks_per_question,
            required_count=request.required_count,
            optional_count=request.optional_count,
            blooms_level=request.blooms_level,
            difficulty=request.difficulty
        )
        
        return QuestionResponse(
            id=question.id,
            exam_id=question.exam_id,
            question_no=question.question_no,
            question_text=question.question_text,
            section=question.section,
            marks_per_question=float(question.marks_per_question),
            required_count=question.required_count,
            optional_count=question.optional_count,
            blooms_level=question.blooms_level,
            difficulty=question.difficulty,
            created_at=question.created_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    service: QuestionService = Depends(get_question_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get question by ID
    
    - **question_id**: Question ID
    """
    try:
        question = await service.get_question(question_id)
        
        return QuestionResponse(
            id=question.id,
            exam_id=question.exam_id,
            question_no=question.question_no,
            question_text=question.question_text,
            section=question.section,
            marks_per_question=float(question.marks_per_question),
            required_count=question.required_count,
            optional_count=question.optional_count,
            blooms_level=question.blooms_level,
            difficulty=question.difficulty,
            created_at=question.created_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/exam/{exam_id}", response_model=QuestionListResponse)
async def get_questions_by_exam(
    exam_id: int,
    section: Optional[str] = Query(None, pattern="^(A|B|C)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    service: QuestionService = Depends(get_question_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get all questions for an exam
    
    - **exam_id**: Exam ID
    - **section**: Optional section filter (A, B, C)
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records
    """
    try:
        questions = await service.get_questions_by_exam(exam_id, section, skip, limit)
        
        items = [
            QuestionResponse(
                id=q.id,
                exam_id=q.exam_id,
                question_no=q.question_no,
                question_text=q.question_text,
                section=q.section,
                marks_per_question=float(q.marks_per_question),
                required_count=q.required_count,
                optional_count=q.optional_count,
                blooms_level=q.blooms_level,
                difficulty=q.difficulty,
                created_at=q.created_at
            )
            for q in questions
        ]
        
        return QuestionListResponse(
            items=items,
            total=len(items),
            skip=skip,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    request: UpdateQuestionRequest,
    service: QuestionService = Depends(get_question_service),
    current_user: User = Depends(get_current_user)
):
    """
    Update question
    
    - **question_id**: Question ID
    - **question_text**: New question text (optional)
    - **section**: New section (optional)
    - **marks_per_question**: New marks (optional)
    - **required_count**: New required count (optional)
    - **optional_count**: New optional count (optional)
    - **blooms_level**: New Bloom's level (optional)
    - **difficulty**: New difficulty (optional)
    """
    try:
        question = await service.update_question(
            question_id=question_id,
            question_text=request.question_text,
            section=request.section,
            marks_per_question=request.marks_per_question,
            required_count=request.required_count,
            optional_count=request.optional_count,
            blooms_level=request.blooms_level,
            difficulty=request.difficulty
        )
        
        return QuestionResponse(
            id=question.id,
            exam_id=question.exam_id,
            question_no=question.question_no,
            question_text=question.question_text,
            section=question.section,
            marks_per_question=float(question.marks_per_question),
            required_count=question.required_count,
            optional_count=question.optional_count,
            blooms_level=question.blooms_level,
            difficulty=question.difficulty,
            created_at=question.created_at
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    service: QuestionService = Depends(get_question_service),
    current_user: User = Depends(get_current_user)
):
    """
    Delete question
    
    - **question_id**: Question ID
    """
    try:
        await service.delete_question(question_id)
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/co-mapping", response_model=QuestionCOMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_question_co_mapping(
    request: CreateQuestionCOMappingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a Question-CO mapping
    
    - **question_id**: Question ID
    - **co_id**: Course Outcome ID
    - **weight_pct**: Weight percentage (0-100, default 100)
    """
    try:
        # Verify question exists
        question_repo = QuestionRepository(db)
        question = await question_repo.get_by_id(request.question_id)
        if not question:
            raise EntityNotFoundError("Question", request.question_id)
        
        # Verify CO exists
        co_repo = CourseOutcomeRepository(db)
        co = await co_repo.get_by_id(request.co_id)
        if not co:
            raise EntityNotFoundError("CourseOutcome", request.co_id)
        
        # Check if mapping already exists
        existing = db.query(QuestionCOMappingModel).filter(
            QuestionCOMappingModel.question_id == request.question_id,
            QuestionCOMappingModel.co_id == request.co_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Question-CO mapping already exists"
            )
        
        # Create mapping
        mapping = QuestionCOMappingModel(
            question_id=request.question_id,
            co_id=request.co_id,
            weight_pct=request.weight_pct
        )
        
        db.add(mapping)
        db.commit()
        db.refresh(mapping)
        
        return QuestionCOMappingResponse(
            question_id=mapping.question_id,
            co_id=mapping.co_id,
            weight_pct=float(mapping.weight_pct)
        )
    except EntityNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/{question_id}/co-mappings", response_model=List[QuestionCOMappingResponse])
async def get_question_co_mappings(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all CO mappings for a question
    
    - **question_id**: Question ID
    """
    try:
        mappings = db.query(QuestionCOMappingModel).filter(
            QuestionCOMappingModel.question_id == question_id
        ).all()
        
        return [
            QuestionCOMappingResponse(
                question_id=m.question_id,
                co_id=m.co_id,
                weight_pct=float(m.weight_pct)
            )
            for m in mappings
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/co-mapping/{question_id}/{co_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question_co_mapping(
    question_id: int,
    co_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete Question-CO mapping
    
    - **question_id**: Question ID
    - **co_id**: Course Outcome ID
    """
    mapping = db.query(QuestionCOMappingModel).filter(
        QuestionCOMappingModel.question_id == question_id,
        QuestionCOMappingModel.co_id == co_id
    ).first()
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question-CO mapping not found"
        )
    
    db.delete(mapping)
    db.commit()

