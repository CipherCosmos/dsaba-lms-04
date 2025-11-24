import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { studentAnalyticsAPI } from '../../services/api'
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, BookOpen, BarChart3 } from 'lucide-react'

const StudentPerformanceDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (user?.student_profile?.id) {
      fetchDashboard()
    }
  }, [user, selectedSemester])

  const fetchDashboard = async () => {
    if (!user?.student_profile?.id) return
    
    setLoading(true)
    try {
      const data = await studentAnalyticsAPI.getDashboard(user.student_profile.id, selectedSemester)
      setDashboard(data)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'O': 'text-green-600 bg-green-100',
      'A+': 'text-blue-600 bg-blue-100',
      'A': 'text-blue-500 bg-blue-50',
      'B+': 'text-yellow-600 bg-yellow-100',
      'B': 'text-yellow-500 bg-yellow-50',
      'C': 'text-orange-600 bg-orange-100',
      'F': 'text-red-600 bg-red-100'
    }
    return colors[grade] || 'text-gray-600 bg-gray-100'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-600" />
    if (trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />
    return <BarChart3 className="w-5 h-5 text-gray-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No performance data available</p>
      </div>
    )
  }

  const { overview, component_breakdown, subject_performance, trends, strengths_weaknesses } = dashboard

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Semester {dashboard.student_info.current_semester_id} • Year {dashboard.student_info.current_year}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">SGPA</p>
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.sgpa}</p>
          <p className={`text-sm mt-2 px-2 py-1 rounded inline-block ${getGradeColor(overview.grade)}`}>
            Grade: {overview.grade}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Percentage</p>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.percentage}%</p>
          <p className="text-sm text-gray-600 mt-2">
            Class Avg: {overview.class_average}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Class Rank</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.rank || 'N/A'}</p>
          <p className="text-sm text-gray-600 mt-2">
            of {overview.total_students} students
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Trend</p>
            {getTrendIcon(trends.trend)}
          </div>
          <p className="text-xl font-semibold text-gray-900 capitalize">{trends.trend}</p>
          <p className="text-sm text-gray-600 mt-2">
            {trends.semesters.length} semesters
          </p>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Assessment Component Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(component_breakdown).map(([component, data]: [string, any]) => (
            <div key={component} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{component.toUpperCase()}</h3>
                <span className={`px-2 py-1 rounded text-sm ${getGradeColor(data.grade)}`}>
                  {data.grade}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{data.percentage}%</p>
                <p className="text-sm text-gray-600">
                  {data.obtained} / {data.maximum} marks
                </p>
                <p className="text-xs text-gray-500">{data.count} assessments</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Subject-wise Performance
        </h2>
        <div className="space-y-3">
          {subject_performance.map((subject: any) => (
            <div key={subject.subject_id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{subject.subject_name}</h3>
                  <p className="text-sm text-gray-600">{subject.subject_code} • {subject.credits} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{subject.percentage}%</p>
                  <span className={`px-2 py-1 rounded text-sm inline-block ${getGradeColor(subject.grade)}`}>
                    {subject.grade}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>{subject.obtained} / {subject.maximum} marks</span>
                <span>•</span>
                <span>{subject.assessments_count} assessments</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Strengths
          </h2>
          {strengths_weaknesses.strengths.length > 0 ? (
            <ul className="space-y-2">
              {strengths_weaknesses.strengths.map((strength: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <div>
                    <p className="font-medium text-green-900">{strength.name}</p>
                    <p className="text-sm text-green-700">
                      {strength.percentage}% • Grade {strength.grade}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-700">Keep working to identify your strengths!</p>
          )}
        </div>

        {/* Weaknesses */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Areas for Improvement
          </h2>
          {strengths_weaknesses.weaknesses.length > 0 ? (
            <ul className="space-y-3">
              {strengths_weaknesses.weaknesses.map((weakness: any, idx: number) => (
                <li key={idx} className="border-b border-red-200 pb-2 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 mt-1">!</span>
                    <div className="flex-1">
                      <p className="font-medium text-red-900">{weakness.name}</p>
                      <p className="text-sm text-red-700">
                        {weakness.percentage}% • Grade {weakness.grade}
                      </p>
                      {weakness.suggestion && (
                        <p className="text-sm text-red-600 mt-1 italic">
                          💡 {weakness.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-700">Great! No major weaknesses identified.</p>
          )}
        </div>
      </div>

      {/* Overall Recommendation */}
      {strengths_weaknesses.overall_recommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900">
            <strong>Recommendation:</strong> {strengths_weaknesses.overall_recommendation}
          </p>
        </div>
      )}
    </div>
  )
}

export default StudentPerformanceDashboard
