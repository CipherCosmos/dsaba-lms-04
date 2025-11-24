import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { 
  Building, Users, GraduationCap, TrendingUp, TrendingDown, 
  Award, AlertTriangle, BookOpen, Target, BarChart3 
} from 'lucide-react'

// HOD Analytics API (add to api.ts)
const hodAnalyticsAPI = {
  getDashboard: async (departmentId: number, academicYearId?: number) => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {}
    const response = await fetch(`/api/v1/hod-analytics/dashboard/${departmentId}?${new URLSearchParams(params as any)}`)
    return response.json()
  }
}

const HODDepartmentDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null)

  // In real scenario, department_id would come from user profile
  const departmentId = 1 // Replace with actual department ID from user

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const data = await hodAnalyticsAPI.getDashboard(departmentId)
      setDashboard(data)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
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
        <p className="text-gray-600">No department data available</p>
      </div>
    )
  }

  const { overview, batch_performance, faculty_stats, top_subjects, weak_areas } = dashboard

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Department Analytics</h1>
        <p className="text-gray-600 mt-1">
          {dashboard.department_info.name} ({dashboard.department_info.code})
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Students</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.total_students}</p>
          <div className="mt-2 text-xs space-y-1">
            <p className="text-green-600">✓ {overview.students_in_good_standing} in good standing</p>
            <p className="text-red-600">⚠ {overview.detained_students} detained</p>
            <p className="text-orange-600">📚 {overview.students_with_backlogs} with backlogs</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Department Average</p>
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.department_average}%</p>
          <p className="text-sm text-gray-600 mt-2">
            Pass Rate: {overview.pass_rate}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Faculty</p>
            <GraduationCap className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.total_faculty}</p>
          <p className="text-sm text-gray-600 mt-2">
            Active Teachers
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Batches</p>
            <Building className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview.active_batches}</p>
          <p className="text-sm text-gray-600 mt-2">
            Ongoing Programs
          </p>
        </div>
      </div>

      {/* Batch Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Batch Performance Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Batch</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Year</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Students</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Average</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Pass Rate</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Detained</th>
              </tr>
            </thead>
            <tbody>
              {batch_performance.map((batch: any, idx: number) => (
                <tr key={batch.batch_id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{batch.admission_year} Admission</td>
                  <td className="p-3">Year {batch.current_year}</td>
                  <td className="p-3 font-medium">{batch.total_students}</td>
                  <td className="p-3">
                    <span className={`font-bold ${
                      batch.average_percentage >= 70 ? 'text-green-600' :
                      batch.average_percentage >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {batch.average_percentage}%
                    </span>
                  </td>
                  <td className="p-3">{batch.pass_rate}%</td>
                  <td className="p-3">
                    {batch.detained > 0 ? (
                      <span className="text-red-600 font-medium">{batch.detained}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Faculty Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-purple-600" />
          Faculty Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faculty_stats.map((faculty: any) => (
            <div key={faculty.teacher_id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{faculty.name}</p>
                  <p className="text-sm text-gray-600">{faculty.total_classes} classes</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    faculty.average_class_performance >= 70 ? 'text-green-600' :
                    faculty.average_class_performance >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {faculty.average_class_performance}%
                  </p>
                  <p className="text-xs text-gray-500">Class Avg</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pass Rate: {faculty.pass_rate}%</span>
                <span className="text-gray-600">{faculty.marks_entered} marks</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top & Weak Subjects in Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performing Subjects */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Top Performing Subjects
          </h2>
          <div className="space-y-2">
            {top_subjects.slice(0, 5).map((subject: any, idx: number) => (
              <div key={subject.subject_id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{subject.subject_name}</p>
                  <p className="text-sm text-gray-600">{subject.subject_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{subject.average_percentage}%</p>
                  <p className="text-xs text-gray-500">{subject.total_assessments} assessments</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Areas */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Areas Needing Improvement
          </h2>
          <div className="space-y-3">
            {weak_areas.slice(0, 5).map((subject: any) => (
              <div key={subject.subject_id} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{subject.subject_name}</p>
                    <p className="text-sm text-gray-600">{subject.subject_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{subject.average_percentage}%</p>
                    <p className="text-xs text-red-500">↓ {subject.improvement_needed}% below target</p>
                  </div>
                </div>
                <p className="text-xs text-red-700 italic">
                  💡 {subject.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-3">Department Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-700 font-semibold mb-2">Strengths</p>
            <ul className="space-y-1 text-blue-900">
              <li>✓ {overview.pass_rate}% overall pass rate</li>
              <li>✓ {top_subjects.length} high-performing subjects</li>
              <li>✓ {overview.total_faculty} active faculty members</li>
            </ul>
          </div>
          <div>
            <p className="text-blue-700 font-semibold mb-2">Areas of Concern</p>
            <ul className="space-y-1 text-blue-900">
              {overview.detained_students > 0 && (
                <li>⚠ {overview.detained_students} detained students</li>
              )}
              {overview.students_with_backlogs > 0 && (
                <li>⚠ {overview.students_with_backlogs} students with backlogs</li>
              )}
              {weak_areas.length > 0 && (
                <li>⚠ {weak_areas.length} subjects below target</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-blue-700 font-semibold mb-2">Recommendations</p>
            <ul className="space-y-1 text-blue-900">
              <li>→ Focus on weak subjects</li>
              <li>→ Support faculty with lower pass rates</li>
              <li>→ Implement retention strategies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HODDepartmentDashboard
