import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { reportsAPI } from '../../services/api'
import { 
  FileText, Download, RefreshCw, 
  BarChart3, PieChart, TrendingUp, Users, Target, Award,
  Eye, EyeOff, Share2, Archive, Building2, GraduationCap,
  UserCheck, BookOpen, TrendingDown, AlertTriangle, CheckCircle
} from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'department' | 'teacher' | 'student' | 'attainment' | 'strategic' | 'accreditation'
  format: 'pdf' | 'excel' | 'json' | 'csv'
  icon: any
  color: string
  roles: string[]
}

const HODReportManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [reportFilters, setReportFilters] = useState({
    academicYear: '2024-25',
    semester: 'all',
    teacherId: null,
    classId: null,
    studentId: null,
    subjectId: null,
    comparisonType: 'classes',
    timePeriod: 'current_semester',
    planningPeriod: 'annual',
    accreditationStandard: 'NBA',
    resourceType: 'all',
    includeCharts: true,
    includeDetails: true,
    includeRecommendations: true
  })
  const [generating, setGenerating] = useState(false)
  const [generatedReports, setGeneratedReports] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [taskStatus, setTaskStatus] = useState<string>('')

  // Filter subjects for current HOD's department
  const hodSubjects = useMemo(() => 
    subjects.filter(s => s.class_id && s.class_id === user?.department_id),
    [subjects, user?.department_id]
  )

  // Icon mapping for report templates
  const getIcon = (category: string) => {
    const iconMap: { [key: string]: any } = {
      department: Building2,
      teacher: UserCheck,
      student: GraduationCap,
      attainment: Target,
      strategic: TrendingUp,
      accreditation: Award
    }
    return iconMap[category] || FileText
  }

  // Color mapping for report templates
  const getColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      department: 'bg-blue-500',
      teacher: 'bg-green-500',
      student: 'bg-purple-500',
      attainment: 'bg-orange-500',
      strategic: 'bg-indigo-500',
      accreditation: 'bg-red-500'
    }
    return colorMap[category] || 'bg-gray-500'
  }

  // HOD-specific report templates
  const hodReportTemplates: ReportTemplate[] = [
    {
      id: 'department_performance',
      name: 'Department Performance Report',
      description: 'Comprehensive department-wide performance analysis',
      category: 'department',
      format: 'pdf',
      icon: Building2,
      color: 'bg-blue-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'teacher_effectiveness',
      name: 'Teacher Effectiveness Analysis',
      description: 'Analysis of teacher performance and effectiveness',
      category: 'teacher',
      format: 'pdf',
      icon: UserCheck,
      color: 'bg-green-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'student_progress_tracking',
      name: 'Student Progress Tracking',
      description: 'Track student progress across subjects and semesters',
      category: 'student',
      format: 'pdf',
      icon: GraduationCap,
      color: 'bg-purple-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'attainment_gap_analysis',
      name: 'Attainment Gap Analysis',
      description: 'Identify gaps in CO/PO attainment and improvement areas',
      category: 'attainment',
      format: 'pdf',
      icon: Target,
      color: 'bg-orange-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'strategic_planning',
      name: 'Strategic Planning Report',
      description: 'Strategic insights for department planning and improvement',
      category: 'strategic',
      format: 'pdf',
      icon: TrendingUp,
      color: 'bg-indigo-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'comparative_analysis',
      name: 'Comparative Analysis Report',
      description: 'Compare performance across classes, subjects, and time periods',
      category: 'department',
      format: 'pdf',
      icon: BarChart3,
      color: 'bg-blue-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'accreditation_report',
      name: 'Accreditation Report',
      description: 'Comprehensive report for accreditation and quality assurance',
      category: 'accreditation',
      format: 'pdf',
      icon: Award,
      color: 'bg-red-500',
      roles: ['hod', 'admin']
    },
    {
      id: 'resource_utilization',
      name: 'Resource Utilization Report',
      description: 'Analysis of resource utilization and efficiency',
      category: 'department',
      format: 'pdf',
      icon: Archive,
      color: 'bg-gray-500',
      roles: ['hod', 'admin']
    }
  ]

  useEffect(() => {
    dispatch(fetchSubjects())
    loadReportTemplates()
    loadGeneratedReports()
  }, [dispatch])

  const loadReportTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const templates = await reportsAPI.getReportTemplates()
      // Filter templates for HOD role
      const hodTemplates = templates.filter((template: any) => 
        template.roles && template.roles.includes('hod')
      )
      setReportTemplates(hodTemplates)
    } catch (error) {
      console.error('Error fetching report templates:', error)
      // Use fallback templates
      setReportTemplates(hodReportTemplates)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const loadGeneratedReports = () => {
    const saved = localStorage.getItem('hodGeneratedReports')
    if (saved) {
      setGeneratedReports(JSON.parse(saved))
    }
  }

  const saveGeneratedReport = (report: any) => {
    const newReports = [...generatedReports, report]
    setGeneratedReports(newReports)
    localStorage.setItem('hodGeneratedReports', JSON.stringify(newReports))
  }

  const generateReport = async () => {
    if (!selectedDepartmentId || !selectedTemplate) return

    setGenerating(true)
    try {
      const filters = {
        department_id: selectedDepartmentId,
        academic_year: reportFilters.academicYear,
        semester: reportFilters.semester === 'all' ? undefined : reportFilters.semester,
        teacher_id: reportFilters.teacherId,
        class_id: reportFilters.classId,
        student_id: reportFilters.studentId,
        subject_id: reportFilters.subjectId,
        comparison_type: reportFilters.comparisonType,
        time_period: reportFilters.timePeriod,
        planning_period: reportFilters.planningPeriod,
        accreditation_standard: reportFilters.accreditationStandard,
        resource_type: reportFilters.resourceType,
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
      console.error('Error generating report:', error)
      setTaskStatus('Error generating report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = (report: any) => {
    // This would implement re-downloading of previously generated reports
    console.log('Downloading report:', report)
  }

  const deleteReport = (reportId: string) => {
    const updatedReports = generatedReports.filter(r => r.id !== reportId)
    setGeneratedReports(updatedReports)
    localStorage.setItem('hodGeneratedReports', JSON.stringify(updatedReports))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HOD Report Management</h1>
        <p className="text-gray-600">Generate comprehensive reports and analytics for your department</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Department Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Department Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartmentId || ''}
                  onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  <option value={user?.department_id || 1}>
                    {user?.department_id === 1 ? 'Computer Science' : 
                     user?.department_id === 2 ? 'Electronics' : 
                     user?.department_id === 3 ? 'Mechanical' : 'Your Department'}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <select
                  value={reportFilters.academicYear}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2022-23">2022-23</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Template Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Select Report Type</h2>
            {loadingTemplates ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTemplates.map((template) => {
                  const IconComponent = getIcon(template.category)
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getColor(template.category)}`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {selectedTemplate && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Advanced Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedTemplate.id === 'teacher_effectiveness' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teacher
                    </label>
                    <select
                      value={reportFilters.teacherId || ''}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, teacherId: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Teachers</option>
                      {/* Add teacher options here */}
                    </select>
                  </div>
                )}
                
                {selectedTemplate.id === 'student_progress_tracking' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class
                      </label>
                      <select
                        value={reportFilters.classId || ''}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, classId: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Classes</option>
                        {/* Add class options here */}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student
                      </label>
                      <select
                        value={reportFilters.studentId || ''}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, studentId: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Students</option>
                        {/* Add student options here */}
                      </select>
                    </div>
                  </>
                )}

                {selectedTemplate.id === 'attainment_gap_analysis' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      value={reportFilters.subjectId || ''}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, subjectId: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Subjects</option>
                      {hodSubjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTemplate.id === 'comparative_analysis' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comparison Type
                    </label>
                    <select
                      value={reportFilters.comparisonType}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, comparisonType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="classes">Classes</option>
                      <option value="subjects">Subjects</option>
                      <option value="teachers">Teachers</option>
                      <option value="time_periods">Time Periods</option>
                    </select>
                  </div>
                )}

                {selectedTemplate.id === 'accreditation_report' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accreditation Standard
                    </label>
                    <select
                      value={reportFilters.accreditationStandard}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, accreditationStandard: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NBA">NBA</option>
                      <option value="NAAC">NAAC</option>
                      <option value="ABET">ABET</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Generate Report</h2>
                <p className="text-gray-600">Click to generate your selected report</p>
              </div>
              <button
                onClick={generateReport}
                disabled={!selectedDepartmentId || !selectedTemplate || generating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {generating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                <span>{generating ? 'Generating...' : 'Generate Report'}</span>
              </button>
            </div>
            {taskStatus && (
              <div className={`mt-4 p-3 rounded-lg ${
                taskStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {taskStatus}
              </div>
            )}
          </div>
        </div>

        {/* Generated Reports */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Reports</h2>
            {generatedReports.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No reports generated yet</p>
            ) : (
              <div className="space-y-3">
                {generatedReports.map((report) => (
                  <div key={report.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(report.generatedAt)} • {formatFileSize(report.size)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadReport(report)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HODReportManagement
