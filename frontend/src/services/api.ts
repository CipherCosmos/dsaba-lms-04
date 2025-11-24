import axios from 'axios'
import { API_CONFIG } from '../config/api'
import { logger } from '../core/utils/logger'
import type {
  SmartMarksCalculation,
  SGPACalculation,
  CGPACalculation,
  GradingScale,
  FinalMarksData,
  COAttainment,
  POAttainment,
  COPOAttainmentSummary,
  AttainmentTrend,
  BloomsTaxonomyAnalysis,
  PerformanceTrend,
  DepartmentComparison,
  StudentPerformanceAnalytics,
  TeacherPerformanceAnalytics,
  ClassPerformanceAnalytics,
  SubjectAnalytics,
  DepartmentAnalytics,
  NBAAccreditationData,
  ListResponse,
  MessageResponse,
  QueryParams,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  SubjectCreateRequest,
  SubjectUpdateRequest,
  UserCreateRequest,
  UserUpdateRequest,
  ExamCreateRequest,
  ExamUpdateRequest,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  MarkCreateRequest,
} from '../core/types/api'
import type { ValidationErrorDetail } from '../core/types'
import type { FormattedValidationError } from '../core/types'

const apiClient = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/api/v1`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Add cache busting for GET requests
  if (config.method === 'get') {
    const timestamp = new Date().getTime()
    config.params = {
      ...config.params,
      _t: timestamp,
      _cache: 'no-cache'
    }
  }
  
  // Add cache control headers
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  config.headers['Pragma'] = 'no-cache'
  config.headers['Expires'] = '0'
  
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    // Handle validation errors with better formatting
    if (error.response?.status === 422) {
      const errorData = error.response.data
      if (errorData.detail && Array.isArray(errorData.detail)) {
        // Format validation errors for better display
        const formattedErrors: FormattedValidationError[] = errorData.detail.map((err: ValidationErrorDetail) => ({
          field: err.loc ? err.loc.join('.') : 'general',
          message: err.msg,
          type: err.type
        }))
        error.formattedErrors = formattedErrors
      }
    }
    
    // Retry logic for network errors
    if (!error.response && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        return await apiClient(originalRequest)
      } catch (retryError) {
        return Promise.reject(retryError)
      }
    }
    
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },
  logout: async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (e) {
      // Ignore logout errors
    }
  },
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken
    })
    return response.data
  },
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
  forgotPassword: async (emailOrUsername: string) => {
    const response = await apiClient.post('/auth/forgot-password', {
      email_or_username: emailOrUsername
    })
    return response.data
  },
  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword
    })
    return response.data
  },
}

export const departmentAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { is_active?: boolean; has_hod?: boolean }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.is_active !== undefined) params.is_active = filters.is_active
    if (filters?.has_hod !== undefined) params.has_hod = filters.has_hod
    const response = await apiClient.get('/departments', { params })
    return response.data
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/departments/${id}`)
    return response.data
  },
  create: async (department: DepartmentCreateRequest) => {
    const response = await apiClient.post('/departments', department)
    return response.data
  },
  update: async (id: number, department: DepartmentUpdateRequest) => {
    const response = await apiClient.put(`/departments/${id}`, department)
    return response.data
  },
  delete: async (id: number) => {
    await apiClient.delete(`/departments/${id}`)
  },
  activate: async (id: number) => {
    const response = await apiClient.post(`/departments/${id}/activate`)
    return response.data
  },
  deactivate: async (id: number) => {
    const response = await apiClient.post(`/departments/${id}/deactivate`)
    return response.data
  },
  assignHOD: async (id: number, hodId: number) => {
    const response = await apiClient.post(`/departments/${id}/hod`, { hod_id: hodId })
    return response.data
  },
  removeHOD: async (id: number) => {
    const response = await apiClient.delete(`/departments/${id}/hod`)
    return response.data
  },
}

// ❌ DEPRECATED: classAPI removed - use batchInstanceAPI and academicStructureAPI instead
// classAPI was using legacy endpoints that don't match the production backend
// Migration guide:
//   classAPI.getAll() → batchInstanceAPI.getAll()
//   classAPI.getBatchYears() → Use semester management via academicStructureAPI
//   classAPI.getSemesters() → academicStructureAPI.getAllSemesters()
//   classAPI.create() → batchInstanceAPI.create()
//   classAPI.delete() → batchInstanceAPI.deactivate()

export const subjectAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { department_id?: number; is_active?: boolean }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.department_id) params.department_id = filters.department_id
    if (filters?.is_active !== undefined) params.is_active = filters.is_active
    const response = await apiClient.get('/subjects', { params })
    return response.data
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/subjects/${id}`)
    return response.data
  },
  getByDepartment: async (departmentId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get(`/subjects/department/${departmentId}`, {
      params: { skip, limit }
    })
    return response.data
  },
  create: async (subject: SubjectCreateRequest) => {
    const response = await apiClient.post('/subjects', subject)
    return response.data
  },
  update: async (id: number, subject: SubjectUpdateRequest) => {
    const response = await apiClient.put(`/subjects/${id}`, subject)
    return response.data
  },
  updateMarks: async (id: number, marks: { max_internal?: number; max_external?: number }) => {
    const response = await apiClient.put(`/subjects/${id}/marks`, marks)
    return response.data
  },
  activate: async (id: number) => {
    const response = await apiClient.post(`/subjects/${id}/activate`)
    return response.data
  },
  deactivate: async (id: number) => {
    const response = await apiClient.post(`/subjects/${id}/deactivate`)
    return response.data
  },
  delete: async (id: number) => {
    await apiClient.delete(`/subjects/${id}`)
  },
}

export const userAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { is_active?: boolean; email_verified?: boolean }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.is_active !== undefined) params.is_active = filters.is_active
    if (filters?.email_verified !== undefined) params.email_verified = filters.email_verified
    const response = await apiClient.get('/users', { params })
    return response.data
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },
  create: async (user: UserCreateRequest) => {
    const response = await apiClient.post('/users', user)
    return response.data
  },
  update: async (id: number, user: UserUpdateRequest) => {
    const response = await apiClient.put(`/users/${id}`, user)
    return response.data
  },
  delete: async (id: number) => {
    await apiClient.delete(`/users/${id}`)
  },
  changePassword: async (id: number, oldPassword: string, newPassword: string) => {
    await apiClient.post(`/users/${id}/change-password`, {
      old_password: oldPassword,
      new_password: newPassword
    })
  },
  resetPassword: async (id: number, newPassword: string) => {
    await apiClient.post(`/users/${id}/reset-password`, {
      new_password: newPassword
    })
  },
  assignRole: async (id: number, role: string, departmentId?: number) => {
    const response = await apiClient.post(`/users/${id}/roles`, {
      role,
      department_id: departmentId
    })
    return response.data
  },
  removeRole: async (id: number, role: string, departmentId?: number) => {
    // Backend DELETE endpoint expects request body, but axios DELETE with body needs special handling
    const response = await apiClient.request({
      method: 'DELETE',
      url: `/users/${id}/roles`,
      data: {
        role,
        department_id: departmentId
      }
    })
    return response.data
  },
  bulkCreate: async (users: UserCreateRequest[]) => {
    try {
      const response = await apiClient.post('/users/bulk', { users }, {
        timeout: 120000, // 2 minutes timeout for bulk operations
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error: unknown) {
      // Re-throw with more context
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: Bulk operation took too long. Please try with fewer users.')
      }
      throw error
    }
  }
}

export const profileAPI = {
  getMyProfile: async () => {
    const response = await apiClient.get('/profile/me')
    return response.data
  },
  updateMyProfile: async (profileData: {
    first_name?: string
    last_name?: string
    email?: string
    phone_number?: string
    avatar_url?: string
    bio?: string
  }) => {
    const response = await apiClient.put('/profile/me', profileData)
    return response.data
  },
  getUserProfile: async (userId: number) => {
    const response = await apiClient.get(`/profile/${userId}`)
    return response.data
  },
  updateUserProfile: async (userId: number, profileData: {
    first_name?: string
    last_name?: string
    email?: string
    phone_number?: string
    avatar_url?: string
    bio?: string
  }) => {
    const response = await apiClient.put(`/profile/${userId}`, profileData)
    return response.data
  },
}

// Cache busting utility
const getCacheBustingParams = () => ({
  _t: new Date().getTime(),
  _cache: 'no-cache',
  _r: Math.random().toString(36).substring(7),
  _v: Math.random().toString(36).substring(2, 15)
})

// Force fresh request utility
const forceFreshRequest = (url: string, config: Record<string, unknown> = {}) => {
  const timestamp = new Date().getTime()
  const randomId = Math.random().toString(36).substring(2, 15)
  
  return apiClient.get(url, {
    ...config,
    params: {
      ...config.params,
      _t: timestamp,
      _r: randomId,
      _cache: 'no-cache',
      _fresh: 'true'
    },
    headers: {
      ...config.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'If-Modified-Since': '0',
      'If-None-Match': '*'
    }
  })
}

export const examAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { status?: string; exam_type?: string; subject_assignment_id?: number }, forceRefresh = false) => {
    logger.debug('Fetching exams', forceRefresh ? '(force refresh)' : '')
    
    const params: QueryParams = { skip, limit }
    if (filters?.status) params.status = filters.status
    if (filters?.exam_type) params.exam_type = filters.exam_type
    if (filters?.subject_assignment_id) params.subject_assignment_id = filters.subject_assignment_id
    
    if (forceRefresh) {
      // Clear server cache first
      try {
        // Backend cache clear endpoint is at root, not under /api/v1
        await axios.get(`${API_CONFIG.BASE_URL}/cache/clear`)
        logger.debug('Server cache cleared')
      } catch (error) {
        logger.warn('Cache clear failed, continuing', error)
      }
      
      // Use force fresh request to completely bypass cache
      const response = await forceFreshRequest('/exams', { params })
      logger.debug('Force fresh response received')
      return response.data
    } else {
      Object.assign(params, getCacheBustingParams())
      const response = await apiClient.get('/exams', { params })
      logger.debug('Exams response received')
      return response.data
    }
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/exams/${id}`)
    return response.data
  },
  create: async (exam: ExamCreateRequest) => {
    const response = await apiClient.post('/exams', exam)
    return response.data
  },
  update: async (id: number, exam: ExamUpdateRequest) => {
    const response = await apiClient.put(`/exams/${id}`, exam)
    return response.data
  },
  delete: async (id: number) => {
    await apiClient.delete(`/exams/${id}`)
  },
  getQuestions: async (examId: number) => {
    const response = await apiClient.get(`/questions/exam/${examId}`)
    return response.data
  },
  getStudents: async (examId: number) => {
    const response = await apiClient.get(`/exams/${examId}/students`)
    return response.data
  },
  getQuestionPaper: async (examId: number) => {
    const response = await apiClient.get(`/exams/${examId}/paper`, {
      responseType: 'blob'
    })
    return response.data
  },
}

