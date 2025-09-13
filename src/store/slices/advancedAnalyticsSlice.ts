import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { 
  advancedStudentAnalyticsAPI, 
  strategicDashboardAPI, 
  detailedCOAnalysisAPI, 
  comprehensivePOAnalysisAPI,
  advancedTeacherAnalyticsAPI 
} from '../../services/advancedAnalyticsAPI'

// Types
interface PerformanceIntelligence {
  trend_analysis: {
    exam_progression: Array<{
      exam: string
      percentage: number
      date: string | null
    }>
    improvement_rate: number
    consistency_score: number
  }
  competency_matrix: {
    [key: string]: {
      current: number
      target: number
      trend: string
      strength_level: string
    }
  }
  subject_proficiency: Array<{
    subject: string
    strength_score: number
    weakness_areas: string[]
    improvement_potential: number
  }>
  peer_comparison: {
    class_rank: number
    percentile: number
    above_average: boolean
    performance_gap: number
  }
}

interface PersonalizedInsights {
  risk_assessment: {
    level: string
    factors: string[]
    intervention_needed: boolean
    timeline: string
  }
  achievement_tracking: Array<{
    milestone: string
    progress: number
    target: number
    deadline: string
    status: string
  }>
  study_recommendations: Array<{
    area: string
    priority: string
    action: string
    resources: string[]
    estimated_impact: number
  }>
  motivation_metrics: {
    streak_days: number
    goals_achieved: number
    improvement_rate: number
    engagement_score: number
  }
}

interface AdvancedStudentAnalytics {
  performance_intelligence: PerformanceIntelligence
  personalized_insights: PersonalizedInsights
  risk_assessment: {
    level: string
    factors: string[]
    intervention_needed: boolean
    timeline: string
  }
  study_recommendations: Array<{
    area: string
    priority: string
    action: string
    resources: string[]
    estimated_impact: number
  }>
}

interface DepartmentalIntelligence {
  copo_attainment_matrix: {
    [key: string]: {
      [key: string]: number
    }
  }
  compliance_monitoring: {
    nba_thresholds: {
      co_attainment: number
      po_attainment: number
      student_success: number
    }
    current_status: {
      co_attainment: number
      po_attainment: number
      student_success: number
    }
    compliance_score: number
    alerts: Array<{
      type: string
      message: string
      priority: string
    }>
  }
  subject_performance_ranking: Array<{
    subject: string
    teacher: string
    outcome_achievement: number
    student_satisfaction: number
    teaching_effectiveness: number
    overall_score: number
  }>
  faculty_effectiveness_metrics: Array<{
    teacher: string
    subjects_taught: number
    average_outcome_achievement: number
    student_satisfaction: number
    improvement_trend: string
    effectiveness_score: number
  }>
}

interface StrategicPerformanceAnalytics {
  cross_sectional_analysis: {
    class_comparison: Array<{
      class: string
      average_performance: number
      co_attainment: number
      po_attainment: number
      student_count: number
    }>
    batch_comparison: Array<{
      batch: string
      year: number
      performance_trend: number[]
      graduation_rate: number
      employment_rate: number
    }>
  }
  longitudinal_trends: Array<{
    semester: string
    overall_performance: number
    co_attainment: number
    po_attainment: number
    student_satisfaction: number
  }>
  exam_difficulty_calibration: {
    difficulty_distribution: {
      easy: number
      medium: number
      hard: number
    }
    calibration_score: number
    recommendations: string[]
  }
  academic_calendar_insights: {
    seasonal_patterns: Array<{
      period: string
      performance: number
      trend: string
    }>
    peak_performance_periods: string[]
    challenging_periods: string[]
  }
}

interface RiskManagementIntervention {
  at_risk_student_pipeline: Array<{
    student_id: number
    student_name: string
    class: string
    risk_level: string
    risk_factors: string[]
    predicted_outcome: number
    intervention_status: string
  }>
  remedial_planning: Array<{
    area: string
    affected_students: number
    current_performance: number
    target_performance: number
    intervention_strategy: string
    timeline: string
    expected_outcome: number
  }>
  success_prediction: {
    overall_success_rate: number
    predicted_graduation_rate: number
    at_risk_percentage: number
    intervention_effectiveness: number
  }
  resource_allocation: {
    faculty_workload: Array<{
      teacher: string
      current_load: number
      max_capacity: number
      utilization_percentage: number
    }>
    resource_requirements: Array<{
      resource: string
      current_availability: number
      required_amount: number
      priority: string
    }>
  }
}

