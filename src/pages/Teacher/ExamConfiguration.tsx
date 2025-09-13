import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm, useFieldArray } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { fetchExams, createExam, updateExam, deleteExam } from '../../store/slices/examSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchCODefinitions, fetchPODefinitions } from '../../store/slices/copoSlice'
import { coAPI, poAPI } from '../../services/api'
import { Plus, Edit2, Trash2, Settings, Calendar, Clock, FileText, Target, Layers, CheckCircle, X } from 'lucide-react'

const questionSchema = yup.object({
  question_number: yup.string().required('Question number is required'),
  max_marks: yup.number().min(0.5, 'Minimum 0.5 marks').required('Marks required'),
  section: yup.string().oneOf(['A', 'B', 'C']).required('Section is required'),
  blooms_level: yup.string().required('Blooms level is required'),
  difficulty: yup.string().oneOf(['easy', 'medium', 'hard']).required('Difficulty is required'),
  co_mapping: yup.array().of(yup.string()),
  po_mapping: yup.array().of(yup.string())
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
  const { exams, loading } = useSelector((state: RootState) => state.exams)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)
  const { coDefinitions, poDefinitions } = useSelector((state: RootState) => state.copo)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<any>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [availableCOs, setAvailableCOs] = useState<any[]>([])
  const [availablePOs, setAvailablePOs] = useState<any[]>([])
  const [loadingCOs, setLoadingCOs] = useState(false)
  const [loadingPOs, setLoadingPOs] = useState(false)
  const [coPoMapping, setCoPoMapping] = useState<any[]>([])
  const [autoMapPOs, setAutoMapPOs] = useState(true)

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
      questions: [
        {
          question_number: '1a',
          max_marks: 10,
          section: 'A',
          blooms_level: 'Remember',
          difficulty: 'easy',
          co_mapping: [],
          po_mapping: []
        }
      ]
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
    subjects.filter(s => s.teacher_id === user?.id),
    [subjects, user?.id]
  )

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
      if (subject?.department_id) {
        // Fetch POs for the department
        const poResponse = await poAPI.getByDepartment(subject.department_id)
        setAvailablePOs(poResponse || [])
        
        // Fetch CO-PO mapping for auto-mapping
        try {
          const response = await fetch(`/api/analytics/co-po-mapping/${subjectId}`)
          if (response.ok) {
            const mapping = await response.json()
            setCoPoMapping(mapping)
          }
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
      // Convert date to ISO string if provided
      const examData = {
        ...data,
        exam_date: data.exam_date ? new Date(data.exam_date).toISOString() : undefined,
        duration: data.duration || undefined,
        questions: data.questions?.map((q: any, index: number) => ({
          ...q,
          id: q.id || index + 1,
          co_mapping: q.co_mapping?.filter((co: any) => co !== undefined) || [],
          po_mapping: q.po_mapping?.filter((po: any) => po !== undefined) || []
        })) || []
      }

      if (editingExam) {
        await dispatch(updateExam({ id: editingExam.id, ...examData })).unwrap()
        toast.success('Exam updated successfully!')
      } else {
        await dispatch(createExam(examData)).unwrap()
        toast.success('Exam created successfully!')
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
      questions: exam.questions?.length > 0 ? exam.questions : [{
        question_number: '1a',
        max_marks: 10,
        section: 'A',
        blooms_level: 'Remember',
        difficulty: 'easy',
        co_mapping: [],
        po_mapping: []
      }]
    })
    
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await dispatch(deleteExam(id)).unwrap()
        toast.success('Exam deleted successfully!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete exam')
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExam(null)
    reset({
      questions: [{
        question_number: '1a',
        max_marks: 10,
        section: 'A',
        blooms_level: 'Remember',
        difficulty: 'easy',
        co_mapping: [],
        po_mapping: []
      }]
    })
  }

  const addQuestion = () => {
    append({
      question_number: '',
      max_marks: 10,
      section: 'A',
      blooms_level: 'Remember',
      difficulty: 'easy',
      co_mapping: [],
      po_mapping: []
    })
  }

  // CO/PO Selection Component
  const COPOSelector = ({ 
    questionIndex, 
    selectedCOs, 
    selectedPOs, 
    onCOChange, 
    onPOChange 
  }: {
    questionIndex: number
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

  // Filter exams for current teacher
  const teacherExams = exams.filter(exam => 
    teacherSubjects.some(subject => subject.id === exam.subject_id)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Exam Configuration</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Create Exam</span>
        </button>
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
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
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
                      {Array.from(new Set(exam.questions.flatMap(q => q.co_mapping || []))).slice(0, 3).map(co => (
                        <span key={co} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                          {co}
                        </span>
                      ))}
                      {Array.from(new Set(exam.questions.flatMap(q => q.co_mapping || []))).length > 3 && (
                        <span className="text-gray-400">+{Array.from(new Set(exam.questions.flatMap(q => q.co_mapping || []))).length - 3} more</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="font-medium">POs:</span>
                      {Array.from(new Set(exam.questions.flatMap(q => q.po_mapping || []))).slice(0, 3).map(po => (
                        <span key={po} className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">
                          {po}
                        </span>
                      ))}
                      {Array.from(new Set(exam.questions.flatMap(q => q.po_mapping || []))).length > 3 && (
                        <span className="text-gray-400">+{Array.from(new Set(exam.questions.flatMap(q => q.po_mapping || []))).length - 3} more</span>
                      )}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingExam ? 'Edit Exam' : 'Create New Exam'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
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

              {/* Questions Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
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
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="btn-secondary text-sm"
                    >
                      <Plus size={16} className="mr-1" />
                      Add Question
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                {watchedQuestions && watchedQuestions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Questions:</span>
                        <span className="ml-2 font-medium">{watchedQuestions.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unique COs:</span>
                        <span className="ml-2 font-medium">
                          {Array.from(new Set(watchedQuestions.flatMap(q => q.co_mapping || []))).length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unique POs:</span>
                        <span className="ml-2 font-medium">
                          {Array.from(new Set(watchedQuestions.flatMap(q => q.po_mapping || []))).length}
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

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

                      {/* CO/PO Mapping Section */}
                      <div className="mt-4">
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-700">CO/PO Mapping</h5>
                            <label className="flex items-center space-x-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={autoMapPOs}
                                onChange={(e) => setAutoMapPOs(e.target.checked)}
                                className="rounded"
                              />
                              <span>Auto-map POs from COs</span>
                            </label>
                          </div>
                          {selectedSubjectId ? (
                            <COPOSelector
                              questionIndex={index}
                              selectedCOs={watchedQuestions?.[index]?.co_mapping || []}
                              selectedPOs={watchedQuestions?.[index]?.po_mapping || []}
                              onCOChange={(cos) => setValue(`questions.${index}.co_mapping`, cos)}
                              onPOChange={(pos) => setValue(`questions.${index}.po_mapping`, pos)}
                            />
                          ) : (
                            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                              Please select a subject first to configure CO/PO mappings
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

              <div className="flex justify-end space-x-3 pt-4">
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
    </div>
  )
}

export default ExamConfiguration