export const questionAPI = {
  getAll: async (examId: number, section?: 'A' | 'B' | 'C', skip: number = 0, limit: number = 100) => {
    const params: QueryParams = { skip, limit }
    if (section) params.section = section
    const response = await apiClient.get(`/questions/exam/${examId}`, { params })
    return response.data
  },
  getById: async (questionId: number) => {
    const response = await apiClient.get(`/questions/${questionId}`)
    return response.data
  },
  create: async (question: QuestionCreateRequest) => {
    const response = await apiClient.post('/questions', question)
    return response.data
  },
  update: async (questionId: number, question: QuestionUpdateRequest) => {
    const response = await apiClient.put(`/questions/${questionId}`, question)
    return response.data
  },
  delete: async (questionId: number) => {
    await apiClient.delete(`/questions/${questionId}`)
  },
  getCOMappings: async (questionId: number) => {
    const response = await apiClient.get(`/questions/${questionId}/co-mappings`)
    return response.data
  },
  createCOMapping: async (mapping: { question_id: number; co_id: number; weight_pct: number }) => {
    const response = await apiClient.post('/questions/co-mapping', mapping)
    return response.data
  },
  deleteCOMapping: async (questionId: number, coId: number) => {
    await apiClient.delete(`/questions/co-mapping/${questionId}/${coId}`)
  },
}

export const marksAPI = {
  getByExam: async (examId: number, skip: number = 0, limit: number = 1000) => {
    const response = await apiClient.get(`/marks/exam/${examId}`, {
      params: { skip, limit }
    })
    return response.data
  },
  getByStudent: async (studentId: number) => {
    const response = await apiClient.get(`/marks/student/${studentId}`)
    return response.data
  },
  getByStudentAndExam: async (studentId: number, examId: number) => {
    const response = await apiClient.get(`/marks/student/${studentId}/exam/${examId}`)
    return response.data
  },
  getLockStatus: async (examId: number) => {
    // Check exam status instead - locked exam means marks can't be edited
    const response = await apiClient.get(`/exams/${examId}`)
    const exam = response.data
    return {
      is_locked: exam.status === 'locked' || exam.status === 'published',
      can_edit: exam.status === 'draft' || exam.status === 'active',
      lock_reason: exam.status === 'locked' ? 'Exam is locked' : exam.status === 'published' ? 'Exam is published' : null
    }
  },
  create: async (mark: MarkCreateRequest) => {
    const response = await apiClient.post('/marks', mark)
    return response.data
  },
  bulkCreate: async (examId: number, marks: MarkCreateRequest[]) => {
    const response = await apiClient.post('/marks/bulk', {
      exam_id: examId,
      marks
    })
    return response.data
  },
  update: async (id: number, mark: { marks_obtained: number; can_override?: boolean; reason?: string }) => {
    const response = await apiClient.put(`/marks/${id}`, {
      marks_obtained: mark.marks_obtained,
      can_override: mark.can_override || false,
      reason: mark.reason
    })
    return response.data
  },
  delete: async (id: number) => {
    await apiClient.delete(`/marks/${id}`)
  },
  calculateStudentTotal: async (studentId: number, examId: number, questionMaxMarks: Record<number, number>, optionalQuestions?: number[]) => {
    // Backend expects question_max_marks as body and optional_questions as query param
    const params: QueryParams = {}
    if (optionalQuestions) params.optional_questions = optionalQuestions
    const response = await apiClient.post(`/marks/student/${studentId}/exam/${examId}/calculate`, questionMaxMarks, {
      params
    })
    return response.data
  },
  calculateBestInternal: async (subjectAssignmentId: number, studentId: number, internal1Marks?: number, internal2Marks?: number) => {
    const response = await apiClient.post('/marks/best-internal', {
      subject_assignment_id: subjectAssignmentId,
      student_id: studentId,
      internal_1_marks: internal1Marks,
      internal_2_marks: internal2Marks
    })
    return response.data
  },
}

export const analyticsAPI = {
  getStudentAnalytics: async (studentId: number, subjectId?: number, semesterId?: number, academicYearId?: number): Promise<StudentPerformanceAnalytics> => {
    const params: QueryParams = {}
    if (subjectId) params.subject_id = subjectId
    if (semesterId) params.semester_id = semesterId
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get(`/analytics/student/${studentId}`, { params })
    return response.data
  },
  getTeacherAnalytics: async (teacherId: number, subjectId?: number, semesterId?: number, academicYearId?: number): Promise<TeacherPerformanceAnalytics> => {
    const params: QueryParams = {}
    if (subjectId) params.subject_id = subjectId
    if (semesterId) params.semester_id = semesterId
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get(`/analytics/teacher/${teacherId}`, { params })
    return response.data
  },
  getHODAnalytics: async (departmentId: number, academicYearId?: number): Promise<DepartmentAnalytics> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get(`/analytics/hod/department/${departmentId}`, { params })
    return response.data
  },
  /**
   * @deprecated LEGACY-COMPATIBLE: Backend still supports class-based analytics
   * TODO: Migrate to batch_instance_id/semester_id based analytics when backend supports
   */
  getClassAnalytics: async (classId: number, subjectId?: number): Promise<ClassPerformanceAnalytics> => {
    const params: QueryParams = {}
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/analytics/class/${classId}`, { params })
    return response.data
  },
  getStrategicDashboardData: async (departmentId: number): Promise<DepartmentAnalytics> => {
    // Use HOD analytics endpoint
    const response = await apiClient.get(`/analytics/hod/department/${departmentId}`)
    return response.data
  },
  getCOAttainment: async (subjectId: number, examType?: 'internal1' | 'internal2' | 'external' | 'all', semesterId?: number, academicYearId?: number): Promise<COAttainment[]> => {
    const params: QueryParams = {}
    if (examType) params.exam_type = examType
    if (semesterId) params.semester_id = semesterId
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get(`/analytics/co-attainment/subject/${subjectId}`, { params })
    return response.data
  },
  getPOAttainment: async (departmentId: number, subjectId?: number, academicYearId?: number, semesterId?: number): Promise<POAttainment[]> => {
    const params: QueryParams = {}
    if (subjectId) params.subject_id = subjectId
    if (academicYearId) params.academic_year_id = academicYearId
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get(`/analytics/po-attainment/department/${departmentId}`, { params })
    return response.data
  },
  getBloomsAnalysis: async (examId?: number, subjectId?: number, semesterId?: number, departmentId?: number): Promise<BloomsTaxonomyAnalysis> => {
    const params: QueryParams = {}
    if (examId) params.exam_id = examId
    if (subjectId) params.subject_id = subjectId
    if (semesterId) params.semester_id = semesterId
    if (departmentId) params.department_id = departmentId
    const response = await apiClient.get('/analytics/blooms', { params })
    return response.data
  },
  getMultiDimensionalAnalytics: async (dimension: 'year' | 'semester' | 'subject' | 'class' | 'teacher', filters?: Record<string, string | number | boolean | undefined>): Promise<unknown> => {
    const params: QueryParams = { dim: dimension }
    if (filters) {
      params.filters = JSON.stringify(filters)
    }
    const response = await apiClient.get('/analytics/multi', { params })
    return response.data
  },
  // These endpoints may not exist in backend - using available endpoints instead
  getStudentPerformance: async (subjectId: number, studentId?: number, examType?: string): Promise<StudentPerformanceAnalytics> => {
    // Use student analytics with subject filter
    const params: QueryParams = {}
    if (subjectId) params.subject_id = subjectId
    if (studentId) {
      const response = await apiClient.get(`/analytics/student/${studentId}`, { params })
      return response.data
    }
    // If no studentId, this endpoint doesn't exist - return empty or use subject analytics
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getClassPerformance: async (subjectId: number, batchInstanceId?: number, examType?: string): Promise<ClassPerformanceAnalytics> => {
    // Use subject analytics with batch instance filter
    const params: QueryParams = {}
    if (batchInstanceId) params.batch_instance_id = batchInstanceId
    const response = await apiClient.get(`/analytics/subject/${subjectId}`, { params })
    return response.data
  },
  generateReport: async (type: string, filters: Record<string, string | number | boolean | undefined>, format: string = 'pdf'): Promise<Blob> => {
    const response = await apiClient.post('/reports/generate', {
      report_type: type,
      filters,
      format: format
    }, {
      responseType: 'blob'
    })
    return response.data
  },
  getReportTemplates: async (): Promise<unknown> => {
    const response = await apiClient.get('/reports/templates')
    return response.data
  },

  /**
   * Get Bloom's Taxonomy analysis for questions and performance
   * Analyzes distribution across 6 cognitive levels (L1-L6)
   */
  getBloomsTaxonomyAnalysis: async (subjectId?: number, departmentId?: number, semesterId?: number, examId?: number): Promise<BloomsTaxonomyAnalysis> => {
    const params: QueryParams = {}
    if (subjectId) params.subject_id = subjectId
    if (departmentId) params.department_id = departmentId
    if (semesterId) params.semester_id = semesterId
    if (examId) params.exam_id = examId
    const response = await apiClient.get('/enhanced-analytics/blooms-taxonomy', {
      params
    })
    return response.data
  },

  /**
   * Get performance trends over time
   * Shows marks trends, pass rates, and attainment trends
   */
  getPerformanceTrends: async (studentId?: number, subjectId?: number, departmentId?: number, months?: number): Promise<PerformanceTrend[]> => {
    const params: QueryParams = {}
    if (studentId) params.student_id = studentId
    if (subjectId) params.subject_id = subjectId
    if (departmentId) params.department_id = departmentId
    if (months) params.months = months
    const response = await apiClient.get('/enhanced-analytics/performance-trends', {
      params
    })
    return response.data
  },

  /**
   * Compare performance across departments
   * Useful for HOD/Principal dashboards
   */
  getDepartmentComparison: async (academicYearId?: number, semesterId?: number): Promise<DepartmentComparison> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get('/enhanced-analytics/department-comparison', {
      params
    })
    return response.data
  },

  /**
   * Get comprehensive student performance analytics
   * Includes marks, attainment, strengths, weaknesses, trends
   */
  getStudentPerformanceAnalytics: async (studentId: number, academicYearId?: number): Promise<StudentPerformanceAnalytics> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get(`/enhanced-analytics/student/${studentId}/performance`, {
      params
    })
    return response.data
  },

  /**
   * Get comprehensive teacher performance analytics
   * Includes class performance, teaching effectiveness, CO attainment
   */
  getTeacherPerformanceAnalytics: async (teacherId: number, academicYearId?: number, semesterId?: number): Promise<TeacherPerformanceAnalytics> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get(`/enhanced-analytics/teacher/${teacherId}/performance`, {
      params
    })
    return response.data
  },

  /**
   * Get class/batch instance performance analytics
   */
  getClassPerformanceAnalytics: async (batchInstanceId: number, semesterId?: number, subjectId?: number): Promise<ClassPerformanceAnalytics> => {
    const params: QueryParams = {}
    if (semesterId) params.semester_id = semesterId
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/enhanced-analytics/class/${batchInstanceId}/performance`, {
      params
    })
    return response.data
  },

  /**
   * Get subject-level analytics
   * Includes performance distribution, CO attainment, question analysis
   */
  getSubjectAnalytics: async (subjectId: number, semesterId?: number, batchInstanceId?: number, includeBloomAnalysis?: boolean): Promise<SubjectAnalytics> => {
    const params: QueryParams = {}
    if (semesterId) params.semester_id = semesterId
    if (batchInstanceId) params.batch_instance_id = batchInstanceId
    if (includeBloomAnalysis) params.include_bloom_analysis = includeBloomAnalysis
    const response = await apiClient.get(`/enhanced-analytics/subject/${subjectId}`, {
      params
    })
    return response.data
  },

  /**
   * Get department-level analytics
   * Includes overall performance, PO attainment, teacher comparison
   */
  getDepartmentAnalytics: async (departmentId: number, academicYearId?: number, includePOAttainment?: boolean, includeTrends?: boolean): Promise<DepartmentAnalytics> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    if (includePOAttainment) params.include_po_attainment = includePOAttainment
    if (includeTrends) params.include_trends = includeTrends
    const response = await apiClient.get(`/enhanced-analytics/department/${departmentId}`, {
      params
    })
    return response.data
  },

  /**
   * Get NBA accreditation report data
   * Formatted specifically for NBA requirements
   */
  getNBAAccreditationData: async (departmentId: number, academicYearId: number, includeIndirectAttainment?: boolean): Promise<NBAAccreditationData> => {
    const params: QueryParams = {
      academic_year_id: academicYearId
    }
    if (includeIndirectAttainment) params.include_indirect_attainment = includeIndirectAttainment
    const response = await apiClient.get(`/enhanced-analytics/nba/${departmentId}`, {
      params
    })
    return response.data
  },

  /**
   * Get subject attainment (from attainmentAnalyticsAPI)
   */
  getSubjectAttainment: async (subjectId: number, examType?: string): Promise<SubjectAnalytics> => {
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },

  /**
   * Get student attainment (from attainmentAnalyticsAPI)
   */
  getStudentAttainment: async (studentId: number, subjectId: number): Promise<StudentPerformanceAnalytics> => {
    const response = await apiClient.get(`/analytics/student/${studentId}`)
    return response.data
  },

  /**
   * Get class attainment (from attainmentAnalyticsAPI)
   */
  getClassAttainment: async (classId: number, term?: string): Promise<ClassPerformanceAnalytics> => {
    const response = await apiClient.get(`/analytics/class/${classId}`)
    return response.data
  },

  /**
   * Get program attainment (from attainmentAnalyticsAPI)
   */
  getProgramAttainment: async (departmentId: number, year?: number): Promise<DepartmentAnalytics> => {
    const response = await apiClient.get(`/analytics/hod/department/${departmentId}`)
    return response.data
  },

  /**
   * Get blueprint validation (from attainmentAnalyticsAPI)
   */
  getBlueprintValidation: async (subjectId: number): Promise<SubjectAnalytics> => {
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },

  /**
   * Get CO-PO mapping (from attainmentAnalyticsAPI)
   */
  getCOPOMapping: async (subjectId: number): Promise<Array<{ co_id: number; co_code: string; mappings: unknown[] }>> => {
    const cosResponse = await apiClient.get(`/course-outcomes/subject/${subjectId}`)
    const cos = cosResponse.data.items || []

    const mappings = await Promise.all(
      cos.map((co: { id: number; code: string }) =>
        apiClient.get(`/co-po-mappings/co/${co.id}`).then((r: { data: { items?: unknown[] } }) => ({
          co_id: co.id,
          co_code: co.code,
          mappings: r.data.items || []
        }))
      )
    )
    return mappings
  },
}

