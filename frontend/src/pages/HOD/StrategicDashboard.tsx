import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchHODAnalytics } from '../../store/slices/analyticsSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { analyticsAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { 
  AlertTriangle, CheckCircle, ArrowUp, ArrowDown, Minus, Building, GraduationCap, Zap, BarChart3, Shield, Users, Filter, Download
} from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, 
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

/*
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
      type: 'warning' | 'error' | 'success'
      message: string
      priority: 'high' | 'medium' | 'low'
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
    improvement_trend: 'up' | 'down' | 'stable'
    effectiveness_score: number
  }>
}
*/

/*
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
      trend: 'up' | 'down' | 'stable'
    }>
    peak_performance_periods: string[]
    challenging_periods: string[]
  }
}
*/

/*
interface RiskManagementIntervention {
  at_risk_student_pipeline: Array<{
    student_id: number
    student_name: string
    class: string
    risk_level: 'low' | 'medium' | 'high'
    risk_factors: string[]
    predicted_outcome: number
    intervention_status: 'none' | 'planned' | 'active' | 'completed'
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
      priority: 'high' | 'medium' | 'low'
    }>
  }
}
*/

const StrategicDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { departments } = useSelector((state: RootState) => state.departments)
  const { } = useSelector((state: RootState) => state.users)
  const { } = useSelector((state: RootState) => state.subjects)
  const [activeTab, setActiveTab] = useState('departmental_intelligence')
  const [strategicData, setStrategicData] = useState<any>(null)
  const [strategicLoading, setStrategicLoading] = useState(false)
  const [strategicError, setStrategicError] = useState<string | null>(null)
  

  useEffect(() => {
    if (user?.department_id) {
      dispatch(fetchHODAnalytics(user.department_id))
      fetchStrategicDashboardData(user.department_id)
    }
    dispatch(fetchDepartments())
    dispatch(fetchUsers())
    dispatch(fetchSubjects())
  }, [dispatch, user])

  const fetchStrategicDashboardData = async (departmentId: number) => {
    try {
      setStrategicLoading(true)
      setStrategicError(null)
      const data = await analyticsAPI.getStrategicDashboardData(departmentId)
      setStrategicData(data)
    } catch (error) {
      logger.error('Error fetching strategic dashboard data:', error)
      setStrategicError('Failed to load strategic dashboard data')
    } finally {
      setStrategicLoading(false)
    }
  }


  const department = departments.find(d => d.id === user?.department_id)

  if (loading || strategicLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (strategicError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-500 mb-2">Error loading strategic dashboard</p>
        <p className="text-sm text-gray-400">{strategicError}</p>
        <button 
          onClick={() => user?.department_id && fetchStrategicDashboardData(user.department_id)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!strategicData) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No strategic dashboard data available</p>
        <p className="text-sm text-gray-400">Department data will appear once exams are conducted</p>
      </div>
    )
  }

  // Use real data from API
  const departmentalIntelligence = strategicData?.departmental_intelligence
  const strategicPerformance = strategicData?.strategic_performance
  const riskManagement = strategicData?.risk_management
  const facultyDevelopment = strategicData?.faculty_development

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'planned': return 'text-yellow-600 bg-yellow-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'none': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Charts Data
  const complianceData = {
    labels: ['CO Attainment', 'PO Attainment', 'Student Success'],
    datasets: [
      {
        label: 'Current Status',
        data: departmentalIntelligence?.compliance_monitoring?.current_status ? 
          [
            departmentalIntelligence.compliance_monitoring.current_status.co_attainment || 0,
            departmentalIntelligence.compliance_monitoring.current_status.po_attainment || 0,
            departmentalIntelligence.compliance_monitoring.current_status.student_success || 0
          ] : [0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'NBA Thresholds',
        data: departmentalIntelligence?.compliance_monitoring?.nba_thresholds ? 
          [
            departmentalIntelligence.compliance_monitoring.nba_thresholds.co_attainment || 0,
            departmentalIntelligence.compliance_monitoring.nba_thresholds.po_attainment || 0,
            departmentalIntelligence.compliance_monitoring.nba_thresholds.student_success || 0
          ] : [0, 0, 0],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }
    ]
  }

  const longitudinalTrendsData = {
    labels: strategicPerformance?.longitudinal_trends?.map((t: any) => t.semester) || [],
    datasets: [
      {
        label: 'Overall Performance',
        data: strategicPerformance?.longitudinal_trends?.map((t: any) => t.overall_performance) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'CO Attainment',
        data: strategicPerformance?.longitudinal_trends?.map((t: any) => t.co_attainment) || [],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'PO Attainment',
        data: strategicPerformance?.longitudinal_trends?.map((t: any) => t.po_attainment) || [],
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  const classComparisonData = {
    labels: strategicPerformance?.cross_sectional_analysis?.class_comparison?.map((c: any) => c.class) || [],
    datasets: [
      {
        label: 'Average Performance',
        data: strategicPerformance?.cross_sectional_analysis?.class_comparison?.map((c: any) => c.average_performance) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'CO Attainment',
        data: strategicPerformance?.cross_sectional_analysis?.class_comparison?.map((c: any) => c.co_attainment) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      },
      {
        label: 'PO Attainment',
        data: strategicPerformance?.cross_sectional_analysis?.class_comparison?.map((c: any) => c.po_attainment) || [],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1
      }
    ]
  }

  const tabs = [
    { id: 'departmental_intelligence', label: 'Departmental Intelligence', icon: Building },
    { id: 'strategic_performance', label: 'Strategic Performance', icon: BarChart3 },
    { id: 'risk_management', label: 'Risk Management', icon: Shield },
    { id: 'faculty_development', label: 'Faculty Development', icon: Users }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategic Dashboard</h1>
          <p className="text-gray-600">{department?.name} - Comprehensive Departmental Intelligence</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button className="btn-secondary flex items-center space-x-2">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Departmental Intelligence Tab */}
      {activeTab === 'departmental_intelligence' && departmentalIntelligence && (
        <div className="space-y-6">
          {/* Compliance Monitoring */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">NBA/NAAC Compliance Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {departmentalIntelligence?.compliance_monitoring?.compliance_score?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600">Compliance Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {departmentalIntelligence?.compliance_monitoring?.current_status?.co_attainment?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600">CO Attainment</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {departmentalIntelligence?.compliance_monitoring?.current_status?.po_attainment?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600">PO Attainment</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {departmentalIntelligence?.compliance_monitoring?.current_status?.student_success?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600">Student Success</div>
              </div>
            </div>
            <div className="h-80">
              <Bar data={complianceData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} />
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Alerts</h3>
            <div className="space-y-3">
              {departmentalIntelligence?.compliance_monitoring?.alerts?.map((alert: any, index: number) => (
                <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg ${getAlertColor(alert.type)}`}>
                  <AlertTriangle className="h-5 w-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(alert.priority)}`}>
                    {alert.priority?.toUpperCase()}
                  </span>
                </div>
              )) || []}
            </div>
          </div>

          {/* Subject Performance Ranking */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subject Performance Ranking</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome Achievement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Satisfaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departmentalIntelligence?.subject_performance_ranking?.map((subject: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.teacher}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.outcome_achievement?.toFixed(1) || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subject.student_satisfaction?.toFixed(1) || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.overall_score?.toFixed(1) || 0}%
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Strategic Performance Tab */}
      {activeTab === 'strategic_performance' && strategicPerformance && (
        <div className="space-y-6">
          {/* Longitudinal Trends */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Longitudinal Performance Trends</h3>
            <div className="h-80">
              <Line data={longitudinalTrendsData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} />
            </div>
          </div>

          {/* Class Comparison */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cross-Sectional Class Analysis</h3>
            <div className="h-80">
              <Bar data={classComparisonData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} />
            </div>
          </div>

          {/* Exam Difficulty Calibration */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Difficulty Calibration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {strategicPerformance?.exam_difficulty_calibration?.calibration_score?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600 mb-4">Calibration Score</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Easy Questions</span>
                    <span>{strategicPerformance?.exam_difficulty_calibration?.difficulty_distribution?.easy?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Medium Questions</span>
                    <span>{strategicPerformance?.exam_difficulty_calibration?.difficulty_distribution?.medium?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hard Questions</span>
                    <span>{strategicPerformance?.exam_difficulty_calibration?.difficulty_distribution?.hard?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {strategicPerformance?.exam_difficulty_calibration?.recommendations?.map((rec: string, index: number) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{rec}</span>
                    </li>
                  )) || []}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Management Tab */}
      {activeTab === 'risk_management' && riskManagement && (
        <div className="space-y-6">
          {/* Success Prediction */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {riskManagement?.success_prediction?.overall_success_rate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Graduation Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {riskManagement?.success_prediction?.predicted_graduation_rate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">At-Risk Students</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {riskManagement?.success_prediction?.at_risk_percentage?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Intervention Effectiveness</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {riskManagement?.success_prediction?.intervention_effectiveness?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Student Pipeline */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">At-Risk Student Pipeline</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted Outcome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Factors</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {riskManagement?.at_risk_student_pipeline?.map((student: any) => (
                    <tr key={student.student_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.student_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(student.risk_level)}`}>
                          {student.risk_level?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.predicted_outcome?.toFixed(1) || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.intervention_status)}`}>
                          {student.intervention_status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.risk_factors?.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remedial Planning */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Remedial Planning</h3>
            <div className="space-y-4">
              {riskManagement?.remedial_planning?.map((plan: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{plan.area}</h4>
                    <span className="text-sm text-gray-500">Timeline: {plan.timeline}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Affected Students:</span>
                      <span className="ml-2 font-medium">{plan.affected_students}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Performance:</span>
                      <span className="ml-2 font-medium">{plan.current_performance?.toFixed(1) || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Target Performance:</span>
                      <span className="ml-2 font-medium">{plan.target_performance?.toFixed(1) || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expected Outcome:</span>
                      <span className="ml-2 font-medium">{plan.expected_outcome?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{plan.intervention_strategy}</p>
                </div>
              )) || []}
            </div>
          </div>
        </div>
      )}

      {/* Faculty Development Tab */}
      {activeTab === 'faculty_development' && (departmentalIntelligence || facultyDevelopment) && (
        <div className="space-y-6">
          {/* Faculty Effectiveness Metrics */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Faculty Effectiveness Metrics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects Taught</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome Achievement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Satisfaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effectiveness Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(departmentalIntelligence?.faculty_effectiveness_metrics || facultyDevelopment?.faculty_effectiveness_metrics)?.map((faculty: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {faculty.teacher}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {faculty.subjects_taught}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {faculty.average_outcome_achievement?.toFixed(1) || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {faculty.student_satisfaction?.toFixed(1) || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">
                        {getTrendIcon(faculty.improvement_trend)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {faculty.effectiveness_score?.toFixed(1) || 0}%
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resource Allocation */}
          {riskManagement && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Allocation</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Faculty Workload</h4>
                  <div className="space-y-3">
                    {riskManagement?.resource_allocation?.faculty_workload?.map((faculty: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{faculty.teacher}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {faculty.current_load}/{faculty.max_capacity} hours
                          </span>
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                faculty.utilization_percentage > 90 ? 'bg-red-500' :
                                faculty.utilization_percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${faculty.utilization_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{faculty.utilization_percentage?.toFixed(1) || 0}%</span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Resource Requirements</h4>
                  <div className="space-y-3">
                    {riskManagement?.resource_allocation?.resource_requirements?.map((resource: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{resource.resource}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {resource.current_availability}/{resource.required_amount}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(resource.priority)}`}>
                            {resource.priority?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StrategicDashboard
