import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { analyticsAPI } from '../../services/api'

interface StudentAnalytics {
  percentage: number
  rank: number
  total_marks: number
  performance_trend: Array<{
    exam: string
    percentage: number
  }>
  co_attainment: Record<string, number>
  po_attainment: Record<string, number>
}

interface TeacherAnalytics {
  class_performance: {
    average_percentage: number
    pass_rate: number
    top_performers: number
    at_risk_students: number
  }
  question_analysis: Array<{
    question_id: number
    average_marks: number
    success_rate: number
    attempt_rate: number
  }>
  co_po_attainment: {
    co_attainment: Record<string, number>
    po_attainment: Record<string, number>
  }
}

interface HODAnalytics {
  department_overview: {
    total_students: number
    total_teachers: number
    total_subjects: number
    average_performance: number
  }
  subject_performance: Array<{
    subject_name: string
    average_percentage: number
    pass_rate: number
  }>
  teacher_performance: Array<{
    teacher_name: string
    subjects_taught: number
    average_class_performance: number
  }>
  nba_compliance?: {
    overall_compliance: number
    co_attainment: number
    po_attainment: number
  }
  recent_updates?: Array<{
    title: string
    description: string
    date: string
    type: string
  }>
}

interface AnalyticsState {
  studentAnalytics: StudentAnalytics | null
  teacherAnalytics: TeacherAnalytics | null
  hodAnalytics: HODAnalytics | null
  loading: boolean
  error: string | null
}

const initialState: AnalyticsState = {
  studentAnalytics: null,
  teacherAnalytics: null,
  hodAnalytics: null,
  loading: false,
  error: null,
}

export const fetchStudentAnalytics = createAsyncThunk(
  'analytics/fetchStudentAnalytics',
  async (studentId: number) => {
    const response = await analyticsAPI.getStudentAnalytics(studentId)
    return response
  }
)

export const fetchTeacherAnalytics = createAsyncThunk(
  'analytics/fetchTeacherAnalytics',
  async (teacherId: number) => {
    const response = await analyticsAPI.getTeacherAnalytics(teacherId)
    return response
  }
)

export const fetchHODAnalytics = createAsyncThunk(
  'analytics/fetchHODAnalytics',
  async (departmentId: number) => {
    const response = await analyticsAPI.getHODAnalytics(departmentId)
    return response
  }
)

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearAnalytics: (state) => {
      state.studentAnalytics = null
      state.teacherAnalytics = null
      state.hodAnalytics = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStudentAnalytics.fulfilled, (state, action) => {
        state.loading = false
        state.studentAnalytics = action.payload as any
      })
      .addCase(fetchStudentAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch student analytics'
      })
      .addCase(fetchTeacherAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeacherAnalytics.fulfilled, (state, action) => {
        state.loading = false
        state.teacherAnalytics = action.payload as any
      })
      .addCase(fetchTeacherAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch teacher analytics'
      })
      .addCase(fetchHODAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchHODAnalytics.fulfilled, (state, action) => {
        state.loading = false
        state.hodAnalytics = action.payload as any
      })
      .addCase(fetchHODAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch HOD analytics'
      })
  },
})

export const { clearError, clearAnalytics } = analyticsSlice.actions
export default analyticsSlice.reducer