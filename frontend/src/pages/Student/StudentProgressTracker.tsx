import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../store/store'
import { studentProgressionAPI } from '../../../services/api'
import { TrendingUp, Award, AlertCircle, Calendar, BookOpen } from 'lucide-react'

interface ProgressionRecord {
  id: number
  from_year_level: number
  to_year_level: number
  promotion_date: string
  promotion_type: string
  cgpa: number | null
  sgpa: number | null
  backlogs_count: number
  notes: string | null
}

const StudentProgressTracker: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [history, setHistory] = useState<ProgressionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState<number>(1)
  const [expectedGraduation, setExpectedGraduation] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchProgressionHistory()
    }
  }, [user])

  const fetchProgressionHistory = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const data = await studentProgressionAPI.getProgressionHistory(user.id)
      setHistory(data)
      
      // Determine current year from latest progression or default to 1
      if (data.length > 0) {
        const latest = data[0]
        setCurrentYear(latest.to_year_level)
      }
    } catch (error) {
      console.error('Failed to fetch progression history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPromotionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      regular: 'bg-green-100 text-green-800',
      repeat: 'bg-yellow-100 text-yellow-800',
      detained: 'bg-red-100 text-red-800',
      promoted_with_backlogs: 'bg-orange-100 text-orange-800',
      manual_override: 'bg-blue-100 text-blue-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getPromotionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regular: 'Regular Promotion',
      repeat: 'Repeat Year',
      detained: 'Detained',
      promoted_with_backlogs: 'Promoted (With Backlogs)',
      manual_override: 'Special Promotion'
    }
    return labels[type] || type
  }

  const yearLevels = [1, 2, 3, 4]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Academic Progress
        </h1>
        <p className="text-gray-600">
          Track your year-wise progression through your academic journey
        </p>
      </div>

      {/* Current Status Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 mb-2">Current Year Level</p>
            <p className="text-5xl font-bold">Year {currentYear}</p>
            {expectedGraduation && (
              <p className="mt-4 text-blue-100 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Expected Graduation: {expectedGraduation}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-blue-100 mb-2">Progress</p>
            <div className="flex gap-2">
              {yearLevels.map((year) => (
                <div
                  key={year}
                  className={`w-16 h-16 rounded-lg flex items-center justify-center text-lg font-bold ${
                    year <= currentYear
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500/30 text-blue-200'
                  }`}
                >
                  {year}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progression Timeline */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Progression History
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading progression history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No progression history yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Your promotion history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((record, index) => (
              <div
                key={record.id}
                className="relative pl-8 pb-8 border-l-2 border-gray-200 last:pb-0 last:border-l-0"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white"></div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Year {record.from_year_level} → Year {record.to_year_level}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(record.promotion_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getPromotionTypeColor(
                        record.promotion_type
                      )}`}
                    >
                      {getPromotionTypeLabel(record.promotion_type)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {record.cgpa !== null && (
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">CGPA</p>
                        <p className="text-2xl font-bold text-gray-900">{record.cgpa.toFixed(2)}</p>
                      </div>
                    )}
                    
                    {record.sgpa !== null && (
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">SGPA</p>
                        <p className="text-2xl font-bold text-gray-900">{record.sgpa.toFixed(2)}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Backlogs</p>
                      <p className={`text-2xl font-bold ${
                        record.backlogs_count > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {record.backlogs_count}
                      </p>
                    </div>
                  </div>

                  {record.notes && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Note:</strong> {record.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Information Card */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Academic Progression Information
        </h3>
        <ul className="text-sm text-yellow-800 space-y-1 ml-6 list-disc">
          <li>Your academic year progresses from Year 1 through Year 4</li>
          <li>Promotion to the next year depends on CGPA, backlogs, and attendance</li>
          <li>Each year consists of 2 semesters</li>
          <li>Clear all backlogs to maintain good academic standing</li>
        </ul>
      </div>
    </div>
  )
}

export default StudentProgressTracker
