/**
 * Contract Mapper
 * Maps between frontend and backend contract formats
 * Ensures type safety and consistency
 */

import { DEFAULT_INTERNAL_MAX, DEFAULT_EXTERNAL_MAX } from '../constants'

/**
 * Maps backend ExamResponse to frontend Exam interface
 */
export function mapExamResponse(backendExam: any): any {
  return {
    ...backendExam,
    questions: backendExam.questions || []
  }
}

/**
 * Maps frontend Exam to backend ExamCreateRequest format
 */
export function mapExamRequest(frontendExam: any): any {
  const { questions, ...examData } = frontendExam
  return {
    name: examData.name,
    subject_assignment_id: examData.subject_assignment_id,
    exam_type: examData.exam_type,
    exam_date: examData.exam_date,
    total_marks: examData.total_marks,
    duration_minutes: examData.duration_minutes,
    instructions: examData.instructions
  }
}

/**
 * Maps backend QuestionResponse to frontend Question interface
 */
export function mapQuestionResponse(backendQuestion: any): any {
  return {
    ...backendQuestion,
    co_weights: backendQuestion.co_weights || []
  }
}

/**
 * Maps frontend Question to backend CreateQuestionRequest format
 */
export function mapQuestionRequest(frontendQuestion: any): any {
  return {
    exam_id: frontendQuestion.exam_id,
    question_no: frontendQuestion.question_no,
    question_text: frontendQuestion.question_text,
    section: frontendQuestion.section,
    marks_per_question: frontendQuestion.marks_per_question,
    required_count: frontendQuestion.required_count || 1,
    optional_count: frontendQuestion.optional_count || 0,
    blooms_level: frontendQuestion.blooms_level,
    difficulty: frontendQuestion.difficulty
  }
}

/**
 * Maps backend MarkResponse to frontend Mark interface
 */
export function mapMarkResponse(backendMark: any): any {
  return {
    ...backendMark
  }
}

/**
 * Maps backend UserResponse to frontend User interface
 */
export function mapUserResponse(backendUser: any): any {
  return {
    ...backendUser,
    role: backendUser.role || (backendUser.roles?.[0]) || 'student'
  }
}

/**
 * Maps backend SubjectResponse to frontend Subject interface
 */
export function mapSubjectResponse(backendSubject: any): any {
  return {
    ...backendSubject,
    // Ensure optional fields have defaults using constants
    max_internal: backendSubject.max_internal ?? DEFAULT_INTERNAL_MAX,
    max_external: backendSubject.max_external ?? DEFAULT_EXTERNAL_MAX,
    total_marks: backendSubject.total_marks ?? (backendSubject.max_internal ?? DEFAULT_INTERNAL_MAX) + (backendSubject.max_external ?? DEFAULT_EXTERNAL_MAX),
    is_active: backendSubject.is_active ?? true
  }
}

