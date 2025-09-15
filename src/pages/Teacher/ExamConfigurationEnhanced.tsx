import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm, useFieldArray } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { fetchExams, createExam, updateExam, deleteExam } from '../../store/slices/examSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { coAPI, poAPI, attainmentAnalyticsAPI } from '../../services/api'
import { 
  Plus, Edit2, Trash2, Settings, Calendar, Clock, FileText, Target, Layers, 
  CheckCircle, X, Search, Filter, Download, Upload, Copy, Eye, BarChart3,
  TrendingUp, Users, Award, BookOpen, Zap, RefreshCw, Save, AlertTriangle,
  ChevronDown, ChevronUp, Star, Share2, Archive, Play, Pause, MoreVertical
} from 'lucide-react'

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

const ExamConfigurationEnhanced = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { exams, loading } = useSelector((state: RootState) => state.exams)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { user } = useSelector((state: RootState) => state.auth)
  
  // Enhanced state management
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<any>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [availableCOs, setAvailableCOs] = useState<any[]>([])
  const [availablePOs, setAvailablePOs] = useState<any[]>([])
  const [loadingCOs, setLoadingCOs] = useState(false)
  const [loadingPOs, setLoadingPOs] = useState(false)
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
  const [examTemplates, setExamTemplates] = useState<any[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [groupBy, setGroupBy] = useState<'none' | 'subject' | 'type' | 'date'>('none')

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
      questions: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions'
  })

  const watchedQuestions = watch('questions')
  const totalMarks = watchedQuestions?.reduce((sum, q) => sum + (q.max_marks || 0), 0) || 0

  useEffect(() => {
    dispatch(fetchExams())
    dispatch(fetchSubjects())
  }, [dispatch])

  useEffect(() => {
    setValue('total_marks', totalMarks)
  }, [totalMarks, setValue])

  // Filter subjects for current teacher
  const teacherSubjects = useMemo(() => 
    subjects?.filter(s => s && s.teacher_id === user?.id) || [],
    [subjects, user?.id]
  )

  // Enhanced filtering and sorting
  const teacherExams = useMemo(() => {
    let filtered = exams?.filter(exam => 
      teacherSubjects.some(subject => subject.id === exam.subject_id)
    ) || []

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
      const coResponse = await coAPI.getBySubject(subjectId)
      setAvailableCOs(coResponse || [])

      // Get the subject to find its department
      const subject = subjects.find(s => s.id === subjectId)
      if (subject?.class_id) {
        // Get the class to find department_id
        const classData = classes.find(c => c.id === subject.class_id)
        if (classData?.department_id) {
          // Fetch POs for the department
          const poResponse = await poAPI.getByDepartment(classData.department_id)
          setAvailablePOs(poResponse || [])
        }
        
        // Fetch CO-PO mapping for auto-mapping
        try {
          const mapping = await attainmentAnalyticsAPI.getCOPOMapping(subjectId)
          setCoPoMapping(mapping)
        } catch (error) {
          console.warn('Could not fetch CO-PO mapping:', error)
          setCoPoMapping([])
        }
      }
    } catch (error) {
      console.error('Error fetching COs and POs:', error)
      toast.error('Failed to load CO/PO data')
    } finally {
      setLoadingCOs(false)
      setLoadingPOs(false)
    }
  }

  const handleEdit = (exam: any) => {
    setEditingExam(exam)
    setSelectedSubjectId(exam.subject_id)
    fetchCOsAndPOs(exam.subject_id)
    reset({
      name: exam.name,
      subject_id: exam.subject_id,
      exam_type: exam.exam_type,
      exam_date: exam.exam_date ? new Date(exam.exam_date) : null,
      duration: exam.duration,
      total_marks: exam.total_marks,
      questions: exam.questions || []
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (examId: number) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await dispatch(deleteExam(examId))
        toast.success('Exam deleted successfully')
      } catch (error) {
        toast.error('Failed to delete exam')
      }
    }
  }

  const onSubmit = async (data: ExamForm) => {
    try {
      if (editingExam) {
        await dispatch(updateExam({ id: editingExam.id, ...data }))
        toast.success('Exam updated successfully')
      } else {
        await dispatch(createExam(data))
        toast.success('Exam created successfully')
      }
      setIsModalOpen(false)
      setEditingExam(null)
      reset()
    } catch (error) {
      toast.error('Failed to save exam')
    }
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Exam Configuration</h1>
            <p className="text-gray-600 mt-1">Create, manage, and analyze your exams with comprehensive features</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <BookOpen size={18} />
              <span>Templates</span>
            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">No Grouping</option>
                <option value="subject">Group by Subject</option>
                <option value="type">Group by Type</option>
                <option value="date">Group by Date</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Exams Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {teacherExams.map(exam => {
            const subject = subjects.find(s => s.id === exam.subject_id)
            const isUpcoming = exam.exam_date && new Date(exam.exam_date) > new Date()
            const isPast = exam.exam_date && new Date(exam.exam_date) < new Date()
            
            return (
              <div key={exam.id} className={`card hover:shadow-lg transition-shadow duration-200 ${isUpcoming ? 'ring-2 ring-blue-200' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{exam.name}</h3>
                      {isUpcoming && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Upcoming
                        </span>
                      )}
                      {isPast && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{subject?.name}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(exam)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Exam"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {/* Duplicate exam */}}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Duplicate Exam"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => {/* View details */}}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Exam"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Exam Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Settings size={16} className="text-gray-400" />
                      <span className="text-sm capitalize">{exam.exam_type.replace('internal', 'Internal ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target size={16} className="text-gray-400" />
                      <span className="text-sm font-medium">{exam.total_marks} marks</span>
                    </div>
                  </div>
                  
                  {exam.exam_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-sm">{new Date(exam.exam_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {exam.duration && (
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-sm">{exam.duration} minutes</span>
                    </div>
                  )}
                </div>
                
                {/* Questions and CO/PO Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">Questions: {exam.questions?.length || 0}</span>
                    <div className="flex items-center space-x-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800">
                        View Questions
                      </button>
                    </div>
                  </div>
                  
                  {/* CO/PO Tags */}
                  {exam.questions && exam.questions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs font-medium text-gray-500">COs:</span>
                        {Array.from(new Set(exam.questions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).slice(0, 4).map(co => (
                          <span key={co} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                            {co}
                          </span>
                        ))}
                        {Array.from(new Set(exam.questions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).length > 4 && (
                          <span className="text-xs text-gray-400">
                            +{Array.from(new Set(exam.questions.flatMap(q => q.co_weights?.map(cw => cw.co_code) || []))).length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Bar for CO Coverage */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>CO Coverage</span>
                      <span>75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                  <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                    <BarChart3 size={14} />
                    <span>Analytics</span>
                  </button>
                  <button className="text-sm text-green-600 hover:text-green-800 flex items-center space-x-1">
                    <Download size={14} />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teacherExams.map(exam => {
                  const subject = subjects.find(s => s.id === exam.subject_id)
                  return (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{exam.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{subject?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {exam.exam_type.replace('internal', 'Internal ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'Not set'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.questions?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exam.total_marks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(exam)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exam.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enhanced Modal for Creating/Editing Exams */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingExam ? 'Edit Exam' : 'Create New Exam'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingExam(null)
                    reset()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Name *
                  </label>
                  <input
                    {...register('name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter exam name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    {...register('subject_id')}
                    onChange={(e) => {
                      const subjectId = Number(e.target.value)
                      setSelectedSubjectId(subjectId)
                      fetchCOsAndPOs(subjectId)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    {teacherSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                  {errors.subject_id && <p className="text-red-500 text-sm mt-1">{errors.subject_id.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Type *
                  </label>
                  <select
                    {...register('exam_type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select exam type</option>
                    <option value="internal1">Internal 1</option>
                    <option value="internal2">Internal 2</option>
                    <option value="final">Final</option>
                  </select>
                  {errors.exam_type && <p className="text-red-500 text-sm mt-1">{errors.exam_type.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    {...register('exam_date')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    {...register('duration')}
                    min="30"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    {...register('total_marks')}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated from questions</p>
                </div>
              </div>

              {/* Questions Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Questions</h3>
                  <button
                    type="button"
                    onClick={() => append({
                      question_number: '',
                      question_text: 'Enter your question here...',
                      max_marks: 0,
                      section: 'A',
                      blooms_level: '',
                      difficulty: 'medium',
                      co_weights: []
                    })}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Question Text Field */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text
                        </label>
                        <textarea
                          {...register(`questions.${index}.question_text`)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter the question text here..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question Number
                          </label>
                          <input
                            {...register(`questions.${index}.question_number`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Q1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Marks
                          </label>
                          <input
                            type="number"
                            {...register(`questions.${index}.max_marks`)}
                            min="0.5"
                            step="0.5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section
                          </label>
                          <select
                            {...register(`questions.${index}.section`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select level</option>
                            <option value="Remember">Remember</option>
                            <option value="Understand">Understand</option>
                            <option value="Apply">Apply</option>
                            <option value="Analyze">Analyze</option>
                            <option value="Evaluate">Evaluate</option>
                            <option value="Create">Create</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Difficulty
                          </label>
                          <select
                            {...register(`questions.${index}.difficulty`)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      {/* CO Weights */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CO Weights
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {availableCOs.map(co => (
                            <div key={co.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{co.code}</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Weight %"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingExam(null)
                    reset()
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>{editingExam ? 'Update Exam' : 'Create Exam'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExamConfigurationEnhanced
