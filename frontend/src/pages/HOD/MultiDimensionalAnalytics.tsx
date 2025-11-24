import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { analyticsAPI } from '../../services/api'
import { BarChart3, Filter, Download, RefreshCw, TrendingUp, Users, BookOpen, Calendar, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '../../core/utils/logger'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

const MultiDimensionalAnalytics: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { departments } = useSelector((state: RootState) => state.departments)

  const [dimension, setDimension] = useState<'year' | 'semester' | 'subject' | 'class' | 'teacher'>('year')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  useEffect(() => {
    fetchAnalytics()
  }, [dimension, filters])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await analyticsAPI.getMultiDimensionalAnalytics(dimension, filters)
      setAnalyticsData(response)
    } catch (error) {
      logger.error('Error fetching multi-dimensional analytics:', error)
      toast.error('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Structure of multi-dimensional analytics data:
   * Each item in analyticsData.data has optional properties: year, semester, subject_name, class_name, teacher_name
   * and required: avg_total, count
   */
  const chartData = analyticsData ? {
    labels: analyticsData.data.map((item: { year?: number; semester?: number; subject_name?: string; class_name?: string; teacher_name?: string }) => {
      if (dimension === 'year') return item.year
      if (dimension === 'semester') return `Semester ${item.semester}`
      if (dimension === 'subject') return item.subject_name
      if (dimension === 'class') return item.class_name
      if (dimension === 'teacher') return item.teacher_name
      return ''
    }),
    datasets: [
      {
        label: 'Average Total Marks',
        data: analyticsData.data.map((item: { avg_total: number }) => item.avg_total),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  } : null

  const getDimensionIcon = (dim: string) => {
    switch (dim) {
      case 'year': return Calendar
      case 'semester': return Calendar
      case 'subject': return BookOpen
      case 'class': return Users
      case 'teacher': return Award
      default: return BarChart3
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Multi-Dimensional Analytics</h1>
          <p className="text-gray-600">Analyze performance across different dimensions</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'bar' | 'line')}
            className="input-field"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dimension Selector */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Dimension</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(['year', 'semester', 'subject', 'class', 'teacher'] as const).map((dim) => {
            const Icon = getDimensionIcon(dim)
            return (
              <button
                key={dim}
                onClick={() => setDimension(dim)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  dimension === dim
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-6 w-6 mx-auto mb-2 ${
                  dimension === dim ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <p className={`text-sm font-medium ${
                  dimension === dim ? 'text-blue-900' : 'text-gray-700'
                }`}>
                  {dim.charAt(0).toUpperCase() + dim.slice(1)}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimension !== 'year' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={filters.department_id || ''}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    department_id: e.target.value ? Number(e.target.value) : undefined
                  })
                }}
                className="input-field"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {dimension === 'semester' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Instance
              </label>
              <input
                type="number"
                value={filters.batch_instance_id || ''}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    batch_instance_id: e.target.value ? Number(e.target.value) : undefined
                  })
                }}
                placeholder="Batch Instance ID"
                className="input-field"
              />
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      ) : analyticsData && chartData ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {dimension.charAt(0).toUpperCase() + dimension.slice(1)} Analysis
          </h2>
          <div className="h-96">
            {chartType === 'bar' ? (
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            ) : (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No data available for selected dimension</p>
        </div>
      )}

      {/* Data Table */}
      {analyticsData && analyticsData.data && analyticsData.data.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Table</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {dimension.charAt(0).toUpperCase() + dimension.slice(1)}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.data.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dimension === 'year' ? item.year :
                       dimension === 'semester' ? `Semester ${item.semester}` :
                       dimension === 'subject' ? item.subject_name :
                       dimension === 'class' ? item.class_name :
                       item.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.avg_total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiDimensionalAnalytics

