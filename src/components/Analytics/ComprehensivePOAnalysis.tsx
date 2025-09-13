import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchComprehensivePOAnalysis } from '../../store/slices/advancedAnalyticsSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { 
  AlertTriangle, Layers, TrendingUp, BarChart3
} from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, 
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

interface POStrengthMapping {
  po_code: string
  po_title: string
  po_type: 'PO' | 'PSO'
  strength_mapping: {
    [co_code: string]: {
      strength: number
      contribution: number
      co_title: string
    }
  }
  direct_attainment: number
  indirect_attainment: number
  total_attainment: number
  target_attainment: number
  gap: number
  level: string
}

interface IndirectAttainmentIntegration {
  po_code: string
  po_title: string
  indirect_sources: Array<{
    source: string
    value: number
    weight: number
    contribution: number
    description: string
  }>
  total_indirect: number
  direct_weight: number
  indirect_weight: number
}

interface POGapAnalysis {
  po_code: string
  po_title: string
  current_attainment: number
  target_attainment: number
  gap: number
  gap_percentage: number
  gap_status: 'exceeds' | 'meets' | 'below' | 'critical'
  improvement_required: number
  timeline: string
  priority: 'high' | 'medium' | 'low'
}

interface ContributingCOIdentification {
  po_code: string
  po_title: string
  contributing_cos: Array<{
    co_code: string
    co_title: string
    strength: number
    co_attainment: number
    contribution_value: number
    contribution_percentage: number
  }>
  total_contribution: number
  strongest_contributor: string
  weakest_contributor: string
}

