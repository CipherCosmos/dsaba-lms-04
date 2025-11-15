"""
Exam Type Enumerations
"""

from enum import Enum


class ExamType(str, Enum):
    """
    Types of exams in the system
    """
    
    INTERNAL_1 = "internal1"
    INTERNAL_2 = "internal2"
    EXTERNAL = "external"
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def display_name(self) -> str:
        return {
            self.INTERNAL_1: "Internal Assessment 1",
            self.INTERNAL_2: "Internal Assessment 2",
            self.EXTERNAL: "External Examination",
        }[self]
    
    @property
    def is_internal(self) -> bool:
        return self in [self.INTERNAL_1, self.INTERNAL_2]
    
    @property
    def is_external(self) -> bool:
        return self == self.EXTERNAL
    
    @property
    def default_weightage(self) -> float:
        """Default weightage percentage"""
        return {
            self.INTERNAL_1: 20.0,
            self.INTERNAL_2: 20.0,
            self.EXTERNAL: 60.0,
        }[self]


class QuestionSection(str, Enum):
    """
    Question paper sections
    """
    
    SECTION_A = "A"
    SECTION_B = "B"
    SECTION_C = "C"
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def display_name(self) -> str:
        return f"Section {self.value}"


class QuestionDifficulty(str, Enum):
    """
    Question difficulty levels
    """
    
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def marks_multiplier(self) -> float:
        """Suggested marks multiplier"""
        return {
            self.EASY: 1.0,
            self.MEDIUM: 1.5,
            self.HARD: 2.0,
        }[self]


class BloomsLevel(str, Enum):
    """
    Bloom's Taxonomy levels
    """
    
    L1_REMEMBER = "L1"
    L2_UNDERSTAND = "L2"
    L3_APPLY = "L3"
    L4_ANALYZE = "L4"
    L5_EVALUATE = "L5"
    L6_CREATE = "L6"
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def display_name(self) -> str:
        return {
            self.L1_REMEMBER: "L1: Remember",
            self.L2_UNDERSTAND: "L2: Understand",
            self.L3_APPLY: "L3: Apply",
            self.L4_ANALYZE: "L4: Analyze",
            self.L5_EVALUATE: "L5: Evaluate",
            self.L6_CREATE: "L6: Create",
        }[self]
    
    @property
    def cognitive_level(self) -> int:
        """Cognitive complexity level (1-6)"""
        return int(self.value[1])


class ExamStatus(str, Enum):
    """
    Exam lifecycle status
    """
    
    DRAFT = "draft"
    ACTIVE = "active"
    LOCKED = "locked"
    PUBLISHED = "published"
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def display_name(self) -> str:
        return self.value.capitalize()
    
    def can_transition_to(self, new_status: "ExamStatus") -> bool:
        """Check if transition to new status is allowed"""
        valid_transitions = {
            self.DRAFT: [self.ACTIVE],
            self.ACTIVE: [self.LOCKED],
            self.LOCKED: [self.PUBLISHED],
            self.PUBLISHED: [],  # Terminal state
        }
        return new_status in valid_transitions.get(self, [])