interface StrategicDashboardData {
  departmental_intelligence: DepartmentalIntelligence
  strategic_performance: StrategicPerformanceAnalytics
  risk_management: RiskManagementIntervention
  faculty_development: {
    faculty_effectiveness_metrics: Array<{
      teacher: string
      subjects_taught: number
      average_outcome_achievement: number
      student_satisfaction: number
      improvement_trend: string
      effectiveness_score: number
    }>
    development_needs: string[]
    training_programs: string[]
  }
}

interface AdvancedAnalyticsState {
  // Student Analytics
  studentAnalytics: AdvancedStudentAnalytics | null
  studentAnalyticsLoading: boolean
  studentAnalyticsError: string | null
  
  // Strategic Dashboard
  strategicDashboard: StrategicDashboardData | null
  strategicDashboardLoading: boolean
  strategicDashboardError: string | null
  
  // Detailed CO Analysis
  detailedCOAnalysis: any | null
  detailedCOAnalysisLoading: boolean
  detailedCOAnalysisError: string | null
  
  // Comprehensive PO Analysis
  comprehensivePOAnalysis: any | null
  comprehensivePOAnalysisLoading: boolean
  comprehensivePOAnalysisError: string | null
  
  // Advanced Teacher Analytics
  advancedTeacherAnalytics: any | null
  advancedTeacherAnalyticsLoading: boolean
  advancedTeacherAnalyticsError: string | null
}

const initialState: AdvancedAnalyticsState = {
  studentAnalytics: null,
  studentAnalyticsLoading: false,
  studentAnalyticsError: null,
  
  strategicDashboard: null,
  strategicDashboardLoading: false,
  strategicDashboardError: null,
  
  detailedCOAnalysis: null,
  detailedCOAnalysisLoading: false,
  detailedCOAnalysisError: null,
  
  comprehensivePOAnalysis: null,
  comprehensivePOAnalysisLoading: false,
  comprehensivePOAnalysisError: null,
  
  advancedTeacherAnalytics: null,
  advancedTeacherAnalyticsLoading: false,
  advancedTeacherAnalyticsError: null
}

// Async Thunks
export const fetchAdvancedStudentAnalytics = createAsyncThunk(
  'advancedAnalytics/fetchStudentAnalytics',
  async (studentId: number, { rejectWithValue }) => {
    try {
      const data = await advancedStudentAnalyticsAPI.getStudentAnalytics(studentId)
      return data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch student analytics')
    }
  }
)

export const fetchStrategicDashboardData = createAsyncThunk(
  'advancedAnalytics/fetchStrategicDashboard',
  async (departmentId: number, { rejectWithValue }) => {
    try {
      const data = await strategicDashboardAPI.getDashboardData(departmentId)
      return data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch strategic dashboard data')
    }
  }
)

export const fetchDetailedCOAnalysis = createAsyncThunk(
  'advancedAnalytics/fetchDetailedCOAnalysis',
  async (subjectId: number, { rejectWithValue }) => {
    try {
      const data = await detailedCOAnalysisAPI.getPerStudentBreakdown(subjectId)
      return data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch detailed CO analysis')
    }
  }
)

export const fetchComprehensivePOAnalysis = createAsyncThunk(
  'advancedAnalytics/fetchComprehensivePOAnalysis',
  async (subjectId: number, { rejectWithValue }) => {
    try {
      const data = await comprehensivePOAnalysisAPI.getPOStrengthMapping(subjectId)
      return data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch comprehensive PO analysis')
    }
  }
)

export const fetchAdvancedTeacherAnalytics = createAsyncThunk(
  'advancedAnalytics/fetchAdvancedTeacherAnalytics',
  async (teacherId: number, { rejectWithValue }) => {
    try {
      const data = await advancedTeacherAnalyticsAPI.getTeachingEffectivenessAnalysis(teacherId)
      return data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch advanced teacher analytics')
    }
  }
)

// Slice
const advancedAnalyticsSlice = createSlice({
  name: 'advancedAnalytics',
  initialState,
  reducers: {
    clearStudentAnalytics: (state) => {
      state.studentAnalytics = null
      state.studentAnalyticsError = null
    },
    clearStrategicDashboard: (state) => {
      state.strategicDashboard = null
      state.strategicDashboardError = null
    },
    clearDetailedCOAnalysis: (state) => {
      state.detailedCOAnalysis = null
      state.detailedCOAnalysisError = null
    },
    clearComprehensivePOAnalysis: (state) => {
      state.comprehensivePOAnalysis = null
      state.comprehensivePOAnalysisError = null
    },
    clearAdvancedTeacherAnalytics: (state) => {
      state.advancedTeacherAnalytics = null
      state.advancedTeacherAnalyticsError = null
    },
    clearAllAnalytics: (state) => {
      state.studentAnalytics = null
      state.strategicDashboard = null
      state.detailedCOAnalysis = null
      state.comprehensivePOAnalysis = null
      state.advancedTeacherAnalytics = null
      state.studentAnalyticsError = null
      state.strategicDashboardError = null
      state.detailedCOAnalysisError = null
      state.comprehensivePOAnalysisError = null
      state.advancedTeacherAnalyticsError = null
    }
  },
  extraReducers: (builder) => {
    // Student Analytics
    builder
      .addCase(fetchAdvancedStudentAnalytics.pending, (state) => {
        state.studentAnalyticsLoading = true
        state.studentAnalyticsError = null
      })
      .addCase(fetchAdvancedStudentAnalytics.fulfilled, (state, action) => {
        state.studentAnalyticsLoading = false
        state.studentAnalytics = action.payload
        state.studentAnalyticsError = null
      })
      .addCase(fetchAdvancedStudentAnalytics.rejected, (state, action) => {
        state.studentAnalyticsLoading = false
        state.studentAnalyticsError = action.payload as string
      })
    
    // Strategic Dashboard
    builder
      .addCase(fetchStrategicDashboardData.pending, (state) => {
        state.strategicDashboardLoading = true
        state.strategicDashboardError = null
      })
      .addCase(fetchStrategicDashboardData.fulfilled, (state, action) => {
        state.strategicDashboardLoading = false
        state.strategicDashboard = action.payload
        state.strategicDashboardError = null
      })
      .addCase(fetchStrategicDashboardData.rejected, (state, action) => {
        state.strategicDashboardLoading = false
        state.strategicDashboardError = action.payload as string
      })
    
    // Detailed CO Analysis
    builder
      .addCase(fetchDetailedCOAnalysis.pending, (state) => {
        state.detailedCOAnalysisLoading = true
        state.detailedCOAnalysisError = null
      })
      .addCase(fetchDetailedCOAnalysis.fulfilled, (state, action) => {
        state.detailedCOAnalysisLoading = false
        state.detailedCOAnalysis = action.payload
        state.detailedCOAnalysisError = null
      })
      .addCase(fetchDetailedCOAnalysis.rejected, (state, action) => {
        state.detailedCOAnalysisLoading = false
        state.detailedCOAnalysisError = action.payload as string
      })
    
    // Comprehensive PO Analysis
    builder
      .addCase(fetchComprehensivePOAnalysis.pending, (state) => {
        state.comprehensivePOAnalysisLoading = true
        state.comprehensivePOAnalysisError = null
      })
      .addCase(fetchComprehensivePOAnalysis.fulfilled, (state, action) => {
        state.comprehensivePOAnalysisLoading = false
        state.comprehensivePOAnalysis = action.payload
        state.comprehensivePOAnalysisError = null
      })
      .addCase(fetchComprehensivePOAnalysis.rejected, (state, action) => {
        state.comprehensivePOAnalysisLoading = false
        state.comprehensivePOAnalysisError = action.payload as string
      })
    
    // Advanced Teacher Analytics
    builder
      .addCase(fetchAdvancedTeacherAnalytics.pending, (state) => {
        state.advancedTeacherAnalyticsLoading = true
        state.advancedTeacherAnalyticsError = null
      })
      .addCase(fetchAdvancedTeacherAnalytics.fulfilled, (state, action) => {
        state.advancedTeacherAnalyticsLoading = false
        state.advancedTeacherAnalytics = action.payload
        state.advancedTeacherAnalyticsError = null
      })
      .addCase(fetchAdvancedTeacherAnalytics.rejected, (state, action) => {
        state.advancedTeacherAnalyticsLoading = false
        state.advancedTeacherAnalyticsError = action.payload as string
      })
  }
})

export const {
  clearStudentAnalytics,
  clearStrategicDashboard,
  clearDetailedCOAnalysis,
  clearComprehensivePOAnalysis,
  clearAdvancedTeacherAnalytics,
  clearAllAnalytics
} = advancedAnalyticsSlice.actions

export default advancedAnalyticsSlice.reducer
