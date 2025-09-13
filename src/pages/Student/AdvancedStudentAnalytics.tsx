import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchAdvancedStudentAnalytics } from '../../store/slices/advancedAnalyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { 
  TrendingUp, BookOpen, Star, AlertCircle, Trophy, Users, Zap, Shield, ArrowUp, 
  ArrowDown, Minus, CheckCircle, Clock, BarChart3, Brain, Lightbulb, Target, Download
} from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, 
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

/*
interface PerformanceIntelligence {
  trend_analysis: {
    exam_progression: Array<{
      exam: string
      percentage: number
      predicted: number
      confidence: number
    }>
    improvement_rate: number
    consistency_score: number
  }
  competency_matrix: {
    [key: string]: {
      current: number
      target: number
      trend: 'up' | 'down' | 'stable'
      strength_level: 'weak' | 'moderate' | 'strong'
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
*/

/*
interface PersonalizedInsights {
  risk_assessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    intervention_needed: boolean
    timeline: string
  }
  achievement_tracking: Array<{
    milestone: string
    progress: number
    target: number
    deadline: string
    status: 'completed' | 'in_progress' | 'at_risk'
  }>
  study_recommendations: Array<{
    area: string
    priority: 'high' | 'medium' | 'low'
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
*/

const AdvancedStudentAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { studentAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { } = useSelector((state: RootState) => state.subjects)
  const [activeTab, setActiveTab] = useState('performance')

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAnalytics(user.id))
      dispatch(fetchAdvancedStudentAnalytics(user.id))
    }
    dispatch(fetchSubjects())
  }, [dispatch, user])

  // Use real data from Redux store
  const { 
    studentAnalytics: advancedStudentAnalytics, 
    studentAnalyticsLoading: advancedLoading,
    studentAnalyticsError: advancedError 
  } = useSelector((state: RootState) => state.advancedAnalytics)

  // Extract data from advanced analytics
  const performanceIntelligence = advancedStudentAnalytics?.performance_intelligence || null
  const personalizedInsights = advancedStudentAnalytics?.personalized_insights || null

  /*
  useEffect(() => {
    // Fallback to mock data if real data is not available
    if (!advancedStudentAnalytics && !advancedLoading) {
      setPerformanceIntelligence({
      trend_analysis: {
        exam_progression: [
          { exam: 'Internal 1', percentage: 75, predicted: 78, confidence: 85 },
          { exam: 'Internal 2', percentage: 82, predicted: 85, confidence: 90 },
          { exam: 'Final', percentage: 88, predicted: 90, confidence: 95 }
        ],
        improvement_rate: 15.2,
        consistency_score: 87.5
      },
      competency_matrix: {
        'CO1': { current: 85, target: 80, trend: 'up', strength_level: 'strong' },
        'CO2': { current: 72, target: 80, trend: 'up', strength_level: 'moderate' },
        'CO3': { current: 90, target: 80, trend: 'stable', strength_level: 'strong' },
        'CO4': { current: 65, target: 80, trend: 'down', strength_level: 'weak' }
      },
      subject_proficiency: [
        { subject: 'Data Structures', strength_score: 88, weakness_areas: ['Algorithms'], improvement_potential: 12 },
        { subject: 'Database Systems', strength_score: 75, weakness_areas: ['Normalization', 'Indexing'], improvement_potential: 25 },
        { subject: 'Software Engineering', strength_score: 82, weakness_score: ['Testing'], improvement_potential: 18 }
      ],
      peer_comparison: {
        class_rank: 3,
        percentile: 85,
        above_average: true,
        performance_gap: 12.5
      }
    })

    setPersonalizedInsights({
      risk_assessment: {
        level: 'low',
        factors: ['Consistent improvement', 'Strong CO3 performance'],
        intervention_needed: false,
        timeline: 'Continue current approach'
      },
      achievement_tracking: [
        { milestone: 'Achieve 85% overall', progress: 88, target: 85, deadline: '2024-05-30', status: 'completed' },
        { milestone: 'Top 5 in class', progress: 3, target: 5, deadline: '2024-05-30', status: 'in_progress' },
        { milestone: 'All COs above 70%', progress: 75, target: 100, deadline: '2024-04-30', status: 'in_progress' }
      ],
      study_recommendations: [
        { area: 'CO4 - Advanced Concepts', priority: 'high', action: 'Focus on algorithm optimization', resources: ['Textbook Ch. 8', 'Practice Problems'], estimated_impact: 15 },
        { area: 'Database Normalization', priority: 'medium', action: 'Review normalization rules', resources: ['Online Tutorial', 'Lab Exercises'], estimated_impact: 10 }
      ],
      motivation_metrics: {
        streak_days: 12,
        goals_achieved: 8,
        improvement_rate: 15.2,
        engagement_score: 92
      }
    // })
    // }
  // }, [])
  */


  if (loading || advancedLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (advancedError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-500">Error loading analytics data</p>
        <p className="text-sm text-gray-400">{advancedError}</p>
      </div>
    )
  }

  if (!studentAnalytics && !advancedStudentAnalytics) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
        <p className="text-sm text-gray-400">Complete some exams to see your analytics</p>
      </div>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getStrengthColor = (level: string) => {
    switch (level) {
      case 'strong': return 'text-green-600 bg-green-100'
      case 'moderate': return 'text-yellow-600 bg-yellow-100'
      case 'weak': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'at_risk': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  // Performance Intelligence Charts
  const trendAnalysisData = {
    labels: performanceIntelligence?.trend_analysis.exam_progression.map(p => p.exam) || [],
    datasets: [
      {
        label: 'Actual Performance',
        data: performanceIntelligence?.trend_analysis.exam_progression.map(p => p.percentage) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Predicted Performance',
        data: performanceIntelligence?.trend_analysis.exam_progression.map((p: any) => p.predicted || p.percentage) || [],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        borderDash: [5, 5]
      }
    ]
  }

  const competencyMatrixData = {
    labels: Object.keys(performanceIntelligence?.competency_matrix || {}),
    datasets: [
      {
        label: 'Current Performance',
        data: Object.values(performanceIntelligence?.competency_matrix || {}).map(c => c.current),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Target Performance',
        data: Object.values(performanceIntelligence?.competency_matrix || {}).map(c => c.target),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      }
    ]
  }

  const subjectProficiencyData = {
    labels: performanceIntelligence?.subject_proficiency.map(s => s.subject) || [],
    datasets: [
      {
        label: 'Strength Score',
        data: performanceIntelligence?.subject_proficiency.map(s => s.strength_score) || [],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1
      }
    ]
  }

  const tabs = [
    { id: 'performance', label: 'Performance Intelligence', icon: BarChart3 },
    { id: 'insights', label: 'Personalized Insights', icon: Brain },
    { id: 'recommendations', label: 'Study Recommendations', icon: Lightbulb },
    { id: 'goals', label: 'Goals & Milestones', icon: Target }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Academic Analytics</h1>
          <p className="text-gray-600">AI-powered insights and personalized recommendations</p>
        </div>
        <div className="flex items-center space-x-3">
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

      {/* Performance Intelligence Tab */}
      {activeTab === 'performance' && performanceIntelligence && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Improvement Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    +{performanceIntelligence.trend_analysis.improvement_rate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Consistency Score</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceIntelligence.trend_analysis.consistency_score}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Class Rank</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    #{performanceIntelligence.peer_comparison.class_rank}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Percentile</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceIntelligence.peer_comparison.percentile}th
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Analysis Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trend Analysis</h3>
            <div className="h-80">
              <Line data={trendAnalysisData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Actual vs Predicted Performance' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }} />
            </div>
          </div>

          {/* Competency Matrix */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Competency Matrix</h3>
            <div className="h-80">
              <Bar data={competencyMatrixData} options={{
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

          {/* Competency Details */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">CO Performance Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strength Level</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(performanceIntelligence.competency_matrix).map(([co, data]) => (
                    <tr key={co}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{co}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.current}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.target}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">
                        {getTrendIcon(data.trend)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStrengthColor(data.strength_level)}`}>
                          {data.strength_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subject Proficiency */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subject Proficiency Analysis</h3>
            <div className="h-80">
              <Bar data={subjectProficiencyData} options={{
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
        </div>
      )}

      {/* Personalized Insights Tab */}
      {activeTab === 'insights' && personalizedInsights && (
        <div className="space-y-6">
          {/* Risk Assessment */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-full ${getRiskColor(personalizedInsights.risk_assessment.level)}`}>
                <span className="font-medium">{personalizedInsights.risk_assessment.level.toUpperCase()} RISK</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {personalizedInsights.risk_assessment.intervention_needed 
                    ? 'Intervention needed' 
                    : 'No intervention needed'
                  }
                </p>
                <p className="text-xs text-gray-500">{personalizedInsights.risk_assessment.timeline}</p>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Factors:</h4>
              <div className="flex flex-wrap gap-2">
                {personalizedInsights.risk_assessment.factors.map((factor, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Motivation Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Study Streak</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {personalizedInsights.motivation_metrics.streak_days} days
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Goals Achieved</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {personalizedInsights.motivation_metrics.goals_achieved}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Improvement Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    +{personalizedInsights.motivation_metrics.improvement_rate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Engagement Score</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {personalizedInsights.motivation_metrics.engagement_score}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Study Recommendations Tab */}
      {activeTab === 'recommendations' && personalizedInsights && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personalized Study Recommendations</h3>
            <div className="space-y-4">
              {personalizedInsights.study_recommendations.map((rec, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{rec.area}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(rec.priority)}`}>
                          {rec.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.action}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Estimated Impact: +{rec.estimated_impact}%</span>
                        <span>Resources: {rec.resources.length} available</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Recommended Resources:</h5>
                    <div className="flex flex-wrap gap-2">
                      {rec.resources.map((resource, resIndex) => (
                        <span key={resIndex} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goals & Milestones Tab */}
      {activeTab === 'goals' && personalizedInsights && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Achievement Tracking</h3>
            <div className="space-y-4">
              {personalizedInsights.achievement_tracking.map((goal, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(goal.status)}
                      <h4 className="font-medium text-gray-900">{goal.milestone}</h4>
                    </div>
                    <span className="text-sm text-gray-500">Due: {goal.deadline}</span>
                  </div>
                  <div className="flex items-center space-x-4 mb-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{goal.progress}/{goal.target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            goal.status === 'completed' ? 'bg-green-500' :
                            goal.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedStudentAnalytics
