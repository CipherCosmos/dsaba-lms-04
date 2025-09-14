import axios from 'axios'
import { API_CONFIG } from '../config/api'

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
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
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}

export const departmentAPI = {
  getAll: async () => {
    const response = await apiClient.get('/departments')
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
}

export const classAPI = {
  getAll: async () => {
    const response = await apiClient.get('/classes')
    return response.data
  },
  create: async (classData: any) => {
    const response = await apiClient.post('/classes', classData)
    return response.data
  },
  update: async (id: number, classData: any) => {
    const response = await apiClient.put(`/classes/${id}`, classData)
    return response.data
  },
  delete: async (id: number) => {
    await apiClient.delete(`/classes/${id}`)
  },
}

export const subjectAPI = {
  getAll: async () => {
    const response = await apiClient.get('/subjects')
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
  delete: async (id: number) => {
    await apiClient.delete(`/subjects/${id}`)
  },
}

export const userAPI = {
  getAll: async () => {
    const response = await apiClient.get('/users')
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
  resetPassword: async (id: number) => {
    const response = await apiClient.post(`/users/${id}/reset-password`)
    return response.data
  },
}

export const examAPI = {
  getAll: async () => {
    const response = await apiClient.get('/exams')
    return response.data
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
    const response = await apiClient.get(`/exams/${examId}/questions`)
    return response.data
  },
}

export const questionAPI = {
  create: async (question: any) => {
    const response = await apiClient.post('/questions', question)
    return response.data
  },
}

export const marksAPI = {
  getByExam: async (examId: number) => {
    const response = await apiClient.get(`/marks/exam/${examId}`)
    return response.data
  },
  getByStudent: async (studentId: number) => {
    const response = await apiClient.get(`/marks/student/${studentId}`)
    return response.data
  },
  getLockStatus: async (examId: number) => {
    const response = await apiClient.get(`/marks/exam/${examId}/lock-status`)
    return response.data
  },
  bulkCreate: async (marks: any[]) => {
    const response = await apiClient.post('/marks/bulk', marks)
    return response.data
  },
  update: async (id: number, mark: any) => {
    const response = await apiClient.put(`/marks/${id}`, mark)
    return response.data
  },
}

export const analyticsAPI = {
  getStudentAnalytics: async (studentId: number) => {
    const response = await apiClient.get(`/analytics/student/${studentId}`)
    return response.data
  },
  getTeacherAnalytics: async (teacherId: number) => {
    const response = await apiClient.get(`/analytics/teacher/${teacherId}`)
    return response.data
  },
  getHODAnalytics: async (departmentId: number) => {
    const response = await apiClient.get(`/analytics/hod/${departmentId}`)
    return response.data
  },
  getClassAnalytics: async (classId: number) => {
    const response = await apiClient.get(`/analytics/class/${classId}`)
    return response.data
  },
  getSubjectAnalytics: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/subject/${subjectId}`)
    return response.data
  },
  getStrategicDashboardData: async (departmentId: number) => {
    const response = await apiClient.get(`/analytics/strategic/department/${departmentId}`)
    return response.data
  },
  getCOAttainment: async (subjectId: number, examType: string = 'all') => {
    const response = await apiClient.get(`/analytics/co-attainment/${subjectId}?exam_type=${examType}`)
    return response.data
  },
  getPOAttainment: async (subjectId: number, examType: string = 'all') => {
    const response = await apiClient.get(`/analytics/po-attainment/${subjectId}?exam_type=${examType}`)
    return response.data
  },
  getStudentPerformance: async (subjectId: number, classId?: number, examType: string = 'all') => {
    const params = new URLSearchParams({ exam_type: examType })
    if (classId) params.append('class_id', classId.toString())
    const response = await apiClient.get(`/analytics/student-performance/${subjectId}?${params}`)
    return response.data
  },
  getClassPerformance: async (subjectId: number, examType: string = 'all') => {
    const response = await apiClient.get(`/analytics/class-performance/${subjectId}?exam_type=${examType}`)
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
    
    const response = await apiClient.post(`/upload/marks-template?exam_id=${examId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  downloadMarksTemplate: async (examId: number) => {
    const response = await apiClient.get(`/download/marks-template/${examId}`, {
      responseType: 'blob'
    })
    return response.data
  },
}

// Reports API
export const reportsAPI = {
  getTemplates: async () => {
    const response = await apiClient.get('/reports/templates')
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
  getReportStatus: async (taskId: string) => {
    const response = await apiClient.get(`/reports/status/${taskId}`)
    return response.data
  },
  downloadReport: async (taskId: string) => {
    const response = await apiClient.get(`/reports/download/${taskId}`, {
      responseType: 'blob'
    })
    return response.data
  },
}

// CO/PO/PSO Framework APIs
export const coAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}/cos`)
    return response.data
  },
  create: async (subjectId: number, coData: any) => {
    const response = await apiClient.post(`/subjects/${subjectId}/cos`, {
      ...coData,
      subject_id: subjectId
    })
    return response.data
  },
  update: async (coId: number, coData: any) => {
    const response = await apiClient.put(`/cos/${coId}`, coData)
    return response.data
  },
  delete: async (coId: number) => {
    await apiClient.delete(`/cos/${coId}`)
  },
}

export const poAPI = {
  getByDepartment: async (departmentId: number) => {
    const response = await apiClient.get(`/departments/${departmentId}/pos`)
    return response.data
  },
  create: async (departmentId: number, poData: any) => {
    const response = await apiClient.post(`/departments/${departmentId}/pos`, {
      ...poData,
      department_id: departmentId
    })
    return response.data
  },
  update: async (poId: number, poData: any) => {
    const response = await apiClient.put(`/pos/${poId}`, poData)
    return response.data
  },
  delete: async (poId: number) => {
    await apiClient.delete(`/pos/${poId}`)
  },
}

export const coTargetAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}/co-targets`)
    return response.data
  },
  bulkUpdate: async (subjectId: number, coTargets: any[]) => {
    const response = await apiClient.put(`/subjects/${subjectId}/co-targets`, {
      subject_id: subjectId,
      co_targets: coTargets.map(target => ({
        ...target,
        subject_id: subjectId
      }))
    })
    return response.data
  },
}

export const assessmentWeightAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}/assessment-weights`)
    return response.data
  },
  bulkUpdate: async (subjectId: number, assessmentWeights: any[]) => {
    const response = await apiClient.put(`/subjects/${subjectId}/assessment-weights`, {
      subject_id: subjectId,
      assessment_weights: assessmentWeights.map(weight => ({
        ...weight,
        subject_id: subjectId
      }))
    })
    return response.data
  },
}

export const coPoMatrixAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}/co-po-matrix`)
    return response.data
  },
  bulkUpdate: async (subjectId: number, coPoMatrix: any[]) => {
    const response = await apiClient.put(`/subjects/${subjectId}/co-po-matrix`, {
      subject_id: subjectId,
      co_po_matrix: coPoMatrix.map(matrix => ({
        ...matrix,
        subject_id: subjectId
      }))
    })
    return response.data
  },
}

export const questionCoWeightAPI = {
  getByQuestion: async (questionId: number) => {
    const response = await apiClient.get(`/questions/${questionId}/co-weights`)
    return response.data
  },
  bulkUpdate: async (questionId: number, coWeights: any[]) => {
    const response = await apiClient.put(`/questions/${questionId}/co-weights`, {
      question_id: questionId,
      co_weights: coWeights
    })
    return response.data
  },
}

export const indirectAttainmentAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}/indirect-attainment`)
    return response.data
  },
  create: async (subjectId: number, attainmentData: any) => {
    const response = await apiClient.post(`/subjects/${subjectId}/indirect-attainment`, attainmentData)
    return response.data
  },
  update: async (attainmentId: number, attainmentData: any) => {
    const response = await apiClient.put(`/indirect-attainment/${attainmentId}`, attainmentData)
    return response.data
  },
  delete: async (attainmentId: number) => {
    await apiClient.delete(`/indirect-attainment/${attainmentId}`)
  },
}

export const attainmentAuditAPI = {
  getBySubject: async (subjectId: number) => {
    const response = await apiClient.get(`/subjects/${subjectId}/attainment-audit`)
    return response.data
  },
}

// Enhanced Analytics APIs
export const attainmentAnalyticsAPI = {
  getSubjectAttainment: async (subjectId: number, examType?: string) => {
    const response = await apiClient.get(`/analytics/attainment/subject/${subjectId}`, {
      params: examType ? { exam_type: examType } : {}
    })
    return response.data
  },
  getStudentAttainment: async (studentId: number, subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/student/${studentId}`, {
      params: { subject_id: subjectId }
    })
    return response.data
  },
  getClassAttainment: async (classId: number, term?: string) => {
    const response = await apiClient.get(`/analytics/attainment/class/${classId}`, {
      params: term ? { term } : {}
    })
    return response.data
  },
  getProgramAttainment: async (departmentId: number, year?: number) => {
    const response = await apiClient.get(`/analytics/attainment/program/${departmentId}`, {
      params: year ? { year } : {}
    })
    return response.data
  },
  getCOAttainment: async (subjectId: number, examType?: string) => {
    const response = await apiClient.get(`/analytics/co-attainment/${subjectId}`, {
      params: { exam_type: examType || 'all' }
    })
    return response.data
  },
  getPOAttainment: async (subjectId: number, examType?: string) => {
    const response = await apiClient.get(`/analytics/po-attainment/${subjectId}`, {
      params: { exam_type: examType || 'all' }
    })
    return response.data
  },
  getBlueprintValidation: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/blueprint-validation/${subjectId}`)
    return response.data
  },
  getStudentPerformance: async (subjectId: number, studentId?: number, examType?: string) => {
    const response = await apiClient.get(`/analytics/student-performance/${subjectId}`, {
      params: { 
        student_id: studentId,
        exam_type: examType || 'all'
      }
    })
    return response.data
  },
  getClassPerformance: async (subjectId: number, examType?: string) => {
    const response = await apiClient.get(`/analytics/class-performance/${subjectId}`, {
      params: { exam_type: examType || 'all' }
    })
    return response.data
  },
  getCOPOMapping: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/co-po-mapping/${subjectId}`)
    return response.data
  },
}

