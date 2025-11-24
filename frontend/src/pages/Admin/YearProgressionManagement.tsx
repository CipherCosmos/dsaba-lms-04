import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../store/store'
import { studentProgressionAPI, batchInstanceAPI, academicYearAPI } from '../../../services/api'
import toast from 'react-hot-toast'
import { 
  TrendingUp, 
  Users, 
  Award, 
  AlertCircle, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface YearStatistics {
  year_level: number
  total_students: number
  detained_students: number
  students_with_backlogs: number
  students_in_good_standing: number
}

interface BatchInstance {
  id: number
  current_year: number
  current_semester: number
  department: { name: string }
  batch: { name: string }
  admission_year: number
  expected_graduation_year: number
}

const YearProgressionDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [selectedYear, setSelectedYear] = useState<number>(1)
  const [statistics, setStatistics] = useState<YearStatistics | null>(null)
  const [batchInstances, setBatchInstances] = useState<BatchInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [promotionInProgress, setPromotionInProgress] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null)

  useEffect(() => {
    fetchStatistics()
    fetchBatchInstances()
  }, [selectedYear, user])

  const fetchStatistics = async () => {
    if (!user?.department_id) return
    
    try {
      const stats = await studentProgressionAPI.getYearStatistics(
        selectedYear,
        user.department_id
      )
      setStatistics(stats)
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchBatchInstances = async () => {
    try {
      const response = await batchInstanceAPI.getAll(0, 100, {
        department_id: user?.department_id,
        is_active: true
      })
      
      // Filter batches that match the selected year level
      const filtered = response.items.filter((batch: BatchInstance) => 
        batch.current_year === selectedYear
      )
      setBatchInstances(filtered)
    } catch (error) {
      console.error('Failed to fetch batch instances:', error)
    }
  }

  const handlePromoteBatch = async (batchInstanceId: number) => {
    if (!window.confirm('Are you sure you want to promote this entire batch to the next year?')) {
      return
    }

    setPromotionInProgress(true)
    try {
      // Get current academic year
      const academicYears = await academicYearAPI.getAll(0, 10, { is_active: true })
      const currentYear = academicYears.items.find((ay: any) => ay.is_active)
      
      if (!currentYear) {
        toast.error('No active academic year found')
        return
      }

      const result = await studentProgressionAPI.promoteBatch(batchInstanceId, {
        academic_year_id: currentYear.id,
        auto_promote_eligible: true,
        force_all: false
      })

      toast.success(
        `Batch promoted! ${result.promoted_count} students promoted, ${result.failed_count} failed eligibility`
      )
      
      // Refresh data
      await fetchStatistics()
      await fetchBatchInstances()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to promote batch')
    } finally {
      setPromotionInProgress(false)
    }
  }

  const getYearColor = (year: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500'
    ]
    return colors[year - 1] || 'bg-gray-500'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Year Progression Management
        </h1>
        <p className="text-gray-600">
          Manage student promotions and year-level progression
        </p>
      </div>

      {/* Year Level Selector */}
      <div className="mb-6 flex gap-3">
        {[1, 2, 3, 4].map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedYear === year
                ? `${getYearColor(year)} text-white shadow-lg`
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Year {year}
          </button>
        ))}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total_students}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Good Standing</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.students_in_good_standing}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">With Backlogs</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.students_with_backlogs}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Detained</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.detained_students}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Batch Instances */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Batches in Year {selectedYear}
        </h2>

        {batchInstances.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No batches in Year {selectedYear}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {batchInstances.map((batch) => (
              <div
                key={batch.id}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {batch.batch.name} - {batch.department.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Admission Year: {batch.admission_year} | 
                      Current Semester: {batch.current_semester} |
                      Expected Graduation: {batch.expected_graduation_year}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePromoteBatch(batch.id)}
                      disabled={promotionInProgress || selectedYear === 4}
                      className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                        selectedYear === 4
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                      }`}
                    >
                      {promotionInProgress ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Promoting...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          Promote to Year {selectedYear + 1}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Award className="w-5 h-5" />
          How Promotion Works
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
          <li>Students are automatically checked for eligibility (CGPA, backlogs, attendance)</li>
          <li>Eligible students are promoted to the next year level</li>
          <li>Ineligible students remain in their current year</li>
          <li>Detained students must be manually cleared before promotion</li>
          <li>Year 4 students graduate and are not promoted further</li>
        </ul>
      </div>
    </div>
  )
}

export default YearProgressionDashboard
