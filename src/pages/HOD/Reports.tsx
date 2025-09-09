import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store/store'
import { analyticsAPI } from '../../services/api'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import toast from 'react-hot-toast'
import { Download, FileText, Calendar, Filter, Users, BookOpen, Award, BarChart3, Settings } from 'lucide-react'
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
  const [reportTemplates, setReportTemplates] = useState([])

  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
    dispatch(fetchUsers())
    loadReportTemplates()
  }, [dispatch])

  const loadReportTemplates = async () => {
    try {
      const templates = await analyticsAPI.getReportTemplates()
      setReportTemplates(templates)
    } catch (error) {
      console.error('Failed to load report templates:', error)
    }
  }

  const reportTypes = [
    {
      id: 'student_performance',
      name: 'Student Performance Report',
      description: 'Individual student performance analysis with CO/PO mapping',
      icon: Users,
      filters: ['class_id', 'subject_id', 'exam_type', 'date_from', 'date_to']
    },
    {
      id: 'co_po_attainment',
      name: 'CO/PO Attainment Report',
      description: 'Course and Program Outcomes attainment analysis',
      icon: Award,
      filters: ['subject_id', 'class_id', 'exam_type']
    },
    {
      id: 'teacher_performance',
      name: 'Faculty Performance Report',
      description: 'Teaching effectiveness and class performance analysis',
      icon: BookOpen,
      filters: ['teacher_id', 'subject_id', 'date_from', 'date_to']
    },
    {
      id: 'class_analysis',
      name: 'Class Analysis Report',
      description: 'Comprehensive class performance with statistical analysis',
      icon: BarChart3,
      filters: ['class_id', 'subject_id', 'exam_type']
    },
    {
      id: 'nba_compliance',
      name: 'NBA Compliance Report',
      description: 'NBA accreditation ready reports with all required metrics',
      icon: FileText,
      filters: ['class_id', 'date_from', 'date_to']
    },
    {
      id: 'department_summary',
      name: 'Department Summary Report',
      description: 'High-level department performance overview',
      icon: Users,
      filters: ['date_from', 'date_to']
    }
  ]

  // Filter data based on user's department
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  const departmentSubjects = subjects.filter(s => {
    const subjectClass = departmentClasses.find(c => c.id === s.class_id)
    return !!subjectClass
  })
  const departmentTeachers = users.filter(u => 
    u.role === 'teacher' && u.department_id === user?.department_id
  )

  const handleGenerateReport = async () => {
    if (!selectedReportType) {
      toast.error('Please select a report type')
      return
    }

    setGenerating(true)
    try {
      const reportData = await analyticsAPI.generateReport(selectedReportType, {
        ...filters,
        department_id: user?.department_id
      })
      
      // Create blob and download
      const blob = new Blob([reportData], { 
        type: filters.format === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
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
      toast.error(error.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleQuickReport = async (reportType: string, quickFilters = {}) => {
    setGenerating(true)
    try {
      const reportData = await analyticsAPI.generateReport(reportType, {
        ...quickFilters,
        department_id: user?.department_id,
        format: 'pdf'
      })
      
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
      toast.error(error.message || 'Failed to generate report')
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
          </select>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => handleQuickReport('department_summary')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Department Summary</p>
            <p className="text-xs text-gray-600">Current performance</p>
          </button>
          
          <button 
            onClick={() => handleQuickReport('co_po_attainment')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Award className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">CO/PO Analysis</p>
            <p className="text-xs text-gray-600">Attainment report</p>
          </button>
          
          <button 
            onClick={() => handleQuickReport('nba_compliance')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">NBA Compliance</p>
            <p className="text-xs text-gray-600">Accreditation ready</p>
          </button>
          
          <button 
            onClick={() => handleQuickReport('teacher_performance')}
            disabled={generating}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Users className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Faculty Performance</p>
            <p className="text-xs text-gray-600">Teaching effectiveness</p>
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Report Generation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {reportTypes.map(report => {
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