// Student Progress API
export const studentProgressAPI = {
  getProgress: async (studentId: number) => {
    const response = await apiClient.get(`/student-progress/${studentId}`)
    return response.data
  },
  getGoals: async (studentId: number) => {
    const response = await apiClient.get(`/student-goals/${studentId}`)
    return response.data
  },
  createGoal: async (goal: any) => {
    const response = await apiClient.post('/student-goals', goal)
    return response.data
  },
  updateGoal: async (goalId: number, goal: any) => {
    const response = await apiClient.put(`/student-goals/${goalId}`, goal)
    return response.data
  },
  deleteGoal: async (goalId: number) => {
    await apiClient.delete(`/student-goals/${goalId}`)
  },
  getMilestones: async (studentId: number) => {
    const response = await apiClient.get(`/student-milestones/${studentId}`)
    return response.data
  },
  createMilestone: async (milestone: any) => {
    const response = await apiClient.post('/student-milestones', milestone)
    return response.data
  },
  updateMilestone: async (milestoneId: number, milestone: any) => {
    const response = await apiClient.put(`/student-milestones/${milestoneId}`, milestone)
    return response.data
  },
  deleteMilestone: async (milestoneId: number) => {
    await apiClient.delete(`/student-milestones/${milestoneId}`)
  },
}

export default apiClient