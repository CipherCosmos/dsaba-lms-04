import React, { useState } from 'react'
import { BarChart3, TrendingUp, Users, Target, Brain, Calendar, Award, AlertTriangle, Download } from 'lucide-react'
import {
  useBloomsTaxonomyAnalysis,
  usePerformanceTrends,
  useDepartmentComparison,
  useStudentPerformanceAnalytics,
  useTeacherPerformanceAnalytics,
  useClassPerformanceAnalytics,
  useSubjectAnalyticsEnhanced,
  useDepartmentAnalytics,
  useNBAAccreditationData,
  useCOPOAttainmentSummary,
} from '../../core/hooks'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

export default function EnhancedAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDepartment, setSelectedDepartment] = useState(1) // Default department
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number | undefined>(2024)

  // Enhanced Analytics Hooks
  const { data: bloomsData, isLoading: bloomsLoading } = useBloomsTaxonomyAnalysis(undefined, selectedDepartment)
  const { data: trendsData, isLoading: trendsLoading } = usePerformanceTrends(undefined, undefined, selectedDepartment, 6)
  const { data: deptComparison, isLoading: comparisonLoading } = useDepartmentComparison(selectedAcademicYear)
  const { data: deptAnalytics, isLoading: deptAnalyticsLoading } = useDepartmentAnalytics(selectedDepartment, selectedAcademicYear, true, true)
  const { data: nbaData, isLoading: nbaLoading } = useNBAAccreditationData(selectedDepartment, selectedAcademicYear || 2024)
  const { data: copoSummary, isLoading: copoLoading } = useCOPOAttainmentSummary(selectedDepartment, selectedAcademicYear)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'blooms', label: 'Bloom\'s Taxonomy', icon: Brain },
    { id: 'trends', label: 'Performance Trends', icon: TrendingUp },
    { id: 'comparison', label: 'Department Comparison', icon: Users },
    { id: 'nba', label: 'NBA Accreditation', icon: Award },
    { id: 'copo', label: 'CO-PO Analysis', icon: Target },
  ]

  // Chart data for Bloom's Taxonomy
  const bloomsChartData = {
    labels: ['L1 (Remember)', 'L2 (Understand)', 'L3 (Apply)', 'L4 (Analyze)', 'L5 (Evaluate)', 'L6 (Create)'],
    datasets: [{
      label: 'Average Performance (%)',
      data: bloomsData ? [
        bloomsData.level_distribution.L1_Remember.average_percentage,
        bloomsData.level_distribution.L2_Understand.average_percentage,
        bloomsData.level_distribution.L3_Apply.average_percentage,
        bloomsData.level_distribution.L4_Analyze.average_percentage,
        bloomsData.level_distribution.L5_Evaluate.average_percentage,
        bloomsData.level_distribution.L6_Create.average_percentage,
      ] : [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    }]
  }

  // Performance trends chart
  const trendsChartData = {
    labels: trendsData?.trends?.map(t => t.month) || [],
    datasets: [{
      label: 'Average Performance (%)',
      data: trendsData?.trends?.map(t => t.average_percentage) || [],
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }

  // Department comparison chart
  const comparisonChartData = {
    labels: deptComparison?.departments?.map(d => d.department_code) || [],
    datasets: [{
      label: 'Average Performance (%)',
      data: deptComparison?.departments?.map(d => d.average_performance) || [],
      backgroundColor: 'rgba(168, 85, 247, 0.8)',
      borderColor: 'rgba(168, 85, 247, 1)',
      borderWidth: 1
    }]
  }

  if (bloomsLoading || trendsLoading || comparisonLoading || deptAnalyticsLoading || nbaLoading || copoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 animate-pulse text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading enhanced analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            Enhanced Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Advanced analytics with Bloom's taxonomy, performance trends, and accreditation insights
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Download className="h-5 w-5" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>Computer Science</option>
              <option value={2}>Information Technology</option>
              <option value={3}>Electronics</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear || ''}
              onChange={(e) => setSelectedAcademicYear(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Years</option>
              <option value={2024}>2023-24</option>
              <option value={2023}>2022-23</option>
              <option value={2022}>2021-22</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium opacity-90">Bloom's Balance</div>
            <Brain className="h-6 w-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2">
            {bloomsData ? Math.round(Object.values(bloomsData.level_distribution).reduce((sum, level) => sum + level.average_percentage, 0) / 6) : 0}%
          </div>
          <div className="text-sm opacity-90">Average across all levels</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium opacity-90">Performance Trend</div>
            <TrendingUp className="h-6 w-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2 capitalize">
            {trendsData?.summary?.trend_direction || 'Stable'}
          </div>
          <div className="text-sm opacity-90">
            {trendsData?.summary?.total_months || 0} months analyzed
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium opacity-90">Department Rank</div>
            <Users className="h-6 w-6 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-2">
            #{deptComparison?.departments?.findIndex(d => d.department_id === selectedDepartment) + 1 || 'N/A'}
          </div>
          <div className="text-sm opacity-90">
            Out of {deptComparison?.departments?.length || 0} departments
          </div>
        </div>

        <div className={`rounded-lg p-6 shadow-lg text-white ${nbaData?.nba_compliance_status === 'compliant' ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium opacity-90">NBA Status</div>
            <Award className="h-6 w-6 opacity-80" />
          </div>
          <div className="text-2xl font-bold mb-2">
            {nbaData?.nba_compliance_status?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div className="text-sm opacity-90">
            {nbaData?.overall_attainment?.toFixed(1) || 0}% attainment
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {bloomsData && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Bloom's Taxonomy Distribution</h3>
                    <div className="h-80">
                      <Bar data={bloomsChartData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } },
                        scales: { y: { beginAtZero: true, max: 100 } }
                      }} />
                    </div>
                  </div>
                )}

                {trendsData && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends (6 Months)</h3>
                    <div className="h-80">
                      <Line data={trendsChartData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } },
                        scales: { y: { beginAtZero: true, max: 100 } }
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {deptAnalytics && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Analytics Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {deptAnalytics.overall_performance.avg_sgpa?.toFixed(2) || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Average SGPA</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {deptAnalytics.overall_performance.pass_rate?.toFixed(1) || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Pass Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {deptAnalytics.overall_performance.total_students || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Students</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bloom's Taxonomy Tab */}
          {activeTab === 'blooms' && bloomsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cognitive Level Performance</h3>
                  <div className="h-80">
                    <Bar data={bloomsChartData} />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Level Details</h3>
                  <div className="space-y-4">
                    {Object.entries(bloomsData.level_distribution).map(([level, data]) => (
                      <div key={level} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-gray-900">{data.level_name}</div>
                          <div className="text-sm text-gray-600">{data.total_attempts} attempts</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{data.average_percentage.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">Pass rate: {data.pass_rate.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Trends Tab */}
          {activeTab === 'trends' && trendsData && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends Analysis</h3>
                <div className="h-80 mb-6">
                  <Line data={trendsChartData} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{trendsData.summary.overall_average.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Overall Average</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600 capitalize">{trendsData.summary.trend_direction}</div>
                    <div className="text-sm text-gray-600">Trend Direction</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">{trendsData.summary.total_months}</div>
                    <div className="text-sm text-gray-600">Months Analyzed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Department Comparison Tab */}
          {activeTab === 'comparison' && deptComparison && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance Comparison</h3>
                <div className="h-80 mb-6">
                  <Bar data={comparisonChartData} />
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deptComparison.departments.map((dept, index) => (
                        <tr key={dept.department_id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">#{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{dept.department_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{dept.average_performance?.toFixed(1) || 0}%</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{dept.pass_rate?.toFixed(1) || 0}%</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{dept.student_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* NBA Accreditation Tab */}
          {activeTab === 'nba' && nbaData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{nbaData.co_attainment_summary.overall_attainment.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">CO Attainment</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{nbaData.po_attainment_summary.overall_attainment.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">PO Attainment</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{nbaData.overall_attainment.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Overall Attainment</div>
                </div>
                <div className={`rounded-lg border border-gray-200 p-6 text-center ${nbaData.nba_compliance_status === 'compliant' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-3xl font-bold mb-2 ${nbaData.nba_compliance_status === 'compliant' ? 'text-green-600' : 'text-red-600'}`}>
                    {nbaData.nba_compliance_status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">Compliance Status</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Accreditation Recommendations</h3>
                <div className="space-y-3">
                  {nbaData.recommendations?.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-blue-800">{rec}</p>
                    </div>
                  )) || []}
                </div>
              </div>
            </div>
          )}

          {/* CO-PO Analysis Tab */}
          {activeTab === 'copo' && copoSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-2">{copoSummary.overall_co_attainment.toFixed(1)}%</div>
                  <div className="text-sm opacity-90">CO Attainment</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-2">{copoSummary.overall_po_attainment.toFixed(1)}%</div>
                  <div className="text-sm opacity-90">PO Attainment</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-2">{copoSummary.co_attainments.length}</div>
                  <div className="text-sm opacity-90">COs Analyzed</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-6 text-white">
                  <div className="text-3xl font-bold mb-2">{copoSummary.po_attainments.length}</div>
                  <div className="text-sm opacity-90">POs Analyzed</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">CO-PO Attainment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Course Outcomes</h4>
                    <div className="space-y-2">
                      {copoSummary.co_attainments.slice(0, 5).map((co) => (
                        <div key={co.co_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{co.co_code}</span>
                          <span className={`text-sm font-bold ${co.attainment_met ? 'text-green-600' : 'text-red-600'}`}>
                            {co.actual_attainment.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Program Outcomes</h4>
                    <div className="space-y-2">
                      {copoSummary.po_attainments.slice(0, 5).map((po) => (
                        <div key={po.po_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{po.po_code}</span>
                          <span className={`text-sm font-bold ${po.attainment_met ? 'text-green-600' : 'text-red-600'}`}>
                            {po.actual_attainment.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}