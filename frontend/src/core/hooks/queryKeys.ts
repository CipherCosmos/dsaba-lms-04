/**
 * Query Key Factory
 * Centralized query keys for consistent caching and invalidation
 */

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },

  // Departments
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.departments.lists(), filters] as const,
    details: () => [...queryKeys.departments.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.departments.details(), id] as const,
  },

  // Subjects
  subjects: {
    all: ['subjects'] as const,
    lists: () => [...queryKeys.subjects.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.subjects.lists(), filters] as const,
    details: () => [...queryKeys.subjects.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.subjects.details(), id] as const,
    byDepartment: (departmentId: number, skip?: number, limit?: number) => [...queryKeys.subjects.all, 'department', departmentId, skip, limit] as const,
  },

  // Exams
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.exams.lists(), filters] as const,
    details: () => [...queryKeys.exams.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.exams.details(), id] as const,
    questions: (examId: number) => [...queryKeys.exams.detail(examId), 'questions'] as const,
  },

  // Marks
  marks: {
    all: ['marks'] as const,
    byExam: (examId: number, skip?: number, limit?: number) => [...queryKeys.marks.all, 'exam', examId, skip, limit] as const,
    byStudent: (studentId: number) => [...queryKeys.marks.all, 'student', studentId] as const,
    byStudentAndExam: (studentId: number, examId: number) => 
      [...queryKeys.marks.all, 'student', studentId, 'exam', examId] as const,
    lockStatus: (examId: number) => [...queryKeys.marks.all, 'lock-status', examId] as const,
  },

  // Questions
  questions: {
    all: ['questions'] as const,
    details: () => [...queryKeys.questions.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.questions.details(), id] as const,
    byExam: (examId: number, section?: string) => [...queryKeys.questions.all, 'exam', examId, section] as const,
    coMappings: (questionId: number) => [...queryKeys.questions.detail(questionId), 'co-mappings'] as const,
  },

  // Course Outcomes
  courseOutcomes: {
    all: ['course-outcomes'] as const,
    details: () => [...queryKeys.courseOutcomes.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.courseOutcomes.details(), id] as const,
    bySubject: (subjectId: number) => [...queryKeys.courseOutcomes.all, 'subject', subjectId] as const,
  },

  // Program Outcomes
  programOutcomes: {
    all: ['program-outcomes'] as const,
    details: () => [...queryKeys.programOutcomes.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.programOutcomes.details(), id] as const,
    byDepartment: (departmentId: number) => [...queryKeys.programOutcomes.all, 'department', departmentId] as const,
  },

  // CO-PO Mappings
  coPoMappings: {
    all: ['co-po-mappings'] as const,
    details: () => [...queryKeys.coPoMappings.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.coPoMappings.details(), id] as const,
    byCO: (coId: number) => [...queryKeys.coPoMappings.all, 'co', coId] as const,
    byPO: (poId: number) => [...queryKeys.coPoMappings.all, 'po', poId] as const,
    bySubject: (subjectId: number) => [...queryKeys.coPoMappings.all, 'subject', subjectId] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    student: (studentId: number) => [...queryKeys.analytics.all, 'student', studentId] as const,
    teacher: (teacherId: number) => [...queryKeys.analytics.all, 'teacher', teacherId] as const,
    class: (classId: number) => [...queryKeys.analytics.all, 'class', classId] as const,
    subject: (subjectId: number) => [...queryKeys.analytics.all, 'subject', subjectId] as const,
    hod: (departmentId: number) => [...queryKeys.analytics.all, 'hod', 'department', departmentId] as const,
    coAttainment: (subjectId: number, examType?: string) => 
      [...queryKeys.analytics.all, 'co-attainment', subjectId, examType] as const,
    poAttainment: (departmentId: number, subjectId?: number) => 
      [...queryKeys.analytics.all, 'po-attainment', 'department', departmentId, subjectId] as const,
    strategicDashboard: (departmentId: number) => 
      [...queryKeys.analytics.all, 'strategic', 'department', departmentId] as const,
  },

  // Academic Structure
  academic: {
    all: ['academic'] as const,
    batches: () => [...queryKeys.academic.all, 'batches'] as const,
    // Legacy batch-year keys removed; use semester keys directly
    semestersByBatchInstance: (batchInstanceId: number) => [...queryKeys.academic.all, 'batch-instances', batchInstanceId, 'semesters'] as const,
    semestersAll: (filters?: Record<string, any>) => [...queryKeys.academic.all, 'semesters', filters] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    templates: () => [...queryKeys.reports.all, 'templates'] as const,
    byStudent: (studentId: number) => [...queryKeys.reports.all, 'student', studentId] as const,
    byBatchInstance: (batchInstanceId: number) => [...queryKeys.reports.all, 'batch-instance', batchInstanceId] as const,
    coPo: (subjectId: number) => [...queryKeys.reports.all, 'co-po', subjectId] as const,
  },

  // Academic Years
  academicYears: {
    all: ['academic-years'] as const,
    lists: () => [...queryKeys.academicYears.all, 'list'] as const,
    list: (skip?: number, limit?: number, filters?: Record<string, any>) =>
      [...queryKeys.academicYears.lists(), skip, limit, filters] as const,
    details: () => [...queryKeys.academicYears.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.academicYears.details(), id] as const,
    current: () => [...queryKeys.academicYears.all, 'current'] as const,
  },

  // Student Enrollments
  studentEnrollments: {
    all: ['student-enrollments'] as const,
    lists: () => [...queryKeys.studentEnrollments.all, 'list'] as const,
    list: (skip?: number, limit?: number, filters?: Record<string, any>) =>
      [...queryKeys.studentEnrollments.lists(), skip, limit, filters] as const,
    details: () => [...queryKeys.studentEnrollments.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.studentEnrollments.details(), id] as const,
    byStudent: (studentId: number) => [...queryKeys.studentEnrollments.all, 'student', studentId] as const,
    bySemester: (semesterId: number) => [...queryKeys.studentEnrollments.all, 'semester', semesterId] as const,
  },

  // Internal Marks
  internalMarks: {
    all: ['internal-marks'] as const,
    lists: () => [...queryKeys.internalMarks.all, 'list'] as const,
    list: (skip?: number, limit?: number, filters?: Record<string, any>) =>
      [...queryKeys.internalMarks.lists(), skip, limit, filters] as const,
    details: () => [...queryKeys.internalMarks.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.internalMarks.details(), id] as const,
    submitted: (skip?: number, limit?: number, department_id?: number) =>
      [...queryKeys.internalMarks.all, 'submitted', skip, limit, department_id] as const,
    byStudent: (studentId: number) => [...queryKeys.internalMarks.all, 'student', studentId] as const,
    bySubject: (subjectAssignmentId: number) =>
      [...queryKeys.internalMarks.all, 'subject-assignment', subjectAssignmentId] as const,
  },
}

