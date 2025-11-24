import React, { useState, useEffect, useMemo, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import {
  fetchSubjectAttainment,
  setSelectedSubject
} from '../../store/slices/copoSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Download,
  Filter,
  RefreshCw,
  Eye,
  BarChart2,
  PieChart,
  Activity,
  Brain
} from 'lucide-react'
import { Link } from 'react-router-dom'

import type { COAttainment, POAttainment } from '../../core/types/api'

const AttainmentAnalytics: React.FC = memo(() => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)
  const { 
    subjectAttainment,
    subjectAttainmentLoading, 
    subjectAttainmentError,
    selectedSubjectId 
  } = useSelector((state: RootState) => state.copo)

  const [examType, setExamType] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'co' | 'po' | 'detailed' | 'recommendations'>('overview')
  const [selectedCO, setSelectedCO] = useState<any>(null)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [showDetailedView, setShowDetailedView] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')

  // Filter subjects to only show the ones the teacher owns
  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  useEffect(() => {
    if (selectedSubjectId) {
      // Check if the selected subject is owned by the teacher
      const isOwnedByTeacher = teacherSubjects.some(subject => subject.id === selectedSubjectId)
      if (!isOwnedByTeacher) {
        // Clear the selection if the teacher doesn't own this subject
        dispatch(setSelectedSubject(0))
        return
      }
      dispatch(fetchSubjectAttainment({ subjectId: selectedSubjectId, examType }))
    }
  }, [dispatch, selectedSubjectId, examType, teacherSubjects])

  const handleSubjectChange = (subjectId: number) => {
    dispatch(setSelectedSubject(subjectId))
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'L3': return 'text-green-600 bg-green-100'
      case 'L2': return 'text-blue-600 bg-blue-100'
      case 'L1': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-red-600 bg-red-100'
    }
  }

  const getGapColor = (gap: number) => {
    if (gap >= 0) return 'text-green-600'
    if (gap >= -10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 80) return 'text-blue-600'
    if (percentage >= 70) return 'text-yellow-600'
    if (percentage >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  // Export functions
  const exportToExcel = () => {
    if (!subjectAttainment) return

    const data = [
      ['Subject Analytics Report'],
      ['Subject:', subjectAttainment.subject_name],
      ['Code:', subjectAttainment.subject_code],
      ['Overall Attainment:', `${subjectAttainment.overall_attainment}%`],
      ['Target Attainment:', `${subjectAttainment.target_attainment}%`],
      ['Gap:', `${subjectAttainment.gap_analysis?.overall_gap || 0}%`],
      [''],
      ['CO Attainment Details'],
      ['CO Code', 'Description', 'Target %', 'Actual %', 'Gap', 'Level', 'Students', 'Passing', 'Excellent'],
      ...(subjectAttainment.co_attainment || []).map(co => [
        co.co_code,
        co.co_description,
        co.target_pct,
        co.actual_pct,
        co.gap,
        co.level,
        co.student_performance?.total_students || 0,
        co.student_performance?.passing_students || 0,
        co.student_performance?.excellent_students || 0
      ]),
      [''],
      ['PO Attainment Details'],
      ['PO Code', 'Description', 'Direct %', 'Indirect %', 'Total %', 'Level', 'Gap'],
      ...(subjectAttainment.po_attainment || []).map(po => [
        po.po_code,
        po.po_description,
        po.direct_pct,
        po.indirect_pct,
        po.total_pct,
        po.level,
        po.gap
      ]),
      [''],
      ['Performance Metrics'],
      ['Total Students:', subjectAttainment.performance_metrics?.total_students || 0],
      ['Total Exams:', subjectAttainment.performance_metrics?.total_exams || 0],
      ['Total Questions:', subjectAttainment.performance_metrics?.total_questions || 0],
      [''],
      ['Student Distribution'],
      ['Grade A:', subjectAttainment.student_distribution?.A_grade || 0],
      ['Grade B:', subjectAttainment.student_distribution?.B_grade || 0],
      ['Grade C:', subjectAttainment.student_distribution?.C_grade || 0],
      ['Grade D:', subjectAttainment.student_distribution?.D_grade || 0],
      ['Grade F:', subjectAttainment.student_distribution?.F_grade || 0],
      [''],
      ['Difficulty Analysis'],
      ['Easy Questions:', typeof subjectAttainment.difficulty_analysis?.easy === 'object' ? subjectAttainment.difficulty_analysis.easy.count : subjectAttainment.difficulty_analysis?.easy || 0],
      ['Medium Questions:', typeof subjectAttainment.difficulty_analysis?.medium === 'object' ? subjectAttainment.difficulty_analysis.medium.count : subjectAttainment.difficulty_analysis?.medium || 0],
      ['Hard Questions:', typeof subjectAttainment.difficulty_analysis?.hard === 'object' ? subjectAttainment.difficulty_analysis.hard.count : subjectAttainment.difficulty_analysis?.hard || 0],
      [''],
      ['Blooms Taxonomy'],
      ...Object.entries(subjectAttainment.blooms_analysis || {}).map(([level, data]) => {
        const count = typeof data === 'object' ? data.count : data;
        return [level, count];
      })
    ]

    // Convert to CSV format
    const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `attainment_analytics_${subjectAttainment.subject_code}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    // For PDF export, we'll create a comprehensive report
    const printWindow = window.open('', '_blank')
    if (!printWindow || !subjectAttainment) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attainment Analytics Report - ${subjectAttainment.subject_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
          .metric-label { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .progress-bar { width: 100%; height: 20px; background-color: #e0e0e0; border-radius: 10px; overflow: hidden; }
          .progress-fill { height: 100%; background-color: #007bff; transition: width 0.3s ease; }
          .recommendations { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attainment Analytics Report</h1>
          <h2>${subjectAttainment.subject_name} (${subjectAttainment.subject_code})</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h2>Overall Performance</h2>
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${subjectAttainment.overall_attainment}%</div>
              <div class="metric-label">Overall Attainment</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.target_attainment}%</div>
              <div class="metric-label">Target Attainment</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.gap_analysis?.overall_gap || 0}%</div>
              <div class="metric-label">Gap</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.performance_metrics?.total_students || 0}</div>
              <div class="metric-label">Total Students</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>CO Attainment Details</h2>
          <table>
            <thead>
              <tr>
                <th>CO Code</th>
                <th>Description</th>
                <th>Target %</th>
                <th>Actual %</th>
                <th>Gap</th>
                <th>Level</th>
                <th>Students</th>
                <th>Passing</th>
              </tr>
            </thead>
            <tbody>
              ${(subjectAttainment.co_attainment || []).map(co => `
                <tr>
                  <td>${co.co_code}</td>
                  <td>${co.co_description}</td>
                  <td>${co.target_pct}%</td>
                  <td>${co.actual_pct}%</td>
                  <td>${co.gap}%</td>
                  <td>${co.level}</td>
                  <td>${co.student_performance?.total_students || 0}</td>
                  <td>${co.student_performance?.passing_students || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>PO Attainment Details</h2>
          <table>
            <thead>
              <tr>
                <th>PO Code</th>
                <th>Description</th>
                <th>Direct %</th>
                <th>Indirect %</th>
                <th>Total %</th>
                <th>Level</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              ${(subjectAttainment.po_attainment || []).map(po => `
                <tr>
                  <td>${po.po_code}</td>
                  <td>${po.po_description}</td>
                  <td>${po.direct_pct}%</td>
                  <td>${po.indirect_pct}%</td>
                  <td>${po.total_pct}%</td>
                  <td>${po.level}</td>
                  <td>${po.gap}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Student Distribution</h2>
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${subjectAttainment.student_distribution?.A_grade || 0}</div>
              <div class="metric-label">Grade A</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.student_distribution?.B_grade || 0}</div>
              <div class="metric-label">Grade B</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.student_distribution?.C_grade || 0}</div>
              <div class="metric-label">Grade C</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.student_distribution?.D_grade || 0}</div>
              <div class="metric-label">Grade D</div>
            </div>
            <div class="metric">
              <div class="metric-value">${subjectAttainment.student_distribution?.F_grade || 0}</div>
              <div class="metric-label">Grade F</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Recommendations</h2>
          <div class="recommendations">
            <ul>
              ${(subjectAttainment.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const handleExport = () => {
    if (exportFormat === 'excel' || exportFormat === 'csv') {
      exportToExcel()
    } else if (exportFormat === 'pdf') {
      exportToPDF()
    }
  }

  const renderOverviewTab = () => {
    if (!subjectAttainment) return null

    const { 
      overall_attainment, 
      target_attainment, 
      gap_analysis, 
      performance_metrics,
      class_statistics,
      student_distribution,
      difficulty_analysis,
      blooms_analysis,
      exam_analysis,
      co_attainment,
      po_attainment
    } = subjectAttainment

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overall Attainment</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(overall_attainment)}`}>
                  {overall_attainment}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Target Attainment</p>
                <p className="text-2xl font-bold text-gray-900">{target_attainment}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gap</p>
                <p className={`text-2xl font-bold ${getGapColor(gap_analysis?.overall_gap || 0)}`}>
                  {gap_analysis?.overall_gap || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-2xl font-bold text-gray-900">{class_statistics?.total_students || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">COs</p>
                <p className="text-2xl font-bold text-gray-900">{co_attainment?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Award className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">POs</p>
                <p className="text-2xl font-bold text-gray-900">{po_attainment?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attainment Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attainment Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Attainment</span>
                  <span className="font-semibold">{overall_attainment}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${getPerformanceColor(overall_attainment).replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(overall_attainment, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Target Attainment</span>
                  <span className="font-semibold">{target_attainment}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-gray-600"
                    style={{ width: `${Math.min(target_attainment, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical COs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical COs</h3>
            {gap_analysis?.critical_cos && gap_analysis.critical_cos.length > 0 ? (
              <div className="space-y-2">
                {gap_analysis.critical_cos.map((co: string) => (
                  <div key={co} className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-gray-700">{co}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-700">No critical COs</span>
              </div>
            )}
          </div>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Grade Distribution</h3>
            <div className="space-y-3">
              {student_distribution && Object.entries(student_distribution).map(([grade, count]) => (
                <div key={grade} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Grade {grade}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / class_statistics?.total_students) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Difficulty Distribution</h3>
            <div className="space-y-3">
              {difficulty_analysis && Object.entries(difficulty_analysis).map(([difficulty, data]) => {
                const count = typeof data === 'object' ? data.count : data;
                const totalCount = Object.values(difficulty_analysis).reduce((sum, item) => {
                  return sum + (typeof item === 'object' ? item.count : item);
                }, 0);
                
                return (
                  <div key={difficulty} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 capitalize">{difficulty}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            difficulty === 'easy' ? 'bg-green-500' : 
                            difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${totalCount > 0 ? (count / totalCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blooms Taxonomy Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Blooms Taxonomy</h3>
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Detailed Bloom's Taxonomy analysis is available on the dedicated page</p>
              <Link
                to="/teacher/blooms-analytics"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Brain className="h-4 w-4 mr-2" />
                View Bloom's Analysis
              </Link>
            </div>
          </div>

          {/* Exam Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Analysis</h3>
            <div className="space-y-3">
              {exam_analysis && Object.entries(exam_analysis).map(([type, data]: [string, any]) => (
                <div key={type} className="border-b pb-2 last:border-b-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                    <span className="text-xs text-gray-500">{data.exam_type}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>Questions: {data.total_questions}</div>
                    <div>Marks: {data.total_marks}</div>
                    <div>Difficulty: {data.difficulty}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trends */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Attainment</span>
                <span className={`font-semibold ${getPerformanceColor(overall_attainment)}`}>
                  {overall_attainment}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Target Attainment</span>
                <span className="font-semibold text-gray-900">{target_attainment}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gap</span>
                <span className={`font-semibold ${getGapColor(gap_analysis?.overall_gap || 0)}`}>
                  {gap_analysis?.overall_gap || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        {subjectAttainment.recommendations && subjectAttainment.recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-2">
              {subjectAttainment.recommendations.map((rec: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    )
  }

  const renderCOTab = () => {
    if (!subjectAttainment?.co_attainment) return null

    return (
      <div className="space-y-6">
        {/* CO Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectAttainment.co_attainment.map((co: COAttainment) => (
            <div key={co.co_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{co.co_code}</h3>
                  <p className="text-sm text-gray-600">{co.co_description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(co.level)}`}>
                  {co.level}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Attainment</span>
                  <span className={`font-semibold ${getPerformanceColor(co.actual_pct)}`}>
                    {co.actual_pct}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Target</span>
                  <span className="font-semibold text-gray-900">{co.target_pct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gap</span>
                  <span className={`font-semibold ${getGapColor(co.gap)}`}>
                    {co.gap > 0 ? '+' : ''}{co.gap}%
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getPerformanceColor(co.actual_pct).replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(co.actual_pct, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Enhanced CO Details */}
              {co.student_performance && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Student Performance</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{co.student_performance.total_students}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passing:</span>
                      <span className="font-medium text-green-600">{co.student_performance.passing_students}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Excellent:</span>
                      <span className="font-medium text-blue-600">{co.student_performance.excellent_students}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg:</span>
                      <span className="font-medium">{co.student_performance.average_attainment}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Difficulty Analysis for CO */}
              {co.difficulty_analysis && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Question Difficulty</h4>
                  <div className="space-y-1">
                    {Object.entries(co.difficulty_analysis || {}).map(([level, data]) => {
                      const count = data && typeof data === 'object' && 'count' in data ? (data as any).count : (typeof data === 'number' ? data : 0);
                      return (
                        <div key={level} className="flex justify-between text-xs">
                          <span className="text-gray-600 capitalize">{level}:</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations for CO */}
              {co.recommendations && co.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                  <div className="space-y-1">
                    {co.recommendations.slice(0, 2).map((rec: string, index: number) => (
                      <p key={index} className="text-xs text-gray-600">• {rec}</p>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedCO(co)
                  setShowDetailedView(true)
                }}
                className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPOTab = () => {
    if (!subjectAttainment?.po_attainment) return null

    return (
      <div className="space-y-6">
        {/* PO Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectAttainment.po_attainment.map((po: POAttainment) => (
            <div key={po.po_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{po.po_code}</h3>
                  <p className="text-sm text-gray-600">{po.po_description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(po.level)}`}>
                  {po.level}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Attainment</span>
                  <span className={`font-semibold ${getPerformanceColor(po.total_pct)}`}>
                    {po.total_pct}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Direct</span>
                  <span className="font-semibold text-blue-600">{po.direct_pct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Indirect</span>
                  <span className="font-semibold text-green-600">{po.indirect_pct}%</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getPerformanceColor(po.total_pct).replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(po.total_pct, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Enhanced PO Details */}
              {po.attainment_distribution && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Attainment Distribution</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Excellent:</span>
                      <span className="font-medium text-green-600">{po.attainment_distribution.excellent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Good:</span>
                      <span className="font-medium text-blue-600">{po.attainment_distribution.good}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Satisfactory:</span>
                      <span className="font-medium text-yellow-600">{po.attainment_distribution.satisfactory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Needs Improvement:</span>
                      <span className="font-medium text-red-600">{po.attainment_distribution.needs_improvement}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contributing COs */}
              {po.contributing_cos && po.contributing_cos.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Contributing COs</h4>
                  <div className="flex flex-wrap gap-1">
                    {po.contributing_cos.map((co: string) => (
                      <span key={co} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {co}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strength and Improvement Areas */}
              {(po.strength_areas && po.strength_areas.length > 0) || (po.improvement_areas && po.improvement_areas.length > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Areas</h4>
                  {po.strength_areas && po.strength_areas.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-green-600 font-medium">Strengths: </span>
                      <span className="text-xs text-gray-600">{po.strength_areas.join(', ')}</span>
                    </div>
                  )}
                  {po.improvement_areas && po.improvement_areas.length > 0 && (
                    <div>
                      <span className="text-xs text-red-600 font-medium">Improve: </span>
                      <span className="text-xs text-gray-600">{po.improvement_areas.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations for PO */}
              {po.recommendations && po.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                  <div className="space-y-1">
                    {po.recommendations.slice(0, 2).map((rec: string, index: number) => (
                      <p key={index} className="text-xs text-gray-600">• {rec}</p>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedPO(po)
                  setShowDetailedView(true)
                }}
                className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderDetailedTab = () => {
    if (!subjectAttainment) return null

    return (
      <div className="space-y-6">
        {/* Exam Analysis */}
        {subjectAttainment.exam_analysis && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Analysis</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(subjectAttainment.exam_analysis).map(([examName, examData]: [string, any]) => (
                    <tr key={examName}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{examName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{examData.exam_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{examData.total_questions}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{examData.total_marks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{examData.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {subjectAttainment.performance_metrics && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{subjectAttainment.performance_metrics.total_students}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{subjectAttainment.performance_metrics.total_exams}</div>
                <div className="text-sm text-gray-600">Total Exams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{subjectAttainment.performance_metrics.total_questions}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{subjectAttainment.performance_metrics.average_attainment}%</div>
                <div className="text-sm text-gray-600">Average Attainment</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderRecommendationsTab = () => {
    if (!subjectAttainment?.recommendations) return null

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">General Recommendations</h3>
          <div className="space-y-3">
            {subjectAttainment.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CO-specific Recommendations */}
        {subjectAttainment.co_attainment && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CO-specific Recommendations</h3>
            <div className="space-y-4">
              {subjectAttainment.co_attainment
                .filter((co: any) => co.recommendations && co.recommendations.length > 0)
                .map((co: any) => (
                  <div key={co.co_id} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">{co.co_code}</h4>
                    <div className="mt-2 space-y-2">
                      {co.recommendations.map((rec: string, index: number) => (
                        <p key={index} className="text-sm text-gray-600">• {rec}</p>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* PO-specific Recommendations */}
        {subjectAttainment.po_attainment && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PO-specific Recommendations</h3>
            <div className="space-y-4">
              {subjectAttainment.po_attainment
                .filter((po: any) => po.recommendations && po.recommendations.length > 0)
                .map((po: any) => (
                  <div key={po.po_id} className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-gray-900">{po.po_code}</h4>
                    <div className="mt-2 space-y-2">
                      {po.recommendations.map((rec: string, index: number) => (
                        <p key={index} className="text-sm text-gray-600">• {rec}</p>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDetailedView = () => {
    if (!showDetailedView || (!selectedCO && !selectedPO)) return null

    const item = selectedCO || selectedPO
    const isCO = !!selectedCO

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isCO ? 'CO' : 'PO'} Details - {item.co_code || item.po_code}
              </h2>
              <button
                onClick={() => {
                  setShowDetailedView(false)
                  setSelectedCO(null)
                  setSelectedPO(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Metrics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Attainment:</span>
                      <span className={`font-semibold ${getPerformanceColor(item.actual_pct || item.total_pct)}`}>
                        {item.actual_pct || item.total_pct}%
                      </span>
                    </div>
                    {item.target_pct && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Target:</span>
                        <span className="font-semibold">{item.target_pct}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gap:</span>
                      <span className={`font-semibold ${getGapColor(item.gap)}`}>
                        {item.gap > 0 ? '+' : ''}{item.gap}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Level:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(item.level)}`}>
                        {item.level}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Performance</h3>
                  {item.student_performance && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Students:</span>
                        <span className="font-semibold">{item.student_performance.total_students}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Passing:</span>
                        <span className="font-semibold">{item.student_performance.passing_students}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Excellent:</span>
                        <span className="font-semibold">{item.student_performance.excellent_students}</span>
                      </div>
                      {item.student_performance.standard_deviation && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Std Dev:</span>
                          <span className="font-semibold">{item.student_performance.standard_deviation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {item.recommendations && item.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {item.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty Analysis (for CO) */}
              {isCO && item.difficulty_analysis && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Difficulty Analysis</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(item.difficulty_analysis || {}).map(([difficulty, data]) => {
                      const count = data && typeof data === 'object' && 'count' in data ? (data as any).count : (typeof data === 'number' ? data : 0);
                      return (
                        <div key={difficulty} className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-sm text-gray-600 capitalize">{difficulty}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Blooms Taxonomy (for CO) */}
              {isCO && item.blooms_taxonomy && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Blooms Taxonomy</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(item.blooms_taxonomy || {}).map(([level, data]) => {
                      const count = data && typeof data === 'object' && 'count' in data ? (data as any).count : (typeof data === 'number' ? data : 0);
                      return (
                        <div key={level} className="text-center">
                          <div className="text-xl font-bold text-blue-600">{count}</div>
                          <div className="text-sm text-gray-600 capitalize">{level}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (subjectAttainmentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (subjectAttainmentError) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
        <p className="text-gray-600 mb-4">{subjectAttainmentError}</p>
        <button
          onClick={() => selectedSubjectId && dispatch(fetchSubjectAttainment({ subjectId: selectedSubjectId, examType }))}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attainment Analytics</h1>
            <p className="text-gray-600">Comprehensive CO/PO attainment analysis and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Export:</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel' | 'csv')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="excel">Excel/CSV</option>
                <option value="pdf">PDF</option>
              </select>
              <button
                onClick={handleExport}
                className="btn-primary flex items-center space-x-2"
                disabled={!subjectAttainment}
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
            <button
              onClick={() => selectedSubjectId && dispatch(fetchSubjectAttainment({ subjectId: selectedSubjectId, examType }))}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>{showDetailedView ? 'Hide' : 'Show'} Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => handleSubjectChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a subject...</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Exams</option>
              <option value="internal1">Internal 1</option>
              <option value="internal2">Internal 2</option>
              <option value="final">Final</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      {selectedSubjectId && subjectAttainment ? (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'co', label: 'CO Analysis', icon: Target },
                  { id: 'po', label: 'PO Analysis', icon: Award },
                  { id: 'detailed', label: 'Detailed', icon: BarChart2 },
                  { id: 'recommendations', label: 'Recommendations', icon: Info }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'co' && renderCOTab()}
              {activeTab === 'po' && renderPOTab()}
              {activeTab === 'detailed' && renderDetailedTab()}
              {activeTab === 'recommendations' && renderRecommendationsTab()}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Subject Selected</h3>
          <p className="text-gray-600">Please select a subject to view attainment analytics</p>
        </div>
      )}

      {/* Detailed View Modal */}
      {renderDetailedView()}
    </div>
  )
})

AttainmentAnalytics.displayName = 'AttainmentAnalytics'

export default AttainmentAnalytics
