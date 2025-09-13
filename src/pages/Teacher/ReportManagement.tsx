import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { 
  FileText, Download, Calendar, Filter, Search, RefreshCw, 
  BarChart3, PieChart, TrendingUp, Users, Target, Award,
  Eye, EyeOff, Settings, Printer, Share2, Archive
} from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'academic' | 'performance' | 'attainment' | 'comprehensive'
  format: 'pdf' | 'excel' | 'json' | 'csv'
  icon: any
  color: string
}

const ReportManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportFilters, setReportFilters] = useState({
    examType: 'all',
    dateRange: 'all',
    includeCharts: true,
    includeDetails: true,
    includeRecommendations: true
  })
  const [generating, setGenerating] = useState(false)
  const [generatedReports, setGeneratedReports] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)

  // Filter subjects for current teacher
  const teacherSubjects = useMemo(() => 
    subjects.filter(s => s.teacher_id === user?.id),
    [subjects, user?.id]
  )

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'co-attainment',
      name: 'CO Attainment Report',
      description: 'Detailed Course Outcome attainment analysis with targets and achievements',
      category: 'attainment',
      format: 'pdf',
      icon: Target,
      color: 'blue'
    },
    {
      id: 'po-attainment',
      name: 'PO Attainment Report',
      description: 'Program Outcome attainment analysis with CO mappings',
      category: 'attainment',
      format: 'pdf',
      icon: Award,
      color: 'green'
    },
    {
      id: 'student-performance',
      name: 'Student Performance Report',
      description: 'Individual student performance analysis with grades and trends',
      category: 'performance',
      format: 'excel',
      icon: Users,
      color: 'purple'
    },
    {
      id: 'class-analytics',
      name: 'Class Analytics Report',
      description: 'Comprehensive class performance with statistics and comparisons',
      category: 'performance',
      format: 'pdf',
      icon: BarChart3,
      color: 'orange'
    },
    {
      id: 'comprehensive',
      name: 'Comprehensive Report',
      description: 'Complete analysis including CO/PO attainment, student performance, and recommendations',
      category: 'comprehensive',
      format: 'pdf',
      icon: FileText,
      color: 'indigo'
    },
    {
      id: 'grade-distribution',
      name: 'Grade Distribution Report',
      description: 'Grade distribution analysis with charts and statistics',
      category: 'academic',
      format: 'excel',
      icon: PieChart,
      color: 'pink'
    },
    {
      id: 'performance-trends',
      name: 'Performance Trends Report',
      description: 'Performance trends analysis across different exams and time periods',
      category: 'performance',
      format: 'pdf',
      icon: TrendingUp,
      color: 'teal'
    },
    {
      id: 'raw-data',
      name: 'Raw Data Export',
      description: 'Export all raw data in JSON/CSV format for external analysis',
      category: 'academic',
      format: 'json',
      icon: Archive,
      color: 'gray'
    }
  ]

  useEffect(() => {
    dispatch(fetchSubjects())
    loadGeneratedReports()
  }, [dispatch])

  const loadGeneratedReports = () => {
    // Load previously generated reports from localStorage
    const saved = localStorage.getItem('generatedReports')
    if (saved) {
      setGeneratedReports(JSON.parse(saved))
    }
  }

  const saveGeneratedReport = (report: any) => {
    const newReports = [...generatedReports, report]
    setGeneratedReports(newReports)
    localStorage.setItem('generatedReports', JSON.stringify(newReports))
  }

  const generateReport = async () => {
    if (!selectedSubjectId || !selectedTemplate) return

    setGenerating(true)
    try {
      const reportData = {
        template: selectedTemplate,
        subjectId: selectedSubjectId,
        filters: reportFilters,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.id
      }

      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const report = {
        id: Date.now().toString(),
        ...reportData,
        status: 'completed',
        downloadUrl: `#report-${Date.now()}`,
        size: Math.floor(reportData.content.length * 0.5) + 500 // Estimate based on content length
      }

      saveGeneratedReport(report)
      setShowPreview(true)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = (report: any) => {
    // Simulate download
    const blob = new Blob([`Report: ${report.template.name}\nGenerated: ${report.generatedAt}`], { 
      type: 'text/plain' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.template.name}-${report.generatedAt}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      academic: 'bg-blue-100 text-blue-800',
      performance: 'bg-green-100 text-green-800',
      attainment: 'bg-purple-100 text-purple-800',
      comprehensive: 'bg-indigo-100 text-indigo-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getFormatColor = (format: string) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800',
      excel: 'bg-green-100 text-green-800',
      json: 'bg-yellow-100 text-yellow-800',
      csv: 'bg-blue-100 text-blue-800'
    }
    return colors[format as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (teacherSubjects.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
        <p className="text-gray-600">You don't have any subjects assigned to generate reports.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive reports for your subjects</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary flex items-center space-x-2"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generation Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Selection */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Subject</h3>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value) || null)}
              className="input-field w-full"
            >
              <option value="">Choose a subject</option>
              {teacherSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          {/* Report Templates */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-${template.color}-100`}>
                      <template.icon className={`w-6 h-6 text-${template.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormatColor(template.format)}`}>
                          {template.format.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Filters */}
          {selectedTemplate && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                  <select
                    value={reportFilters.examType}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, examType: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="all">All Exams</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={reportFilters.dateRange}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="all">All Time</option>
                    <option value="current_semester">Current Semester</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="last_90_days">Last 90 Days</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportFilters.includeCharts}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include Charts and Graphs</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportFilters.includeDetails}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, includeDetails: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include Detailed Analysis</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={reportFilters.includeRecommendations}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, includeRecommendations: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include Recommendations</span>
                </label>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {selectedSubjectId && selectedTemplate && (
            <div className="card">
              <button
                onClick={generateReport}
                disabled={generating}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {generating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                <span>
                  {generating ? 'Generating Report...' : `Generate ${selectedTemplate.name}`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Generated Reports Panel */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Reports</h3>
            
            {generatedReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No reports generated yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedReports
                  .filter(report => report.generatedBy === user?.id)
                  .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                  .map(report => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{report.template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {teacherSubjects.find(s => s.id === report.subjectId)?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(report.generatedAt).toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormatColor(report.template.format)}`}>
                            {report.template.format.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(report.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadReport(report)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Preview */}
          {showPreview && selectedTemplate && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center py-8">
                  <selectedTemplate.icon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-900 mb-2">{selectedTemplate.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{selectedTemplate.description}</p>
                  <div className="text-xs text-gray-500">
                    Preview will be available after generation
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

export default ReportManagement
