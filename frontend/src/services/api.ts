import axios from 'axios'
import { API_CONFIG } from '../config/api'
import { logger } from '../core/utils/logger'

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
        const formattedErrors = errorData.detail.map((err: any) => ({
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
    const params: any = { skip, limit }
    if (filters?.is_active !== undefined) params.is_active = filters.is_active
    if (filters?.has_hod !== undefined) params.has_hod = filters.has_hod
    const response = await apiClient.get('/departments', { params })
    return response.data
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/departments/${id}`)
    return response.data
  },
  create: async (department: any) => {
    const response = await apiClient.post('/departments', department)
    return response.data
  },
  update: async (id: number, department: any) => {
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

export const classAPI = {
  getAll: async () => {
    // Note: Backend uses academic structure - batches, semesters, etc.
    // This endpoint might need to be refactored to use proper academic structure
    const response = await apiClient.get('/academic/batches')
    return response.data
  },
  getBatches: async (skip: number = 0, limit: number = 100, isActive?: boolean) => {
    const params: any = { skip, limit }
    if (isActive !== undefined) params.is_active = isActive
    const response = await apiClient.get('/academic/batches', { params })
    return response.data
  },
  getBatchYears: async (batchId: number) => {
    const response = await apiClient.get(`/academic/batches/${batchId}/batch-years`)
    return response.data
  },
  getSemesters: async (batchYearId: number) => {
    const response = await apiClient.get(`/academic/batch-years/${batchYearId}/semesters`)
    return response.data
  },
  // Compatibility methods for old slices
  create: async (classData: any) => {
    // For compatibility, this creates a batch
    const response = await apiClient.post('/academic/batches', classData)
    return response.data
  },
  update: async (id: number, classData: any) => {
    // For compatibility, this updates a batch
    const response = await apiClient.put(`/academic/batches/${id}`, classData)
    return response.data
  },
  delete: async (id: number) => {
    // For compatibility, this deletes a batch
    await apiClient.delete(`/academic/batches/${id}`)
  },
  createBatch: async (batchData: any) => {
    const response = await apiClient.post('/academic/batches', batchData)
    return response.data
  },
  createBatchYear: async (batchYearData: any) => {
    const response = await apiClient.post('/academic/batch-years', batchYearData)
    return response.data
  },
  createSemester: async (semesterData: any) => {
    const response = await apiClient.post('/academic/semesters', semesterData)
    return response.data
  },
  updateSemester: async (id: number, semesterData: any) => {
    const response = await apiClient.put(`/academic/semesters/${id}/dates`, semesterData)
    return response.data
  },
}

export const subjectAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { department_id?: number; is_active?: boolean }) => {
    const params: any = { skip, limit }
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
  create: async (subject: any) => {
    const response = await apiClient.post('/subjects', subject)
    return response.data
  },
  update: async (id: number, subject: any) => {
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
    const params: any = { skip, limit }
    if (filters?.is_active !== undefined) params.is_active = filters.is_active
    if (filters?.email_verified !== undefined) params.email_verified = filters.email_verified
    const response = await apiClient.get('/users', { params })
    return response.data
  },
  getById: async (id: number) => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },
  create: async (user: any) => {
    const response = await apiClient.post('/users', user)
    return response.data
  },
  update: async (id: number, user: any) => {
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
  bulkCreate: async (users: any[]) => {
    try {
      const response = await apiClient.post('/users/bulk', { users }, {
        timeout: 120000, // 2 minutes timeout for bulk operations
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error: any) {
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
const forceFreshRequest = (url: string, config: any = {}) => {
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
    
    const params: any = { skip, limit }
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
  create: async (exam: any) => {
    const response = await apiClient.post('/exams', exam)
    return response.data
  },
  update: async (id: number, exam: any) => {
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
    const params: any = { skip, limit }
    if (section) params.section = section
    const response = await apiClient.get(`/questions/exam/${examId}`, { params })
    return response.data
  },
  getById: async (questionId: number) => {
    const response = await apiClient.get(`/questions/${questionId}`)
    return response.data
  },
  create: async (question: any) => {
    const response = await apiClient.post('/questions', question)
    return response.data
  },
  update: async (questionId: number, question: any) => {
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
  createCOMapping: async (mapping: any) => {
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
  create: async (mark: any) => {
    const response = await apiClient.post('/marks', mark)
    return response.data
  },
  bulkCreate: async (examId: number, marks: any[]) => {
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
    const params: any = {}
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
  getStudentAnalytics: async (studentId: number, subjectId?: number) => {
    const params: any = {}
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/analytics/student/${studentId}`, { params })
    return response.data
  },
  getTeacherAnalytics: async (teacherId: number, subjectId?: number) => {
    const params: any = {}
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/analytics/teacher/${teacherId}`, { params })
    return response.data
  },
  getHODAnalytics: async (departmentId: number) => {
    const response = await apiClient.get(`/analytics/hod/department/${departmentId}`)
    return response.data
  },
  getClassAnalytics: async (classId: number, subjectId?: number) => {
    const params: any = {}
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/analytics/class/${classId}`, { params })
    return response.data
  },
  getSubjectAnalytics: async (subjectId: number, classId?: number) => {
    const params: any = {}
    if (classId) params.class_id = classId
    const response = await apiClient.get(`/analytics/subject/${subjectId}`, { params })
    return response.data
  },
  getStrategicDashboardData: async (departmentId: number) => {
    // Use HOD analytics endpoint
    const response = await apiClient.get(`/analytics/hod/department/${departmentId}`)
    return response.data
  },
  getCOAttainment: async (subjectId: number, examType?: 'internal1' | 'internal2' | 'external' | 'all') => {
    const params: any = {}
    if (examType) params.exam_type = examType
    const response = await apiClient.get(`/analytics/co-attainment/subject/${subjectId}`, { params })
    return response.data
  },
  getPOAttainment: async (departmentId: number, subjectId?: number) => {
    const params: any = {}
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/analytics/po-attainment/department/${departmentId}`, { params })
    return response.data
  },
  getBloomsAnalysis: async (examId?: number, subjectId?: number) => {
    const params: any = {}
    if (examId) params.exam_id = examId
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get('/analytics/blooms', { params })
    return response.data
  },
  getMultiDimensionalAnalytics: async (dimension: 'year' | 'semester' | 'subject' | 'class' | 'teacher', filters?: Record<string, any>) => {
    const params: any = { dim: dimension }
    if (filters) {
      params.filters = JSON.stringify(filters)
    }
    const response = await apiClient.get('/analytics/multi', { params })
    return response.data
  },
  // These endpoints may not exist in backend - using available endpoints instead
  getStudentPerformance: async (subjectId: number, studentId?: number, examType?: string) => {
    // Use student analytics with subject filter
    const params: any = {}
    if (subjectId) params.subject_id = subjectId
    if (studentId) {
      const response = await apiClient.get(`/analytics/student/${studentId}`, { params })
      return response.data
    }
    // If no studentId, this endpoint doesn't exist - return empty or use subject analytics
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getClassPerformance: async (subjectId: number, classId?: number, examType?: string) => {
    // Use class analytics or subject analytics
    if (classId) {
      const params: any = { subject_id: subjectId }
      const response = await apiClient.get(`/analytics/class/${classId}`, { params })
      return response.data
    }
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getCOPOMapping: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/co-po-mapping/${subjectId}`)
    return response.data
  },
  generateReport: async (type: string, filters: any, format: string = 'pdf') => {
    const response = await apiClient.post('/reports/generate', {
      report_type: type,
      filters,
      format: format
    }, {
      responseType: 'blob'
    })
    return response.data
  },
  getReportTemplates: async () => {
    const response = await apiClient.get('/reports/templates')
    return response.data
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
  getTypes: async () => {
    const response = await apiClient.get('/reports/types')
    return response.data
  },
  generateReport: async (reportType: string, filters: any, format: string = 'pdf') => {
    const response = await apiClient.post('/reports/generate', {
      report_type: reportType,
      filters,
      format
    })
    return response.data
  },
  getStudentReport: async (studentId: number, subjectId?: number, format: string = 'json') => {
    const params: any = { format }
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/reports/student/${studentId}`, { params, responseType: format === 'pdf' ? 'blob' : 'json' })
    return response.data
  },
  getClassReport: async (classId: number, subjectId?: number, format: string = 'json') => {
    const params: any = { format }
    if (subjectId) params.subject_id = subjectId
    const response = await apiClient.get(`/reports/class/${classId}`, { params, responseType: format === 'pdf' ? 'blob' : 'json' })
    return response.data
  },
  getCOPOReport: async (subjectId: number, format: string = 'json') => {
    const params = { format }
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
  create: async (coData: any) => {
    const response = await apiClient.post('/course-outcomes', coData)
    return response.data
  },
  update: async (coId: number, coData: any) => {
    const response = await apiClient.put(`/course-outcomes/${coId}`, coData)
    return response.data
  },
  delete: async (coId: number) => {
    await apiClient.delete(`/course-outcomes/${coId}`)
  },
}

export const poAPI = {
  getByDepartment: async (departmentId: number, poType?: 'PO' | 'PSO', skip: number = 0, limit: number = 100) => {
    const params: any = { skip, limit }
    if (poType) params.po_type = poType
    const response = await apiClient.get(`/program-outcomes/department/${departmentId}`, { params })
    return response.data
  },
  getById: async (poId: number) => {
    const response = await apiClient.get(`/program-outcomes/${poId}`)
    return response.data
  },
  create: async (poData: any) => {
    const response = await apiClient.post('/program-outcomes', poData)
    return response.data
  },
  update: async (poId: number, poData: any) => {
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
  bulkUpdate: async (subjectId: number, coTargets: any[]) => {
    // Update each CO's target_attainment individually
    const updates = await Promise.all(
      coTargets.map((target: any) =>
        apiClient.put(`/course-outcomes/${target.co_id}`, {
          target_attainment: target.target_attainment,
          l1_threshold: target.l1_threshold,
          l2_threshold: target.l2_threshold,
          l3_threshold: target.l3_threshold
        })
      )
    )
    return updates.map((r: any) => r.data)
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
  bulkUpdate: async (subjectId: number, assessmentWeights: any[]) => {
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
  bulkUpdate: async (subjectId: number, coPoMatrix: any[]) => {
    // Get COs for subject first
    const cosResponse = await apiClient.get(`/course-outcomes/subject/${subjectId}`)
    // Backend returns COListResponse with items array (standardized format)
    const cos = cosResponse.data.items || []
    
    // For each CO in the matrix, update/create/delete mappings
    const results = []
    for (const matrixItem of coPoMatrix) {
      const co = cos.find((c: any) => c.id === matrixItem.co_id)
      if (!co) continue
      
      // Get existing mappings for this CO
      // Backend returns COPOMappingListResponse with items array (standardized format)
      const existingMappings = await apiClient.get(`/co-po-mappings/co/${co.id}`).then(r => r.data.items || [])
      
      // Process updates (existing mappings)
      for (const mapping of matrixItem.mappings || []) {
        const existing = existingMappings.find((m: any) => m.po_id === mapping.po_id)
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
      const newPoIds = new Set((matrixItem.mappings || []).map((m: any) => m.po_id))
      for (const existing of existingMappings) {
        if (!newPoIds.has(existing.po_id)) {
          await apiClient.delete(`/co-po-mappings/${existing.id}`)
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
  bulkUpdate: async (questionId: number, coMappings: any[]) => {
    // Delete existing mappings
    const existingResponse = await apiClient.get(`/questions/${questionId}/co-mappings`)
    // Backend returns COPOMappingListResponse with items array (standardized format)
    const existing = existingResponse.data.items || []
    
    await Promise.all(
      existing.map((mapping: any) =>
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
// Note: Indirect attainment (surveys, exit exams, etc.) is a future enhancement
// This API is reserved for future implementation when indirect assessment methods are added
// Currently returns empty data to prevent errors in components that reference it
export const indirectAttainmentAPI = {
  getBySubject: async (subjectId: number) => {
    // Future: GET /indirect-attainment/subject/{subject_id}
    // Returns indirect attainment data (surveys, exit exams, etc.)
    // For now, return empty array to prevent errors
    logger.info('Indirect attainment API not yet implemented - returning empty data', { subjectId })
    return []
  },
  create: async (subjectId: number, attainmentData: any) => {
    // Future: POST /indirect-attainment
    // Creates indirect attainment record
    logger.warn('Indirect attainment create API not yet implemented', { subjectId })
    throw new Error('Indirect attainment API is a future enhancement and not yet implemented')
  },
  update: async (attainmentId: number, attainmentData: any) => {
    // Future: PUT /indirect-attainment/{id}
    // Updates indirect attainment record
    logger.warn('Indirect attainment update API not yet implemented', { attainmentId })
    throw new Error('Indirect attainment API is a future enhancement and not yet implemented')
  },
  delete: async (attainmentId: number) => {
    // Future: DELETE /indirect-attainment/{id}
    // Deletes indirect attainment record
    logger.warn('Indirect attainment delete API not yet implemented', { attainmentId })
    throw new Error('Indirect attainment API is a future enhancement and not yet implemented')
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

// Enhanced Analytics APIs - using existing backend endpoints
export const attainmentAnalyticsAPI = {
  getSubjectAttainment: async (subjectId: number, examType?: string) => {
    // Use subject analytics endpoint
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getStudentAttainment: async (studentId: number, subjectId: number) => {
    // Use student analytics endpoint
    const response = await apiClient.get(`/analytics/student/${studentId}`)
    return response.data
  },
  getClassAttainment: async (classId: number, term?: string) => {
    // Use class analytics endpoint
    const response = await apiClient.get(`/analytics/class/${classId}`)
    return response.data
  },
  getProgramAttainment: async (departmentId: number, year?: number) => {
    // Use HOD analytics endpoint
    const response = await apiClient.get(`/analytics/hod/department/${departmentId}`)
    return response.data
  },
  getCOAttainment: async (subjectId: number, examType?: string) => {
    const response = await apiClient.get(`/analytics/co-attainment/subject/${subjectId}`)
    return response.data
  },
  getPOAttainment: async (departmentId: number, examType?: string) => {
    // PO attainment is department-level
    const response = await apiClient.get(`/analytics/po-attainment/department/${departmentId}`)
    return response.data
  },
  getBlueprintValidation: async (subjectId: number) => {
    // Use subject analytics endpoint for blueprint validation
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getStudentPerformance: async (subjectId: number, studentId?: number, examType?: string) => {
    // Use student analytics endpoint with subject filter
    if (studentId) {
      const response = await apiClient.get(`/analytics/student/${studentId}`, {
        params: { subject_id: subjectId }
      })
      return response.data
    }
    // If no studentId, use subject analytics
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getClassPerformance: async (subjectId: number, examType?: string) => {
    // Use subject analytics endpoint - class performance is part of subject analytics
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getCOPOMapping: async (subjectId: number) => {
    // Get COs for subject, then get their CO-PO mappings
    const cosResponse = await apiClient.get(`/course-outcomes/subject/${subjectId}`)
    // Backend returns COListResponse with items array (standardized format)
    const cos = cosResponse.data.items || []
    
    // Get mappings for each CO
    // Backend returns COPOMappingListResponse with items array (standardized format)
    const mappings = await Promise.all(
      cos.map((co: any) =>
        apiClient.get(`/co-po-mappings/co/${co.id}`).then((r: any) => ({
          co_id: co.id,
          co_code: co.code,
          mappings: r.data.items || []
        }))
      )
    )
    return mappings
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
  }) => {
    const params: any = { skip, limit }
    if (filters?.teacher_id) params.teacher_id = filters.teacher_id
    if (filters?.subject_id) params.subject_id = filters.subject_id
    if (filters?.class_id) params.class_id = filters.class_id
    if (filters?.semester_id) params.semester_id = filters.semester_id
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
  getAllSemesters: async (skip: number = 0, limit: number = 100, filters?: { batch_year_id?: number; is_current?: boolean; academic_year_id?: number; department_id?: number }) => {
    const params: any = { skip, limit }
    if (filters?.batch_year_id) params.batch_year_id = filters.batch_year_id
    if (filters?.is_current !== undefined) params.is_current = filters.is_current
    if (filters?.academic_year_id) params.academic_year_id = filters.academic_year_id
    if (filters?.department_id) params.department_id = filters.department_id
    const response = await apiClient.get('/academic/semesters', { params })
    return response.data
  },
  getSemestersByBatchYear: async (batchYearId: number) => {
    const response = await apiClient.get(`/academic/batch-years/${batchYearId}/semesters`)
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
    const params: any = { skip, limit }
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
    const params: any = { skip, limit }
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
  promote: async (enrollmentId: number, nextSemesterId: number) => {
    const response = await apiClient.post(`/student-enrollments/${enrollmentId}/promote`, null, {
      params: { next_semester_id: nextSemesterId }
    })
    return response.data
  },
}

// Internal Marks API
export const internalMarksAPI = {
  getAll: async (skip: number = 0, limit: number = 100, filters?: { student_id?: number; subject_assignment_id?: number; semester_id?: number; academic_year_id?: number; workflow_state?: string }) => {
    const params: any = { skip, limit }
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
    const params: any = { skip, limit }
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
    const params: any = {
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
    const params: any = {
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

export default apiClient