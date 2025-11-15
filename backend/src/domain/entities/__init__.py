"""Domain Entities"""

from .base import Entity, AggregateRoot, ValueObject
from .user import User
from .department import Department
from .academic_structure import Batch, BatchYear, Semester
from .subject import Subject
from .exam import Exam
from .mark import Mark
from .course_outcome import CourseOutcome
from .program_outcome import ProgramOutcome
from .co_po_mapping import COPOMapping
from .question import Question
from .sub_question import SubQuestion
from .final_mark import FinalMark

__all__ = [
    "Entity",
    "AggregateRoot",
    "ValueObject",
    "User",
    "Department",
    "Batch",
    "BatchYear",
    "Semester",
    "Subject",
    "Exam",
    "Mark",
    "CourseOutcome",
    "ProgramOutcome",
    "COPOMapping",
    "Question",
    "SubQuestion",
    "FinalMark",
]

