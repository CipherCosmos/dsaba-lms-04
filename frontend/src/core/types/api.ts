/**
 * API Type Definitions
 * Comprehensive TypeScript interfaces matching backend DTOs exactly
 * 
 * These types ensure 100% type safety between frontend and backend
 * and match the production backend schema 1:1
 */

// ============================================
// SMART MARKS TYPES
// ============================================

export interface SmartMarksCalculation {
  student_id: number
  subject_assignment_id: number
  internal_1?: number
  internal_2?: number
  best_internal: number
  external_marks?: number
  total_marks: number
  percentage: number
  grade: string
  grade_point: number
  credits?: number
}

export interface SGPACalculation {
  student_id: number
  semester_id: number
  sgpa: number
  total_credits: number
  subjects_count: number
  subjects: Array<{
    subject_id: number
    subject_name: string
    subject_code: string
    credits: number
    grade: string
    grade_point: number
  }>
}

export interface CGPACalculation {
  student_id: number
  cgpa: number
  total_credits: number
  semesters_count: number
  semesters: Array<{
    semester_id: number
    semester_name: string
    sgpa: number
    credits: number
  }>
}

export interface GradingScale {
  min_percentage: number
  max_percentage: number
  grade: string
  grade_point: number
  description: string
}

export interface FinalMarksData {
  student_id: number
  subject_assignment_id: number
  semester_id: number
  internal_1?: number
  internal_2?: number
  best_internal: number
  external_marks?: number
  total_marks: number
  percentage: number
  grade: string
  grade_point: number
  is_published: boolean
  published_at?: string
}

// ============================================
// CO-PO ATTAINMENT TYPES
// ============================================

export interface COAttainment {
  co_id: number
  co_code: string
  co_description: string
  subject_id: number
  subject_name: string
  target_attainment: number
  actual_attainment: number
  attainment_met: boolean
  level_distribution: {
    L1: COLevelAttainment
    L2: COLevelAttainment
    L3: COLevelAttainment
  }
  students_analyzed: number
  semester_id?: number
  academic_year_id?: number
}

export interface COLevelAttainment {
  level: 'L1' | 'L2' | 'L3'
  threshold: number
  students_above_threshold: number
  total_students: number
  attainment_percentage: number
  attainment_met: boolean
}

export interface POAttainment {
  po_id: number
  po_code: string
  po_description: string
  department_id: number
  target_attainment: number
  actual_attainment: number
  attainment_met: boolean
  contributing_cos: Array<{
    co_id: number
    co_code: string
    subject_name: string
    co_attainment: number
    mapping_strength: 1 | 2 | 3
    weighted_contribution: number
  }>
  academic_year_id?: number
}

export interface COPOAttainmentSummary {
  department_id: number
  department_name: string
  academic_year_id: number
  academic_year_name: string
  co_attainments: COAttainment[]
  po_attainments: POAttainment[]
  overall_co_attainment: number
  overall_po_attainment: number
  nba_compliance: {
    co_attainment_threshold: number
    po_attainment_threshold: number
    cos_met: number
    cos_total: number
    pos_met: number
    pos_total: number
    is_compliant: boolean
  }
  trends?: {
    co_attainment_trend: 'increasing' | 'decreasing' | 'stable'
    po_attainment_trend: 'increasing' | 'decreasing' | 'stable'
  }
}

export interface AttainmentTrend {
  period: string // "Semester 1", "2023-24", etc.
  period_id: number
  attainment_percentage: number
  target_percentage: number
  students_analyzed: number
  date: string
}

// ============================================
// ENHANCED ANALYTICS TYPES
// ============================================

export interface BloomsTaxonomyAnalysis {
  exam_id?: number
  subject_id?: number
  semester_id?: number
  department_id?: number
  level_distribution: {
    L1_Remember: BloomsLevel
    L2_Understand: BloomsLevel
    L3_Apply: BloomsLevel
    L4_Analyze: BloomsLevel
    L5_Evaluate: BloomsLevel
    L6_Create: BloomsLevel
  }
  total_questions: number
  total_marks: number
  student_performance_by_level: {
    [key: string]: {
      level: string
      avg_marks_percentage: number
      students_above_60: number
      students_above_40: number
      total_students: number
    }
  }
}

