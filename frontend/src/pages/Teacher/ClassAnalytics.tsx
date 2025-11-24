import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { teacherAnalyticsAPI } from '../../services/api'
import { 
  Users, TrendingUp, AlertTriangle, Award, BarChart3, 
  ChevronDown, ChevronUp, FileText, Target 
} from 'lucide-react'

const TeacherClassAnalytics: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [dashboard, setDashboard] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [classPerformance, setClassPerformance] = useState<any>(null)
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null)

  useEffect(() => {
    if (user?.teacher_profile?.id) {
      fetchDashboard()
      fetchAtRiskStudents()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      fetchClassPerformance(selectedClass)
    }
  }, [selectedClass])

  const fetchDashboard = async () => {
    if (!user?.teacher_profile?.id) return
    
    try {
      const data = await teacherAnalyticsAPI.getDashboard(user.teacher_profile.id)
      setDashboard(data)
      
      // Auto-select first class
      if (data.class_analytics && data.class_analytics.length > 0) {
        setSelectedClass(data.class_analytics[0].assignment_id)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    }
  }

  const fetchClassPerformance = async (assignmentId: number) => {
    try {
      const data = await teacherAnalyticsAPI.getClassPerformance(assignmentId)
      setClassPerformance(data)
    } catch (error) {
      console.error('Failed to fetch class performance:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAtRiskStudents = async () => {
    if (!user?.teacher_profile?.id) return
    
    try {
      const data = await teacherAnalyticsAPI.getAtRiskStudents(user.teacher_profile.id, 40.0)
      setAtRiskStudents(data.at_risk_students || [])
    } catch (error) {
      console.error('Failed to fetch at-risk students:', error)
    }
  }

  const getRiskColor = (level: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-100 text-red-800 border-red-300',
      'high': 'bg-orange-100 text-orange-800 border-orange-300',
      'moderate': 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return colors[level] || 'bg-gray-100 text-gray-800'
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'O': 'bg-green-600 text-white',
      'A+': 'bg-blue-600 text-white',
      'A': 'bg-blue-500 text-white',
      'B+': 'bg-yellow-600 text-white',
      'B': 'bg-yellow-500 text-white',
      'C': 'bg-orange-600 text-white',
      'F': 'bg-red-600 text-white'
    }
    return colors[grade] || 'bg-gray-500 text-white'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboard || !classPerformance) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No class data available</p>
      </div>
    )
  }

  const { statistics, distribution, top_performers, bottom_performers } = classPerformance

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Class Analytics</h1>
        <p className="text-gray-600 mt-1">Monitor performance and identify students who need support</p>
      </div>

      {/* Class Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
        <select
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(Number(e.target.value))}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {dashboard.class_analytics.map((cls: any) => (
            <option key={cls.assignment_id} value={cls.assignment_id}>
              {cls.subject_name} - {cls.subject_code}
            </option>
          ))}
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average</p>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics.average_percentage}%</p>
          <p className="text-sm text-gray-600 mt-1">Class Average</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pass Rate</p>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics.pass_percentage}%</p>
          <p className="text-sm text-gray-600 mt-1">
            {statistics.passing_students}/{classPerformance.total_students} students
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Highest</p>
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics.highest_percentage}%</p>
          <p className="text-sm text-gray-600 mt-1">Top Score</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">At Risk</p>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{statistics.failing_students}</p>
          <p className="text-sm text-gray-600 mt-1">Need Attention</p>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Grade Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {Object.entries(distribution).map(([grade, count]: [string, any]) => (
            <div key={grade} className="text-center">
              <div className={`${getGradeColor(grade)} rounded-lg p-4 mb-2`}>
                <p className="text-2xl font-bold">{count}</p>
              </div>
              <p className="text-sm font-medium text-gray-700">Grade {grade}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Top Performers
          </h2>
          <div className="space-y-2">
            {top_performers.map((student: any, idx: number) => (
              <div key={student.student_id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-green-600">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{student.roll_no}</p>
                    <p className="text-sm text-gray-600">
                      {student.obtained}/{student.maximum} marks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{student.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Need Attention
          </h2>
          <div className="space-y-2">
            {bottom_performers.map((student: any, idx: number) => (
              <div key={student.student_id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{student.roll_no}</p>
                  <p className="text-sm text-gray-600">
                    {student.obtained}/{student.maximum} marks
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{student.percentage}%</p>
                  {student.percentage < 40 && (
                    <p className="text-xs text-red-500 font-medium">FAILING</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Students Across All Classes */}
      {atRiskStudents.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            At-Risk Students (All Classes)
          </h2>
          <div className="space-y-3">
            {atRiskStudents.map((student: any) => (
              <div 
                key={`${student.student_id}-${student.subject_code}`}
                className={`border rounded-lg p-4 ${getRiskColor(student.risk_level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-bold text-lg">{student.roll_no}</p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        student.risk_level === 'critical' ? 'bg-red-600 text-white' :
                        student.risk_level === 'high' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {student.risk_level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {student.subject_name} ({student.subject_code})
                    </p>
                    <p className="text-sm mb-2">
                      Current: {student.current_percentage}% • {student.marks_obtained}/{student.max_marks} marks
                    </p>
                    <p className="text-sm italic">
                      💡 {student.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Teaching Stats */}
      {dashboard.overall_stats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">Overall Teaching Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-700">Total Classes</p>
              <p className="text-2xl font-bold text-blue-900">{dashboard.overall_stats.total_classes}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Total Students</p>
              <p className="text-2xl font-bold text-blue-900">{dashboard.overall_stats.total_students}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Average Performance</p>
              <p className="text-2xl font-bold text-blue-900">{dashboard.overall_stats.average_class_performance}%</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Overall Pass Rate</p>
              <p className="text-2xl font-bold text-blue-900">{dashboard.overall_stats.overall_pass_rate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherClassAnalytics
