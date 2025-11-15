import { useState, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { fetchExams } from '../../store/slices/examSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchMarksByExam, saveMarks } from '../../store/slices/marksSlice'
import { marksAPI } from '../../services/api'
import { useExamSubjectAssignments } from '../../core/hooks/useSubjectAssignments'
import { 
  Download, Save, Users, FileSpreadsheet, 
  Search, CheckCircle, AlertTriangle,
  BarChart3, Copy, Upload,
  SortAsc, SortDesc
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { logger } from '../../core/utils/logger'

const MarksEntry = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { exams } = useSelector((state: RootState) => state.exams)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { users } = useSelector((state: RootState) => state.users)
  const { marks, loading } = useSelector((state: RootState) => state.marks)
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [marksData, setMarksData] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'percentage'>('name')
  const [sortOrder] = useState<'asc' | 'desc'>('asc')
  const [showStats, setShowStats] = useState(true)
  const [autoSave, setAutoSave] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [lockStatus, setLockStatus] = useState<any>(null)
  const [loadingLockStatus, setLoadingLockStatus] = useState(false)
  
  // New state for enhanced features
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [quickFillValue, setQuickFillValue] = useState('')
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [showValidation] = useState(true)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<any[]>([])
  const [uploadError, setUploadError] = useState<string>('')
  
  // Refs for keyboard shortcuts
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dispatch(fetchExams())
    dispatch(fetchSubjects())
    dispatch(fetchUsers())
  }, [dispatch])

  // Filter exams for current teacher
  const teacherSubjects = useMemo(() => 
    subjects?.filter(s => s && s.teacher_id === user?.id) || [],
    [subjects, user?.id]
  )
  
  // Get subject assignments for exams
  const { getSubjectForExam, getAssignmentForExam } = useExamSubjectAssignments(exams)
  
  const teacherExams = useMemo(() => {
    // Filter exams by checking if the exam's subject assignment belongs to teacher's subjects
    return exams.filter(exam => {
      const assignment = getAssignmentForExam(exam)
      if (!assignment) return false
      const examSubject = getSubjectForExam(exam)
      return examSubject?.teacher_id === user?.id
    })
  }, [exams, teacherSubjects, user?.id, getSubjectForExam, getAssignmentForExam])

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
      'A+': marks.filter((m: number) => m >= (totalMarks || 0) * 0.9).length,
      'A': marks.filter((m: number) => m >= (totalMarks || 0) * 0.8 && m < (totalMarks || 0) * 0.9).length,
      'B+': marks.filter((m: number) => m >= (totalMarks || 0) * 0.7 && m < (totalMarks || 0) * 0.8).length,
      'B': marks.filter((m: number) => m >= (totalMarks || 0) * 0.6 && m < (totalMarks || 0) * 0.7).length,
      'C': marks.filter((m: number) => m >= (totalMarks || 0) * 0.5 && m < (totalMarks || 0) * 0.6).length,
      'D': marks.filter((m: number) => m >= (totalMarks || 0) * 0.4 && m < (totalMarks || 0) * 0.5).length,
      'F': marks.filter((m: number) => m < (totalMarks || 0) * 0.4).length
    }
    
    return {
      totalMarks,
      average,
      passRate,
      totalStudents: totalStudents || 0,
      passCount: passCount || 0,
      failCount: (totalStudents || 0) - (passCount || 0),
      gradeDistribution,
      highest: Math.max(...marks, 0),
      lowest: Math.min(...marks.filter((m: number) => m > 0), 0) || 0
    }
  }, [marksData, selectedExam, calculateTotals])

  const fetchLockStatus = async (examId: number) => {
    try {
      setLoadingLockStatus(true)
      const status = await marksAPI.getLockStatus(examId)
      setLockStatus(status)
    } catch (error) {
      logger.error('Error fetching lock status:', error)
      setLockStatus(null)
    } finally {
      setLoadingLockStatus(false)
    }
  }

  const handleExamSelect = async (exam: any) => {
    logger.debug('Exam selected:', exam.id, exam.name)
    setSelectedExam(exam)
    setLockStatus(null)
    setSelectedStudents(new Set())
    setBulkMode(false)
    
    // Use new endpoint to get students for this exam
    const { examAPI } = await import('../../services/api')
    let classStudents: any[] = []
    try {
      const studentsResponse = await examAPI.getStudents(exam.id)
      classStudents = studentsResponse.students || []
      logger.debug('Class students loaded:', classStudents.length)
      setStudents(classStudents)
    } catch (error: any) {
      logger.error('Error fetching students for exam:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch students. Please try again.')
      setStudents([])
      return
    }
    
    // Check if exam has questions
    if (!exam.questions || exam.questions.length === 0) {
      toast.error('This exam has no questions. Please add questions first.')
      setMarksData([])
      return
    }
    
    // Fetch existing marks first
    try {
      const marksResult = await dispatch(fetchMarksByExam(exam.id)).unwrap()
      logger.debug('Marks fetched:', marksResult.length, 'records')
      
      // Initialize marks data structure with proper calculations
      const initialMarksData = classStudents.map((student: any) => {
        const studentMarks: { [key: number]: number } = {}
        let total = 0
        
        exam.questions?.forEach((question: any) => {
          const existingMark = marksResult.find((m: any) => 
            m.student_id === student.id && m.question_id === question.id
          )
          const markValue = existingMark?.marks_obtained || 0
          studentMarks[question.id] = markValue
          total += markValue
        })
        
        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          student_roll: student.username || '',
          marks: studentMarks,
          total: Math.round(total * 100) / 100,
          percentage: exam.total_marks > 0 ? Math.round((total / exam.total_marks) * 10000) / 100 : 0
        }
      })
      
      logger.debug('Initial marks data prepared:', initialMarksData.length, 'students')
      setMarksData(initialMarksData)
    } catch (error) {
      logger.error('Error fetching marks:', error)
      toast.error('Failed to load existing marks')
    }
    
    // Fetch lock status
    fetchLockStatus(exam.id)
  }

  const handleMarksChange = (studentId: number, questionId: number, marks: number) => {
    logger.debug('Marks change:', { studentId, questionId, marks })
    if (lockStatus?.is_locked) return
    
    setMarksData(prev => {
      const updated = prev.map(student => {
        if (student.student_id === studentId) {
          const updatedMarks = { ...student.marks, [questionId]: marks }
          const total = Object.values(updatedMarks).reduce((sum: number, mark: any) => {
            const numMark = Number(mark) || 0
            return sum + numMark
          }, 0)
          const percentage = selectedExam?.total_marks > 0 ? (total / selectedExam.total_marks) * 100 : 0
          
          const updatedStudent = { 
            ...student, 
            marks: updatedMarks, 
            total: Math.round(total * 100) / 100,
            percentage: Math.round(percentage * 100) / 100
          }
          logger.debug('Updated student marks')
          return updatedStudent
        }
        return student
      })
      logger.debug('Marks data updated')
      return updated
    })

    // Auto-save if enabled
    if (autoSave) {
      setTimeout(() => {
        handleSaveMarks()
      }, 2000)
    }
  }

  // Enhanced bulk operations
  const handleBulkFill = (questionId: number, value: number) => {
    if (lockStatus?.is_locked) return
    
    setMarksData(prev => prev.map(student => {
      if (selectedStudents.size === 0 || selectedStudents.has(student.student_id)) {
        const updatedMarks = { ...student.marks, [questionId]: value }
        const total = Object.values(updatedMarks).reduce((sum: number, mark: any) => {
          const numMark = Number(mark) || 0
          return sum + numMark
        }, 0)
        const percentage = selectedExam?.total_marks > 0 ? (total / selectedExam.total_marks) * 100 : 0
        
        return { 
          ...student, 
          marks: updatedMarks, 
          total: Math.round(total * 100) / 100,
          percentage: Math.round(percentage * 100) / 100
        }
      }
      return student
    }))
  }

  const handleSelectStudent = (studentId: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)))
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcuts) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            handleSaveMarks()
            break
          case 'a':
            e.preventDefault()
            handleSelectAll()
            break
          case 'b':
            e.preventDefault()
            setBulkMode(!bulkMode)
            break
          case 'f':
            e.preventDefault()
            document.getElementById('search-input')?.focus()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [keyboardShortcuts, bulkMode])

  // Auto-save effect
  useEffect(() => {
    if (autoSave && marksData.length > 0) {
      const timer = setTimeout(() => {
        handleSaveMarks()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [marksData, autoSave])

  const handleSaveMarks = async () => {
    if (!selectedExam) return

    if (lockStatus?.is_locked) {
      toast.error(lockStatus.message || 'Marks are locked and cannot be modified')
      return
    }

    try {
      const marksToSave = []
      
      logger.info('Saving marks for exam:', selectedExam.id)
      
      for (const student of marksData) {
        for (const questionId in student.marks) {
          const markValue = Number(student.marks[questionId])
          if (markValue > 0) { // Only save non-zero marks
            const questionIdInt = parseInt(questionId)
            logger.debug('Processing mark:', {
              exam_id: selectedExam.id,
              student_id: student.student_id,
              question_id: questionIdInt,
              marks_obtained: markValue
            })
            
            // Validate question exists in exam
            const questionExists = selectedExam.questions?.some((q: any) => q.id === questionIdInt)
            if (!questionExists) {
              logger.warn(`Question ${questionIdInt} not found in exam ${selectedExam.id}`)
              toast.error(`Question ${questionIdInt} not found in exam`)
              continue
            }
            
            marksToSave.push({
              exam_id: selectedExam.id,
              student_id: student.student_id,
              question_id: questionIdInt,
              marks_obtained: markValue
            })
          }
        }
      }

      logger.debug('Marks to save:', marksToSave.length, 'records')
      
      if (marksToSave.length === 0) {
        toast.error('No marks to save')
        return
      }

      if (!selectedExam?.id) {
        toast.error('No exam selected')
        return
      }

      const result = await dispatch(saveMarks({ examId: selectedExam.id, marks: marksToSave })).unwrap()
      logger.info('Marks saved successfully')
      setLastSaved(new Date())
      toast.success('Marks saved successfully!', {
        duration: 3000,
        icon: '✅'
      })
    } catch (error: any) {
      logger.error('Save error:', error)
      
      // Handle different types of errors
      if (error.response?.status === 422) {
        const errorDetails = error.response.data
        logger.error('Validation error details:', errorDetails)
        
        if (errorDetails.detail && Array.isArray(errorDetails.detail)) {
          // Pydantic validation errors
          const errorMessages = errorDetails.detail.map((err: any) => 
            `${err.loc?.join('.')}: ${err.msg}`
          ).join(', ')
          toast.error(`Validation error: ${errorMessages}`)
        } else if (errorDetails.message) {
          // Custom validation error
          toast.error(`Validation error: ${errorDetails.message}`)
        } else {
          toast.error('Validation error: Invalid data format')
        }
      } else if (error.response?.status === 400) {
        const errorDetails = error.response.data
        logger.error('Business logic error:', errorDetails)
        toast.error(errorDetails.message || 'Invalid request')
      } else {
        toast.error(error.message || 'Failed to save marks')
      }
    }
  }

  // Enhanced filtering and sorting
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = marksData.filter(student => 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_roll.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (showOnlyIncomplete) {
      filtered = filtered.filter(student => {
        const totalQuestions = selectedExam?.questions?.length || 0
        const answeredQuestions = Object.values(student.marks).filter((m: any) => m > 0).length
        return answeredQuestions < totalQuestions
      })
    }

    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.student_name.localeCompare(b.student_name)
          break
        case 'total':
          comparison = (a.total || 0) - (b.total || 0)
          break
        case 'percentage':
          comparison = (a.percentage || 0) - (b.percentage || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [marksData, searchTerm, sortBy, sortOrder, showOnlyIncomplete, selectedExam])

  // File upload functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]

    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file')
      return
    }

    setUploadFile(file)
    setUploadError('')
    parseUploadedFile(file)
  }

  const parseUploadedFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        let workbook: XLSX.WorkBook

        if (file.type === 'text/csv') {
          // Handle CSV
          const csvData = XLSX.utils.aoa_to_sheet((data as string).split('\n').map(row => row.split(',')))
          workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, csvData, 'Sheet1')
        } else {
          // Handle Excel
          workbook = XLSX.read(data, { type: 'binary' })
        }

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        // Validate and parse the data
        const parsedData = validateAndParseMarksData(jsonData)
        if (parsedData.error) {
          setUploadError(parsedData.error)
          return
        }

        setUploadPreview(parsedData.data)
      } catch (error) {
        setUploadError('Error parsing file. Please check the format.')
        logger.error('File parsing error:', error)
      }
    }

    if (file.type === 'text/csv') {
      reader.readAsText(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const validateAndParseMarksData = (data: any[][]) => {
    if (!selectedExam) {
      return { error: 'No exam selected', data: [] }
    }

    if (data.length < 2) {
      return { error: 'File must contain at least a header row and one data row', data: [] }
    }

    const headers = data[0]
    const expectedHeaders = ['Roll No', 'Student Name']
    
    // Add question headers
    selectedExam.questions?.forEach((question: any, index: number) => {
      const questionTitle = question.question_text 
        ? `Q${index + 1}: ${question.question_text.substring(0, 30)}${question.question_text.length > 30 ? '...' : ''} (${question.marks_per_question})`
        : `Q${index + 1} (${question.marks_per_question})`
      expectedHeaders.push(questionTitle)
    })

    // Check if required headers exist
    const missingHeaders = expectedHeaders.filter(header => 
      !headers.some(h => h && h.toString().toLowerCase().includes(header.toLowerCase().split(' ')[0]))
    )

    if (missingHeaders.length > 0) {
      return { 
        error: `Missing required columns: ${missingHeaders.join(', ')}. Please use the template format.`, 
        data: [] 
      }
    }

    const parsedData = []
    const errors = []

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const studentData: any = {
        rowIndex: i + 1,
        rollNo: row[0]?.toString().trim() || '',
        studentName: row[1]?.toString().trim() || '',
        marks: {},
        errors: []
      }

      // Parse question marks
      selectedExam.questions?.forEach((question: any, qIndex: number) => {
        const colIndex = 2 + qIndex // Skip Roll No and Student Name
        const markValue = row[colIndex]
        
        if (markValue !== undefined && markValue !== null && markValue !== '') {
          const numValue = parseFloat(markValue.toString())
          if (isNaN(numValue)) {
            studentData.errors.push(`Q${qIndex + 1}: Invalid number format`)
          } else if (numValue < 0) {
            studentData.errors.push(`Q${qIndex + 1}: Cannot be negative`)
          } else if (numValue > question.marks_per_question) {
            studentData.errors.push(`Q${qIndex + 1}: Exceeds max marks (${question.marks_per_question})`)
          } else {
            studentData.marks[question.id] = numValue
          }
        }
      })

      // Check if student exists
      const student = students.find(s => 
        s.username === studentData.rollNo || 
        `${s.first_name} ${s.last_name}`.toLowerCase() === studentData.studentName.toLowerCase()
      )

      if (!student) {
        studentData.errors.push('Student not found in class')
      } else {
        studentData.student_id = student.id
        studentData.student = student
      }

      if (studentData.errors.length > 0) {
        errors.push(`Row ${studentData.rowIndex}: ${studentData.errors.join(', ')}`)
      }

      parsedData.push(studentData)
    }

    if (errors.length > 0) {
      return { 
        error: `Validation errors found:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`, 
        data: parsedData 
      }
    }

    return { error: null, data: parsedData }
  }

  const handleUploadMarks = async () => {
    if (!selectedExam || !uploadPreview.length) return

    if (lockStatus?.is_locked) {
      toast.error(lockStatus.message || 'Marks are locked and cannot be modified')
      return
    }

    try {
      const marksToSave = []

      for (const studentData of uploadPreview) {
        if (studentData.student_id) {
          for (const questionId in studentData.marks) {
            marksToSave.push({
              exam_id: selectedExam.id,
              student_id: studentData.student_id,
              question_id: parseInt(questionId),
              marks_obtained: studentData.marks[questionId]
            })
          }
        }
      }

      if (marksToSave.length === 0) {
        toast.error('No valid marks found to upload')
        return
      }

      if (!selectedExam?.id) {
        toast.error('No exam selected')
        return
      }

      await dispatch(saveMarks({ examId: selectedExam.id, marks: marksToSave })).unwrap()
      
      // Update local marks data
      const updatedMarksData = marksData.map(student => {
        const uploadedStudent = uploadPreview.find(u => u.student_id === student.student_id)
        if (uploadedStudent) {
          const updatedMarks = { ...student.marks, ...uploadedStudent.marks }
          const total = Object.values(updatedMarks).reduce((sum: number, mark: any) => {
            const numMark = Number(mark) || 0
            return sum + numMark
          }, 0)
          const percentage = selectedExam?.total_marks > 0 ? (total / selectedExam.total_marks) * 100 : 0
          
          return {
            ...student,
            marks: updatedMarks,
            total: Math.round(total * 100) / 100,
            percentage: Math.round(percentage * 100) / 100
          }
        }
        return student
      })

      setMarksData(updatedMarksData)
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadPreview([])
      setUploadError('')
      
      toast.success(`Successfully uploaded marks for ${marksToSave.length} entries!`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload marks')
    }
  }

  // Excel export with enhanced data
  const handleExportExcel = () => {
    if (!selectedExam) return

    const wb = XLSX.utils.book_new()
    
    // Prepare data with all details
    const exportData = filteredAndSortedStudents.map(student => {
      const row: any = {
        'Roll No': student.student_roll,
        'Student Name': student.student_name,
        'Total Marks': student.total || 0,
        'Percentage': `${student.percentage || 0}%`,
        'Status': (student.total || 0) >= (selectedExam.total_marks * 0.4) ? 'Pass' : 'Fail'
      }
      
      // Add individual question marks
      selectedExam.questions?.forEach((question: any, index: number) => {
        const questionTitle = question.question_text 
          ? `Q${index + 1}: ${question.question_text.substring(0, 30)}${question.question_text.length > 30 ? '...' : ''} (${question.marks_per_question})`
        : `Q${index + 1} (${question.marks_per_question})`
        row[questionTitle] = student.marks[question.id] || 0
      })
      
      return row
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(wb, ws, 'Marks')
    XLSX.writeFile(wb, `${selectedExam.name}_Marks_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Excel template generation
  const handleDownloadTemplate = () => {
    if (!selectedExam) return

    const wb = XLSX.utils.book_new()
    
    const templateData = students.map(student => {
      const row: any = {
        'Roll No': student.username || '',
        'Student Name': `${student.first_name} ${student.last_name}`,
        'Total Marks': '',
        'Percentage': '',
        'Status': ''
      }
      
      selectedExam.questions?.forEach((question: any, index: number) => {
        const questionTitle = question.question_text 
          ? `Q${index + 1}: ${question.question_text.substring(0, 30)}${question.question_text.length > 30 ? '...' : ''} (${question.marks_per_question})`
        : `Q${index + 1} (${question.marks_per_question})`
        row[questionTitle] = ''
      })
      
      return row
    })

    const ws = XLSX.utils.json_to_sheet(templateData)
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `${selectedExam.name}_Template.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-gray-600">Enter and manage student marks efficiently</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="keyboard-shortcuts"
              checked={keyboardShortcuts}
              onChange={(e) => setKeyboardShortcuts(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="keyboard-shortcuts" className="text-sm text-gray-600">
              Keyboard Shortcuts
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-save"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="auto-save" className="text-sm text-gray-600">
              Auto Save
            </label>
          </div>
        </div>
      </div>

      {/* Exam Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Select Exam</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherExams.map((exam) => {
            // Get subject from subject assignment using hook
            const examSubject = getSubjectForExam(exam)
            return (
              <div
                key={exam.id}
                onClick={() => handleExamSelect(exam)}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedExam?.id === exam.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{exam.name}</h4>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {exam.exam_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{examSubject?.name || 'Unknown Subject'}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{exam.total_marks} marks</span>
                  <span>{exam.questions?.length || 0} questions</span>
                </div>
                {exam.exam_date && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(exam.exam_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Marks Entry Interface */}
      {selectedExam && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedExam.name} - Marks Entry
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {students.length} students • {selectedExam.questions?.length || 0} questions • {selectedExam.total_marks} total marks
              </p>
              {lockStatus && (
                <div className={`mt-2 px-3 py-2 rounded-md text-sm font-medium ${
                  lockStatus.is_locked 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  {loadingLockStatus ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Checking lock status...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {lockStatus.is_locked ? (
                        <AlertTriangle size={16} className="mr-2" />
                      ) : (
                        <CheckCircle size={16} className="mr-2" />
                      )}
                      {lockStatus.message}
                      {!lockStatus.is_locked && lockStatus.days_remaining !== null && (
                        <span className="ml-2 text-xs">
                          (Lock date: {new Date(lockStatus.lock_date).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {lastSaved && (
                <div className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Users size={16} className="text-gray-600" />
                <span className="text-sm text-gray-600">{students.length} students</span>
              </div>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10 w-64"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-incomplete"
                  checked={showOnlyIncomplete}
                  onChange={(e) => setShowOnlyIncomplete(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="show-incomplete" className="text-sm text-gray-600">
                  Show only incomplete
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`btn-secondary flex items-center space-x-2 ${
                    bulkMode ? 'bg-blue-100 text-blue-700' : ''
                  }`}
                >
                  <Copy size={16} />
                  <span>Bulk Mode</span>
                </button>
                
                {bulkMode && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSelectAll}
                      className="btn-secondary text-sm"
                    >
                      {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedStudents.size} selected
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <BarChart3 size={16} />
                  <span>{showStats ? 'Hide' : 'Show'} Stats</span>
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Panel */}
          {showStats && statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{statistics.totalStudents}</div>
                <div className="text-sm text-blue-600">Total Students</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{statistics.passCount}</div>
                <div className="text-sm text-green-600">Passed</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{statistics.failCount}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{statistics.average}</div>
                <div className="text-sm text-purple-600">Average</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{statistics.passRate}%</div>
                <div className="text-sm text-orange-600">Pass Rate</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{statistics.highest}</div>
                <div className="text-sm text-indigo-600">Highest</div>
              </div>
            </div>
          )}

          {/* Marks Entry Table */}
          <div ref={tableRef} className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === students.length}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    )}
                    <span className="ml-2">Student</span>
                  </th>
                  {selectedExam.questions?.map((question: any, index: number) => (
                    <th key={question.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center">
                        <span>Q{index + 1}</span>
                        <span className="text-gray-400">({question.marks_per_question})</span>
                        {question.question_text && (
                          <div className="mt-1 max-w-32">
                            <span 
                              className="text-xs text-gray-600 truncate block" 
                              title={question.question_text}
                            >
                              {question.question_text.length > 20 
                                ? `${question.question_text.substring(0, 20)}...` 
                                : question.question_text
                              }
                            </span>
                          </div>
                        )}
                        {bulkMode && (
                          <div className="mt-2 flex items-center space-x-1">
                            <input
                              type="number"
                              placeholder="Fill"
                              value={quickFillValue}
                              onChange={(e) => setQuickFillValue(e.target.value)}
                              className="w-12 h-6 text-xs text-center border rounded"
                              min="0"
                              max={question.marks_per_question}
                            />
                            <button
                              onClick={() => handleBulkFill(question.id, Number(quickFillValue) || 0)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              Fill
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center space-x-2">
                      <span>Total</span>
                      <button
                        onClick={() => setSortBy('total')}
                        className="hover:text-gray-700"
                      >
                        {sortBy === 'total' ? (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />) : <SortAsc size={14} />}
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center space-x-2">
                      <span>%</span>
                      <button
                        onClick={() => setSortBy('percentage')}
                        className="hover:text-gray-700"
                      >
                        {sortBy === 'percentage' ? (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />) : <SortAsc size={14} />}
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {bulkMode && (
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.student_id)}
                            onChange={() => handleSelectStudent(student.student_id)}
                            className="rounded mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.student_roll}
                          </div>
                        </div>
                      </div>
                    </td>
                    {selectedExam.questions?.map((question: any) => (
                      <td key={question.id} className="px-4 py-3 text-center">
                        <div className="relative">
                          <input
                            ref={(el) => {
                              inputRefs.current[`${student.student_id}-${question.id}`] = el
                            }}
                            type="number"
                            min="0"
                            max={question.marks_per_question}
                            step="0.5"
                            value={student.marks[question.id] || ''}
                            onChange={(e) => handleMarksChange(
                              student.student_id,
                              question.id,
                              parseFloat(e.target.value) || 0
                            )}
                            disabled={lockStatus?.is_locked}
                            className={`w-16 input-field text-center ${
                              lockStatus?.is_locked
                                ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                : student.marks[question.id] > question.marks_per_question
                                ? 'border-red-300 bg-red-50'
                                : student.marks[question.id] === question.marks_per_question
                                ? 'border-green-300 bg-green-50'
                                : ''
                            }`}
                            placeholder="0"
                          />
                          {showValidation && student.marks[question.id] > question.marks_per_question && (
                            <AlertTriangle className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                          )}
                          {showValidation && student.marks[question.id] === question.marks_per_question && (
                            <CheckCircle className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          /{question.marks_per_question}
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {student.total || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className={`text-sm font-medium ${
                        (student.percentage || 0) >= 80 ? 'text-green-600' :
                        (student.percentage || 0) >= 60 ? 'text-yellow-600' :
                        (student.percentage || 0) >= 40 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {student.percentage || 0}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (student.percentage || 0) >= 40
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(student.percentage || 0) >= 40 ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
              <div className="text-xs text-gray-600 space-y-1">
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadTemplate}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download size={18} />
                <span>Download Template</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Upload size={18} />
                <span>Upload Excel/CSV</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="btn-secondary flex items-center space-x-2"
              >
                <FileSpreadsheet size={18} />
                <span>Export Excel</span>
              </button>
            </div>
            <button
              onClick={handleSaveMarks}
              disabled={loading || !marksData.length || lockStatus?.is_locked}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save size={18} />
              )}
              <span>{loading ? 'Saving...' : 'Save Marks'}</span>
            </button>
          </div>

          {/* Keyboard Shortcuts Help */}
          {keyboardShortcuts && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Keyboard Shortcuts:</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Ctrl+S: Save marks</div>
                <div>Ctrl+A: Select all students</div>
                <div>Ctrl+B: Toggle bulk mode</div>
                <div>Ctrl+F: Focus search</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 my-8 max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Upload Marks from Excel/CSV</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadPreview([])
                  setUploadError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {!uploadFile ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Excel or CSV File</h4>
                    <p className="text-gray-600 mb-4">
                      Please use the template format. Download the template first to ensure proper formatting.
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="btn-primary cursor-pointer inline-flex items-center space-x-2"
                    >
                      <Upload size={18} />
                      <span>Choose File</span>
                    </label>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">File Format Requirements:</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• First column: Roll No (must match student roll numbers)</li>
                      <li>• Second column: Student Name (must match student names)</li>
                      <li>• Subsequent columns: Q1 (marks_per_question), Q2 (marks_per_question), etc.</li>
                      <li>• Supported formats: .xlsx, .xls, .csv</li>
                      <li>• Use the template for proper formatting</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet size={24} className="text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{uploadFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadFile(null)
                        setUploadPreview([])
                        setUploadError('')
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  {uploadError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle size={20} className="text-red-600 mr-3 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-red-800 mb-1">Validation Error</h5>
                          <p className="text-sm text-red-700 whitespace-pre-line">{uploadError}</p>
                        </div>
                      </div>
                    </div>
                  ) : uploadPreview.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <CheckCircle size={20} className="text-green-600 mr-3 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-green-800 mb-1">File Validated Successfully</h5>
                            <p className="text-sm text-green-700">
                              Found {uploadPreview.length} students with valid marks data.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <h6 className="font-medium text-gray-900">Preview (First 10 rows)</h6>
                        </div>
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left">Roll No</th>
                                <th className="px-3 py-2 text-left">Student Name</th>
                                {selectedExam.questions?.slice(0, 5).map((q: any, index: number) => (
                                  <th key={q.id} className="px-3 py-2 text-center">Q{index + 1}</th>
                                ))}
                                {selectedExam.questions && selectedExam.questions.length > 5 && (
                                  <th className="px-3 py-2 text-center">...</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {uploadPreview.slice(0, 10).map((student: any, index: number) => (
                                <tr key={index} className="border-t">
                                  <td className="px-3 py-2">{student.rollNo}</td>
                                  <td className="px-3 py-2">{student.studentName}</td>
                                  {selectedExam.questions?.slice(0, 5).map((q: any) => (
                                    <td key={q.id} className="px-3 py-2 text-center">
                                      {student.marks[q.id] !== undefined ? student.marks[q.id] : '-'}
                                    </td>
                                  ))}
                                  {selectedExam.questions && selectedExam.questions.length > 5 && (
                                    <td className="px-3 py-2 text-center text-gray-400">...</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {uploadFile && !uploadError && uploadPreview.length > 0 && (
              <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
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
                  onClick={handleUploadMarks}
                  disabled={loading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Upload size={18} />
                  )}
                  <span>{loading ? 'Uploading...' : 'Upload Marks'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MarksEntry