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
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { Plus, Edit2, Trash2, BookOpen, User } from 'lucide-react'

const schema = yup.object({
  name: yup.string().required('Subject name is required'),
  code: yup.string().required('Subject code is required'),
  department_id: yup.number().required('Department is required'),
  credits: yup.number().min(1).max(6).required('Credits is required'),
  cos: yup.array().of(yup.string()).default([]),
  pos: yup.array().of(yup.string()).default([]),
})

type SubjectForm = yup.InferType<typeof schema>

const SubjectManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects, loading } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { departments } = useSelector((state: RootState) => state.departments)
  const { users } = useSelector((state: RootState) => state.users)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<SubjectForm>({
    resolver: yupResolver(schema),
  })

  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchDepartments())
    dispatch(fetchUsers())
  }, [dispatch])

  const teachers = users.filter(u => u.role === 'teacher')

  const onSubmit = async (data: SubjectForm) => {
    try {
      // Process CO and PO mappings
      const processedData = {
        name: data.name,
        code: data.code,
        department_id: data.department_id,
        credits: data.credits,
        // Remove fields that don't belong to Subject entity
        // cos, pos, teacher_id are not part of Subject - they're in subject_assignments or CO definitions
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

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSubject(null)
    reset()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Subject</span>
        </button>
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
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(subject => {
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
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        subject.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {subject.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 size={16} />
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

      {subjects.length === 0 && (
        <div className="card text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Found</h3>
          <p className="text-gray-600 mb-4">
            Start by creating your first subject.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            Add First Subject
          </button>
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
                    Department
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credits
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Outcomes (CO) - Comma separated
                  </label>
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g., CO1, CO2, CO3"
                    defaultValue={editingSubject?.cos?.join(', ') || ''}
                    onChange={(e) => {
                      const cos = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      setValue('cos', cos)
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program Outcomes (PO) - Comma separated
                  </label>
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g., PO1, PO2, PO3"
                    defaultValue={editingSubject?.pos?.join(', ') || ''}
                    onChange={(e) => {
                      const pos = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      setValue('pos', pos)
                    }}
                  />
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
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
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

export default SubjectManagement