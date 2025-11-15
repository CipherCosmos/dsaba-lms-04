"""Domain Repository Interfaces"""

from .base_repository import IRepository, IReadOnlyRepository, IWriteOnlyRepository
from .user_repository import IUserRepository
from .department_repository import IDepartmentRepository
from .exam_repository import IExamRepository
from .mark_repository import IMarkRepository
from .academic_structure_repository import IBatchRepository, IBatchYearRepository, ISemesterRepository
from .subject_repository import ISubjectRepository
from .course_outcome_repository import ICourseOutcomeRepository
from .program_outcome_repository import IProgramOutcomeRepository
from .co_po_mapping_repository import ICOPOMappingRepository
from .question_repository import IQuestionRepository
from .final_mark_repository import IFinalMarkRepository
from .password_reset_token_repository import IPasswordResetTokenRepository

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
    "ISubjectRepository",
    "ICourseOutcomeRepository",
    "IProgramOutcomeRepository",
    "ICOPOMappingRepository",
    "IQuestionRepository",
    "IFinalMarkRepository",
    "IPasswordResetTokenRepository",
]

