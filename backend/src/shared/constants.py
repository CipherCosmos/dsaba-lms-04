"""
Application Constants
Centralized constants for the application
"""

# ============================================
# User Constants
# ============================================
MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 50

MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 50

MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 128

# ============================================
# Academic Constants
# ============================================
MIN_SEMESTER = 1
MAX_SEMESTER = 12

MIN_CREDITS = 1
MAX_CREDITS = 10

MIN_BATCH_DURATION = 1
MAX_BATCH_DURATION = 6

# ============================================
# Exam Constants
# ============================================
MIN_EXAM_DURATION = 30  # minutes
MAX_EXAM_DURATION = 300  # minutes

# Question sections
QUESTION_SECTIONS = ['A', 'B', 'C']

# Blooms levels
BLOOMS_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']

# Difficulty levels
DIFFICULTY_LEVELS = ['easy', 'medium', 'hard']

# ============================================
# Marks Constants
# ============================================
MIN_MARKS = 0
MAX_MARKS = 100

DEFAULT_INTERNAL_MAX = 40.0
DEFAULT_EXTERNAL_MAX = 60.0

# Edit window
DEFAULT_MARKS_EDIT_WINDOW_DAYS = 7

# ============================================
# Grading Constants
# ============================================
DEFAULT_GRADING_SCALE = {
    "A+": 90,
    "A": 80,
    "B+": 70,
    "B": 60,
    "C": 50,
    "D": 40,
    "F": 0
}

# Grade points
GRADE_POINTS = {
    "A+": 10,
    "A": 9,
    "B+": 8,
    "B": 7,
    "C": 6,
    "D": 5,
    "F": 0
}

# ============================================
# CO-PO Constants
# ============================================
CO_PO_STRENGTH_LEVELS = [1, 2, 3]  # Low, Medium, High

DEFAULT_CO_TARGET = 70.0  # 70% attainment target

# Attainment levels
ATTAINMENT_LEVELS = {
    "L1": 60.0,  # Level 1 threshold
    "L2": 70.0,  # Level 2 threshold
    "L3": 80.0,  # Level 3 threshold
}

# ============================================
# Pagination Constants
# ============================================
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200

# ============================================
# File Upload Constants
# ============================================
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_UPLOAD_EXTENSIONS = {
    'image': ['.jpg', '.jpeg', '.png', '.gif'],
    'document': ['.pdf', '.doc', '.docx'],
    'spreadsheet': ['.xls', '.xlsx', '.csv'],
}

# ============================================
# API Constants
# ============================================
API_VERSION = "v1"
API_PREFIX = f"/api/{API_VERSION}"

# ============================================
# Cache TTL Constants (seconds)
# ============================================
CACHE_TTL_SHORT = 300  # 5 minutes
CACHE_TTL_MEDIUM = 1800  # 30 minutes
CACHE_TTL_LONG = 3600  # 1 hour
CACHE_TTL_VERY_LONG = 86400  # 24 hours

# ============================================
# Rate Limiting Constants
# ============================================
RATE_LIMIT_LOGIN = "5/minute"
RATE_LIMIT_API = "100/minute"
RATE_LIMIT_HEAVY = "10/minute"  # For expensive operations

# ============================================
# Cache Key Prefixes
# ============================================
CACHE_KEYS = {
    "user": "user:{user_id}",
    "department": "dept:{dept_id}",
    "subject": "subject:{subject_id}",
    "exam": "exam:{exam_id}",
    "analytics": "analytics:{type}:{id}",
    "report": "report:{type}:{id}",
    "co_po": "co_po:{subject_id}",
    "dashboard": "dashboard:{user_id}:{role}",
}