export interface BloomsLevel {
  level: string
  questions_count: number
  marks_allocated: number
  percentage_of_total: number
  recommended_percentage: number
  is_balanced: boolean
}

export interface PerformanceTrend {
  period: string
  period_start: string
  period_end: string
  avg_marks: number
  median_marks: number
  pass_rate: number
  students_count: number
  subjects_count?: number
  co_attainment_avg?: number
  po_attainment_avg?: number
}

export interface DepartmentComparison {
  academic_year_id: number
  semester_id?: number
  departments: Array<{
    department_id: number
    department_name: string
    metrics: {
      avg_marks?: number
      pass_rate?: number
      students_count?: number
      co_attainment?: number
      po_attainment?: number
      sgpa_avg?: number
    }
    rank: number
  }>
  overall_metrics: {
    avg_marks: number
    pass_rate: number
    total_students: number
  }
}

export interface StudentPerformanceAnalytics {
  student_id: number
  student_name: string
  roll_no: string
  semester_id?: number
  overall_performance: {
    cgpa: number
    sgpa?: number
    total_credits: number
    rank?: number
    percentile?: number
  }
  subject_wise_performance: Array<{
    subject_id: number
    subject_name: string
    subject_code: string
    internal_marks: number
    external_marks: number
    total_marks: number
    percentage: number
    grade: string
    credits: number
  }>
  co_attainment?: Array<{
    co_id: number
    co_code: string
    subject_name: string
    attainment_percentage: number
    attainment_met: boolean
  }>
  strengths: string[]
  weaknesses: string[]
  trends?: {
    marks_trend: 'improving' | 'declining' | 'stable'
    sgpa_trend: 'improving' | 'declining' | 'stable'
  }
}

export interface TeacherPerformanceAnalytics {
  teacher_id: number
  teacher_name: string
  semester_id?: number
  subjects_taught: number
  students_taught: number
  class_performance: {
    avg_marks: number
    pass_rate: number
    distinction_rate: number
    fail_rate: number
  }
  co_attainment: {
    avg_co_attainment: number
    cos_met: number
    cos_total: number
  }
  class_comparison?: Array<{
    batch_instance_id: number
    batch_name: string
    section_name: string
    subject_name: string
    avg_marks: number
    pass_rate: number
  }>
  teaching_effectiveness_score?: number
}

export interface ClassPerformanceAnalytics {
  batch_instance_id: number
  batch_name: string
  department_name: string
  semester_id?: number
  subject_id?: number
  students_count: number
  performance: {
    avg_marks: number
    median_marks: number
    highest_marks: number
    lowest_marks: number
    pass_rate: number
    distinction_rate: number
    fail_rate: number
  }
  grade_distribution: {
    [grade: string]: number // 'A+': 10, 'A': 15, etc.
  }
  co_attainment?: Array<{
    co_id: number
    co_code: string
    attainment_percentage: number
  }>
  top_performers: Array<{
    student_id: number
    student_name: string
    marks: number
    percentage: number
  }>
  struggling_students: Array<{
    student_id: number
    student_name: string
    marks: number
    percentage: number
  }>
}

export interface SubjectAnalytics {
  subject_id: number
  subject_name: string
  subject_code: string
  semester_id?: number
  batch_instance_id?: number
  students_enrolled: number
  performance_distribution: {
    avg_marks: number
    median_marks: number
    std_deviation: number
    pass_rate: number
  }
  co_attainment?: Array<{
    co_id: number
    co_code: string
    co_description: string
    target_attainment: number
    actual_attainment: number
    attainment_met: boolean
  }>
  bloom_analysis?: BloomsTaxonomyAnalysis
  question_analysis?: {
    total_questions: number
    easy_questions: number
    medium_questions: number
    hard_questions: number
    avg_difficulty: number
  }
}

