import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
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
  generateReport: async (type: string, filters: any) => {
    const response = await apiClient.post('/reports/generate', {
      report_type: type,
      filters,
      format: filters.format || 'pdf'
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