import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { analyticsAPI } from '../../services/api'
import { Brain, Filter, Download, RefreshCw, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '../../core/utils/logger'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const BloomsAnalytics: React.FC = () => {
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { exams } = useSelector((state: RootState) => state.exams)
  const { user } = useSelector((state: RootState) => state.auth)

  const [selectedExamId, setSelectedExamId] = useState<number | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [bloomsData, setBloomsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedExamId || selectedSubjectId) {
      fetchBloomsAnalysis()
    }
  }, [selectedExamId, selectedSubjectId])

  const fetchBloomsAnalysis = async () => {
    try {
      setLoading(true)
      const response = await analyticsAPI.getBloomsAnalysis(selectedExamId || undefined, selectedSubjectId || undefined)
      setBloomsData(response)
    } catch (error) {
      logger.error('Error fetching Bloom\'s analysis:', error)
      toast.error('Failed to fetch Bloom\'s analysis')
    } finally {
      setLoading(false)
    }
  }

  const chartData = bloomsData ? {
    labels: Object.keys(bloomsData.blooms_levels || {}),
    datasets: [
      {
        data: Object.values(bloomsData.blooms_levels || {}),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // L1 - Remember (Red)
          'rgba(245, 158, 11, 0.8)',   // L2 - Understand (Orange)
          'rgba(59, 130, 246, 0.8)',   // L3 - Apply (Blue)
          'rgba(16, 185, 129, 0.8)',   // L4 - Analyze (Green)
          'rgba(139, 92, 246, 0.8)',   // L5 - Evaluate (Purple)
          'rgba(236, 72, 153, 0.8)',   // L6 - Create (Pink)
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 2,
      },
    ],
  } : null

  const bloomsLabels: { [key: string]: string } = {
    'L1': 'Remember',
    'L2': 'Understand',
    'L3': 'Apply',
    'L4': 'Analyze',
    'L5': 'Evaluate',
    'L6': 'Create',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bloom's Taxonomy Analysis</h1>
          <p className="text-gray-600">Analyze cognitive level distribution in questions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchBloomsAnalysis}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Subject
            </label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)
                setSelectedExamId(null)
              }}
              className="input-field"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Exam
            </label>
            <select
              value={selectedExamId || ''}
              onChange={(e) => {
                setSelectedExamId(e.target.value ? Number(e.target.value) : null)
                setSelectedSubjectId(null)
              }}
              className="input-field"
            >
              <option value="">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      ) : bloomsData && chartData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribution</h2>
            <div className="h-64">
              <Doughnut
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const label = bloomsLabels[context.label] || context.label
                          const value = context.parsed
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                          const percentage = ((value / total) * 100).toFixed(1)
                          return `${label}: ${value} (${percentage}%)`
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(bloomsData.blooms_levels || {}).map(([level, count]: [string, any]) => {
                const percentage = ((count / bloomsData.total) * 100).toFixed(1)
                return (
                  <div key={level} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        level === 'L1' ? 'bg-red-500' :
                        level === 'L2' ? 'bg-orange-500' :
                        level === 'L3' ? 'bg-blue-500' :
                        level === 'L4' ? 'bg-green-500' :
                        level === 'L5' ? 'bg-purple-500' :
                        'bg-pink-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {bloomsLabels[level] || level}
                        </p>
                        <p className="text-sm text-gray-600">{level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{count}</p>
                      <p className="text-sm text-gray-600">{percentage}%</p>
                    </div>
                  </div>
                )
              })}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">Total Questions</p>
                  <p className="font-semibold text-gray-900">{bloomsData.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a filter to view Bloom's taxonomy analysis</p>
        </div>
      )}
    </div>
  )
}

export default BloomsAnalytics