export const dashboardAPI = {
  getStats: async () => {
    const response = await apiClient.get('/dashboard/stats')
    return response.data
  },
}

export const fileAPI = {
  uploadMarksTemplate: async (examId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post(`/bulk-uploads/marks/${examId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  downloadMarksTemplate: async (examId: number) => {
    const response = await apiClient.get(`/bulk-uploads/template/marks`, {
      params: { exam_id: examId },
      responseType: 'blob'
    })
    return response.data
  },
  
  uploadQuestions: async (examId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post(`/bulk-uploads/questions/${examId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  downloadQuestionTemplate: async () => {
    const response = await apiClient.get(`/bulk-uploads/template/questions`, {
      responseType: 'blob'
    })
    return response.data
  },
}

// Reports API
export const reportsAPI = {
  getTypes: async (): Promise<unknown> => {
    const response = await apiClient.get('/reports/types')
    return response.data
  },
  generateReport: async (reportType: string, filters: Record<string, string | number | boolean | undefined>, format: string = 'pdf'): Promise<unknown> => {
    const response = await apiClient.post('/reports/generate', {
      report_type: reportType,
      filters,
      format
    })
    return response.data
  },
  getStudentReport: async (studentId: number, subjectId?: number, semesterId?: number, format: string = 'json'): Promise<unknown> => {
    const params: QueryParams = { format }
    if (subjectId) params.subject_id = subjectId
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get(`/reports/student/${studentId}`, { params, responseType: format === 'pdf' ? 'blob' : 'json' })
    return response.data
  },
  /**
   * @deprecated LEGACY-COMPATIBLE: Backend still supports class-based reports
   * TODO: Migrate to batch_instance_id/semester_id based reports when backend supports
   */
  getClassReport: async (classId: number, subjectId?: number, format: string = 'json'): Promise<unknown> => {
    const params: QueryParams = { format }
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/reports/class/${classId}`, { params, responseType: format === 'pdf' ? 'blob' : 'json' })
    return response.data
  },
  getCOPOReport: async (subjectId: number, examType?: string, semesterId?: number, format: string = 'json'): Promise<unknown> => {
    const params: QueryParams = { format }
    if (examType) params.exam_type = examType
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get(`/reports/co-po/${subjectId}`, { params, responseType: format === 'pdf' ? 'blob' : 'json' })
    return response.data
  },
}

// CO/PO/PSO Framework APIs
export const coAPI = {
  getBySubject: async (subjectId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get(`/course-outcomes/subject/${subjectId}`, {
      params: { skip, limit }
    })
    return response.data
  },
  getById: async (coId: number) => {
    const response = await apiClient.get(`/course-outcomes/${coId}`)
    return response.data
  },
  create: async (coData: { subject_id: number; code: string; description: string; bloom_level: 1 | 2 | 3; target_attainment: number; l1_threshold: number; l2_threshold: number; l3_threshold: number }) => {
    const response = await apiClient.post('/course-outcomes', coData)
    return response.data
  },
  update: async (coId: number, coData: Partial<{ code: string; description: string; bloom_level: 1 | 2 | 3; target_attainment: number; l1_threshold: number; l2_threshold: number; l3_threshold: number }>) => {
    const response = await apiClient.put(`/course-outcomes/${coId}`, coData)
    return response.data
  },
  delete: async (coId: number) => {
    await apiClient.delete(`/course-outcomes/${coId}`)
  },
}

export const poAPI = {
  getByDepartment: async (departmentId: number, poType?: 'PO' | 'PSO', skip: number = 0, limit: number = 100) => {
    const params: QueryParams = { skip, limit }
    if (poType) params.po_type = poType
    const response = await apiClient.get(`/program-outcomes/department/${departmentId}`, { params })
    return response.data
  },
  getById: async (poId: number) => {
    const response = await apiClient.get(`/program-outcomes/${poId}`)
    return response.data
  },
  create: async (poData: { department_id: number; code: string; description: string; po_type: 'PO' | 'PSO'; target_attainment: number }) => {
    const response = await apiClient.post('/program-outcomes', poData)
    return response.data
  },
  update: async (poId: number, poData: Partial<{ code: string; description: string; po_type: 'PO' | 'PSO'; target_attainment: number }>) => {
    const response = await apiClient.put(`/program-outcomes/${poId}`, poData)
    return response.data
  },
  delete: async (poId: number) => {
    await apiClient.delete(`/program-outcomes/${poId}`)
  },
}

export const coTargetAPI = {
  getBySubject: async (subjectId: number) => {
    // Get COs for subject and return their target_attainment
    const response = await apiClient.get(`/course-outcomes/subject/${subjectId}`)
    return response.data
  },
  bulkUpdate: async (subjectId: number, coTargets: Array<{ co_id: number; target_attainment: number; l1_threshold: number; l2_threshold: number; l3_threshold: number }>) => {
    // Update each CO's target_attainment individually
    const updates = await Promise.all(
      coTargets.map((target) =>
        apiClient.put(`/course-outcomes/${target.co_id}`, {
          target_attainment: target.target_attainment,
          l1_threshold: target.l1_threshold,
          l2_threshold: target.l2_threshold,
          l3_threshold: target.l3_threshold
        })
      )
    )
    return updates.map((r) => r.data)
  },
}

// Assessment weights may be part of subject marks configuration
export const assessmentWeightAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}`)
    const subject = response.data
    return {
      max_internal: subject.max_internal || 0,
      max_external: subject.max_external || 0
    }
  },
  bulkUpdate: async (subjectId: number, assessmentWeights: Array<{ max_internal: number; max_external: number }>) => {
    // Update subject marks distribution
    const subject = assessmentWeights[0] || {}
    const response = await apiClient.put(`/subjects/${subjectId}/marks`, {
      max_internal: subject.max_internal,
      max_external: subject.max_external
    })
    return response.data
  },
}

export const coPoMatrixAPI = {
  getBySubject: async (subjectId: number) => {
    // Get COs for subject, then get their CO-PO mappings
    const cosResponse = await apiClient.get(`/course-outcomes/subject/${subjectId}`)
    // Backend returns COListResponse with items array (standardized format)
    const cos = cosResponse.data.items || []
    
    // Get mappings for each CO
    const mappings = await Promise.all(
      cos.map((co: any) =>
        apiClient.get(`/co-po-mappings/co/${co.id}`).then(r => ({
          co_id: co.id,
          co_code: co.code,
          // Backend returns COPOMappingListResponse with items array (standardized format)
          mappings: r.data.items || []
        }))
      )
    )
    return mappings
  },
  getByCO: async (coId: number) => {
    const response = await apiClient.get(`/co-po-mappings/co/${coId}`)
    // Backend returns COPOMappingListResponse with items array
    return response.data
  },
  getByPO: async (poId: number) => {
    const response = await apiClient.get(`/co-po-mappings/po/${poId}`)
    // Backend returns COPOMappingListResponse with items array
    return response.data
  },
  create: async (mappingData: { co_id: number; po_id: number; strength: 1 | 2 | 3 }) => {
    const response = await apiClient.post('/co-po-mappings', {
      co_id: mappingData.co_id,
      po_id: mappingData.po_id,
      strength: mappingData.strength
    })
    return response.data
  },
  update: async (mappingId: number, strength: 1 | 2 | 3) => {
    const response = await apiClient.put(`/co-po-mappings/${mappingId}`, {
      strength
    })
    return response.data
  },
  delete: async (mappingId: number) => {
    await apiClient.delete(`/co-po-mappings/${mappingId}`)
  },
  bulkUpdate: async (subjectId: number, coPoMatrix: Array<{ co_id: number; mappings?: Array<{ po_id: number; strength?: 1 | 2 | 3; correlation_level?: 'high' | 'medium' | 'low' }> }>) => {
    // Get COs for subject first
    const cosResponse = await apiClient.get(`/course-outcomes/subject/${subjectId}`)
    // Backend returns COListResponse with items array (standardized format)
    const cos = cosResponse.data.items || []
    
    // For each CO in the matrix, update/create/delete mappings
    const results = []
    for (const matrixItem of coPoMatrix) {
      const co = cos.find((c: { id: number }) => c.id === matrixItem.co_id)
      if (!co) continue
      
      // Get existing mappings for this CO
      // Backend returns COPOMappingListResponse with items array (standardized format)
      const existingMappings = await apiClient.get(`/co-po-mappings/co/${co.id}`).then(r => r.data.items || [])
      
      // Process updates (existing mappings)
      for (const mapping of matrixItem.mappings || []) {
        const existing = existingMappings.find((m: { po_id: number }) => m.po_id === mapping.po_id)
        if (existing) {
          // Update existing mapping - backend uses strength (1-3)
          const strength = mapping.strength || (mapping.correlation_level === 'high' ? 3 : mapping.correlation_level === 'medium' ? 2 : 1)
          await apiClient.put(`/co-po-mappings/${existing.id}`, {
            strength
          })
          results.push(existing)
        } else {
          // Create new mapping - backend uses strength (1-3) not correlation_level
          const strength = mapping.strength || (mapping.correlation_level === 'high' ? 3 : mapping.correlation_level === 'medium' ? 2 : 1)
          const newMapping = await apiClient.post('/co-po-mappings', {
            co_id: co.id,
            po_id: mapping.po_id,
            strength
          })
          results.push(newMapping.data)
        }
      }
      
      // Delete mappings that are no longer in the matrix
      const newPoIds = new Set((matrixItem.mappings || []).map((m) => m.po_id))
      for (const existing of existingMappings) {
        if (!newPoIds.has((existing as { po_id: number }).po_id)) {
          await apiClient.delete(`/co-po-mappings/${(existing as { id: number }).id}`)
        }
      }
    }
    
    return results
  },
}

export const questionCoWeightAPI = {
  getByQuestion: async (questionId: number) => {
    const response = await apiClient.get(`/questions/${questionId}/co-mappings`)
    return response.data
  },
  bulkUpdate: async (questionId: number, coMappings: Array<{ co_id: number; weight_pct: number }>) => {
    // Delete existing mappings
    const existingResponse = await apiClient.get(`/questions/${questionId}/co-mappings`)
    // Backend returns COPOMappingListResponse with items array (standardized format)
    const existing = existingResponse.data.items || []
    
    await Promise.all(
      existing.map((mapping: { co_id: number }) =>
        apiClient.delete(`/questions/co-mapping/${questionId}/${mapping.co_id}`)
      )
    )
    
    // Create new mappings
    const newMappings = await Promise.all(
      coMappings.map(mapping =>
        apiClient.post('/questions/co-mapping', {
          question_id: questionId,
          co_id: mapping.co_id,
          weight_pct: mapping.weight_pct  // Backend expects weight_pct, not weight_percentage
        })
      )
    )
    return newMappings.map(r => r.data)
  },
}

// Indirect attainment API
// Now implemented with full survey and exit exam functionality
export const indirectAttainmentAPI = {
  // Legacy endpoint - returns empty array for backward compatibility
  getBySubject: async (subjectId: number) => {
    try {
      const response = await apiClient.get(`/indirect-attainment/subject/${subjectId}`)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.warn('Indirect attainment by subject API failed, returning empty data', { subjectId, error: errorMessage })
      return []
    }
  },

  // Survey management
  getSurveys: async (departmentId?: number, skip: number = 0, limit: number = 100) => {
    const params: QueryParams = { skip, limit }
    if (departmentId) params.department_id = departmentId
    const response = await apiClient.get('/indirect-attainment/surveys', { params })
    return response.data
  },

  getActiveSurveys: async (departmentId: number, academicYearId?: number) => {
    const params: QueryParams = { department_id: departmentId }
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get('/indirect-attainment/surveys/active', { params })
    return response.data
  },

  getSurvey: async (surveyId: number) => {
    const response = await apiClient.get(`/indirect-attainment/surveys/${surveyId}`)
    return response.data
  },

  createSurvey: async (surveyData: Record<string, unknown>) => {
    const response = await apiClient.post('/indirect-attainment/surveys', surveyData)
    return response.data
  },

  updateSurvey: async (surveyId: number, surveyData: Record<string, unknown>) => {
    const response = await apiClient.put(`/indirect-attainment/surveys/${surveyId}`, surveyData)
    return response.data
  },

  deleteSurvey: async (surveyId: number) => {
    await apiClient.delete(`/indirect-attainment/surveys/${surveyId}`)
  },

  submitSurveyResponse: async (surveyId: number, responses: unknown[]) => {
    const response = await apiClient.post(`/indirect-attainment/surveys/${surveyId}/responses`, responses)
    return response.data
  },

  getSurveyAnalytics: async (surveyId: number) => {
    const response = await apiClient.get(`/indirect-attainment/surveys/${surveyId}/analytics`)
    return response.data
  },

  // Exit exam management
  getExitExams: async (departmentId?: number, skip: number = 0, limit: number = 100) => {
    const params: QueryParams = { skip, limit }
    if (departmentId) params.department_id = departmentId
    const response = await apiClient.get('/indirect-attainment/exit-exams', { params })
    return response.data
  },

  getActiveExitExams: async (departmentId: number, academicYearId?: number) => {
    const params: QueryParams = { department_id: departmentId }
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get('/indirect-attainment/exit-exams/active', { params })
    return response.data
  },

  getExitExam: async (examId: number) => {
    const response = await apiClient.get(`/indirect-attainment/exit-exams/${examId}`)
    return response.data
  },

  createExitExam: async (examData: Record<string, unknown>) => {
    const response = await apiClient.post('/indirect-attainment/exit-exams', examData)
    return response.data
  },

  updateExitExam: async (examId: number, examData: Record<string, unknown>) => {
    const response = await apiClient.put(`/indirect-attainment/exit-exams/${examId}`, examData)
    return response.data
  },

  deleteExitExam: async (examId: number) => {
    await apiClient.delete(`/indirect-attainment/exit-exams/${examId}`)
  },

  submitExitExamResult: async (examId: number, resultData: Record<string, unknown>) => {
    const response = await apiClient.post(`/indirect-attainment/exit-exams/${examId}/results`, resultData)
    return response.data
  },

  getExitExamAnalytics: async (examId: number) => {
    const response = await apiClient.get(`/indirect-attainment/exit-exams/${examId}/analytics`)
    return response.data
  },

  // Indirect attainment calculation
  calculateIndirectAttainment: async (departmentId: number, academicYearId?: number) => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    const response = await apiClient.get(`/indirect-attainment/attainment/${departmentId}`, { params })
    return response.data
  },

  // Legacy methods for backward compatibility - now return proper responses instead of errors
  create: async (subjectId: number, attainmentData: Record<string, unknown>) => {
    // This was a legacy method - redirect to survey creation if needed
    logger.warn('Legacy indirect attainment create called - consider using createSurvey instead', { subjectId })
    throw new Error('Use createSurvey or createExitExam for indirect attainment')
  },

  update: async (attainmentId: number, attainmentData: Record<string, unknown>) => {
    // This was a legacy method - redirect to appropriate update method
    logger.warn('Legacy indirect attainment update called - consider using updateSurvey or updateExitExam instead', { attainmentId })
    throw new Error('Use updateSurvey or updateExitExam for indirect attainment')
  },

  delete: async (attainmentId: number) => {
    // This was a legacy method - redirect to appropriate delete method
    logger.warn('Legacy indirect attainment delete called - consider using deleteSurvey or deleteExitExam instead', { attainmentId })
    throw new Error('Use deleteSurvey or deleteExitExam for indirect attainment')
  },
}

// Attainment audit endpoints
// Note: This is a future enhancement for tracking attainment changes over time
export const attainmentAuditAPI = {
  getBySubject: async (subjectId: number) => {
    // Future: GET /attainment-audit/subject/{subject_id}
    // Returns audit trail of attainment changes
    // For now, return empty array to prevent errors
    logger.info('Attainment audit API not yet implemented - returning empty data', { subjectId })
    return []
  },
}


// Student Progress API - Uses analytics endpoint for progress tracking
export const studentProgressAPI = {
  getProgress: async (studentId: number) => {
    // Use student analytics endpoint for progress data
    const response = await apiClient.get(`/analytics/student/${studentId}`)
    return response.data
  },
}

// Subject Assignment API
export const subjectAssignmentAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: {
    teacher_id?: number
    subject_id?: number
    class_id?: number
    semester_id?: number
    academic_year_id?: number
  }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.teacher_id) params.teacher_id = filters.teacher_id
    if (filters?.subject_id) params.subject_id = filters.subject_id
    if (filters?.class_id) params.class_id = filters.class_id
    if (filters?.semester_id) params.semester_id = filters.semester_id
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id
    const response = await apiClient.get('/subject-assignments', { params })
    return response.data
  },
  getById: async (assignmentId: number) => {
    const response = await apiClient.get(`/subject-assignments/${assignmentId}`)
    return response.data
  },
  getByExam: async (examId: number) => {
    const response = await apiClient.get(`/subject-assignments/exam/${examId}`)
    return response.data
  },
  create: async (assignmentData: {
    subject_id: number
    teacher_id: number
    class_id: number
    semester_id: number
    academic_year: number
  }) => {
    const response = await apiClient.post('/subject-assignments', assignmentData)
    return response.data
  },
  getByTeacher: async (teacherId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get('/subject-assignments', {
      params: { teacher_id: teacherId, skip, limit }
    })
    return response.data
  },
  getByUserId: async (userId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get('/subject-assignments', {
      params: { user_id: userId, skip, limit }
    })
    return response.data
  },
  getBySubject: async (subjectId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get('/subject-assignments', {
      params: { subject_id: subjectId, skip, limit }
    })
    return response.data
  },
}

