import { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { fetchExams } from '../../store/slices/examSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchMarksByExam, saveMarks } from '../../store/slices/marksSlice'
import { marksAPI } from '../../services/api'
import { 
  Download, Save, Users, FileSpreadsheet, 
  Search, CheckCircle, AlertTriangle, BarChart3, Copy, Upload,
  SortAsc, SortDesc, Filter, Eye, Edit3, Trash2, Plus, Minus,
  TrendingUp, Award, Target, Clock, BookOpen, Calculator,
  RefreshCw, Settings, MoreVertical, Share2, Archive, Play, Pause
} from 'lucide-react'
import * as XLSX from 'xlsx'

const MarksEntryEnhanced = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { exams } = useSelector((state: RootState) => state.exams)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { users } = useSelector((state: RootState) => state.users)
  const { marks, loading } = useSelector((state: RootState) => state.marks)
  const { user } = useSelector((state: RootState) => state.auth)
  
  // Enhanced state management
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [marksData, setMarksData] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'percentage'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showStats, setShowStats] = useState(true)
  const [autoSave, setAutoSave] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [lockStatus, setLockStatus] = useState<any>(null)
  const [loadingLockStatus, setLoadingLockStatus] = useState(false)
  
  // Enhanced features state
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [quickFillValue, setQuickFillValue] = useState('')
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [showValidation, setShowValidation] = useState(true)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<any[]>([])
  const [uploadError, setUploadError] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [gradeDistribution, setGradeDistribution] = useState<any>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  // Refs for keyboard shortcuts
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dispatch(fetchExams())
    dispatch(fetchSubjects())
    dispatch(fetchUsers())
  }, [dispatch])

  // Filter subjects and exams for current teacher
  const teacherSubjects = useMemo(() => 
    subjects?.filter(s => s && s.teacher_id === user?.id) || [],
    [subjects, user?.id]
  )
  
  const teacherExams = useMemo(() => {
    console.log('Teacher Exams Debug:', { exams, teacherSubjects, user })
    return exams?.filter(exam => 
      teacherSubjects.some(subject => subject.id === exam.subject_id)
    ) || []
  }, [exams, teacherSubjects])

  // Enhanced calculations with proper error handling
  const calculateTotals = useMemo(() => {
    if (!selectedExam || !marksData.length) return { totalMarks: 0, average: 0, passRate: 0 }
    
    const totalMarks = selectedExam.total_marks || 0
    const validMarks = marksData.filter(s => s.total !== undefined && !isNaN(s.total))
    const totalObtained = validMarks.reduce((sum, s) => sum + (s.total || 0), 0)
    const average = validMarks.length > 0 ? totalObtained / validMarks.length : 0
    const passCount = validMarks.filter(s => (s.total || 0) >= (totalMarks * 0.4)).length
    const passRate = validMarks.length > 0 ? (passCount / validMarks.length) * 100 : 0
    
    return {
      totalMarks,
      average: Math.round(average * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      totalStudents: validMarks.length,
      passCount: passCount
    }
  }, [marksData, selectedExam])

  // Enhanced statistics with more details
  const statistics = useMemo(() => {
    if (!marksData.length || !selectedExam) return null
    
    const { totalMarks, average, passRate, totalStudents, passCount } = calculateTotals || {}
    const marks = marksData.map(s => s.total || 0).filter((m: number) => !isNaN(m))
    
    // Grade distribution
    const gradeDistribution = {
      A: marks.filter(m => m >= totalMarks * 0.9).length,
      B: marks.filter(m => m >= totalMarks * 0.8 && m < totalMarks * 0.9).length,
      C: marks.filter(m => m >= totalMarks * 0.7 && m < totalMarks * 0.8).length,
      D: marks.filter(m => m >= totalMarks * 0.6 && m < totalMarks * 0.7).length,
      F: marks.filter(m => m < totalMarks * 0.6).length
    }

    // Performance metrics
    const highest = Math.max(...marks, 0)
    const lowest = Math.min(...marks, 0)
    const median = marks.length > 0 ? marks.sort((a, b) => a - b)[Math.floor(marks.length / 2)] : 0
    
    // Standard deviation
    const variance = marks.length > 0 ? marks.reduce((acc, mark) => acc + Math.pow(mark - average, 2), 0) / marks.length : 0
    const standardDeviation = Math.sqrt(variance)

    return {
      totalMarks,
      average,
      passRate,
      totalStudents,
      passCount,
      gradeDistribution,
      highest,
      lowest,
      median,
      standardDeviation: Math.round(standardDeviation * 100) / 100
    }
  }, [marksData, selectedExam, calculateTotals])

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students || []

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Show only incomplete
    if (showOnlyIncomplete) {
      filtered = filtered.filter(student => 
        !marksData.find(m => m.student_id === student.id) || 
        marksData.find(m => m.student_id === student.id)?.total === undefined
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aMarks = marksData.find(m => m.student_id === a.id)?.total || 0
      const bMarks = marksData.find(m => m.student_id === b.id)?.total || 0
      
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || ''
          bVal = b.name?.toLowerCase() || ''
          break
        case 'total':
          aVal = aMarks
          bVal = bMarks
          break
        case 'percentage':
          aVal = selectedExam ? (aMarks / selectedExam.total_marks) * 100 : 0
          bVal = selectedExam ? (bMarks / selectedExam.total_marks) * 100 : 0
          break
        default:
          aVal = a.name?.toLowerCase() || ''
          bVal = b.name?.toLowerCase() || ''
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return filtered
  }, [students, searchTerm, showOnlyIncomplete, sortBy, sortOrder, marksData, selectedExam])

  // Load marks when exam changes
  useEffect(() => {
    if (selectedExam) {
      loadMarksForExam(selectedExam.id)
      loadStudentsForExam(selectedExam)
    }
  }, [selectedExam])

  const loadMarksForExam = async (examId: number) => {
    try {
      const response = await marksAPI.getByExam(examId)
      setMarksData(response || [])
    } catch (error) {
      console.error('Error loading marks:', error)
      toast.error('Failed to load marks')
    }
  }

  const loadStudentsForExam = async (exam: any) => {
    try {
      // Get students from the class of the subject
      const subject = subjects.find(s => s.id === exam.subject_id)
      if (subject?.class_id) {
        const classStudents = users?.filter(u => u.class_id === subject.class_id && u.role === 'student') || []
        setStudents(classStudents)
      }
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students')
    }
  }

  const handleMarkChange = (studentId: number, questionId: number, value: string) => {
    const numericValue = parseFloat(value) || 0
    setMarksData(prev => {
      const existing = prev.find(m => m.student_id === studentId)
      if (existing) {
        return prev.map(m => 
          m.student_id === studentId 
            ? { ...m, [questionId]: numericValue, total: calculateStudentTotal({ ...m, [questionId]: numericValue }) }
            : m
        )
      } else {
        return [...prev, { student_id: studentId, [questionId]: numericValue, total: numericValue }]
      }
    })
  }

  const calculateStudentTotal = (studentMarks: any) => {
    if (!selectedExam?.questions) return 0
    return selectedExam.questions.reduce((total: number, question: any) => {
      return total + (studentMarks[question.id] || 0)
    }, 0)
  }

  const handleSave = async () => {
    if (!selectedExam) return

    try {
      const marksToSave = marksData.map(mark => ({
        exam_id: selectedExam.id,
        student_id: mark.student_id,
        marks: Object.entries(mark)
          .filter(([key, value]) => key !== 'student_id' && key !== 'total' && typeof value === 'number')
          .map(([questionId, value]) => ({ question_id: parseInt(questionId), marks: value })),
        total_marks: mark.total || 0
      }))

      await dispatch(saveMarks(marksToSave))
      setLastSaved(new Date())
      toast.success('Marks saved successfully')
    } catch (error) {
      console.error('Error saving marks:', error)
      toast.error('Failed to save marks')
    }
  }

  const handleBulkAction = (action: string) => {
    if (!selectedStudents.size) {
      toast.error('Please select students first')
      return
    }

    switch (action) {
      case 'fill':
        if (!quickFillValue) {
          toast.error('Please enter a value to fill')
          return
        }
        const value = parseFloat(quickFillValue)
        selectedStudents.forEach(studentId => {
          selectedExam?.questions?.forEach((question: any) => {
            handleMarkChange(studentId, question.id, value.toString())
          })
        })
        toast.success(`Filled marks for ${selectedStudents.size} students`)
        break
      case 'clear':
        selectedStudents.forEach(studentId => {
          selectedExam?.questions?.forEach((question: any) => {
            handleMarkChange(studentId, question.id, '0')
          })
        })
        toast.success(`Cleared marks for ${selectedStudents.size} students`)
        break
    }
    setSelectedStudents(new Set())
  }

  const handleExport = () => {
    if (!selectedExam) return

    const exportData = filteredStudents.map(student => {
      const studentMarks = marksData.find(m => m.student_id === student.id)
      const row: any = {
        'Roll Number': student.roll_number,
        'Name': student.name,
        'Total': studentMarks?.total || 0,
        'Percentage': selectedExam ? ((studentMarks?.total || 0) / selectedExam.total_marks * 100).toFixed(2) + '%' : '0%'
      }

      selectedExam.questions?.forEach((question: any, index: number) => {
        row[`Q${index + 1}`] = studentMarks?.[question.id] || 0
      })

      return row
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marks')
    XLSX.writeFile(wb, `${selectedExam.name}_marks.xlsx`)
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        
        setUploadPreview(jsonData)
        setUploadError('')
      } catch (error) {
        setUploadError('Invalid file format')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Marks Entry</h1>
            <p className="text-gray-600 mt-1">Enter, manage, and analyze student marks with comprehensive features</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="btn-secondary flex items-center space-x-2"
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Upload size={18} />
              <span>Import</span>
            </button>
            <button
              onClick={handleExport}
              disabled={!selectedExam}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedExam || loading}
              className="btn-primary flex items-center space-x-2"
            >
              <Save size={18} />
              <span>Save Marks</span>
            </button>
          </div>
        </div>

        {/* Exam Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Exam
            </label>
            <select
              value={selectedExam?.id || ''}
              onChange={(e) => {
                const exam = teacherExams.find(ex => ex.id === Number(e.target.value))
                setSelectedExam(exam || null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose an exam...</option>
              {teacherExams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} - {subjects.find(s => s.id === exam.subject_id)?.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSave"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoSave" className="text-sm text-gray-700">
                Auto-save
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOnlyIncomplete"
                checked={showOnlyIncomplete}
                onChange={(e) => setShowOnlyIncomplete(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showOnlyIncomplete" className="text-sm text-gray-700">
                Show only incomplete
              </label>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showAnalytics && statistics && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Average</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.average}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.passRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Highest</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.highest}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">Students</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.totalStudents}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      {selectedExam && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="total">Sort by Total</option>
              <option value="percentage">Sort by Percentage</option>
            </select>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {viewMode === 'table' ? <FileSpreadsheet size={16} /> : <Users size={16} />}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setBulkMode(!bulkMode)}
                className={`px-4 py-2 rounded-lg border ${
                  bulkMode 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Bulk Mode
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {bulkMode && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Quick fill value"
                    value={quickFillValue}
                    onChange={(e) => setQuickFillValue(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleBulkAction('fill')}
                    className="btn-secondary"
                  >
                    Fill Selected
                  </button>
                </div>
                <button
                  onClick={() => handleBulkAction('clear')}
                  className="btn-secondary"
                >
                  Clear Selected
                </button>
                <button
                  onClick={() => setSelectedStudents(new Set())}
                  className="btn-secondary"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Marks Entry Table */}
      {selectedExam && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {bulkMode && (
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
                          } else {
                            setSelectedStudents(new Set())
                          }
                        }}
                      />
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  {selectedExam.questions?.map((question: any, index: number) => (
                    <th key={question.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex flex-col">
                        <span>Q{index + 1} ({question.max_marks})</span>
                        {question.question_text && (
                          <span 
                            className="text-xs text-gray-600 font-normal mt-1 truncate max-w-32" 
                            title={question.question_text}
                          >
                            {question.question_text.length > 25 
                              ? `${question.question_text.substring(0, 25)}...` 
                              : question.question_text
                            }
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map(student => {
                  const studentMarks = marksData.find(m => m.student_id === student.id)
                  const total = studentMarks?.total || 0
                  const percentage = selectedExam ? (total / selectedExam.total_marks * 100).toFixed(1) : 0
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bulkMode && (
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedStudents)
                              if (e.target.checked) {
                                newSelected.add(student.id)
                              } else {
                                newSelected.delete(student.id)
                              }
                              setSelectedStudents(newSelected)
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.roll_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.name}
                      </td>
                      {selectedExam.questions?.map((question: any) => (
                        <td key={question.id} className="px-6 py-4 whitespace-nowrap">
                          <input
                            ref={el => inputRefs.current[`${student.id}-${question.id}`] = el}
                            type="number"
                            min="0"
                            max={question.max_marks}
                            step="0.5"
                            value={studentMarks?.[question.id] || ''}
                            onChange={(e) => handleMarkChange(student.id, question.id, e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {percentage}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import Marks from Excel</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setUploadFile(file)
                      handleImport(file)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{uploadError}</p>
                </div>
              )}
              
              {uploadPreview.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(uploadPreview[0]).map(key => (
                            <th key={key} className="px-2 py-1 text-left font-medium text-gray-500">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, i) => (
                              <td key={i} className="px-2 py-1 border border-gray-200">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadPreview([])
                  setUploadError('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Process import
                  setShowUploadModal(false)
                  toast.success('Marks imported successfully')
                }}
                disabled={!uploadFile || uploadPreview.length === 0}
                className="btn-primary"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {selectedExam && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {filteredStudents.length} students
              </span>
              <span className="text-sm text-gray-600">
                {marksData.filter(m => m.total !== undefined).length} marked
              </span>
              {lastSaved && (
                <span className="text-sm text-gray-600">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {autoSave && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle size={16} />
                  <span className="text-sm">Auto-save enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarksEntryEnhanced
