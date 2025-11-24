"""Domain Repository Interfaces"""

from .base_repository import IRepository, IReadOnlyRepository, IWriteOnlyRepository
from .user_repository import IUserRepository
from .department_repository import IDepartmentRepository
from .exam_repository import IExamRepository
from .mark_repository import IMarkRepository
from .academic_structure_repository import IBatchRepository, IBatchYearRepository, ISemesterRepository, IBatchInstanceRepository, ISectionRepository
from .subject_repository import ISubjectRepository
from .subject_assignment_repository import ISubjectAssignmentRepository
from .course_outcome_repository import ICourseOutcomeRepository
from .program_outcome_repository import IProgramOutcomeRepository
from .co_po_mapping_repository import ICOPOMappingRepository
from .question_repository import IQuestionRepository
from .final_mark_repository import IFinalMarkRepository
from .password_reset_token_repository import IPasswordResetTokenRepository
from .survey_repository import SurveyRepository
from .exit_exam_repository import ExitExamRepository

__all__ = [
    "IRepository",
    "IReadOnlyRepository",
    "IWriteOnlyRepository",
    "IUserRepository",
    "IDepartmentRepository",
    "IExamRepository",
    "IMarkRepository",
    "IBatchRepository",
    "IBatchYearRepository",
    "ISemesterRepository",
    "IBatchInstanceRepository",
    "ISectionRepository",
    "ISubjectRepository",
    "ISubjectAssignmentRepository",
    "ICourseOutcomeRepository",
    "IProgramOutcomeRepository",
    "ICOPOMappingRepository",
    "IQuestionRepository",
    "IFinalMarkRepository",
    "IPasswordResetTokenRepository",
    "SurveyRepository",
    "ExitExamRepository",
]