// Final Marks API
export const finalMarksAPI = {
  createOrUpdate: async (data: {
    student_id: number
    subject_assignment_id: number
    semester_id: number
    internal_1?: number
    internal_2?: number
    external?: number
    best_internal_method?: 'best' | 'avg' | 'weighted'
    max_internal?: number
    max_external?: number
  }) => {
    const response = await apiClient.post('/final-marks', data)
    return response.data
  },
  getById: async (finalMarkId: number) => {
    const response = await apiClient.get(`/final-marks/${finalMarkId}`)
    return response.data
  },
  getByStudentAndSemester: async (studentId: number, semesterId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get(`/final-marks/student/${studentId}/semester/${semesterId}`, {
      params: { skip, limit }
    })
    // Backend returns FinalMarkListResponse with items array
    return response.data
  },
  publish: async (finalMarkId: number) => {
    const response = await apiClient.put(`/final-marks/${finalMarkId}/publish`)
    return response.data
  },
  lock: async (finalMarkId: number) => {
    const response = await apiClient.put(`/final-marks/${finalMarkId}/lock`)
    return response.data
  },
  calculateSGPA: async (studentId: number, semesterId: number) => {
    const response = await apiClient.post('/final-marks/calculate-sgpa', {
      student_id: studentId,
      semester_id: semesterId
    })
    return response.data
  },
  calculateCGPA: async (studentId: number, upToSemesterId?: number) => {
    const response = await apiClient.post('/final-marks/calculate-cgpa', {
      student_id: studentId,
      up_to_semester_id: upToSemesterId
    })
    return response.data
  },
}

