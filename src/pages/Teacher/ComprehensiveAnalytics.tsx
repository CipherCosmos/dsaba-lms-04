import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { analyticsAPI } from '../../services/api'
import { 
  BarChart3, TrendingUp, Users, Target, Award, BookOpen, 
  Download, Eye, EyeOff, RefreshCw
} from 'lucide-react'

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ComprehensiveAnalytics Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card text-center py-12">
          <div className="text-red-500 mb-4">
            <BookOpen className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-gray-600">Something went wrong while loading the analytics data.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface COAttainmentData {
  [key: string]: {
    co_id: number
    co_code: string
    co_title: string
    target: number
    attainment: number
    status: string
    exam_details: any[]
  }
}

interface POAttainmentData {
  [key: string]: {
    po_code: string
    mapped_cos: any[]
    attainment: number
    status: string
  }
}

interface StudentPerformanceData {
  [key: string]: {
    student_id: number
    student_name: string
    overall_percentage: number
    total_obtained: number
    total_possible: number
    exam_details: any[]
    grade: string
  }
}

interface ClassPerformanceData {
  total_students: number
  average_percentage: number
  highest_percentage: number
  lowest_percentage: number
  pass_rate: number
  grade_distribution: { [key: string]: number }
  performance_trends: any
  student_rankings: any[]
}

const ComprehensiveAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [examType, setExamType] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'co' | 'po' | 'students' | 'class'>('overview')
  const [showDetails, setShowDetails] = useState(false)
  
  // Data states
  const [coAttainment, setCOAttainment] = useState<COAttainmentData>({})
  const [poAttainment, setPOAttainment] = useState<POAttainmentData>({})
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformanceData>({})
  const [classPerformance, setClassPerformance] = useState<ClassPerformanceData | null>(null)
  const [coPoMapping, setCoPoMapping] = useState<any[]>([])

  // Filter subjects for current teacher
  const teacherSubjects = useMemo(() => 
    subjects?.filter(s => s && s.teacher_id === user?.id) || [],
    [subjects, user?.id]
  )

  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  const fetchAnalyticsData = async () => {
    if (!selectedSubjectId) return

    setLoading(true)
    try {
      // Fetch all analytics data in parallel using API service
      const [coData, poData, studentData, classData, mappingData] = await Promise.all([
        analyticsAPI.getCOAttainment(selectedSubjectId, examType),
        analyticsAPI.getPOAttainment(selectedSubjectId, examType),
        analyticsAPI.getStudentPerformance(selectedSubjectId, undefined, examType),
        analyticsAPI.getClassPerformance(selectedSubjectId, examType),
        analyticsAPI.getCOPOMapping(selectedSubjectId)
      ])

      console.log('Analytics Data:', { coData, poData, studentData, classData, mappingData })
      
      setCOAttainment(coData || {})
      setPOAttainment(poData || {})
      setStudentPerformance(studentData || {})
      setClassPerformance(classData || null)
      setCoPoMapping(mappingData || [])

    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSubjectId) {
      fetchAnalyticsData()
    }
  }, [selectedSubjectId, examType])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const coValues = Object.values(coAttainment || {})
    const poValues = Object.values(poAttainment || {})
    const studentValues = Object.values(studentPerformance || {})
    
    return {
      totalCOs: coValues.length,
      achievedCOs: coValues.filter(co => co && co.status === 'Achieved').length,
      totalPOs: poValues.length,
      achievedPOs: poValues.filter(po => po && po.status === 'Achieved').length,
      totalStudents: studentValues.length,
      averageCOAttainment: coValues.length > 0 ? 
        coValues.reduce((sum, co) => sum + (co?.attainment || 0), 0) / coValues.length : 0,
      averagePOAttainment: poValues.length > 0 ? 
        poValues.reduce((sum, po) => sum + (po?.attainment || 0), 0) / poValues.length : 0,
      averageStudentPerformance: studentValues.length > 0 ?
        studentValues.reduce((sum, student) => sum + (student?.overall_percentage || 0), 0) / studentValues.length : 0,
      classStats: classPerformance || {
        total_students: studentValues.length,
        average_percentage: studentValues.length > 0 ?
          studentValues.reduce((sum, student) => sum + (student?.overall_percentage || 0), 0) / studentValues.length : 0,
        highest_percentage: studentValues.length > 0 ? Math.max(...studentValues.map(s => s?.overall_percentage || 0)) : 0,
        lowest_percentage: studentValues.length > 0 ? Math.min(...studentValues.map(s => s?.overall_percentage || 0)) : 0,
        pass_rate: studentValues.length > 0 ? 
          (studentValues.filter(s => (s?.overall_percentage || 0) >= 40).length / studentValues.length) * 100 : 0,
        grade_distribution: {},
        performance_trends: {},
        student_rankings: studentValues.sort((a, b) => (b?.overall_percentage || 0) - (a?.overall_percentage || 0))
      }
    }
  }, [coAttainment, poAttainment, classPerformance, studentPerformance])

  const exportReport = () => {
    const reportData = {
      subject: teacherSubjects?.find(s => s && s.id === selectedSubjectId)?.name || 'Unknown Subject',
      examType,
      generatedAt: new Date().toISOString(),
      coAttainment,
      poAttainment,
      studentPerformance,
      classPerformance,
      coPoMapping
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${selectedSubjectId}-${examType}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (teacherSubjects.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
        <p className="text-gray-600">You don't have any subjects assigned to view analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprehensive Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed CO/PO attainment and performance analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAnalyticsData}
            disabled={loading || !selectedSubjectId}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportReport}
            disabled={!selectedSubjectId}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Subject and Exam Type Selection */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value) || null)}
              className="input-field w-full"
            >
              <option value="">Select a subject</option>
              {teacherSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="input-field w-full"
            >
              <option value="all">All Exams</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>
        </div>
      </div>

      {!selectedSubjectId ? (
        <div className="card text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Subject</h3>
          <p className="text-gray-600">Choose a subject to view comprehensive analytics.</p>
        </div>
      ) : loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching CO/PO attainment, student performance, and class analytics...</p>
        </div>
      ) : (
        <>
          {/* Data Status Indicator */}
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-700">Data Status</h4>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${Object.keys(coAttainment || {}).length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">CO Data ({Object.keys(coAttainment || {}).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${Object.keys(poAttainment || {}).length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">PO Data ({Object.keys(poAttainment || {}).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${Object.keys(studentPerformance || {}).length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">Students ({Object.keys(studentPerformance || {}).length})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${coPoMapping && coPoMapping.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">CO-PO Mapping ({coPoMapping?.length || 0})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          {summaryStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">CO Attainment</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.achievedCOs}/{summaryStats.totalCOs}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryStats.averageCOAttainment?.toFixed(1) || '0.0'}% avg
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <Award className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">PO Attainment</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.achievedPOs}/{summaryStats.totalPOs}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryStats.averagePOAttainment?.toFixed(1) || '0.0'}% avg
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Class Performance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.classStats?.average_percentage?.toFixed(1) || '0.0'}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryStats.classStats?.pass_rate?.toFixed(1) || '0.0'}% pass rate
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summaryStats.classStats?.total_students || 0}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryStats.classStats?.highest_percentage?.toFixed(1) || '0.0'}% highest
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="card">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'overview', name: 'Overview', icon: BarChart3 },
                  { id: 'co', name: 'CO Analysis', icon: Target },
                  { id: 'po', name: 'PO Analysis', icon: Award },
                  { id: 'students', name: 'Student Performance', icon: Users },
                  { id: 'class', name: 'Class Analysis', icon: TrendingUp }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Exam Type:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                    {examType === 'all' ? 'All Exams' : examType.charAt(0).toUpperCase() + examType.slice(1)}
                  </span>
                </div>
              </div>
                  
                  {/* CO-PO Mapping Heatmap */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4">CO-PO Mapping Matrix</h4>
                    {coPoMapping && coPoMapping.length > 0 ? (
                      <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-medium text-gray-600">CO</th>
                            {Object.keys(poAttainment || {}).map(poCode => (
                              <th key={poCode} className="text-center py-2 px-3 font-medium text-gray-600">
                                {poCode}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            try {
                              return coPoMapping?.filter(co => co && co.co_code)?.map(co => (
                                <tr key={co?.co_code || 'unknown'} className="border-b border-gray-100">
                                  <td className="py-2 px-3 font-medium text-gray-900">{co?.co_code || 'N/A'}</td>
                                  {Object.keys(poAttainment || {}).map(poCode => {
                                    try {
                                      const mapping = co?.mapped_pos?.find((p: any) => p && p.po_code === poCode)
                                      return (
                                        <td key={poCode} className="text-center py-2 px-3">
                                          {mapping ? (
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                              mapping.strength === 3 ? 'bg-red-100 text-red-800' :
                                              mapping.strength === 2 ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800'
                                            }`}>
                                              {mapping.strength}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300">-</span>
                                          )}
                                        </td>
                                      )
                                    } catch (error) {
                                      console.error('Error rendering PO mapping:', error)
                                      return (
                                        <td key={poCode} className="text-center py-2 px-3">
                                          <span className="text-gray-300">-</span>
                                        </td>
                                      )
                                    }
                                  })}
                                </tr>
                              )) || []
                            } catch (error) {
                              console.error('Error rendering CO-PO mapping:', error)
                              return (
                                <tr>
                                  <td colSpan={Object.keys(poAttainment || {}).length + 1} className="text-center py-4 text-gray-500">
                                    Error loading CO-PO mapping data
                                  </td>
                                </tr>
                              )
                            }
                          })()}
                        </tbody>
                      </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No CO-PO mapping data available</p>
                      </div>
                    )}
                  </div>

                  {/* Grade Distribution */}
                  {classPerformance && (
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-4">Grade Distribution</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {Object.entries(classPerformance?.grade_distribution || {}).map(([grade, count]) => (
                          <div key={grade} className="text-center">
                            <div className={`text-2xl font-bold ${
                              grade === 'A+' ? 'text-green-600' :
                              grade === 'A' ? 'text-blue-600' :
                              grade === 'B+' ? 'text-yellow-600' :
                              grade === 'B' ? 'text-orange-600' :
                              grade === 'C+' ? 'text-red-600' :
                              grade === 'C' ? 'text-red-700' :
                              'text-gray-600'
                            }`}>
                              {count}
                            </div>
                            <div className="text-xs text-gray-600">Grade {grade}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CO Analysis Tab */}
              {activeTab === 'co' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Course Outcome (CO) Analysis</h3>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
                    </button>
                  </div>
                  
                  {/* CO Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Target className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Total COs</p>
                          <p className="text-2xl font-bold text-blue-900">{Object.keys(coAttainment || {}).length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Award className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm text-green-600 font-medium">Achieved COs</p>
                          <p className="text-2xl font-bold text-green-900">
                            {Object.values(coAttainment || {}).filter(co => co && co.status === 'Achieved').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Avg Attainment</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {summaryStats?.averageCOAttainment?.toFixed(1) || '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <BarChart3 className="w-8 h-8 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Target Achievement</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {Object.values(coAttainment || {}).length > 0 ? 
                              Math.round((Object.values(coAttainment || {}).filter(co => co && co.status === 'Achieved').length / Object.values(coAttainment || {}).length) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(coAttainment || {}).map(([coCode, data]) => {
                      const gap = data.target - data.attainment
                      const priority = gap > 20 ? 'High' : gap > 10 ? 'Medium' : 'Low'
                      const trend = data.exam_details && data.exam_details.length > 1 ? 
                        (data.exam_details[data.exam_details.length - 1].attainment > data.exam_details[0].attainment ? 'Improving' : 'Declining') : 'Stable'
                      
                      return (
                        <div key={coCode} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg">{coCode}</h4>
                              <p className="text-gray-600 mt-1">{data.co_title}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-sm text-gray-500">Target: {data.target}%</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  priority === 'High' ? 'bg-red-100 text-red-800' : 
                                  priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {priority} Priority
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  trend === 'Improving' ? 'bg-green-100 text-green-800' : 
                                  trend === 'Declining' ? 'bg-red-100 text-red-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {trend}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-3xl font-bold ${
                                data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {data.attainment.toFixed(1)}%
                              </div>
                              <div className={`text-sm font-medium ${
                                data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {data.status}
                              </div>
                              {gap > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Gap: {gap.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${
                                data.status === 'Achieved' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(data.attainment, 100)}%` }}
                            ></div>
                          </div>
                          
                          {showDetails && data.exam_details && data.exam_details.length > 0 && (
                            <div className="mt-6 space-y-4">
                              <h5 className="font-semibold text-gray-700 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Exam-wise Performance
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.exam_details.map((exam: any, index: number) => (
                                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-medium text-sm text-gray-700">{exam.exam_name}</span>
                                      <span className={`text-sm font-bold ${
                                        exam.attainment >= 70 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {exam.attainment.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          exam.attainment >= 70 ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(exam.attainment, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Recommendations */}
                          {gap > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h6 className="font-medium text-yellow-800 mb-2">Recommendations:</h6>
                              <ul className="text-sm text-yellow-700 space-y-1">
                                {priority === 'High' && (
                                  <>
                                    <li>• Conduct remedial classes for this CO</li>
                                    <li>• Review teaching methodology and materials</li>
                                    <li>• Provide additional practice exercises</li>
                                  </>
                                )}
                                {priority === 'Medium' && (
                                  <>
                                    <li>• Increase practice sessions</li>
                                    <li>• Review assessment methods</li>
                                    <li>• Provide targeted feedback</li>
                                  </>
                                )}
                                {priority === 'Low' && (
                                  <>
                                    <li>• Monitor progress closely</li>
                                    <li>• Provide additional support if needed</li>
                                  </>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* PO Analysis Tab */}
              {activeTab === 'po' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Program Outcome (PO) Analysis</h3>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
                    </button>
                  </div>
                  
                  {/* PO Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Award className="w-8 h-8 text-indigo-600 mr-3" />
                        <div>
                          <p className="text-sm text-indigo-600 font-medium">Total POs</p>
                          <p className="text-2xl font-bold text-indigo-900">{Object.keys(poAttainment || {}).length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Target className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm text-green-600 font-medium">Achieved POs</p>
                          <p className="text-2xl font-bold text-green-900">
                            {Object.values(poAttainment || {}).filter(po => po && po.status === 'Achieved').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Avg Attainment</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {summaryStats?.averagePOAttainment?.toFixed(1) || '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <BarChart3 className="w-8 h-8 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Target Achievement</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {Object.values(poAttainment || {}).length > 0 ? 
                              Math.round((Object.values(poAttainment || {}).filter(po => po && po.status === 'Achieved').length / Object.values(poAttainment || {}).length) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(poAttainment || {}).map(([poCode, data]) => {
                      const gap = 70 - data.attainment // Assuming 70% target
                      const priority = gap > 20 ? 'High' : gap > 10 ? 'Medium' : 'Low'
                      const totalCOs = data.mapped_cos ? data.mapped_cos.length : 0
                      const strongCOs = data.mapped_cos ? data.mapped_cos.filter((co: any) => co && co.attainment >= 70).length : 0
                      
                      return (
                        <div key={poCode} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-lg">{poCode}</h4>
                              <p className="text-gray-600 mt-1">
                                Mapped COs: {data.mapped_cos ? data.mapped_cos.map((co: any) => co?.co_code || 'N/A').join(', ') : 'None'}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-sm text-gray-500">Target: 70%</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  priority === 'High' ? 'bg-red-100 text-red-800' : 
                                  priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {priority} Priority
                                </span>
                                <span className="text-sm text-gray-500">
                                  COs: {strongCOs}/{totalCOs} Strong
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-3xl font-bold ${
                                data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {data.attainment.toFixed(1)}%
                              </div>
                              <div className={`text-sm font-medium ${
                                data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {data.status}
                              </div>
                              {gap > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Gap: {gap.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${
                                data.status === 'Achieved' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(data.attainment, 100)}%` }}
                            ></div>
                          </div>
                          
                          {showDetails && data.mapped_cos && data.mapped_cos.length > 0 && (
                            <div className="mt-6 space-y-4">
                              <h5 className="font-semibold text-gray-700 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Contributing COs
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(data.mapped_cos || []).map((co: any, index: number) => (
                                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-medium text-sm text-gray-700">{co.co_code}</span>
                                      <span className={`text-sm font-bold ${
                                        co.attainment >= 70 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {co.attainment.toFixed(1)}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs text-gray-500">Strength: {co.strength || 'Medium'}</span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        co.attainment >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {co.attainment >= 70 ? 'Strong' : 'Weak'}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          co.attainment >= 70 ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(co.attainment, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Recommendations */}
                          {gap > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h6 className="font-medium text-yellow-800 mb-2">Recommendations:</h6>
                              <ul className="text-sm text-yellow-700 space-y-1">
                                {priority === 'High' && (
                                  <>
                                    <li>• Focus on improving weak contributing COs</li>
                                    <li>• Review CO-PO mapping weights</li>
                                    <li>• Conduct comprehensive assessment</li>
                                  </>
                                )}
                                {priority === 'Medium' && (
                                  <>
                                    <li>• Strengthen contributing COs</li>
                                    <li>• Review assessment strategies</li>
                                    <li>• Provide targeted support</li>
                                  </>
                                )}
                                {priority === 'Low' && (
                                  <>
                                    <li>• Monitor PO progress closely</li>
                                    <li>• Maintain current CO performance</li>
                                  </>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Student Performance Tab */}
              {activeTab === 'students' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Student Performance Analysis</h3>
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{showDetails ? 'Hide' : 'Show'} Details</span>
                    </button>
                  </div>

                  {/* Student Performance Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Users className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Total Students</p>
                          <p className="text-2xl font-bold text-blue-900">{summaryStats?.totalStudents || 0}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm text-green-600 font-medium">Average Score</p>
                          <p className="text-2xl font-bold text-green-900">
                            {summaryStats?.averageStudentPerformance?.toFixed(1) || '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Award className="w-8 h-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Pass Rate</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {summaryStats?.classStats?.pass_rate?.toFixed(1) || '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <BarChart3 className="w-8 h-8 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Highest Score</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {summaryStats?.classStats?.highest_percentage?.toFixed(1) || '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Student</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Overall %</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Grade</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Marks</th>
                          {showDetails && <th className="text-center py-3 px-4 font-medium text-gray-600">Exam Details</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(studentPerformance || {})
                          .filter(student => student && typeof student.overall_percentage === 'number')
                          .sort((a, b) => b.overall_percentage - a.overall_percentage)
                          .map((student) => (
                          <tr key={student.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{student.student_name}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-medium ${
                                student.overall_percentage >= 80 ? 'text-green-600' :
                                student.overall_percentage >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {student.overall_percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                student.grade === 'A+' ? 'bg-green-100 text-green-800' :
                                student.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                                student.grade === 'B+' ? 'bg-yellow-100 text-yellow-800' :
                                student.grade === 'B' ? 'bg-orange-100 text-orange-800' :
                                student.grade === 'C+' ? 'bg-red-100 text-red-800' :
                                student.grade === 'C' ? 'bg-red-200 text-red-900' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {student.grade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-gray-600">
                              {student.total_obtained.toFixed(1)}/{student.total_possible.toFixed(1)}
                            </td>
                            {showDetails && (
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  {(student.exam_details || []).map((exam, index) => (
                                    <div key={index} className="flex justify-between text-xs text-gray-600">
                                      <span>{exam.exam_name}</span>
                                      <span>{exam.percentage.toFixed(1)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Class Analysis Tab */}
              {activeTab === 'class' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Class Performance Analysis</h3>
                  
                  {/* Class Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {classPerformance?.average_percentage?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-sm text-gray-600">Class Average</div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {classPerformance?.pass_rate?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-sm text-gray-600">Pass Rate</div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {summaryStats?.classStats?.total_students || 0}
                        </div>
                        <div className="text-sm text-gray-600">Total Students</div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {summaryStats?.classStats?.highest_percentage?.toFixed(1) || '0.0'}%
                        </div>
                        <div className="text-sm text-gray-600">Highest Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Range */}
                  <div className="card">
                    <h4 className="text-md font-medium text-gray-700 mb-4">Performance Range</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Highest Score</span>
                        <span className="font-medium text-green-600">
                          {classPerformance?.highest_percentage?.toFixed(1) || '0.0'}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Lowest Score</span>
                        <span className="font-medium text-red-600">
                          {classPerformance?.lowest_percentage?.toFixed(1) || '0.0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                          style={{ 
                            width: '100%',
                            background: `linear-gradient(to right, 
                              red 0%, 
                              red ${classPerformance ? (classPerformance.lowest_percentage / classPerformance.highest_percentage) * 100 : 0}%, 
                              yellow ${classPerformance ? (50 / classPerformance.highest_percentage) * 100 : 0}%, 
                              green ${classPerformance ? (80 / classPerformance.highest_percentage) * 100 : 0}%, 
                              green 100%)`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="card">
                    <h4 className="text-md font-medium text-gray-700 mb-4">Top Performers</h4>
                    <div className="space-y-2">
                      {classPerformance?.student_rankings?.slice(0, 5)?.map((student, index) => (
                        <div key={student.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-orange-500' :
                              'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-900">{student.student_name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{student.overall_percentage.toFixed(1)}%</div>
                            <div className="text-sm text-gray-600">{student.grade}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const ComprehensiveAnalyticsWithErrorBoundary = () => {
  return (
    <ErrorBoundary>
      <ComprehensiveAnalytics />
    </ErrorBoundary>
  )
}

export default ComprehensiveAnalyticsWithErrorBoundary
