/**
 * Contract Mapper
 * Maps between frontend and backend contract formats
 * Ensures type safety and consistency
 */

import { DEFAULT_INTERNAL_MAX, DEFAULT_EXTERNAL_MAX } from '../constants'
import type {
  Exam,
  ExamCreateRequest,
  Question,
  QuestionCreateRequest,
  Mark,
  User,
  Subject,
} from '../types/api'

/**
 * Maps backend Exam response to frontend Exam interface.
 * Ensures questions array is initialized if missing.
 */
export function mapExamResponse(backendExam: Exam): Exam {
  return {
    ...backendExam,
    questions: backendExam.questions || []
  }
}

/**
 * Maps frontend Exam to backend ExamCreateRequest format.
 * Extracts exam data while excluding questions for separate handling.
 */
export function mapExamRequest(frontendExam: Pick<Exam, 'name' | 'exam_type' | 'subject_assignment_id' | 'total_marks'> & Partial<Exam>): ExamCreateRequest {
  const { questions, ...examData } = frontendExam
  return {
    name: examData.name!,
    subject_assignment_id: examData.subject_assignment_id!,
    exam_type: examData.exam_type!,
    exam_date: examData.exam_date,
    total_marks: examData.total_marks!,
    duration_minutes: examData.duration_minutes,
    instructions: examData.instructions
  }
}

/**
 * Maps backend Question response to frontend Question interface.
 * Ensures co_weights array is initialized if missing.
 */
export function mapQuestionResponse(backendQuestion: Question): Question {
  return {
    ...backendQuestion,
    co_mappings: backendQuestion.co_mappings || []
  }
}

/**
 * Maps frontend Question to backend QuestionCreateRequest format.
 * Applies default values for required_count and optional_count if not provided.
 */
export function mapQuestionRequest(frontendQuestion: Partial<Question>): QuestionCreateRequest {
  return {
    exam_id: frontendQuestion.exam_id!,
    question_no: (frontendQuestion as any).question_no ?? frontendQuestion.question_number!,
    question_text: frontendQuestion.question_text!,
    section: frontendQuestion.section!,
    marks_per_question: (frontendQuestion as any).marks_per_question ?? frontendQuestion.marks!,
    required_count: frontendQuestion.required_count || 1,
    optional_count: frontendQuestion.optional_count || 0,
    blooms_level: (frontendQuestion as any).blooms_level ?? frontendQuestion.bloom_level!,
    difficulty: frontendQuestion.difficulty!
  }
}

/**
 * Maps backend Mark response to frontend Mark interface.
 * No transformations applied; returns the mark as-is.
 */
export function mapMarkResponse(backendMark: Mark): Mark {
  return {
    ...backendMark
  }
}

/**
 * Maps backend User response to frontend User interface.
 * Adds a computed 'role' field for backward compatibility, defaulting to the first role or 'student'.
 */
export function mapUserResponse(backendUser: User): User & { role: string } {
  return {
    ...backendUser,
    role: backendUser.primary_role || backendUser.roles?.[0]?.role || 'student'
  }
}

/**
 * Maps backend Subject response to frontend Subject interface.
 * Applies default values for max_internal, max_external, and is_active using constants.
 * Computes total_marks as the sum of max_internal and max_external.
 */
export function mapSubjectResponse(backendSubject: Subject): Subject & { total_marks: number } {
  return {
    ...backendSubject,
    // Ensure optional fields have defaults using constants
    max_internal: backendSubject.max_internal ?? DEFAULT_INTERNAL_MAX,
    max_external: backendSubject.max_external ?? DEFAULT_EXTERNAL_MAX,
    total_marks: backendSubject.total_marks ?? (backendSubject.max_internal ?? DEFAULT_INTERNAL_MAX) + (backendSubject.max_external ?? DEFAULT_EXTERNAL_MAX),
    is_active: backendSubject.is_active ?? true
  }
}