// PDF Generation API
export const pdfGenerationAPI = {
  generateQuestionPaper: async (examId: number) => {
    // Use new alias endpoint
    const response = await apiClient.get(`/exams/${examId}/paper`, {
      responseType: 'blob'
    })
    return response.data
  },
  generateReportCard: async (studentId: number, semesterId: number) => {
    const response = await apiClient.get(`/pdf/report-card/student/${studentId}/semester/${semesterId}`, {
      responseType: 'blob'
    })
    return response.data
  },
  generateCOPOPdf: async (subjectId: number) => {
    const response = await apiClient.post(`/pdf/co-po-report/subject/${subjectId}`, {}, {
      responseType: 'blob'
    })
    return response.data
  },
}

// Student API
export const studentAPI = {
  getSemesters: async (skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get('/student/semesters', {
      params: { skip, limit }
    })
    return response.data
  },
  getMarksBySemester: async (semesterId: number, skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get(`/student/marks/sem/${semesterId}`, {
      params: { skip, limit }
    })
    return response.data
  },
  getReportPDF: async (semesterId: number) => {
    const response = await apiClient.get('/student/report/pdf', {
      params: { semester_id: semesterId },
      responseType: 'blob'
    })
    return response.data
  },
}

// Academic Structure API (Batches, Semesters, etc.)
export const academicStructureAPI = {
  getAllSemesters: async (skip: number = 0, limit: number = 100, filters?: { is_current?: boolean; academic_year_id?: number; department_id?: number; batch_instance_id?: number }) => {
    const params: QueryParams = { skip, limit }
    // Note: batch_year_id filter removed - use batch_instance_id or academic_year_id instead
    if (filters?.is_current !== undefined) params.is_current = filters.is_current
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id
    if (filters?.department_id) params.department_id = filters.department_id
    if (filters?.batch_instance_id) params.batch_instance_id = filters.batch_instance_id
    const response = await apiClient.get('/academic/semesters', { params })
    return response.data
  },
  publishSemester: async (semesterId: number) => {
    const response = await apiClient.post(`/academic/semesters/${semesterId}/publish`)
    return response.data
  },
}

