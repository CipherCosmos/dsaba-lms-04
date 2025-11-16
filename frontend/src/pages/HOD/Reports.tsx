import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { reportsAPI } from '../../services/api'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import toast from 'react-hot-toast'
import { logger } from '../../core/utils/logger'
import { Download, FileText, Filter, Users, BookOpen, Award, BarChart2, BarChart3, Building, TrendingUp, Target, Brain, Gauge, Layers } from 'lucide-react'
import { format } from 'date-fns'

const Reports = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { users } = useSelector((state: RootState) => state.users)
  const dispatch = useDispatch<AppDispatch>()

  const [selectedReportType, setSelectedReportType] = useState('')
  const [filters, setFilters] = useState({
    subject_id: '',
    class_id: '',
    teacher_id: '',
    exam_type: '',
    date_from: '',
    date_to: '',
    format: 'pdf'
  })
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
    dispatch(fetchUsers())
    loadReportTemplates()
  }, [dispatch])

  const loadReportTemplates = async () => {
    try {
      const types = await reportsAPI.getTypes()
      logger.debug('Report types loaded:', types?.report_types?.length || 0)
    } catch (error) {
      logger.error('Failed to load report types:', error)
    }
  }

  const reportTypes = [
    // Teacher-level reports
    {
      id: 'student_performance',
      name: 'Student Performance Report',
      description: 'Individual student performance analysis with CO/PO mapping',
      icon: Users,
      filters: ['class_id', 'subject_id', 'exam_type', 'date_from', 'date_to'],
      category: 'Student Analytics'
    },
    {
      id: 'class_analytics',
      name: 'Class Analytics Report',
      description: 'Comprehensive class performance with statistical analysis',
      icon: BarChart3,
      filters: ['class_id', 'subject_id', 'exam_type'],
      category: 'Class Analytics'
    },
    {
      id: 'co_po_attainment',
      name: 'CO/PO Attainment Report',
      description: 'Course and Program Outcomes attainment analysis',
      icon: Award,
      filters: ['subject_id', 'class_id', 'exam_type'],
      category: 'Attainment Analysis'
    },
    {
      id: 'exam_analysis',
      name: 'Exam Analysis Report',
      description: 'Detailed exam performance and question analysis',
      icon: FileText,
      filters: ['exam_id', 'subject_id'],
      category: 'Exam Analytics'
    },
    {
      id: 'comprehensive_analysis',
      name: 'Comprehensive Analysis Report',
      description: 'Complete analysis with all metrics and insights',
      icon: BarChart3,
      filters: ['class_id', 'subject_id', 'exam_type'],
      category: 'Comprehensive Analytics'
    },
    {
      id: 'custom_analysis',
      name: 'Custom Analysis Report',
      description: 'Customizable analysis based on specific criteria',
      icon: Filter,
      filters: ['class_id', 'subject_id', 'exam_type', 'date_from', 'date_to'],
      category: 'Custom Analytics'
    },
    
    // Detailed CO-PO Analysis Reports (USP Features)
    {
      id: 'detailed_co_analysis',
      name: 'Detailed CO Analysis Report',
      description: 'Comprehensive Course Outcome analysis with trends, gaps, and recommendations',
      icon: Target,
      filters: ['subject_id', 'exam_type'],
      category: 'CO-PO Analysis'
    },
    {
      id: 'detailed_po_analysis',
      name: 'Detailed PO Analysis Report',
      description: 'Comprehensive Program Outcome analysis with dependency mapping',
      icon: Layers,
      filters: ['subject_id', 'exam_type'],
      category: 'CO-PO Analysis'
    },
    {
      id: 'co_po_mapping_analysis',
      name: 'CO-PO Mapping Analysis Report',
      description: 'Analysis of CO-PO relationships and mapping effectiveness',
      icon: BarChart2,
      filters: ['subject_id', 'class_id'],
      category: 'CO-PO Analysis'
    },
    {
      id: 'comprehensive_co_po_report',
      name: 'Comprehensive CO-PO Report',
      description: 'Complete CO-PO analysis with all metrics, trends, and strategic insights',
      icon: Brain,
      filters: ['subject_id', 'class_id', 'exam_type'],
      category: 'CO-PO Analysis'
    },
    
    // HOD-level reports
    {
      id: 'department_performance',
      name: 'Department Performance Report',
      description: 'Overall department performance and key metrics',
      icon: Building,
      filters: ['date_from', 'date_to'],
      category: 'Department Analytics'
    },
    {
      id: 'teacher_effectiveness',
      name: 'Teacher Effectiveness Report',
      description: 'Faculty performance evaluation and effectiveness analysis',
      icon: BookOpen,
      filters: ['teacher_id', 'subject_id', 'date_from', 'date_to'],
      category: 'Faculty Analytics'
    },
    {
      id: 'student_progress_tracking',
      name: 'Student Progress Tracking Report',
      description: 'Long-term student progress and improvement tracking',
      icon: TrendingUp,
      filters: ['class_id', 'subject_id', 'date_from', 'date_to'],
      category: 'Student Analytics'
    },
    {
      id: 'attainment_gap_analysis',
      name: 'Attainment Gap Analysis Report',
      description: 'Analysis of gaps in CO/PO attainment and improvement areas',
      icon: Target,
      filters: ['subject_id', 'class_id', 'exam_type'],
      category: 'Attainment Analysis'
    },
    {
      id: 'strategic_planning',
      name: 'Strategic Planning Report',
      description: 'Strategic insights for department planning and development',
      icon: Brain,
      filters: ['date_from', 'date_to'],
      category: 'Strategic Analytics'
    },
    {
      id: 'comparative_analysis',
      name: 'Comparative Analysis Report',
      description: 'Comparative analysis across classes, subjects, and time periods',
      icon: BarChart3,
      filters: ['class_id', 'subject_id', 'exam_type', 'date_from', 'date_to'],
      category: 'Comparative Analytics'
    },
    {
      id: 'accreditation_report',
      name: 'Accreditation Report',
      description: 'NBA accreditation ready reports with all required metrics',
      icon: Award,
      filters: ['class_id', 'date_from', 'date_to'],
      category: 'Accreditation'
    },
    {
      id: 'resource_utilization',
      name: 'Resource Utilization Report',
      description: 'Analysis of resource utilization and efficiency metrics',
      icon: Gauge,
      filters: ['date_from', 'date_to'],
      category: 'Resource Analytics'
    }
  ]

  // Filter data based on user's department
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  const departmentSubjects = subjects.filter(s => s.department_id === user?.department_id)
  const userDeptId = user?.department_ids?.[0] || (user as any)?.department_id
  const departmentTeachers = users.filter(u => {
    if (u.role !== 'teacher') return false
    if (u.department_ids && u.department_ids.length > 0) {
      return u.department_ids[0] === userDeptId
    }
    return (u as any).department_id === userDeptId
  })

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      toast.error('Please select a report type')
      return
    }

    // Validate required filters for CO/PO reports
    if ((selectedReportType.includes('co') || selectedReportType.includes('po')) && !filters.subject_id) {
      toast.error('Please select a subject for CO/PO analysis reports')
      return
    }

    setGenerating(true)
    try {
      const reportData = await reportsAPI.generateReport(selectedReportType, {
        ...filters,
        department_id: user?.department_id
      }, filters.format)
      
      // Create blob and download
      const blob = new Blob([reportData], { 
        type: filters.format === 'pdf' 
          ? 'application/pdf' 
          : filters.format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedReportType}_${format(new Date(), 'yyyy-MM-dd')}.${filters.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Report generated successfully!')
    } catch (error: any) {
      logger.error('Report generation error:', error)
      toast.error(error.response?.data?.detail || error.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleQuickReport = async (reportType: string, quickFilters = {}) => {
    setGenerating(true)
    try {
      // Get a default subject for the HOD's department
      const hodSubjects = subjects.filter(s => s.department_id === user?.department_id)
      const defaultSubject = hodSubjects[0]
      
      if (!defaultSubject && (reportType.includes('co') || reportType.includes('po'))) {
        toast.error('No subjects available for CO/PO analysis. Please add subjects first.')
        setGenerating(false)
        return
      }
      
      const reportData = await reportsAPI.generateReport(reportType, {
        ...quickFilters,
        department_id: user?.department_id,
        subject_id: defaultSubject?.id || (quickFilters as any).subject_id
      }, 'pdf')
      
      const blob = new Blob([reportData], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Quick report generated successfully!')
    } catch (error: any) {
      logger.error('Quick report generation error:', error)
      toast.error(error.response?.data?.detail || error.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const selectedReport = reportTypes.find(r => r.id === selectedReportType)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">Export Format:</span>
          <select
            value={filters.format}
            onChange={(e) => setFilters({ ...filters, format: e.target.value })}
            className="input-field"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button 
            onClick={() => handleQuickReport('detailed_co_analysis')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Detailed CO Analysis</p>
            <p className="text-xs text-gray-600">Course Outcomes</p>
          </button>
          <button 
            onClick={() => handleQuickReport('detailed_po_analysis')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Layers className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Detailed PO Analysis</p>
            <p className="text-xs text-gray-600">Program Outcomes</p>
          </button>
          <button 
            onClick={() => handleQuickReport('comprehensive_co_po_report')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Brain className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Comprehensive CO-PO</p>
            <p className="text-xs text-gray-600">Complete analysis</p>
          </button>
          <button 
            onClick={() => handleQuickReport('department_performance')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Building className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Department Performance</p>
            <p className="text-xs text-gray-600">Overall metrics</p>
          </button>
          
          <button 
            onClick={() => handleQuickReport('teacher_effectiveness')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <BookOpen className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Faculty Effectiveness</p>
            <p className="text-xs text-gray-600">Teaching evaluation</p>
          </button>
          
          <button 
            onClick={() => handleQuickReport('accreditation_report')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Accreditation Report</p>
            <p className="text-xs text-gray-600">NBA compliance</p>
          </button>
          
          <button 
            onClick={() => handleQuickReport('strategic_planning')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Brain className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Strategic Planning</p>
            <p className="text-xs text-gray-600">Department insights</p>
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Report Generation</h3>
        
        {/* Group reports by category */}
        {Object.entries(
          reportTypes.reduce((acc, report) => {
            const category = report.category || 'Other'
            if (!acc[category]) acc[category] = []
            acc[category].push(report)
            return acc
          }, {} as Record<string, typeof reportTypes>)
        ).map(([category, reports]) => (
          <div key={category} className="mb-8">
            <h4 className="text-md font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
              {category}
            </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {reports.map(report => {
            const Icon = report.icon
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReportType(report.id)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedReportType === report.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Icon className={`h-6 w-6 ${
                    selectedReportType === report.id ? 'text-primary-600' : 'text-gray-600'
                  }`} />
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            )
          })}
        </div>
          </div>
        ))}

        {/* Filters */}
        {selectedReport && (
          <div className="border-t pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="h-5 w-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-900">Report Filters</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedReport.filters.includes('class_id') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    value={filters.class_id}
                    onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">All Classes</option>
                    {departmentClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedReport.filters.includes('subject_id') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    value={filters.subject_id}
                    onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">All Subjects</option>
                    {departmentSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedReport.filters.includes('teacher_id') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher
                  </label>
                  <select
                    value={filters.teacher_id}
                    onChange={(e) => setFilters({ ...filters, teacher_id: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">All Teachers</option>
                    {departmentTeachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedReport.filters.includes('exam_type') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={filters.exam_type}
                    onChange={(e) => setFilters({ ...filters, exam_type: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="">All Exams</option>
                    <option value="internal1">Internal 1</option>
                    <option value="internal2">Internal 2</option>
                    <option value="final">Final Exam</option>
                  </select>
                </div>
              )}

              {selectedReport.filters.includes('date_from') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              )}

              {selectedReport.filters.includes('date_to') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {generating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Download size={18} />
                )}
                <span>{generating ? 'Generating...' : 'Generate Report'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Templates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Report Templates</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">NBA Accreditation Package</p>
                <p className="text-sm text-gray-600">Complete documentation for NBA submission</p>
              </div>
            </div>
            <button 
              onClick={() => handleQuickReport('nba_compliance')}
              disabled={generating}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Monthly Performance Dashboard</p>
                <p className="text-sm text-gray-600">Executive summary for leadership review</p>
              </div>
            </div>
            <button 
              onClick={() => handleQuickReport('department_summary')}
              disabled={generating}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Award className="h-5 w-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Faculty Assessment Report</p>
                <p className="text-sm text-gray-600">Teaching effectiveness evaluation</p>
              </div>
            </div>
            <button 
              onClick={() => handleQuickReport('teacher_performance')}
              disabled={generating}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Student Performance Report</p>
                <p className="text-sm text-gray-500">Generated on {format(new Date(), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-600">PDF</span>
              <button className="text-primary-600 hover:text-primary-700">
                <Download size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded">
                <Award className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">CO/PO Attainment Report</p>
                <p className="text-sm text-gray-500">Generated on {format(new Date(Date.now() - 86400000), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600">Excel</span>
              <button className="text-primary-600 hover:text-primary-700">
                <Download size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports