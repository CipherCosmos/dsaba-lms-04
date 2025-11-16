import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { 
  fetchSubjects, 
  createSubject, 
  updateSubject, 
  deleteSubject 
} from '../../store/slices/subjectSlice'
import type { Subject } from '../../store/slices/subjectSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { subjectAPI, academicStructureAPI } from '../../services/api'
import { useAcademicYears } from '../../core/hooks'
import { AcademicYearSelector } from '../../components/shared/AcademicYearSelector'
import { logger } from '../../core/utils/logger'
import { Plus, Edit2, Trash2, BookOpen, Search, X, Power, PowerOff, Settings, Award } from 'lucide-react'

const schema = yup.object({
  name: yup.string().required('Subject name is required'),
  code: yup.string().required('Subject code is required'),
  department_id: yup.number().required('Department is required'),
  credits: yup.number().min(1).max(6).required('Credits is required'),
  semester_id: yup.number().nullable().transform((value, originalValue) => {
    return originalValue === '' ? null : value;
  }),
  academic_year_id: yup.number().nullable().transform((value, originalValue) => {
    return originalValue === '' ? null : value;
  }),
  max_internal: yup.number().min(0).max(100).required('Internal marks is required'),
  max_external: yup.number().min(0).max(100).required('External marks is required'),
})

type SubjectForm = yup.InferType<typeof schema>

const SubjectManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, loading } = useSelector((state: RootState) => state.subjects)
  const { departments } = useSelector((state: RootState) => state.departments)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [showMarksModal, setShowMarksModal] = useState(false)
  const [marksModalSubject, setMarksModalSubject] = useState<any>(null)
  const [marksData, setMarksData] = useState({ max_internal: 40, max_external: 60 })
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [semesters, setSemesters] = useState<any[]>([])
  const { data: academicYearsData } = useAcademicYears(0, 100)
  const academicYears = academicYearsData?.items || []

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<SubjectForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      max_internal: 40,
      max_external: 60,
    }
  })

  const watchedDepartment = watch('department_id')
  const watchedMaxInternal = watch('max_internal')
  const watchedMaxExternal = watch('max_external')

  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchDepartments())
    loadSemesters()
  }, [dispatch])

  useEffect(() => {
    // Update max_external when max_internal changes to maintain total = 100
    if (watchedMaxInternal !== undefined && watchedMaxInternal !== null) {
      const newExternal = 100 - watchedMaxInternal
      if (newExternal >= 0 && newExternal <= 100) {
        setValue('max_external', newExternal)
      }
    }
  }, [watchedMaxInternal, setValue])

  useEffect(() => {
    // Update max_internal when max_external changes to maintain total = 100
    if (watchedMaxExternal !== undefined && watchedMaxExternal !== null) {
      const newInternal = 100 - watchedMaxExternal
      if (newInternal >= 0 && newInternal <= 100) {
        setValue('max_internal', newInternal)
      }
    }
  }, [watchedMaxExternal, setValue])

  const loadSemesters = async () => {
    try {
      const response = await academicStructureAPI.getAllSemesters(0, 1000)
      setSemesters(response.items || [])
    } catch (error) {
      logger.error('Error loading semesters:', error)
      toast.error('Failed to load semesters')
    }
  }

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || 
      subject.department_id.toString() === departmentFilter
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && subject.is_active) ||
      (statusFilter === 'inactive' && !subject.is_active)
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: subjects.length,
    active: subjects.filter(s => s.is_active).length,
    inactive: subjects.filter(s => !s.is_active).length,
    byDepartment: departments.reduce((acc, dept) => {
      acc[dept.id] = subjects.filter(s => s.department_id === dept.id).length
      return acc
    }, {} as Record<number, number>)
  }

  const onSubmit = async (data: SubjectForm) => {
    try {
      const processedData: any = {
        name: data.name,
        code: data.code,
        department_id: data.department_id,
        credits: data.credits,
        max_internal: data.max_internal,
        max_external: data.max_external,
        semester_id: data.semester_id || undefined,
        academic_year_id: data.academic_year_id || undefined,
      }

      if (editingSubject) {
        await dispatch(updateSubject({ id: editingSubject.id, ...processedData })).unwrap()
        toast.success('Subject updated successfully!')
      } else {
        await dispatch(createSubject(processedData)).unwrap()
        toast.success('Subject created successfully!')
      }
      closeModal()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (subject: any) => {
    setEditingSubject(subject)
    setValue('name', subject.name)
    setValue('code', subject.code)
    setValue('department_id', subject.department_id)
    setValue('credits', subject.credits)
    setValue('max_internal', subject.max_internal || 40)
    setValue('max_external', subject.max_external || 60)
    setValue('semester_id', subject.semester_id || null)
    setValue('academic_year_id', subject.academic_year_id || null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await dispatch(deleteSubject(id)).unwrap()
        toast.success('Subject deleted successfully!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete subject')
      }
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await subjectAPI.activate(id)
      toast.success('Subject activated successfully!')
      dispatch(fetchSubjects())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to activate subject')
    }
  }

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this subject?')) {
      return
    }
    try {
      await subjectAPI.deactivate(id)
      toast.success('Subject deactivated successfully!')
      dispatch(fetchSubjects())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate subject')
    }
  }

  const handleUpdateMarks = async () => {
    if (!marksModalSubject) return
    if (marksData.max_internal + marksData.max_external !== 100) {
      toast.error('Internal and External marks must total 100')
      return
    }
    try {
      await subjectAPI.updateMarks(marksModalSubject.id, marksData)
      toast.success('Marks distribution updated successfully!')
      setShowMarksModal(false)
      setMarksModalSubject(null)
      dispatch(fetchSubjects())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update marks distribution')
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSubject(null)
    reset()
  }

  // Get semesters for selected department
  const getSemestersForDepartment = () => {
    if (!watchedDepartment) return []
    return semesters.filter(s => s.department_id === watchedDepartment)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage subjects, marks distribution, and subject status</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Power className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <PowerOff className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-semibold text-gray-900">{departments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search subjects by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(searchTerm || departmentFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setDepartmentFilter('all')
                  setStatusFilter('all')
                }}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <X size={16} className="mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Credits</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Marks Distribution</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No subjects found
                  </td>
                </tr>
              ) : (
                filteredSubjects.map(subject => {
                  const department = departments.find(d => d.id === subject.department_id)
                  
                  return (
                    <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <BookOpen size={16} className="text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{subject.name}</p>
                            <p className="text-sm text-gray-600">Code: {subject.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900">
                          {department?.name || 'Unknown'}
                        </span>
                        {department && (
                          <p className="text-xs text-gray-500">
                            {department.code}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {subject.credits}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="text-sm">
                          <span className="text-gray-700">Internal: {subject.max_internal}</span>
                          <span className="mx-1 text-gray-400">|</span>
                          <span className="text-gray-700">External: {subject.max_external}</span>
                        </div>
                        <button
                          onClick={() => {
                            setMarksModalSubject(subject)
                            setMarksData({
                              max_internal: subject.max_internal || 40,
                              max_external: subject.max_external || 60
                            })
                            setShowMarksModal(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          subject.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subject.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(subject)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          {subject.is_active ? (
                            <button
                              onClick={() => handleDeactivate(subject.id)}
                              className="p-2 text-gray-400 hover:text-orange-600 rounded-lg"
                              title="Deactivate"
                            >
                              <PowerOff size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(subject.id)}
                              className="p-2 text-gray-400 hover:text-green-600 rounded-lg"
                              title="Activate"
                            >
                              <Power size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(subject.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSubjects.length === 0 && !loading && (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || departmentFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by creating your first subject.'}
          </p>
          {!searchTerm && departmentFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              Add First Subject
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g., Data Structures"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g., CS301"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('department_id', { valueAsNumber: true })}
                    className="input-field w-full"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  {errors.department_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.department_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('credits', { valueAsNumber: true })}
                    className="input-field w-full"
                  >
                    <option value="">Select Credits</option>
                    {[1, 2, 3, 4, 5, 6].map(credit => (
                      <option key={credit} value={credit}>
                        {credit} Credit{credit > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.credits && (
                    <p className="text-red-500 text-sm mt-1">{errors.credits.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester (Optional)
                  </label>
                  <select
                    {...register('semester_id', { 
                      setValueAs: (value) => value === '' ? null : Number(value)
                    })}
                    className="input-field w-full"
                    disabled={!watchedDepartment}
                  >
                    <option value="">Select Semester</option>
                    {getSemestersForDepartment().map(sem => (
                      <option key={sem.id} value={sem.id}>
                        Semester {sem.semester_no}
                      </option>
                    ))}
                  </select>
                  {!watchedDepartment && (
                    <p className="text-xs text-gray-500 mt-1">Select department first</p>
                  )}
                </div>

                <div>
                  <AcademicYearSelector
                    value={watch('academic_year_id') || null}
                    onChange={(value) => setValue('academic_year_id', value || null)}
                    required={false}
                    label="Academic Year (Optional)"
                    showCurrentBadge={true}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marks Distribution <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Internal Marks</label>
                    <input
                      {...register('max_internal', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="input-field w-full"
                    />
                    {errors.max_internal && (
                      <p className="text-red-500 text-xs mt-1">{errors.max_internal.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">External Marks</label>
                    <input
                      {...register('max_external', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="input-field w-full"
                    />
                    {errors.max_external && (
                      <p className="text-red-500 text-xs mt-1">{errors.max_external.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className={`font-medium ${
                    (watchedMaxInternal || 0) + (watchedMaxExternal || 0) === 100
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    Total: {(watchedMaxInternal || 0) + (watchedMaxExternal || 0)} / 100
                  </span>
                  {(watchedMaxInternal || 0) + (watchedMaxExternal || 0) !== 100 && (
                    <p className="text-xs text-red-600 mt-1">
                      Internal and External marks must total 100
                    </p>
                  )}
                </div>
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
                  disabled={loading || (watchedMaxInternal || 0) + (watchedMaxExternal || 0) !== 100}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marks Distribution Modal */}
      {showMarksModal && marksModalSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Update Marks Distribution</h2>
            <p className="text-sm text-gray-600 mb-4">
              Update marks distribution for <strong>{marksModalSubject.name}</strong>
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={marksData.max_internal}
                    onChange={(e) => {
                      const internal = parseFloat(e.target.value) || 0
                      setMarksData({
                        max_internal: internal,
                        max_external: 100 - internal
                      })
                    }}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    External Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={marksData.max_external}
                    onChange={(e) => {
                      const external = parseFloat(e.target.value) || 0
                      setMarksData({
                        max_internal: 100 - external,
                        max_external: external
                      })
                    }}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="text-sm">
                <span className={`font-medium ${
                  marksData.max_internal + marksData.max_external === 100
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  Total: {marksData.max_internal + marksData.max_external} / 100
                </span>
                {marksData.max_internal + marksData.max_external !== 100 && (
                  <p className="text-xs text-red-600 mt-1">
                    Internal and External marks must total 100
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMarksModal(false)
                    setMarksModalSubject(null)
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateMarks}
                  disabled={marksData.max_internal + marksData.max_external !== 100}
                  className="btn-primary disabled:opacity-50"
                >
                  Update Marks
                </button>
              </div>
            </div>
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

export default SubjectManagement