// Academic Year API
export const academicYearAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { status?: string; is_current?: boolean }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.status) params.status = filters.status
    if (filters?.is_current !== undefined) params.is_current = filters.is_current
    const response = await apiClient.get('/academic-years', { params })
    return response.data
  },
  getCurrent: async () => {
    const response = await apiClient.get('/academic-years/current')
    return response.data
  },
  getById: async (academicYearId: number) => {
    const response = await apiClient.get(`/academic-years/${academicYearId}`)
    return response.data
  },
  create: async (data: { start_year: number; end_year: number; start_date?: string; end_date?: string }) => {
    const response = await apiClient.post('/academic-years', data)
    return response.data
  },
  update: async (academicYearId: number, data: { start_date?: string; end_date?: string }) => {
    const response = await apiClient.put(`/academic-years/${academicYearId}`, data)
    return response.data
  },
  activate: async (academicYearId: number) => {
    const response = await apiClient.post(`/academic-years/${academicYearId}/activate`)
    return response.data
  },
  archive: async (academicYearId: number) => {
    const response = await apiClient.post(`/academic-years/${academicYearId}/archive`)
    return response.data
  },
}

// Student Enrollment API
export const studentEnrollmentAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { student_id?: number; semester_id?: number; academic_year_id?: number }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.student_id) params.student_id = filters.student_id
    if (filters?.semester_id) params.semester_id = filters.semester_id
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id
    const response = await apiClient.get('/student-enrollments', { params })
    return response.data
  },
  getById: async (enrollmentId: number) => {
    const response = await apiClient.get(`/student-enrollments/${enrollmentId}`)
    return response.data
  },
  create: async (data: { student_id: number; semester_id: number; academic_year_id: number; roll_no: string; enrollment_date?: string }) => {
    const response = await apiClient.post('/student-enrollments', data)
    return response.data
  },
  bulkCreate: async (data: { semester_id: number; academic_year_id: number; enrollments: Array<{ student_id: number; roll_no: string; enrollment_date?: string }> }) => {
    const response = await apiClient.post('/student-enrollments/bulk', data)
    return response.data
  },
  promote: async (enrollmentId: number, nextSemesterId: number, options?: {
    roll_no?: string
    promotion_type?: 'regular' | 'lateral' | 'failed' | 'retained'
    notes?: string
  }) => {
    const params: QueryParams = { next_semester_id: nextSemesterId }
    if (options?.roll_no) params.roll_no = options.roll_no
    if (options?.promotion_type) params.promotion_type = options.promotion_type
    if (options?.notes) params.notes = options.notes
    const response = await apiClient.post(`/student-enrollments/${enrollmentId}/promote`, null, { params })
    return response.data
  },
}

// Internal Marks API
export const internalMarksAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { student_id?: number; subject_assignment_id?: number; semester_id?: number; academic_year_id?: number; workflow_state?: string }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.student_id) params.student_id = filters.student_id
    if (filters?.subject_assignment_id) params.subject_assignment_id = filters.subject_assignment_id
    if (filters?.semester_id) params.semester_id = filters.semester_id
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id
    if (filters?.workflow_state) params.workflow_state = filters.workflow_state
    const response = await apiClient.get('/internal-marks', { params })
    return response.data
  },
  getById: async (markId: number) => {
    const response = await apiClient.get(`/internal-marks/${markId}`)
    return response.data
  },
  create: async (data: { student_id: number; subject_assignment_id: number; semester_id: number; academic_year_id: number; component_type: string; marks_obtained: number; max_marks: number; notes?: string }) => {
    const response = await apiClient.post('/internal-marks', data)
    return response.data
  },
  update: async (markId: number, data: { marks_obtained: number; notes?: string }) => {
    const response = await apiClient.put(`/internal-marks/${markId}`, data)
    return response.data
  },
  submit: async (markId: number) => {
    const response = await apiClient.post(`/internal-marks/${markId}/submit`)
    return response.data
  },
  bulkSubmit: async (data: { subject_assignment_id: number; mark_ids?: number[] }) => {
    const response = await apiClient.post('/internal-marks/bulk-submit', data)
    return response.data
  },
  approve: async (markId: number) => {
    const response = await apiClient.post(`/internal-marks/${markId}/approve`)
    return response.data
  },
  reject: async (markId: number, reason: string) => {
    const response = await apiClient.post(`/internal-marks/${markId}/reject`, { reason })
    return response.data
  },
  freeze: async (markId: number) => {
    const response = await apiClient.post(`/internal-marks/${markId}/freeze`)
    return response.data
  },
  publish: async (markId: number) => {
    const response = await apiClient.post(`/internal-marks/${markId}/publish`)
    return response.data
  },
  getSubmitted: async (skip: number = 0, limit: number = 100, department_id?: number) => {
    const params: QueryParams = { skip, limit }
    if (department_id) params.department_id = department_id
    const response = await apiClient.get('/internal-marks/submitted/list', { params })
    return response.data
  },
}

// Audit API
export const auditAPI = {
  getMarkAuditLogs: async (filters?: {
    mark_id?: number
    exam_id?: number
    student_id?: number
    changed_by?: number
    skip?: number
    limit?: number
  }) => {
    const params: QueryParams = {
      skip: filters?.skip || 0,
      limit: filters?.limit || 100
    }
    if (filters?.mark_id) params.mark_id = filters.mark_id
    if (filters?.exam_id) params.exam_id = filters.exam_id
    if (filters?.student_id) params.student_id = filters.student_id
    if (filters?.changed_by) params.changed_by = filters.changed_by
    const response = await apiClient.get('/audit/marks', { params })
    return response.data
  },
  getSystemAuditLogs: async (filters?: {
    user_id?: number
    action?: string
    resource?: string
    skip?: number
    limit?: number
  }) => {
    const params: QueryParams = {
      skip: filters?.skip || 0,
      limit: filters?.limit || 100
    }
    if (filters?.user_id) params.user_id = filters.user_id
    if (filters?.action) params.action = filters.action
    if (filters?.resource) params.resource = filters.resource
    const response = await apiClient.get('/audit/system', { params })
    return response.data
  },
}

// Batch Instance API
export const batchInstanceAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: {
    academic_year_id?: number
    department_id?: number
    batch_id?: number
    is_active?: boolean
  }) => {
    const params: QueryParams = { skip, limit }
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id
    if (filters?.department_id) params.department_id = filters.department_id
    if (filters?.batch_id) params.batch_id = filters.batch_id
    if (filters?.is_active !== undefined) params.is_active = filters.is_active
    const response = await apiClient.get('/batch-instances', { params })
    return response.data
  },
  getById: async (batchInstanceId: number) => {
    const response = await apiClient.get(`/batch-instances/${batchInstanceId}`)
    return response.data
  },
  create: async (data: {
    academic_year_id: number
    department_id: number
    batch_id: number
    admission_year: number
    sections?: string[]
  }) => {
    const response = await apiClient.post('/batch-instances', data)
    return response.data
  },
  activate: async (batchInstanceId: number) => {
    const response = await apiClient.put(`/batch-instances/${batchInstanceId}/activate`)
    return response.data
  },
  deactivate: async (batchInstanceId: number) => {
    const response = await apiClient.put(`/batch-instances/${batchInstanceId}/deactivate`)
    return response.data
  },
  // Section endpoints
  getSections: async (batchInstanceId: number) => {
    const response = await apiClient.get(`/batch-instances/${batchInstanceId}/sections`)
    return response.data
  },
  getSection: async (sectionId: number) => {
    const response = await apiClient.get(`/batch-instances/sections/${sectionId}`)
    return response.data
  },
  createSection: async (batchInstanceId: number, data: {
    section_name: string
    capacity?: number
  }) => {
    const response = await apiClient.post(`/batch-instances/${batchInstanceId}/sections`, {
      batch_instance_id: batchInstanceId,
      ...data
    })
    return response.data
  },
  updateSection: async (sectionId: number, data: {
    section_name?: string
    capacity?: number
    is_active?: boolean
  }) => {
    const response = await apiClient.put(`/batch-instances/sections/${sectionId}`, data)
    return response.data
  },
  // Batch promotion
  promote: async (batchInstanceId: number, notes?: string) => {
    const response = await apiClient.post(`/batch-instances/${batchInstanceId}/promote`, {
      batch_instance_id: batchInstanceId,
      notes
    })
    return response.data
  },
}

