/**
 * Application Constants
 * Centralized constants for the frontend application
 * These should match backend constants where applicable
 */

// ============================================
// Marks Constants
// ============================================
export const DEFAULT_INTERNAL_MAX = 40.0
export const DEFAULT_EXTERNAL_MAX = 60.0
export const DEFAULT_TOTAL_MARKS = 100.0

// ============================================
// Academic Constants
// ============================================
export const MIN_SEMESTER = 1
export const MAX_SEMESTER = 12

export const MIN_CREDITS = 1
export const MAX_CREDITS = 10

// ============================================
// Exam Constants
// ============================================
export const MIN_EXAM_DURATION = 30 // minutes
export const MAX_EXAM_DURATION = 300 // minutes

export const QUESTION_SECTIONS = ['A', 'B', 'C'] as const
export type QuestionSection = typeof QUESTION_SECTIONS[number]

export const BLOOMS_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const
export type BloomsLevel = typeof BLOOMS_LEVELS[number]

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]

// ============================================
// Grading Constants
// ============================================
export const DEFAULT_GRADING_SCALE = {
  'A+': 90,
  'A': 80,
  'B+': 70,
  'B': 60,
  'C': 50,
  'D': 40,
  'F': 0
} as const

export const GRADE_POINTS = {
  'A+': 10,
  'A': 9,
  'B+': 8,
  'B': 7,
  'C': 6,
  'D': 5,
  'F': 0
} as const

// ============================================
// CO-PO Constants
// ============================================
export const CO_PO_STRENGTH_LEVELS = [1, 2, 3] as const // Low, Medium, High
export type COPStrength = typeof CO_PO_STRENGTH_LEVELS[number]

export const DEFAULT_CO_TARGET = 70.0 // 70% attainment target

// ============================================
// Pagination Constants
// ============================================
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200

// ============================================
// File Upload Constants
// ============================================
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const ALLOWED_UPLOAD_EXTENSIONS = {
  image: ['.jpg', '.jpeg', '.png', '.gif'],
  document: ['.pdf', '.doc', '.docx'],
  spreadsheet: ['.xls', '.xlsx', '.csv'],
} as const

