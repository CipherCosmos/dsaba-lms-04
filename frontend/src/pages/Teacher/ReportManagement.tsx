import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { reportsAPI } from '../../services/api'
import { 
  FileText, Download, RefreshCw, 
  BarChart3, PieChart, TrendingUp, Users, Target, Award,
  Eye, EyeOff, Share2, Archive
} from 'lucide-react'
import { logger } from '../../core/utils/logger'

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
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<string>('')

  // Filter subjects for current teacher
  const teacherSubjects = useMemo(() => 
    subjects.filter(s => s.teacher_id === user?.id),
    [subjects, user?.id]
  )

  // Icon mapping for report templates
  const getTemplateIcon = (templateId: string) => {
    const iconMap: { [key: string]: any } = {
      'student_performance': Users,
      'co_po_attainment': Target,
      'teacher_performance': Award,
      'class_analytics': BarChart3,
      'comprehensive': FileText,
      'grade_distribution': PieChart,
      'performance_trends': TrendingUp,
      'raw_data': Archive
    }
    return iconMap[templateId] || FileText
  }

  const getTemplateColor = (templateId: string) => {
    const colorMap: { [key: string]: string } = {
      'student_performance': 'purple',
      'co_po_attainment': 'blue',
      'teacher_performance': 'green',
      'class_analytics': 'orange',
      'comprehensive': 'indigo',
      'grade_distribution': 'pink',
      'performance_trends': 'teal',
      'raw_data': 'gray'
    }
    return colorMap[templateId] || 'blue'
  }

  useEffect(() => {
    dispatch(fetchSubjects())
    loadGeneratedReports()
    fetchReportTemplates()
  }, [dispatch])

  const fetchReportTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const types = await reportsAPI.getTypes()
      const formattedTemplates = (types?.report_types || []).map((template: any) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category || (template.id.includes('attainment') ? 'attainment' : 
                 template.id.includes('performance') ? 'performance' : 'academic'),
        format: template.format || (template.id.includes('raw') ? 'json' : 'pdf'),
        icon: getTemplateIcon(template.id),
        color: getTemplateColor(template.id),
        filters: template.filters || []
      }))
      setReportTemplates(formattedTemplates)
    } catch (error) {
      logger.error('Error fetching report templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

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
      const filters = {
        subject_id: selectedSubjectId,
        exam_type: reportFilters.examType === 'all' ? undefined : reportFilters.examType,
        include_charts: reportFilters.includeCharts,
        include_details: reportFilters.includeDetails,
        include_recommendations: reportFilters.includeRecommendations
      }

      const response = await reportsAPI.generateReport(
        selectedTemplate.id,
        filters,
        selectedTemplate.format
      )

      // Create blob and download directly
      const blob = new Blob([response], { 
        type: selectedTemplate.format === 'pdf' ? 'application/pdf' : 
              selectedTemplate.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'text/csv'
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedTemplate.name}_${new Date().toISOString().split('T')[0]}.${selectedTemplate.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Add to generated reports
      const newReport = {
        id: Date.now().toString(),
        name: selectedTemplate.name,
        type: selectedTemplate.id,
        format: selectedTemplate.format,
        generatedAt: new Date().toISOString(),
        size: blob.size,
        status: 'completed'
      }
      
      setGeneratedReports(prev => [newReport, ...prev])
      setTaskStatus('Report generated successfully!')
      
    } catch (error) {
      logger.error('Error generating report:', error)
      setTaskStatus('Error generating report')
    } finally {
      setGenerating(false)
    }
  }

  // Report status polling removed - backend doesn't support async report generation yet
  // Reports are generated synchronously

  const downloadReport = async (report: any) => {
    try {
      // Use appropriate report endpoint based on report type
      let blob
      if (report.template.id.includes('student')) {
        blob = await reportsAPI.getStudentReport(report.studentId || report.filters?.student_id, report.subjectId, 'pdf')
      } else if (report.template.id.includes('class')) {
        // Note: Legacy class_id usage - should migrate to semester/subject_assignment based reports
        blob = await reportsAPI.getClassReport(report.classId || report.filters?.class_id, report.subjectId, 'pdf')
      } else if (report.template.id.includes('co-po')) {
        blob = await reportsAPI.getCOPOReport(report.subjectId, 'pdf')
      } else {
        // Fallback to generate report
        const result = await reportsAPI.generateReport(report.template.id, report.filters, 'pdf')
        blob = result
      }
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.template.name}-${new Date(report.generatedAt).toISOString().split('T')[0]}.${report.template.format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('Error downloading report:', error)
    }
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
            {loadingTemplates ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-600">Loading report templates...</p>
              </div>
            ) : (
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
            )}
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
                  {generating ? `Generating Report... (${taskStatus})` : `Generate ${selectedTemplate.name}`}
                </span>
              </button>
              {generating && (
                <div className="mt-3 text-sm text-gray-600 text-center">
                  <p>Report generation is in progress. This may take a few minutes.</p>
                  <p className="text-xs mt-1">Status: {taskStatus}</p>
                </div>
              )}
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