// Batches (Program catalog) API – current, non-legacy
export const batchesAPI = {
  getAll: async (skip: number = 0, limit: number = 200, isActive?: boolean) => {
    const params: QueryParams = { skip, limit }
    if (isActive !== undefined) params.is_active = isActive
    const response = await apiClient.get('/academic/batches', { params })
    return response.data
  },
}

// ========================================
// NEW APIS - Smart Marks, CO-PO Attainment, Enhanced Analytics
// ========================================

/**
 * Smart Marks API
 * Handles best-of-two internal marks calculation, SGPA/CGPA calculation,
 * grade calculation, and marks recalculation.
 * Backend: /api/v1/smart-marks/*
 */
export const smartMarksAPI = {
  /**
   * Calculate best-of-two internal marks for a student
   * Takes the higher score between IA1 and IA2
   */
  calculateBestOfTwo: async (params: {
    student_id: number
    subject_assignment_id: number
    semester_id: number
    academic_year_id: number
    ia1_marks?: number
    ia2_marks?: number
  }): Promise<SmartMarksCalculation> => {
    const response = await apiClient.get('/smart-marks/best-of-two', {
      params: {
        student_id: params.student_id,
        subject_assignment_id: params.subject_assignment_id,
        semester_id: params.semester_id,
        academic_year_id: params.academic_year_id
      }
    })
    return response.data
  },

  /**
   * Get final calculated marks for a student in a subject
   */
  getFinalMarks: async (studentId: number, subjectAssignmentId: number, semesterId: number, academicYearId: number): Promise<FinalMarksData> => {
    const response = await apiClient.get('/smart-marks/final-marks', {
      params: {
        student_id: studentId,
        subject_assignment_id: subjectAssignmentId,
        semester_id: semesterId,
        academic_year_id: academicYearId
      }
    })
    return response.data
  },

  /**
   * Save final marks (internal + external) for a student
   */
  saveFinalMarks: async (data: {
    student_id: number
    subject_assignment_id: number
    semester_id: number
    best_internal: number
    external_marks?: number
    grade?: string
    total_marks?: number
  }): Promise<MessageResponse> => {
    const response = await apiClient.post('/smart-marks/save-final-marks', data)
    return response.data
  },

  /**
   * Calculate SGPA for a student for a specific semester
   */
  calculateSGPA: async (studentId: number, semesterId: number): Promise<SGPACalculation> => {
    const response = await apiClient.get('/smart-marks/sgpa', {
      params: {
        student_id: studentId,
        semester_id: semesterId
      }
    })
    return response.data
  },

  /**
   * Calculate CGPA for a student (all semesters or up to a specific semester)
   */
  calculateCGPA: async (studentId: number, upToSemesterId?: number): Promise<CGPACalculation> => {
    const response = await apiClient.get('/smart-marks/cgpa', {
      params: {
        student_id: studentId,
        up_to_semester_id: upToSemesterId
      }
    })
    return response.data
  },

  /**
   * Recalculate all final marks for a semester or subject
   * Useful after marks updates or formula changes
   */
  recalculateAll: async (params: {
    semester_id?: number
    subject_assignment_id?: number
    batch_instance_id?: number
  }): Promise<MessageResponse> => {
    const response = await apiClient.post('/smart-marks/recalculate', params)
    return response.data
  },

  /**
   * Get the grading scale used for grade calculation
   */
  getGradingScale: async (): Promise<GradingScale[]> => {
    const response = await apiClient.get('/smart-marks/grading-scale')
    return response.data
  },

  /**
   * Calculate grade based on percentage
   */
  calculateGrade: async (percentage: number, maxMarks: number): Promise<{ grade: string; grade_point: number }> => {
    const response = await apiClient.post('/smart-marks/calculate-grade', {
      percentage,
      max_marks: maxMarks
    })
    return response.data
  },
}

/**
 * CO-PO Attainment API
 * Handles Course Outcome and Program Outcome attainment calculations
 * Backend: /api/v1/co-po-attainment/*
 */
export const coPOAttainmentAPI = {
  /**
   * Calculate CO attainment for a specific subject
   * Returns attainment levels (L1, L2, L3) and overall attainment
   */
  calculateCOAttainment: async (subjectId: number, academicYearId?: number, semesterId?: number): Promise<COAttainment[]> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get(`/co-po-attainment/co/${subjectId}`, {
      params
    })
    return response.data
  },

  /**
   * Calculate PO attainment for a department
   * Aggregates CO attainments weighted by CO-PO mapping strength
   */
  calculatePOAttainment: async (departmentId: number, academicYearId?: number, semesterId?: number): Promise<POAttainment[]> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    if (semesterId) params.semester_id = semesterId
    const response = await apiClient.get(`/co-po-attainment/po/${departmentId}`, {
      params
    })
    return response.data
  },

  /**
   * Get comprehensive CO-PO attainment summary for a department
   * Includes CO attainment, PO attainment, trends, and NBA compliance data
   */
  getAttainmentSummary: async (departmentId: number, academicYearId?: number, semesterId?: number, includeTrends?: boolean): Promise<COPOAttainmentSummary> => {
    const params: QueryParams = {}
    if (academicYearId) params.academic_year_id = academicYearId
    if (semesterId) params.semester_id = semesterId
    if (includeTrends) params.include_trends = includeTrends
    const response = await apiClient.get(`/co-po-attainment/summary/${departmentId}`, {
      params
    })
    return response.data
  },

  /**
   * Get CO attainment trends over multiple semesters
   */
  getCOAttainmentTrends: async (subjectId: number, startSemesterId?: number, endSemesterId?: number): Promise<AttainmentTrend[]> => {
    const params: QueryParams = {}
    if (startSemesterId) params.start_semester_id = startSemesterId
    if (endSemesterId) params.end_semester_id = endSemesterId
    const response = await apiClient.get(`/co-po-attainment/co/${subjectId}/trends`, {
      params
    })
    return response.data
  },

  /**
   * Get PO attainment trends over multiple academic years
   */
  getPOAttainmentTrends: async (departmentId: number, startYear?: number, endYear?: number): Promise<AttainmentTrend[]> => {
    const params: QueryParams = {}
    if (startYear) params.start_year = startYear
    if (endYear) params.end_year = endYear
    const response = await apiClient.get(`/co-po-attainment/po/${departmentId}/trends`, {
      params
    })
    return response.data
  },
}

// Attainment Analytics API - provides attainment-related analytics methods
export const attainmentAnalyticsAPI = {
  getSubjectAttainment: analyticsAPI.getSubjectAttainment,
  getStudentAttainment: analyticsAPI.getStudentAttainment,
  getClassAttainment: analyticsAPI.getClassAttainment,
  getProgramAttainment: analyticsAPI.getProgramAttainment,
  getBlueprintValidation: analyticsAPI.getBlueprintValidation,
  getCOPOMapping: analyticsAPI.getCOPOMapping,
}


// Export utility for backward compatibility
// Components using classAPI should be updated to use batchInstanceAPI
// NOTE: Legacy classAPI fully removed. Use batchInstanceAPI, batchesAPI, and academicStructureAPI instead.

export default apiClient
