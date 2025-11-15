import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm, useFieldArray } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { fetchExams, createExam, updateExam, deleteExam, clearExams } from '../../store/slices/examSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { coAPI, poAPI, attainmentAnalyticsAPI } from '../../services/api'
import { 
  Plus, Edit2, Trash2, Settings, Calendar, Clock, FileText, Target, Layers, 
  CheckCircle, X, Search, Filter, Download, Upload, Copy, Eye, BarChart3,
  TrendingUp, Users, Award, BookOpen, Zap, RefreshCw, Save, AlertTriangle
} from 'lucide-react'
import { logger } from '../../core/utils/logger'

const questionSchema = yup.object({
  question_number: yup.string().required('Question number is required'),
  question_text: yup.string().required('Question text is required'),
  max_marks: yup.number().min(0.5, 'Minimum 0.5 marks').required('Marks required'),
  section: yup.string().oneOf(['A', 'B', 'C']).required('Section is required'),
  blooms_level: yup.string().required('Blooms level is required'),
  difficulty: yup.string().oneOf(['easy', 'medium', 'hard']).required('Difficulty is required'),
  co_weights: yup.array().of(yup.object({
    co_id: yup.number().required(),
    co_code: yup.string().required(),
    weight_pct: yup.number().min(0).max(100).required()
  }))
})

const examSchema = yup.object({
  name: yup.string().required('Exam name is required'),
  subject_id: yup.number().required('Subject is required'),
  exam_type: yup.string().oneOf(['internal1', 'internal2', 'final']).required('Exam type is required'),
  exam_date: yup.date().nullable(),
  duration: yup.number().min(30).max(300).nullable(),
  total_marks: yup.number().min(1).required('Total marks is required'),
  questions: yup.array().of(questionSchema).min(1, 'At least one question is required')
})

type ExamForm = yup.InferType<typeof examSchema>