export interface DepartmentAnalytics {
  department_id: number
  department_name: string
  academic_year_id?: number
  overall_performance: {
    total_students: number
    avg_sgpa: number
    pass_rate: number
    distinction_rate: number
  }
  po_attainment?: Array<{
    po_id: number
    po_code: string
    target_attainment: number
    actual_attainment: number
    attainment_met: boolean
  }>
  teacher_performance: Array<{
    teacher_id: number
    teacher_name: string
    subjects_taught: number
    avg_class_performance: number
  }>
  batch_comparison?: Array<{
    batch_instance_id: number
    batch_name: string
    students_count: number
    avg_sgpa: number
    pass_rate: number
  }>
  trends?: {
    performance_trend: 'improving' | 'declining' | 'stable'
    po_attainment_trend: 'improving' | 'declining' | 'stable'
  }
}

export interface NBAAccreditationData {
  department_id: number
  department_name: string
  academic_year_id: number
  academic_year_name: string
  program_name: string
  accreditation_cycle: string
  co_attainment_summary: {
    total_cos: number
    cos_attained: number
    cos_not_attained: number
    overall_attainment: number
    target_threshold: number
  }
  po_attainment_summary: {
    total_pos: number
    pos_attained: number
    pos_not_attained: number
    overall_attainment: number
    target_threshold: number
  }
  direct_attainment: {
    internal_assessment: {
      weightage: number
      attainment: number
    }
    external_assessment: {
      weightage: number
      attainment: number
    }
  }
  indirect_attainment?: {
    student_feedback: {
      weightage: number
      attainment: number
    }
    employer_feedback: {
      weightage: number
      attainment: number
    }
    alumni_feedback: {
      weightage: number
      attainment: number
    }
  }
  overall_attainment: number
  nba_compliance_status: 'compliant' | 'non_compliant' | 'partial'
  recommendations: string[]
}

// ============================================
// EXISTING TYPES (Updated to match backend)
// ============================================

export interface BatchInstance {
  id: number
  academic_year_id: number
  department_id: number
  batch_id: number
  admission_year: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Populated fields
  academic_year?: AcademicYear
  department?: Department
  batch?: Batch
  sections?: Section[]
  students_count?: number
}

