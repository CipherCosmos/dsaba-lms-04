import apiClient from './api'

// Advanced Student Analytics API
export const advancedStudentAnalyticsAPI = {
  getStudentAnalytics: async (studentId: number) => {
    const response = await apiClient.get(`/analytics/advanced/student/${studentId}`)
    return response.data
  }
}

// Strategic Dashboard API
export const strategicDashboardAPI = {
  getDashboardData: async (departmentId: number) => {
    const response = await apiClient.get(`/analytics/strategic/department/${departmentId}`)
    return response.data
  }
}

// Detailed CO Analysis API
export const detailedCOAnalysisAPI = {
  getPerStudentBreakdown: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/subject/${subjectId}`)
    return response.data
  },
  
  getQuestionWiseContribution: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/co/${subjectId}`)
    return response.data
  },
  
  getEvidenceTracker: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/co/${subjectId}`)
    return response.data
  },
  
  getCoverageValidation: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/blueprint-validation/${subjectId}`)
    return response.data
  }
}

// Comprehensive PO Analysis API
export const comprehensivePOAnalysisAPI = {
  getPOStrengthMapping: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/po/${subjectId}`)
    return response.data
  },
  
  getIndirectAttainment: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/po/${subjectId}`)
    return response.data
  },
  
  getGapAnalysis: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/po/${subjectId}`)
    return response.data
  },
  
  getContributingCOs: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/po/${subjectId}`)
    return response.data
  }
}

// Advanced Teacher Analytics API
export const advancedTeacherAnalyticsAPI = {
  getClassPerformanceIntelligence: async (classId: number) => {
    const response = await apiClient.get(`/analytics/attainment/class/${classId}`)
    return response.data
  },
  
  getQuestionLevelAnalytics: async (subjectId: number) => {
    const response = await apiClient.get(`/analytics/attainment/subject/${subjectId}`)
    return response.data
  },
  
  getStudentRiskManagement: async (classId: number) => {
    const response = await apiClient.get(`/analytics/attainment/class/${classId}`)
    return response.data
  },
  
  getTeachingEffectivenessAnalysis: async (teacherId: number) => {
    const response = await apiClient.get(`/analytics/teacher/${teacherId}`)
    return response.data
  }
}