const ExamConfiguration = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { exams, loading, error } = useSelector((state: RootState) => state.exams)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)
  
  // Debug logging
  // Exam data loaded from Redux store
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">Please log in to access exam configuration</div>
        <button 
          onClick={() => window.location.href = '/login'}
          className="btn-primary"
        >
          Go to Login
        </button>
      </div>
    )
  }
  
  // Show error if API call failed
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading exams: {error}</div>
        <button 
          onClick={() => dispatch(fetchExams())}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }
  
  // Enhanced state management
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<any>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [availableCOs, setAvailableCOs] = useState<any[]>([])
  const [availablePOs, setAvailablePOs] = useState<any[]>([])
  const [loadingCOs, setLoadingCOs] = useState(false)
  const [loadingPOs, setLoadingPOs] = useState(false)
  const [deletingExamId, setDeletingExamId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [isDataFresh, setIsDataFresh] = useState(false)
  const [coPoMapping, setCoPoMapping] = useState<any[]>([])
  const [autoMapPOs, setAutoMapPOs] = useState(true)
  const [expandedMappings, setExpandedMappings] = useState<Set<number>>(new Set())
  
  // Enhanced UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type' | 'marks'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedExams, setSelectedExams] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [showStatistics, setShowStatistics] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue
  } = useForm<ExamForm>({
    resolver: yupResolver(examSchema),
    defaultValues: {
      name: '',
      subject_id: 0,
      exam_type: 'internal1' as const,
      exam_date: undefined,
      duration: 120,
      total_marks: 0,
      questions: [{
        question_number: '1',
        question_text: 'Enter your question here...',
        max_marks: 10,
        section: 'A' as const,
        blooms_level: 'Remember',
        difficulty: 'easy' as const,
        co_weights: []
      }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  })

  const watchedQuestions = watch('questions')

  // Form data is managed by react-hook-form
  const totalMarks = watchedQuestions?.reduce((sum, q) => sum + (q.max_marks || 0), 0) || 0

  // Force refresh function
  const forceRefresh = () => {
    
    setRefreshKey(prev => prev + 1)
    setLastRefreshTime(new Date())
    setIsDataFresh(true)
    
    // Clear cache first
    dispatch(clearExams())
    // Then fetch fresh data with force refresh
    dispatch(fetchExams(true) as any) // Force refresh = true
    dispatch(fetchSubjects())
  }

  useEffect(() => {
    logger.debug('Fetching exams on component mount')
    dispatch(fetchExams()).then((result) => {
      logger.debug('Exams fetched successfully')
    })
    logger.debug('Fetching subjects on component mount')
    dispatch(fetchSubjects()).then((result) => {
      logger.debug('Subjects fetched successfully')
    })
  }, [dispatch, refreshKey])

  useEffect(() => {
    setValue('total_marks', totalMarks)
  }, [totalMarks, setValue])

  // Filter subjects for current teacher
  const teacherSubjects = useMemo(() => {
    const filtered = subjects.filter(s => s.teacher_id === user?.id)
    logger.debug('Teacher subjects filtered:', filtered.length)
    return filtered
  }, [subjects, user?.id])

  // Fetch COs and POs when subject changes
  const fetchCOsAndPOs = async (subjectId: number) => {
    if (!subjectId) {
      setAvailableCOs([])
      setAvailablePOs([])
      setCoPoMapping([])
      return
    }

    try {
      setLoadingCOs(true)
      setLoadingPOs(true)

      // Fetch COs for the subject
      const coResponse = await coAPI.getBySubject(subjectId, 0, 100)
      // Backend returns COListResponse with items array
      setAvailableCOs(coResponse.items || coResponse || [])

      // Get the subject to find its department
      const subject = subjects.find(s => s.id === subjectId)
      if (subject?.department_id) {
        // Fetch POs for the department
        const poResponse = await poAPI.getByDepartment(subject.department_id, undefined, 0, 100)
        // Backend returns POListResponse with items array
        setAvailablePOs(poResponse.items || poResponse || [])
      }
      
      // Fetch CO-PO mapping for auto-mapping
      try {
        const mapping = await attainmentAnalyticsAPI.getCOPOMapping(subjectId)
        setCoPoMapping(mapping)
      } catch (error) {
        logger.warn('Could not fetch CO-PO mapping:', error)
        setCoPoMapping([])
      }
    } catch (error) {
      logger.error('Error fetching COs and POs:', error)
      toast.error('Failed to load CO/PO data')
    } finally {
      setLoadingCOs(false)
      setLoadingPOs(false)
    }
  }

  // Auto-map POs based on selected COs
  const getMappedPOs = (selectedCOs: string[]) => {
    if (!autoMapPOs || !coPoMapping.length) return []
    
    const mappedPOs = new Set<string>()
    selectedCOs.forEach(coCode => {
      const coMapping = coPoMapping.find(m => m.co_code === coCode)
      if (coMapping) {
        coMapping.mapped_pos.forEach((po: any) => {
          mappedPOs.add(po.po_code)
        })
      }
    })
    
    return Array.from(mappedPOs)
  }

  // Watch for subject changes
  const watchedSubjectId = watch('subject_id')
  useEffect(() => {
    if (watchedSubjectId) {
      setSelectedSubjectId(watchedSubjectId)
      fetchCOsAndPOs(watchedSubjectId)
    }
  }, [watchedSubjectId, subjects])

  const onSubmit = async (data: ExamForm) => {
    try {
      logger.debug('Form data received:', data.questions?.length || 0, 'questions')
      
      // Convert date to ISO string if provided
      const examData = {
        ...data,
        exam_date: data.exam_date ? new Date(data.exam_date).toISOString() : undefined,
        duration: data.duration || undefined,
        questions: data.questions?.map((q: any, index: number) => {
          // Ensure question_text is never null or empty
          const questionText = q.question_text?.trim() || `Question ${q.question_number || (index + 1)}`
          
          return {
          ...q,
          id: q.id || index + 1,
            question_text: questionText,
            question_number: q.question_number || `${index + 1}`,
          co_weights: q.co_weights?.filter((cw: any) => cw !== undefined) || []
          }
        }) || []
      }
      
      logger.debug('Exam data prepared for submission')

      if (editingExam) {
        logger.info('Updating exam:', editingExam.id)
        const result = await dispatch(updateExam({ id: editingExam.id, ...examData })).unwrap()
        logger.info('Exam updated successfully')
        toast.success('Exam updated successfully!')
        // Force refresh to ensure data is fresh
        forceRefresh()
      } else {
        logger.info('Creating new exam')
        const result = await dispatch(createExam(examData)).unwrap()
        logger.info('Exam created successfully')
        toast.success('Exam created successfully!')
        // Force refresh to ensure data is fresh
        forceRefresh()
      }
      closeModal()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (exam: any) => {
    setEditingExam(exam)
    
    // Reset form with exam data
    reset({
      name: exam.name,
      subject_id: exam.subject_id,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date ? new Date(exam.exam_date) : undefined,
      duration: exam.duration,
      total_marks: exam.total_marks,
      questions: exam.questions?.length > 0 ? exam.questions.map((q: any, index: number) => ({
        ...q,
        question_text: q.question_text || `Enter your question here...`,
        question_number: q.question_number || `${index + 1}`,
        section: (q.section || 'A') as 'A' | 'B' | 'C',
        difficulty: (q.difficulty || 'easy') as 'easy' | 'medium' | 'hard',
        co_weights: q.co_weights || []
      })) : [{
        question_number: '1',
        question_text: 'Enter your question here...',
        max_marks: 10,
        section: 'A',
        blooms_level: 'Remember',
        difficulty: 'easy',
        co_weights: [],
      }]
    })
    
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        setDeletingExamId(id)
        logger.info('Deleting exam:', id)
        const result = await dispatch(deleteExam(id)).unwrap()
        logger.info('Exam deleted successfully')
        toast.success('Exam deleted successfully!')
        // Force refresh to ensure data is fresh
        logger.debug('Refreshing exams after delete')
        forceRefresh()
      } catch (error: any) {
        logger.error('Delete error:', error)
        toast.error(error.message || 'Failed to delete exam')
      } finally {
        setDeletingExamId(null)
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExam(null)
    reset({
      name: '',
      subject_id: 0,
      exam_type: 'internal1' as const,
      exam_date: undefined,
      duration: 120,
      total_marks: 0,
      questions: [{
        question_number: '1',
        question_text: 'Enter your question here...',
        max_marks: 10,
        section: 'A' as const,
        blooms_level: 'Remember',
        difficulty: 'easy' as const,
        co_weights: [],
      }]
    })
  }

  const addQuestion = () => {
    const newQuestion = {
      question_number: '',
      question_text: 'Enter your question here...',
      max_marks: 10,
      section: 'A' as const,
      blooms_level: 'Remember',
      difficulty: 'easy' as const,
      co_weights: [] as Array<{ co_id: number; co_code: string; weight_pct: number }>
    }
    logger.debug('Adding new question')
    append(newQuestion)
    
    // Scroll to the bottom to show the new question
    setTimeout(() => {
      const questionsContainer = document.querySelector('.flex-1.overflow-y-auto.space-y-4')
      if (questionsContainer) {
        questionsContainer.scrollTo({ top: questionsContainer.scrollHeight, behavior: 'smooth' })
      }
    }, 100)
  }

  const toggleMappingExpansion = (index: number) => {
    const newExpanded = new Set(expandedMappings)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedMappings(newExpanded)
  }

  // CO/PO Selection Component
  const COPOSelector = ({ 
    selectedCOs, 
    selectedPOs, 
    onCOChange, 
    onPOChange 
  }: {
    selectedCOs: string[]
    selectedPOs: string[]
    onCOChange: (cos: string[]) => void
    onPOChange: (pos: string[]) => void
  }) => {
    const toggleCO = (coCode: string) => {
      const newCOs = selectedCOs.includes(coCode)
        ? selectedCOs.filter(co => co !== coCode)
        : [...selectedCOs, coCode]
      onCOChange(newCOs)
      
      // Auto-map POs if enabled
      if (autoMapPOs) {
        const mappedPOs = getMappedPOs(newCOs)
        onPOChange(mappedPOs)
      }
    }

    const togglePO = (poCode: string) => {
      const newPOs = selectedPOs.includes(poCode)
        ? selectedPOs.filter(po => po !== poCode)
        : [...selectedPOs, poCode]
      onPOChange(newPOs)
    }

    return (
      <div className="space-y-4">
        {/* CO Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Target className="inline w-4 h-4 mr-1" />
            Course Outcomes (COs)
          </label>
          {loadingCOs ? (
            <div className="text-sm text-gray-500">Loading COs...</div>
          ) : availableCOs.length === 0 ? (
            <div className="text-sm text-gray-500">No COs available for this subject</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableCOs.map((co) => (
                <button
                  key={co.id}
                  type="button"
                  onClick={() => toggleCO(co.code)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedCOs.includes(co.code)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CheckCircle 
                    className={`w-4 h-4 ${
                      selectedCOs.includes(co.code) ? 'text-blue-600' : 'text-gray-400'
                    }`} 
                  />
                  <span className="font-medium">{co.code}</span>
                  <span className="text-xs text-gray-500 truncate">{co.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PO Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Layers className="inline w-4 h-4 mr-1" />
            Program Outcomes (POs)
          </label>
          {loadingPOs ? (
            <div className="text-sm text-gray-500">Loading POs...</div>
          ) : availablePOs.length === 0 ? (
            <div className="text-sm text-gray-500">No POs available for this department</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availablePOs.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => togglePO(po.code)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedPOs.includes(po.code)
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CheckCircle 
                    className={`w-4 h-4 ${
                      selectedPOs.includes(po.code) ? 'text-green-600' : 'text-gray-400'
                    }`} 
                  />
                  <span className="font-medium">{po.code}</span>
                  <span className="text-xs text-gray-500 truncate">{po.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Items Summary */}
        {(selectedCOs.length > 0 || selectedPOs.length > 0) && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">Selected Mappings:</div>
            <div className="flex flex-wrap gap-2">
              {selectedCOs.map(co => (
                <span key={co} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {co}
                  <button
                    type="button"
                    onClick={() => toggleCO(co)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedPOs.map(po => (
                <span key={po} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {po}
                  <button
                    type="button"
                    onClick={() => togglePO(po)}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Enhanced filtering and sorting
  const teacherExams = useMemo(() => {
    logger.debug('Filtering exams:', exams?.length || 0, 'total,', teacherSubjects.length, 'teacher subjects')
    let filtered = exams?.filter(exam => {
      const hasSubject = teacherSubjects.some(subject => subject.id === exam.subject_id)
      return hasSubject
    }) || []
    logger.debug('Filtered exams:', filtered.length)

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exam => 
        exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.exam_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(exam => exam.exam_type === filterType)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'date':
          aVal = new Date(a.exam_date || 0).getTime()
          bVal = new Date(b.exam_date || 0).getTime()
          break
        case 'type':
          aVal = a.exam_type
          bVal = b.exam_type
          break
        case 'marks':
          aVal = a.total_marks || 0
          bVal = b.total_marks || 0
          break
        default:
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    return filtered
  }, [exams, teacherSubjects, searchTerm, filterType, sortBy, sortOrder])

  // Statistics calculation
  const examStatistics = useMemo(() => {
    const totalExams = teacherExams.length
    const totalMarks = teacherExams.reduce((sum, exam) => sum + (exam.total_marks || 0), 0)
    const avgMarks = totalExams > 0 ? totalMarks / totalExams : 0
    const examTypes = teacherExams.reduce((acc, exam) => {
      acc[exam.exam_type] = (acc[exam.exam_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalExams,
      totalMarks,
      avgMarks: Math.round(avgMarks * 100) / 100,
      examTypes,
      upcomingExams: teacherExams.filter(exam => 
        exam.exam_date && new Date(exam.exam_date) > new Date()
      ).length
    }
  }, [teacherExams])

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exam Configuration</h1>
            <p className="text-gray-600 mt-1">Create, manage, and analyze your exams with advanced features</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowStatistics(!showStatistics)}
              className="btn-secondary flex items-center space-x-2"
            >
              <BarChart3 size={18} />
              <span>Statistics</span>
            </button>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Create Exam</span>
        </button>
        <button
          onClick={forceRefresh}
          className="btn-secondary flex items-center space-x-2"
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
        
        {/* Cache Status Indicator */}
        <div className="flex items-center space-x-2 text-sm">
          <div className={`w-3 h-3 rounded-full ${isDataFresh ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-gray-600">
            {isDataFresh ? 'Fresh Data' : 'Cached Data'}
          </span>
          {lastRefreshTime && (
            <span className="text-gray-400">
              ({lastRefreshTime.toLocaleTimeString()})
            </span>
          )}
        </div>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStatistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-600">{examStatistics.totalExams}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Avg Marks</p>
                  <p className="text-2xl font-bold text-green-600">{examStatistics.avgMarks}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Upcoming</p>
                  <p className="text-2xl font-bold text-purple-600">{examStatistics.upcomingExams}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">Total Marks</p>
                  <p className="text-2xl font-bold text-orange-600">{examStatistics.totalMarks}</p>
                </div>
              </div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-indigo-900">Types</p>
                  <p className="text-2xl font-bold text-indigo-600">{Object.keys(examStatistics.examTypes).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="internal1">Internal 1</option>
            <option value="internal2">Internal 2</option>
            <option value="final">Final</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
            <option value="marks">Sort by Marks</option>
          </select>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? <TrendingUp size={16} /> : <TrendingUp size={16} className="rotate-180" />}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {viewMode === 'grid' ? <Layers size={16} /> : <FileText size={16} />}
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoMapPOs"
                  checked={autoMapPOs}
                  onChange={(e) => setAutoMapPOs(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoMapPOs" className="text-sm text-gray-700">
                  Auto-map POs from COs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showOnlyUpcoming"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showOnlyUpcoming" className="text-sm text-gray-700">
                  Show only upcoming exams
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="groupBySubject"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="groupBySubject" className="text-sm text-gray-700">
                  Group by subject
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exams List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {teacherExams.map(exam => {
          const subject = subjects.find(s => s.id === exam.subject_id)
          return (
            <div key={exam.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(exam)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    disabled={deletingExamId === exam.id}
                    className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingExamId === exam.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                    ) : (
                    <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-gray-400" />
                  <span>{subject?.name}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Settings size={16} className="text-gray-400" />
                  <span className="capitalize">{exam.exam_type.replace('internal', 'Internal ')}</span>
                </div>
                
                {exam.exam_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {exam.duration && (
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-gray-400" />
                    <span>{exam.duration} minutes</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span>Questions: {exam.questions?.length || 0}</span>
                  <span className="font-medium">Total: {exam.total_marks} marks</span>
                </div>
                
                {/* CO/PO Summary */}
                {exam.questions && exam.questions.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <div className="flex flex-wrap gap-1 mb-1">
                      <span className="font-medium">COs:</span>
                      {Array.from(new Set(exam.questions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).slice(0, 3).map(co => (
                        <span key={co} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                          {co}
                        </span>
                      ))}
                      {Array.from(new Set(exam.questions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).length > 3 && (
                        <span className="text-gray-400">+{Array.from(new Set(exam.questions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).length - 3} more</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="font-medium">CO Weights:</span>
                      <span className="text-gray-600 text-xs">
                        {exam.questions.reduce((total, q) => total + (q.co_weights?.length || 0), 0)} mappings
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {teacherExams.length === 0 && (
        <div className="card text-center py-8">
          <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Configured</h3>
          <p className="text-gray-600 mb-4">
            Start by creating your first exam configuration.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            Create First Exam
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 my-8 max-h-[90vh] flex flex-col shadow-xl overflow-y-auto">
            <div className="p-6 bg-white">
              <h2 className="text-lg font-semibold mb-4">
                {editingExam ? 'Edit Exam' : 'Create New Exam'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 flex flex-col bg-white">
              {/* Basic Info */}
              <div className="px-6 pt-6 pb-4 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g., Internal Exam 1"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    {...register('subject_id', { valueAsNumber: true })}
                    className="input-field w-full"
                  >
                    <option value="">Select Subject</option>
                    {teacherSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  {errors.subject_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.subject_id.message}</p>
                  )}
                </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    {...register('exam_type')}
                    className="input-field w-full"
                  >
                    <option value="">Select Type</option>
                    <option value="internal1">Internal 1</option>
                    <option value="internal2">Internal 2</option>
                    <option value="final">Final Exam</option>
                  </select>
                  {errors.exam_type && (
                    <p className="text-red-500 text-sm mt-1">{errors.exam_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Date
                  </label>
                  <input
                    {...register('exam_date')}
                    type="date"
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    {...register('duration', { valueAsNumber: true })}
                    type="number"
                    className="input-field w-full"
                    placeholder="180"
                  />
                </div>
                </div>
              </div>

              {/* Questions Section */}
              <div className="border-t pt-6 flex-1 flex flex-col bg-white px-6 min-h-0">
                {/* Sticky Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 pb-4 mb-6 z-20 shadow-sm rounded-t-lg -mx-6 px-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Questions</h3>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Total Marks: {totalMarks}</span>
                        {selectedSubjectId && (availableCOs.length > 0 || availablePOs.length > 0) && (
                          <span className="ml-4 text-xs text-gray-500">
                            {availableCOs.length} COs • {availablePOs.length} POs available
                          </span>
                        )}
                      </div>
                      {/* Bulk CO Mapping Button */}
                      {availableCOs.length > 0 && watchedQuestions && watchedQuestions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            // Add first CO to all questions with equal weight distribution
                            const firstCO = availableCOs[0]
                            const questions = watchedQuestions || []
                            const weightPerQuestion = Math.floor(100 / (questions.length || 1))
                            
                            questions.forEach((_: any, index: number) => {
                              setValue(`questions.${index}.co_weights`, [{
                                co_id: firstCO.id,
                                co_code: firstCO.code,
                                weight_pct: weightPerQuestion
                              }])
                            })
                            
                            toast.success(`Added ${firstCO.code} to all questions with ${weightPerQuestion}% weight each`)
                          }}
                          className="btn-secondary text-sm flex items-center space-x-1"
                        >
                          <Target size={16} />
                          <span>Bulk Map CO</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="btn-primary text-sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Question
                      </button>
                    </div>
                  </div>
                  
                  {/* Quick Stats - Always visible */}
                  {watchedQuestions && watchedQuestions.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Questions:</span>
                          <span className="ml-2 font-medium">{watchedQuestions.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unique COs:</span>
                          <span className="ml-2 font-medium">
                            {Array.from(new Set(watchedQuestions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).length}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unique POs:</span>
                          <span className="ml-2 font-medium">
                            {watchedQuestions.reduce((total, q) => total + (q.co_weights?.length || 0), 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Marks:</span>
                          <span className="ml-2 font-medium">
                            {(totalMarks / watchedQuestions.length).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50 rounded-lg p-4 min-h-0">
                  {fields.map((field, index) => (
                    <div key={field.id} id={`question-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {watchedQuestions?.[index]?.section || 'A'}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {watchedQuestions?.[index]?.max_marks || 0} marks
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                              {watchedQuestions?.[index]?.difficulty || 'medium'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Scroll to this question
                              const element = document.getElementById(`question-${index}`)
                              element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Scroll to question"
                          >
                            <Target size={16} />
                          </button>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete question"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Text Field */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text
                        </label>
                        <textarea
                          {...register(`questions.${index}.question_text`)}
                          rows={3}
                          className="input-field w-full"
                          placeholder="Enter the question text here..."
                        />
                      </div>
                      
                      {/* Question Text Validation Error */}
                      {errors.questions?.[index]?.question_text && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.questions[index]?.question_text?.message}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question No.
                          </label>
                          <input
                            {...register(`questions.${index}.question_number`)}
                            type="text"
                            className="input-field w-full"
                            placeholder="1a"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Marks
                          </label>
                          <input
                            {...register(`questions.${index}.max_marks`, { valueAsNumber: true })}
                            type="number"
                            step="0.5"
                            className="input-field w-full"
                            placeholder="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section
                          </label>
                          <select
                            {...register(`questions.${index}.section`)}
                            className="input-field w-full"
                          >
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                            <option value="C">Section C</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bloom's Level
                          </label>
                          <select
                            {...register(`questions.${index}.blooms_level`)}
                            className="input-field w-full"
                          >
                            <option value="Remember">Remember</option>
                            <option value="Understand">Understand</option>
                            <option value="Apply">Apply</option>
                            <option value="Analyze">Analyze</option>
                            <option value="Evaluate">Evaluate</option>
                            <option value="Create">Create</option>
                          </select>
                        </div>
                        </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Difficulty
                          </label>
                          <select
                            {...register(`questions.${index}.difficulty`)}
                            className="input-field w-full"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      {/* CO/PO Mapping Section - Collapsible */}
                      <div className="mt-4">
                        <div className="border-t pt-4 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-medium text-gray-700">CO/PO Mapping</h5>
                              {((watchedQuestions?.[index]?.co_weights?.length || 0) > 0) && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {(watchedQuestions?.[index]?.co_weights?.length || 0)} CO weights
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              <label className="flex items-center space-x-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={autoMapPOs}
                                  onChange={(e) => setAutoMapPOs(e.target.checked)}
                                  className="rounded"
                                />
                                <span>Auto-map POs</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => toggleMappingExpansion(index)}
                                className={`text-xs flex items-center space-x-1 px-2 py-1 rounded ${
                                  expandedMappings.has(index)
                                    ? 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100'
                                    : 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100'
                                }`}
                              >
                                {expandedMappings.has(index) ? (
                                  <>
                                    <X size={12} />
                                    <span>Hide Mapping</span>
                                  </>
                                ) : (
                                  <>
                                    <Target size={12} />
                                    <span>Map COs/POs</span>
                                  </>
                                )}
                              </button>
                              {/* Quick Add CO Button */}
                              {!expandedMappings.has(index) && availableCOs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Auto-select first CO with default weight
                                    const firstCO = availableCOs[0]
                                    const currentWeights = watchedQuestions?.[index]?.co_weights || []
                                    const newWeights = [...currentWeights, {
                                      co_id: firstCO.id,
                                      co_code: firstCO.code,
                                      weight_pct: 100 // Default to 100% if no other COs
                                    }]
                                    setValue(`questions.${index}.co_weights`, newWeights)
                                    toast.success(`Added ${firstCO.code} to question ${index + 1}`)
                                  }}
                                  className="text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded flex items-center space-x-1"
                                >
                                  <Plus size={12} />
                                  <span>Quick Add CO</span>
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick Summary */}
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {(watchedQuestions?.[index]?.co_weights || []).map((cw: any) => (
                                <span key={cw.co_id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  {cw.co_code} ({cw.weight_pct}%)
                                </span>
                              ))}
                              {(!watchedQuestions?.[index]?.co_weights?.length) && (
                                <span className="text-gray-500">No CO weights selected</span>
                              )}
                            </div>
                          </div>

                          {/* Detailed Mapping - Collapsible */}
                          {expandedMappings.has(index) && (
                            <div className="mt-3">
                              {selectedSubjectId && availableCOs.length > 0 ? (
                                <div className="space-y-4">
                                  <div className="text-sm text-gray-600">
                                    Select COs and assign weights for this question:
                                  </div>
                                  
                                  {/* CO Selection */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {availableCOs.map((co) => {
                                      const existingWeight = watchedQuestions?.[index]?.co_weights?.find(
                                        (cw: any) => cw.co_id === co.id
                                      )
                                      
                                      return (
                                        <div key={co.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                          <input
                                            type="checkbox"
                                            checked={!!existingWeight}
                                            onChange={(e) => {
                                              const currentWeights = watchedQuestions?.[index]?.co_weights || []
                                              let newWeights
                                              
                                              if (e.target.checked) {
                                                // Add CO with default weight
                                                newWeights = [...currentWeights, {
                                                  co_id: co.id,
                                                  co_code: co.code,
                                                  weight_pct: 10 // Default weight
                                                }]
                                              } else {
                                                // Remove CO
                                                newWeights = currentWeights.filter((cw: any) => cw.co_id !== co.id)
                                              }
                                              
                                              setValue(`questions.${index}.co_weights`, newWeights)
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                              {co.code}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {co.description}
                                            </div>
                                          </div>
                                          {existingWeight && (
                                            <div className="flex items-center space-x-2">
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={existingWeight.weight_pct}
                                                onChange={(e) => {
                                                  const currentWeights = watchedQuestions?.[index]?.co_weights || []
                                                  const newWeights = currentWeights.map((cw: any) =>
                                                    cw.co_id === co.id
                                                      ? { ...cw, weight_pct: Number(e.target.value) }
                                                      : cw
                                                  )
                                                  setValue(`questions.${index}.co_weights`, newWeights)
                                                }}
                                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                              />
                                              <span className="text-xs text-gray-500">%</span>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                  
                                  {/* Weight Validation */}
                                  {(() => {
                                    const totalWeight = watchedQuestions?.[index]?.co_weights?.reduce(
                                      (sum: number, cw: any) => sum + (cw.weight_pct || 0), 0
                                    ) || 0
                                    
                                    return (
                                      <div className={`text-sm p-3 rounded-lg ${
                                        totalWeight > 100 
                                          ? 'bg-red-50 text-red-700 border border-red-200'
                                          : totalWeight < 100
                                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                          : 'bg-green-50 text-green-700 border border-green-200'
                                      }`}>
                                        <div className="flex items-center justify-between">
                                          <span>Total Weight: {totalWeight}%</span>
                                          {totalWeight > 100 && (
                                            <span className="text-xs">⚠️ Exceeds 100%</span>
                                          )}
                                          {totalWeight < 100 && totalWeight > 0 && (
                                            <span className="text-xs">⚠️ Under 100%</span>
                                          )}
                                          {totalWeight === 100 && (
                                            <span className="text-xs">✅ Perfect</span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  
                                  {/* Auto-map POs */}
                                  {autoMapPOs && availablePOs.length > 0 && (
                                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                                      <div className="text-sm font-medium text-purple-900 mb-2">
                                        Auto-mapped POs (based on CO-PO mapping):
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(() => {
                                          const selectedCOs = watchedQuestions?.[index]?.co_weights?.map((cw: any) => cw.co_id) || []
                                          const mappedPOs = coPoMapping
                                            .filter((mapping: any) => selectedCOs.includes(mapping.co_id))
                                            .map((mapping: any) => mapping.po_definition?.code)
                                            .filter((code: string, index: number, arr: string[]) => arr.indexOf(code) === index)
                                          
                                          return mappedPOs.map((poCode: string) => (
                                            <span key={poCode} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                              {poCode}
                                            </span>
                                          ))
                                        })()}
                                        {(() => {
                                          const selectedCOs = watchedQuestions?.[index]?.co_weights?.map((cw: any) => cw.co_id) || []
                                          const mappedPOs = coPoMapping
                                            .filter((mapping: any) => selectedCOs.includes(mapping.co_id))
                                            .map((mapping: any) => mapping.po_definition?.code)
                                            .filter((code: string, index: number, arr: string[]) => arr.indexOf(code) === index)
                                          
                                          return mappedPOs.length === 0 && (
                                            <span className="text-xs text-purple-600">
                                              No POs mapped for selected COs
                                            </span>
                                          )
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : selectedSubjectId ? (
                                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                                  {loadingCOs ? 'Loading COs...' : 'No COs available for this subject'}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                                  Please select a subject first to configure CO/PO mappings
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {errors.questions?.[index] && (
                        <div className="mt-2 text-red-500 text-sm">
                          {Object.entries(errors.questions[index] || {}).map(([key, error]) => (
                            <p key={key}>{typeof error === 'object' && 'message' in error ? error.message : String(error)}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {errors.questions && (
                  <p className="text-red-500 text-sm mt-2">{errors.questions.message}</p>
                )}
              </div>

              {/* Form Buttons - Fixed at bottom */}
              <div className="flex justify-end space-x-3 pt-4 border-t bg-white px-6 pb-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingExam ? 'Update Exam' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto"></div>
        </div>
      )}

      {/* Question Navigation Sidebar */}
      {isModalOpen && watchedQuestions && watchedQuestions.length > 3 && (
        <div className="fixed left-6 top-1/2 transform -translate-y-1/2 z-[60]">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-h-96 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Questions</h4>
            <div className="space-y-1">
              {watchedQuestions.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const element = document.getElementById(`question-${index}`)
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>Q{index + 1}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-400">{watchedQuestions[index]?.section || 'A'}</span>
                    <span className="text-blue-600">{watchedQuestions[index]?.max_marks || 0}m</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {isModalOpen && (
        <div className="fixed bottom-6 right-6 z-[70]">
          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
            title="Add New Question"
          >
            <Plus size={24} />
            <span className="hidden sm:inline">Add Question</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ExamConfiguration