export interface Section {
  id: number
  batch_instance_id: number
  section_name: string
  capacity?: number
  current_strength?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AcademicYear {
  id: number
  start_year: number
  end_year: number
  display_name: string
  start_date?: string
  end_date?: string
  status: 'draft' | 'active' | 'archived'
  is_current: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: number
  name: string
  code: string
  description?: string
  hod_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Populated fields
  hod?: User
}

export interface Batch {
  id: number
  name: string
  code: string
  degree_type: string
  duration_years: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  // Role information
  roles?: UserRole[]
  primary_role?: string
}

export interface UserRole {
  role: string
  department_id?: number
  department?: Department
}

export interface Subject {
  id: number
  code: string
  name: string
  description?: string
  department_id: number
  credits: number
  max_internal: number
  max_external: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Populated fields
  department?: Department
}

export interface SubjectAssignment {
  id: number
  subject_id: number
  teacher_id: number
  semester_id: number
  academic_year_id: number
  created_at: string
  updated_at: string
  // Populated fields
  subject?: Subject
  teacher?: User
  semester?: Semester
  academic_year?: AcademicYear
}

export interface Semester {
  id: number
  name: string
  semester_number: number
  batch_instance_id: number
  academic_year_id: number
  start_date?: string
  end_date?: string
  is_current: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Populated fields
  batch_instance?: BatchInstance
  academic_year?: AcademicYear
}

export interface Student {
  id: number
  user_id: number
  roll_no: string
  batch_instance_id?: number
  current_semester_id?: number
  department_id?: number
  admission_year?: number
  created_at: string
  updated_at: string
  // Populated fields
  user?: User
  batch_instance?: BatchInstance
  current_semester?: Semester
  department?: Department
}

export interface StudentEnrollment {
  id: number
  student_id: number
  semester_id: number
  academic_year_id: number
  roll_no: string
  enrollment_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Populated fields
  student?: Student
  semester?: Semester
  academic_year?: AcademicYear
}

export interface Exam {
  id: number
  name: string
  exam_type: 'internal1' | 'internal2' | 'external' | 'assignment'
  subject_assignment_id: number
  total_marks: number
  exam_date?: string
  duration_minutes?: number
  status: 'draft' | 'active' | 'locked' | 'published'
  created_at: string
  updated_at: string
  // Populated fields
  subject_assignment?: SubjectAssignment
}

export interface Question {
  id: number
  exam_id: number
  question_text: string
  question_number: string
  section: 'A' | 'B' | 'C'
  marks: number
  bloom_level: 1 | 2 | 3 | 4 | 5 | 6
  difficulty: 'easy' | 'medium' | 'hard'
  is_optional: boolean
  created_at: string
  updated_at: string
  // CO mappings
  co_mappings?: Array<{
    co_id: number
    weight_pct: number
  }>
}

export interface Mark {
  id: number
  student_id: number
  exam_id: number
  question_id?: number
  marks_obtained: number
  max_marks: number
  created_at: string
  updated_at: string
  // Populated fields
  student?: Student
  exam?: Exam
  question?: Question
}

export interface InternalMark {
  id: number
  student_id: number
  subject_assignment_id: number
  semester_id: number
  academic_year_id: number
  component_type: 'IA1' | 'IA2' | 'assignment' | 'quiz' | 'project'
  marks_obtained: number
  max_marks: number
  workflow_state: 'draft' | 'submitted' | 'approved' | 'rejected' | 'frozen' | 'published'
  submitted_at?: string
  approved_at?: string
  frozen_at?: string
  published_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  student?: Student
  subject_assignment?: SubjectAssignment
  semester?: Semester
  academic_year?: AcademicYear
}

export interface FinalMark {
  id: number
  student_id: number
  subject_assignment_id: number
  semester_id: number
  internal_1?: number
  internal_2?: number
  best_internal: number
  external: number
  total: number
  percentage: number
  grade: string
  grade_point: number
  is_published: boolean
  published_at?: string
  created_at: string
  updated_at: string
  // Populated fields
  student?: Student
  subject_assignment?: SubjectAssignment
}

export interface CourseOutcome {
  id: number
  subject_id: number
  code: string
  description: string
  bloom_level: 1 | 2 | 3
  target_attainment: number
  l1_threshold: number
  l2_threshold: number
  l3_threshold: number
  created_at: string
  updated_at: string
  // Populated fields
  subject?: Subject
}

export interface ProgramOutcome {
  id: number
  department_id: number
  code: string
  description: string
  po_type: 'PO' | 'PSO'
  target_attainment: number
  created_at: string
  updated_at: string
  // Populated fields
  department?: Department
}

export interface COPOMapping {
  id: number
  co_id: number
  po_id: number
  strength: 1 | 2 | 3
  created_at: string
  updated_at: string
  // Populated fields
  co?: CourseOutcome
  po?: ProgramOutcome
}

// ============================================
// RESPONSE WRAPPER TYPES
// ============================================

export interface ListResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface MessageResponse {
  message: string
  detail?: string
}

export interface ErrorResponse {
  detail: string | Array<{
    loc: string[]
    msg: string
    type: string
  }>
}

// ============================================
// API PARAMETER TYPES
// ============================================

export interface PaginationParams {
  skip?: number
  limit?: number
}

export interface FilterParams {
  is_active?: boolean
  department_id?: number
  semester_id?: number
  academic_year_id?: number
  batch_instance_id?: number
  subject_id?: number
  [key: string]: any
}

export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type APIParams = PaginationParams & FilterParams & SortParams