const ComprehensivePOAnalysis: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('strength_mapping')
  const [poStrengthMapping, setPOStrengthMapping] = useState<POStrengthMapping[]>([])
  const [indirectAttainment, setIndirectAttainment] = useState<IndirectAttainmentIntegration[]>([])
  const [poGapAnalysis, setPOGapAnalysis] = useState<POGapAnalysis[]>([])
  const [contributingCOs, setContributingCOs] = useState<ContributingCOIdentification[]>([])

  const { 
    comprehensivePOAnalysis, 
    comprehensivePOAnalysisLoading, 
    comprehensivePOAnalysisError 
  } = useSelector((state: RootState) => state.advancedAnalytics)

  // Use real data from Redux store
  const realPOStrengthMapping = comprehensivePOAnalysis?.po_strength_mapping || []
  const realIndirectAttainment = comprehensivePOAnalysis?.indirect_attainment || []
  const realPOGapAnalysis = comprehensivePOAnalysis?.po_gap_analysis || []
  const realContributingCOs = comprehensivePOAnalysis?.contributing_cos || []

  useEffect(() => {
    if (selectedSubject) {
      dispatch(fetchComprehensivePOAnalysis(selectedSubject))
    }
  }, [dispatch, selectedSubject])

  useEffect(() => {
    // Fallback to mock data if real data is not available
    if (!comprehensivePOAnalysis && !comprehensivePOAnalysisLoading) {
      setPOStrengthMapping([
      {
        po_code: 'PO1',
        po_title: 'Engineering Knowledge',
        po_type: 'PO',
        strength_mapping: {
          'CO1': { strength: 3, contribution: 25.5, co_title: 'Understand fundamental concepts' },
          'CO2': { strength: 2, contribution: 15.2, co_title: 'Apply knowledge to solve problems' },
          'CO3': { strength: 3, contribution: 27.0, co_title: 'Analyze and evaluate solutions' },
          'CO4': { strength: 1, contribution: 8.5, co_title: 'Create innovative solutions' }
        },
        direct_attainment: 76.2,
        indirect_attainment: 82.5,
        total_attainment: 78.4,
        target_attainment: 75,
        gap: 3.4,
        level: 'L2'
      },
      {
        po_code: 'PO2',
        po_title: 'Problem Analysis',
        po_type: 'PO',
        strength_mapping: {
          'CO1': { strength: 2, contribution: 18.0, co_title: 'Understand fundamental concepts' },
          'CO2': { strength: 3, contribution: 24.3, co_title: 'Apply knowledge to solve problems' },
          'CO3': { strength: 3, contribution: 25.2, co_title: 'Analyze and evaluate solutions' },
          'CO4': { strength: 2, contribution: 13.6, co_title: 'Create innovative solutions' }
        },
        direct_attainment: 81.1,
        indirect_attainment: 78.0,
        total_attainment: 79.6,
        target_attainment: 75,
        gap: 4.6,
        level: 'L2'
      },
      {
        po_code: 'PO3',
        po_title: 'Design/Development of Solutions',
        po_type: 'PO',
        strength_mapping: {
          'CO1': { strength: 1, contribution: 9.5, co_title: 'Understand fundamental concepts' },
          'CO2': { strength: 2, contribution: 16.2, co_title: 'Apply knowledge to solve problems' },
          'CO3': { strength: 2, contribution: 16.8, co_title: 'Analyze and evaluate solutions' },
          'CO4': { strength: 3, contribution: 25.5, co_title: 'Create innovative solutions' }
        },
        direct_attainment: 68.0,
        indirect_attainment: 72.0,
        total_attainment: 69.6,
        target_attainment: 75,
        gap: -5.4,
        level: 'L1'
      },
      {
        po_code: 'PSO1',
        po_title: 'Software Development Skills',
        po_type: 'PSO',
        strength_mapping: {
          'CO1': { strength: 2, contribution: 20.4, co_title: 'Understand fundamental concepts' },
          'CO2': { strength: 3, contribution: 28.8, co_title: 'Apply knowledge to solve problems' },
          'CO3': { strength: 2, contribution: 19.2, co_title: 'Analyze and evaluate solutions' },
          'CO4': { strength: 3, contribution: 30.6, co_title: 'Create innovative solutions' }
        },
        direct_attainment: 99.0,
        indirect_attainment: 85.0,
        total_attainment: 92.0,
        target_attainment: 80,
        gap: 12.0,
        level: 'L3'
      }
    ])

    setIndirectAttainment([
      {
        po_code: 'PO1',
        po_title: 'Engineering Knowledge',
        indirect_sources: [
          { source: 'Course Exit Survey', value: 85, weight: 0.4, contribution: 34.0, description: 'Student self-assessment' },
          { source: 'Employer Feedback', value: 80, weight: 0.3, contribution: 24.0, description: 'Industry feedback' },
          { source: 'Alumni Survey', value: 82, weight: 0.3, contribution: 24.6, description: 'Graduate feedback' }
        ],
        total_indirect: 82.6,
        direct_weight: 0.7,
        indirect_weight: 0.3
      },
      {
        po_code: 'PO2',
        po_title: 'Problem Analysis',
        indirect_sources: [
          { source: 'Course Exit Survey', value: 78, weight: 0.4, contribution: 31.2, description: 'Student self-assessment' },
          { source: 'Employer Feedback', value: 82, weight: 0.3, contribution: 24.6, description: 'Industry feedback' },
          { source: 'Alumni Survey', value: 75, weight: 0.3, contribution: 22.5, description: 'Graduate feedback' }
        ],
        total_indirect: 78.3,
        direct_weight: 0.7,
        indirect_weight: 0.3
      }
    ])

    setPOGapAnalysis([
      {
        po_code: 'PO1',
        po_title: 'Engineering Knowledge',
        current_attainment: 78.4,
        target_attainment: 75,
        gap: 3.4,
        gap_percentage: 4.5,
        gap_status: 'exceeds',
        improvement_required: 0,
        timeline: 'Maintain current performance',
        priority: 'low'
      },
      {
        po_code: 'PO2',
        po_title: 'Problem Analysis',
        current_attainment: 79.6,
        target_attainment: 75,
        gap: 4.6,
        gap_percentage: 6.1,
        gap_status: 'exceeds',
        improvement_required: 0,
        timeline: 'Maintain current performance',
        priority: 'low'
      },
      {
        po_code: 'PO3',
        po_title: 'Design/Development of Solutions',
        current_attainment: 69.6,
        target_attainment: 75,
        gap: -5.4,
        gap_percentage: -7.2,
        gap_status: 'below',
        improvement_required: 5.4,
        timeline: '6 months',
        priority: 'high'
      },
      {
        po_code: 'PSO1',
        po_title: 'Software Development Skills',
        current_attainment: 92.0,
        target_attainment: 80,
        gap: 12.0,
        gap_percentage: 15.0,
        gap_status: 'exceeds',
        improvement_required: 0,
        timeline: 'Maintain current performance',
        priority: 'low'
      }
    ])

    setContributingCOs([
      {
        po_code: 'PO1',
        po_title: 'Engineering Knowledge',
        contributing_cos: [
          { co_code: 'CO3', co_title: 'Analyze and evaluate solutions', strength: 3, co_attainment: 90, contribution_value: 27.0, contribution_percentage: 35.5 },
          { co_code: 'CO1', co_title: 'Understand fundamental concepts', strength: 3, co_attainment: 85, contribution_value: 25.5, contribution_percentage: 33.5 },
          { co_code: 'CO2', co_title: 'Apply knowledge to solve problems', strength: 2, co_attainment: 76, contribution_value: 15.2, contribution_percentage: 20.0 },
          { co_code: 'CO4', co_title: 'Create innovative solutions', strength: 1, co_attainment: 65, contribution_value: 8.5, contribution_percentage: 11.0 }
        ],
        total_contribution: 76.2,
        strongest_contributor: 'CO3',
        weakest_contributor: 'CO4'
      },
      {
        po_code: 'PO3',
        po_title: 'Design/Development of Solutions',
        contributing_cos: [
          { co_code: 'CO4', co_title: 'Create innovative solutions', strength: 3, co_attainment: 65, contribution_value: 25.5, contribution_percentage: 37.5 },
          { co_code: 'CO2', co_title: 'Apply knowledge to solve problems', strength: 2, co_attainment: 76, contribution_value: 16.2, contribution_percentage: 23.8 },
          { co_code: 'CO3', co_title: 'Analyze and evaluate solutions', strength: 2, co_attainment: 90, contribution_value: 16.8, contribution_percentage: 24.7 },
          { co_code: 'CO1', co_title: 'Understand fundamental concepts', strength: 1, co_attainment: 85, contribution_value: 9.5, contribution_percentage: 14.0 }
        ],
        total_contribution: 68.0,
        strongest_contributor: 'CO4',
        weakest_contributor: 'CO1'
      }
    ])
    }
  }, [])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'L3': return 'text-green-600 bg-green-100'
      case 'L2': return 'text-blue-600 bg-blue-100'
      case 'L1': return 'text-yellow-600 bg-yellow-100'
      case 'Below L1': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGapStatusColor = (status: string) => {
    switch (status) {
      case 'exceeds': return 'text-green-600 bg-green-100'
      case 'meets': return 'text-blue-600 bg-blue-100'
      case 'below': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
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

  const getPOTypeColor = (type: string) => {
    switch (type) {
      case 'PO': return 'text-blue-600 bg-blue-100'
      case 'PSO': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Use real data when available, fallback to mock data
  const currentPOStrengthMapping = realPOStrengthMapping.length > 0 ? realPOStrengthMapping : poStrengthMapping
  const currentIndirectAttainment = realIndirectAttainment.length > 0 ? realIndirectAttainment : indirectAttainment
  const currentPOGapAnalysis = realPOGapAnalysis.length > 0 ? realPOGapAnalysis : poGapAnalysis
  const currentContributingCOs = realContributingCOs.length > 0 ? realContributingCOs : contributingCOs

  // Charts Data
  const poAttainmentData = {
    labels: currentPOStrengthMapping.map((po: any) => po.po_code),
    datasets: [
      {
        label: 'Direct Attainment',
        data: currentPOStrengthMapping.map((po: any) => po.direct_attainment),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Indirect Attainment',
        data: currentPOStrengthMapping.map((po: any) => po.indirect_attainment),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1
      },
      {
        label: 'Total Attainment',
        data: currentPOStrengthMapping.map((po: any) => po.total_attainment),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1
      },
      {
        label: 'Target Attainment',
        data: currentPOStrengthMapping.map((po: any) => po.target_attainment),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1,
        borderDash: [5, 5]
      }
    ]
  }

  const gapAnalysisData = {
    labels: currentPOGapAnalysis.map((po: any) => po.po_code),
    datasets: [
      {
        label: 'Gap (%)',
        data: currentPOGapAnalysis.map((po: any) => po.gap),
        backgroundColor: currentPOGapAnalysis.map((po: any) => 
          po.gap > 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: currentPOGapAnalysis.map((po: any) => 
          po.gap > 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 1
      }
    ]
  }

  const tabs = [
    { id: 'strength_mapping', label: 'PO Strength Mapping', icon: Layers },
    { id: 'indirect_attainment', label: 'Indirect Attainment', icon: TrendingUp },
    { id: 'gap_analysis', label: 'Gap Analysis', icon: AlertTriangle },
    { id: 'contributing_cos', label: 'Contributing COs', icon: BarChart3 }
  ]

  if (comprehensivePOAnalysisLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (comprehensivePOAnalysisError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-3" />
        <p className="text-red-500">Error loading comprehensive PO analysis</p>
        <p className="text-sm text-gray-400">{comprehensivePOAnalysisError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprehensive PO Analysis</h1>
          <p className="text-gray-600">Program Outcome analysis with strength mapping and gap analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Subject</option>
            {/* Add subjects here if needed */}
          </select>
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

      {/* PO Strength Mapping Tab */}
      {activeTab === 'strength_mapping' && (
        <div className="space-y-6">
          {/* PO Attainment Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">PO Attainment Overview</h3>
            <div className="h-80">
              <Bar data={poAttainmentData} options={{
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

          {/* PO Strength Mapping Details */}
          <div className="space-y-4">
            {currentPOStrengthMapping.map((po: any) => (
              <div key={po.po_code} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-medium text-gray-900">{po.po_code}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPOTypeColor(po.po_type)}`}>
                        {po.po_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{po.po_title}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{po.total_attainment.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Total Attainment</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(po.level)}`}>
                        {po.level}
                      </span>
                      <span className={`text-sm ${po.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {po.gap > 0 ? '+' : ''}{po.gap.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Attainment Breakdown</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Direct:</span>
                        <span className="font-medium">{po.direct_attainment.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Indirect:</span>
                        <span className="font-medium">{po.indirect_attainment.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target:</span>
                        <span className="font-medium">{po.target_attainment}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">CO Strength Mapping</h5>
                    <div className="space-y-2">
                      {Object.entries(po.strength_mapping).map(([co, data]: [string, any]) => (
                        <div key={co} className="flex items-center justify-between text-sm">
                          <span>{co}:</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{data.contribution.toFixed(1)}%</span>
                            <span className="text-xs text-gray-500">(S{data.strength})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Performance Summary</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Current vs Target:</span>
                        <span className={`font-medium ${po.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {po.total_attainment.toFixed(1)}% vs {po.target_attainment}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gap:</span>
                        <span className={`font-medium ${po.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {po.gap > 0 ? '+' : ''}{po.gap.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-medium ${po.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {po.gap > 0 ? 'Exceeds Target' : 'Below Target'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indirect Attainment Tab */}
      {activeTab === 'indirect_attainment' && (
        <div className="space-y-6">
        <div className="space-y-4">
          {currentIndirectAttainment.map((po: any) => (
              <div key={po.po_code} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{po.po_code}</h4>
                    <p className="text-sm text-gray-600">{po.po_title}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{po.total_indirect.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Total Indirect Attainment</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Indirect Sources</h5>
                    <div className="space-y-3">
                      {po.indirect_sources.map((source: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{source.source}</div>
                            <div className="text-xs text-gray-500">{source.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">{source.value}%</div>
                            <div className="text-xs text-gray-500">Weight: {source.weight * 100}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Weight Distribution</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Direct Weight:</span>
                        <span className="font-medium">{po.direct_weight * 100}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Indirect Weight:</span>
                        <span className="font-medium">{po.indirect_weight * 100}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${po.direct_weight * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Direct</span>
                        <span>Indirect</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gap Analysis Tab */}
      {activeTab === 'gap_analysis' && (
        <div className="space-y-6">
          {/* Gap Analysis Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">PO Gap Analysis</h3>
            <div className="h-80">
              <Bar data={gapAnalysisData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' }
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Gap (%)'
                    }
                  }
                }
              }} />
            </div>
          </div>

          {/* Gap Analysis Details */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gap Analysis Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPOGapAnalysis.map((po: any) => (
                    <tr key={po.po_code}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {po.po_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.po_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.current_attainment.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.target_attainment}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={po.gap > 0 ? 'text-green-600' : 'text-red-600'}>
                          {po.gap > 0 ? '+' : ''}{po.gap.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGapStatusColor(po.gap_status)}`}>
                          {po.gap_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(po.priority)}`}>
                          {po.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.timeline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contributing COs Tab */}
      {activeTab === 'contributing_cos' && (
        <div className="space-y-6">
        <div className="space-y-4">
          {currentContributingCOs.map((po: any) => (
              <div key={po.po_code} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{po.po_code}</h4>
                    <p className="text-sm text-gray-600">{po.po_title}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{po.total_contribution.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Total Contribution</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Contributing COs</h5>
                    <div className="space-y-3">
                      {po.contributing_cos.map((co: any) => (
                        <div key={co.co_code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{co.co_code}</div>
                            <div className="text-xs text-gray-500">{co.co_title}</div>
                            <div className="text-xs text-gray-500">Strength: {co.strength}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">{co.contribution_value.toFixed(1)}%</div>
                            <div className="text-xs text-gray-500">({co.contribution_percentage.toFixed(1)}% of total)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Contribution Analysis</h5>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Strongest Contributor:</span>
                          <span className="font-medium">{po.strongest_contributor}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Weakest Contributor:</span>
                          <span className="font-medium">{po.weakest_contributor}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: '60%' }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          <strong>Recommendation:</strong> Focus on improving {po.weakest_contributor} 
                          to enhance overall PO attainment.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ComprehensivePOAnalysis
