import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchStudentAnalytics } from '../../store/slices/analyticsSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchExams } from '../../store/slices/examSlice'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js'
import { Line, Doughnut, Radar } from 'react-chartjs-2'
import { TrendingUp, Award, BookOpen, Star, AlertCircle, Trophy, Brain, Target, Download } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
)

const StudentAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { studentAnalytics, loading } = useSelector((state: RootState) => state.analytics)
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { } = useSelector((state: RootState) => state.exams)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState('')

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAnalytics(user.id))
    }
    dispatch(fetchSubjects())
    dispatch(fetchExams())
  }, [dispatch, user])

  const classSubjects = subjects?.filter(s => s && s.class_id === user?.class_id) || []

  // Debug logging
  console.log('Student Analytics Debug:', { 
    studentAnalytics, 
    loading, 
    user, 
    subjects, 
    classSubjects 
  })

  if (loading && !studentAnalytics) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!studentAnalytics) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No analytics data available</p>
        <p className="text-sm text-gray-400">Complete some exams to see your analytics</p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ studentAnalytics, loading, user, subjects }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  // Performance trend chart
  const performanceTrendData = {
    labels: studentAnalytics.performance_trend.map(p => p.exam),
    datasets: [
      {
        label: 'Your Performance (%)',
        data: studentAnalytics.performance_trend.map(p => p.percentage),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  // CO Attainment radar chart
  const coAttainmentData = {
    labels: Object.keys(studentAnalytics.co_attainment),
    datasets: [
      {
        label: 'Your CO Attainment (%)',
        data: Object.values(studentAnalytics.co_attainment),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(34, 197, 94, 1)'
      }
    ]
  }

  // PO Attainment radar chart
  const poAttainmentData = {
    labels: Object.keys(studentAnalytics.po_attainment),
    datasets: [
      {
        label: 'Your PO Attainment (%)',
        data: Object.values(studentAnalytics.po_attainment),
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgba(139, 92, 246, 1)',
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
      }
    ]
  }

  // Grade distribution
  const gradeDistribution = studentAnalytics.performance_trend.reduce((acc, exam) => {
    let grade = 'F'
    if (exam.percentage >= 90) grade = 'A+'
    else if (exam.percentage >= 80) grade = 'A'
    else if (exam.percentage >= 70) grade = 'B+'
    else if (exam.percentage >= 60) grade = 'B'
    else if (exam.percentage >= 50) grade = 'C'
    
    acc[grade] = (acc[grade] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const gradeDistributionData = {
    labels: Object.keys(gradeDistribution),
    datasets: [
      {
        data: Object.values(gradeDistribution),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // A+
          'rgba(59, 130, 246, 0.8)',  // A
          'rgba(245, 158, 11, 0.8)',  // B+
          'rgba(139, 92, 246, 0.8)',  // B
          'rgba(239, 68, 68, 0.8)',   // C
          'rgba(156, 163, 175, 0.8)'  // F
        ]
      }
    ]
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      }
    }
  }

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  }

  // Subject-wise performance breakdown
  const subjectPerformance = classSubjects.map(subject => {
    const subjectExams = studentAnalytics.performance_trend.filter(p => 
      p.exam.toLowerCase().includes(subject.name.toLowerCase())
    )
    
    if (subjectExams.length === 0) return null
    
    const avgPerformance = subjectExams.reduce((sum, exam) => sum + exam.percentage, 0) / subjectExams.length
    
    return {
      subject: subject.name,
      code: subject.code,
      average: avgPerformance,
      exams: subjectExams.length,
      cos: subject.cos || [],
      pos: subject.pos || []
    }
  }).filter(Boolean)

  // Strengths and weaknesses analysis
  const coPerformance = Object.entries(studentAnalytics.co_attainment)
  const strengths = coPerformance.filter(([_, score]) => score >= 80).map(([co, _]) => co)
  const weaknesses = coPerformance.filter(([_, score]) => score < 60).map(([co, _]) => co)

  // Study recommendations based on performance
  const getStudyRecommendations = () => {
    const recommendations = []
    
    if (studentAnalytics.percentage >= 85) {
      recommendations.push("Excellent performance! Consider peer tutoring to help others.")
      recommendations.push("Focus on advanced problem-solving and research projects.")
    } else if (studentAnalytics.percentage >= 70) {
      recommendations.push("Good performance! Aim for consistency across all subjects.")
      recommendations.push("Work on improving weaker areas identified in CO analysis.")
    } else if (studentAnalytics.percentage >= 50) {
      recommendations.push("Focus on fundamental concepts in weak subjects.")
      recommendations.push("Consider additional practice sessions and study groups.")
    } else {
      recommendations.push("Urgent attention needed. Consult teachers for remedial help.")
      recommendations.push("Create a structured study plan with daily targets.")
    }

    if (weaknesses.length > 0) {
      recommendations.push(`Priority focus areas: ${weaknesses.join(', ')}`)
    }

    return recommendations
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'co-po', label: 'CO/PO Analysis', icon: Target },
    { id: 'subjects', label: 'Subject-wise', icon: BookOpen },
    { id: 'insights', label: 'Insights & Goals', icon: Brain }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Academic Analytics</h1>
          <p className="text-gray-600">Track your progress and identify improvement areas</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download size={18} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overall Percentage</p>
              <p className="text-2xl font-semibold text-gray-900">
                {studentAnalytics.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  studentAnalytics.percentage >= 80 ? 'bg-green-500' :
                  studentAnalytics.percentage >= 60 ? 'bg-blue-500' :
                  studentAnalytics.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(studentAnalytics.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Class Rank</p>
              <p className="text-2xl font-semibold text-gray-900">#{studentAnalytics.rank}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {studentAnalytics.rank <= 3 ? '🏆 Top performer!' :
               studentAnalytics.rank <= 10 ? '🌟 Great performance!' :
               'Keep improving!'}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Marks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {studentAnalytics.total_marks.toFixed(0)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">Across all exams</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Exams Taken</p>
              <p className="text-2xl font-semibold text-gray-900">
                {studentAnalytics.performance_trend.length}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {classSubjects.length} subjects enrolled
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 h-5 w-5 ${
                  activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Performance Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
              <div className="h-64">
                <Line data={performanceTrendData} options={lineOptions} />
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
              <div className="h-64">
                <Doughnut data={gradeDistributionData} />
              </div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exam Results</h3>
            <div className="space-y-3">
              {studentAnalytics.performance_trend.slice(-5).reverse().map((exam, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      exam.percentage >= 80 ? 'bg-green-500' :
                      exam.percentage >= 60 ? 'bg-blue-500' :
                      exam.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{exam.exam}</p>
                      <p className="text-sm text-gray-600">
                        Grade: {
                          exam.percentage >= 90 ? 'A+' :
                          exam.percentage >= 80 ? 'A' :
                          exam.percentage >= 70 ? 'B+' :
                          exam.percentage >= 60 ? 'B' :
                          exam.percentage >= 50 ? 'C' : 'F'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{exam.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Performance</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'co-po' && (
        <div className="space-y-6">
          {/* CO/PO Attainment Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(studentAnalytics.co_attainment).length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Course Outcomes (CO) Attainment
                </h3>
                <div className="h-80">
                  <Radar data={coAttainmentData} options={radarOptions} />
                </div>
              </div>
            )}

            {Object.keys(studentAnalytics.po_attainment).length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Program Outcomes (PO) Attainment
                </h3>
                <div className="h-80">
                  <Radar data={poAttainmentData} options={radarOptions} />
                </div>
              </div>
            )}
          </div>

          {/* CO Analysis Table */}
          {Object.keys(studentAnalytics.co_attainment).length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed CO Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Course Outcome</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Your Attainment</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Threshold (60%)</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(studentAnalytics.co_attainment).map(([co, score]) => (
                      <tr key={co} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{co}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-semibold ${
                            score >= 80 ? 'text-green-600' :
                            score >= 60 ? 'text-blue-600' :
                            score >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {score.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">60%</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            score >= 60 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {score >= 60 ? 'Achieved' : 'Not Achieved'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {score >= 80 ? 'Excellent! Maintain this level.' :
                           score >= 60 ? 'Good. Aim for 80%+' :
                           'Needs improvement. Focus on this area.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PO Analysis Table */}
          {Object.keys(studentAnalytics.po_attainment).length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibant text-gray-900 mb-4">Program Outcomes Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(studentAnalytics.po_attainment).map(([po, score]) => (
                  <div key={po} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{po}</h4>
                      <span className={`font-semibold ${
                        score >= 80 ? 'text-green-600' :
                        score >= 60 ? 'text-blue-600' :
                        score >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {score.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full ${
                          score >= 80 ? 'bg-green-500' :
                          score >= 60 ? 'bg-blue-500' :
                          score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {score >= 80 ? 'Excellent proficiency' :
                       score >= 60 ? 'Good proficiency' :
                       score >= 40 ? 'Developing' : 'Needs attention'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {/* Subject Filter */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Subject-wise Performance</h3>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="input-field"
              >
                <option value="">All Subjects</option>
                {classSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectPerformance.map((subject, index) => subject && (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{subject.subject}</h4>
                      <p className="text-sm text-gray-600">{subject.code}</p>
                    </div>
                    <span className={`font-semibold text-lg ${
                      subject.average >= 80 ? 'text-green-600' :
                      subject.average >= 60 ? 'text-blue-600' :
                      subject.average >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {subject.average.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full ${
                        subject.average >= 80 ? 'bg-green-500' :
                        subject.average >= 60 ? 'bg-blue-500' :
                        subject.average >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(subject.average, 100)}%` }}
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exams taken:</span>
                      <span className="font-medium">{subject.exams}</span>
                    </div>
                    
                    {subject.cos.length > 0 && (
                      <div>
                        <span className="text-gray-600">COs:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {subject.cos.map((co, idx) => (
                            <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              {co}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Strengths</h3>
              <div className="space-y-3">
                {strengths.length > 0 ? (
                  strengths.map((co, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Star className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">{co}</p>
                        <p className="text-sm text-green-600">
                          {studentAnalytics.co_attainment[co].toFixed(1)}% - Excellent performance
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Complete more exams to identify your strengths</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas for Improvement</h3>
              <div className="space-y-3">
                {weaknesses.length > 0 ? (
                  weaknesses.map((co, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">{co}</p>
                        <p className="text-sm text-red-600">
                          {studentAnalytics.co_attainment[co].toFixed(1)}% - Needs attention
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Star className="h-5 w-5 text-green-600" />
                    <p className="text-green-800">Great job! No major weak areas identified.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Study Recommendations */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalized Study Recommendations</h3>
            <div className="space-y-3">
              {getStudyRecommendations().map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Setting */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Short-term Goals (This Semester)</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Achieve 80%+ overall</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      studentAnalytics.percentage >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {studentAnalytics.percentage >= 80 ? 'Achieved' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Top 10 in class</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      studentAnalytics.rank <= 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {studentAnalytics.rank <= 10 ? 'Achieved' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">All COs above 60%</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      Object.values(studentAnalytics.co_attainment).every(score => score >= 60) ? 
                      'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {Object.values(studentAnalytics.co_attainment).every(score => score >= 60) ? 'Achieved' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Long-term Goals (Academic Year)</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Maintain top 5 position</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Target</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Excel in core subjects</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Target</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Leadership in projects</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Target</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentAnalytics