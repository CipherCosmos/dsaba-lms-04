import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { 
  BarChart3, TrendingUp, Users, Target, Award, BookOpen, 
  Download, Filter, Search, Eye, EyeOff, RefreshCw,
  PieChart, Activity, Zap, Star, AlertTriangle, CheckCircle
} from 'lucide-react'

interface COAttainmentData {
  [key: string]: {
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
    subjects.filter(s => s.teacher_id === user?.id),
    [subjects, user?.id]
  )

  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  const fetchAnalyticsData = async () => {
    if (!selectedSubjectId) return

    setLoading(true)
    try {
      const baseUrl = `/api/analytics`
      
      // Fetch all analytics data in parallel
      const [coResponse, poResponse, studentResponse, classResponse, mappingResponse] = await Promise.all([
        fetch(`${baseUrl}/co-attainment/${selectedSubjectId}?exam_type=${examType}`),
        fetch(`${baseUrl}/po-attainment/${selectedSubjectId}?exam_type=${examType}`),
        fetch(`${baseUrl}/student-performance/${selectedSubjectId}?exam_type=${examType}`),
        fetch(`${baseUrl}/class-performance/${selectedSubjectId}?exam_type=${examType}`),
        fetch(`${baseUrl}/co-po-mapping/${selectedSubjectId}`)
      ])

      if (coResponse.ok) setCOAttainment(await coResponse.json())
      if (poResponse.ok) setPOAttainment(await poResponse.json())
      if (studentResponse.ok) setStudentPerformance(await studentResponse.json())
      if (classResponse.ok) setClassPerformance(await classResponse.json())
      if (mappingResponse.ok) setCoPoMapping(await mappingResponse.json())

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
    if (!classPerformance) return null

    const coValues = Object.values(coAttainment)
    const poValues = Object.values(poAttainment)
    
    return {
      totalCOs: coValues.length,
      achievedCOs: coValues.filter(co => co.status === 'Achieved').length,
      totalPOs: poValues.length,
      achievedPOs: poValues.filter(po => po.status === 'Achieved').length,
      averageCOAttainment: coValues.length > 0 ? 
        coValues.reduce((sum, co) => sum + co.attainment, 0) / coValues.length : 0,
      averagePOAttainment: poValues.length > 0 ? 
        poValues.reduce((sum, po) => sum + po.attainment, 0) / poValues.length : 0,
      classStats: classPerformance
    }
  }, [coAttainment, poAttainment, classPerformance])

  const exportReport = () => {
    const reportData = {
      subject: teacherSubjects.find(s => s.id === selectedSubjectId)?.name,
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
        </div>
      ) : (
        <>
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
                      {summaryStats.averageCOAttainment.toFixed(1)}% avg
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
                      {summaryStats.averagePOAttainment.toFixed(1)}% avg
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
                      {summaryStats.classStats.average_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryStats.classStats.pass_rate.toFixed(1)}% pass rate
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
                      {summaryStats.classStats.total_students}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summaryStats.classStats.highest_percentage.toFixed(1)}% highest
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
                  <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
                  
                  {/* CO-PO Mapping Heatmap */}
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4">CO-PO Mapping Matrix</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-medium text-gray-600">CO</th>
                            {Object.keys(poAttainment).map(poCode => (
                              <th key={poCode} className="text-center py-2 px-3 font-medium text-gray-600">
                                {poCode}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {coPoMapping.map(co => (
                            <tr key={co.co_code} className="border-b border-gray-100">
                              <td className="py-2 px-3 font-medium text-gray-900">{co.co_code}</td>
                              {Object.keys(poAttainment).map(poCode => {
                                const mapping = co.mapped_pos.find((p: any) => p.po_code === poCode)
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
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  {classPerformance && (
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-4">Grade Distribution</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {Object.entries(classPerformance.grade_distribution).map(([grade, count]) => (
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
                  <h3 className="text-lg font-semibold text-gray-900">Course Outcome (CO) Analysis</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(coAttainment).map(([coCode, data]) => (
                      <div key={coCode} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{coCode}: {data.co_title}</h4>
                            <p className="text-sm text-gray-600">Target: {data.target}%</p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.attainment.toFixed(1)}%
                            </div>
                            <div className={`text-sm ${
                              data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.status}
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div 
                            className={`h-2 rounded-full ${
                              data.status === 'Achieved' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(data.attainment, 100)}%` }}
                          ></div>
                        </div>

                        {showDetails && data.exam_details.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">Exam Details:</h5>
                            {data.exam_details.map((exam, index) => (
                              <div key={index} className="flex justify-between text-sm text-gray-600">
                                <span>{exam.exam_name}</span>
                                <span>{exam.attainment.toFixed(1)}% ({exam.obtained}/{exam.possible})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PO Analysis Tab */}
              {activeTab === 'po' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Program Outcome (PO) Analysis</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(poAttainment).map(([poCode, data]) => (
                      <div key={poCode} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{poCode}</h4>
                            <p className="text-sm text-gray-600">
                              Mapped COs: {data.mapped_cos.map((co: any) => co.co_code).join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.attainment.toFixed(1)}%
                            </div>
                            <div className={`text-sm ${
                              data.status === 'Achieved' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.status}
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div 
                            className={`h-2 rounded-full ${
                              data.status === 'Achieved' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(data.attainment, 100)}%` }}
                          ></div>
                        </div>

                        {showDetails && data.mapped_cos.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">Contributing COs:</h5>
                            {data.mapped_cos.map((co: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm text-gray-600">
                                <span>{co.co_code} (Strength: {co.strength})</span>
                                <span>{co.attainment.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
                        {Object.values(studentPerformance)
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
                                  {student.exam_details.map((exam, index) => (
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
              {activeTab === 'class' && classPerformance && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Class Performance Analysis</h3>
                  
                  {/* Class Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {classPerformance.average_percentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Class Average</div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {classPerformance.pass_rate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Pass Rate</div>
                      </div>
                    </div>
                    
                    <div className="card">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {classPerformance.total_students}
                        </div>
                        <div className="text-sm text-gray-600">Total Students</div>
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
                          {classPerformance.highest_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Lowest Score</span>
                        <span className="font-medium text-red-600">
                          {classPerformance.lowest_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                          style={{ 
                            width: '100%',
                            background: `linear-gradient(to right, 
                              red 0%, 
                              red ${(classPerformance.lowest_percentage / classPerformance.highest_percentage) * 100}%, 
                              yellow ${(50 / classPerformance.highest_percentage) * 100}%, 
                              green ${(80 / classPerformance.highest_percentage) * 100}%, 
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
                      {classPerformance.student_rankings.slice(0, 5).map((student, index) => (
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

export default ComprehensiveAnalytics
