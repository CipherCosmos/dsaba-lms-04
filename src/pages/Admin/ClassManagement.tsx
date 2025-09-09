import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { 
  fetchClasses, 
  createClass, 
  updateClass, 
  deleteClass 
} from '../../store/slices/classSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { Plus, Edit2, Trash2, Users, BookOpen, GraduationCap } from 'lucide-react'

const schema = yup.object({
  name: yup.string().required('Class name is required'),
  department_id: yup.number().required('Department is required'),
  semester: yup.number().min(1, 'Minimum semester 1').max(8, 'Maximum semester 8').required('Semester is required'),
  section: yup.string().required('Section is required'),
})

type ClassForm = yup.InferType<typeof schema>

const ClassManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { classes, loading } = useSelector((state: RootState) => state.classes)
  const { departments } = useSelector((state: RootState) => state.departments)
  const { users } = useSelector((state: RootState) => state.users)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<ClassForm>({
    resolver: yupResolver(schema),
  })

  useEffect(() => {
    dispatch(fetchClasses())
    dispatch(fetchDepartments())
    dispatch(fetchUsers())
  }, [dispatch])

  const onSubmit = async (data: ClassForm) => {
    try {
      if (editingClass) {
        await dispatch(updateClass({ id: editingClass.id, ...data })).unwrap()
        toast.success('Class updated successfully!')
      } else {
        await dispatch(createClass(data)).unwrap()
        toast.success('Class created successfully!')
      }
      closeModal()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem)
    setValue('name', classItem.name)
    setValue('department_id', classItem.department_id)
    setValue('semester', classItem.semester)
    setValue('section', classItem.section)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await dispatch(deleteClass(id)).unwrap()
        toast.success('Class deleted successfully!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete class')
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingClass(null)
    reset()
  }

  const getClassStats = (classId: number) => {
    const classStudents = users.filter(u => u.class_id === classId && u.role === 'student')
    return {
      students: classStudents.length,
      activeStudents: classStudents.filter(s => s.is_active).length
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Class</span>
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(classItem => {
          const department = departments.find(d => d.id === classItem.department_id)
          const stats = getClassStats(classItem.id)
          
          return (
            <div key={classItem.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{classItem.name}</h3>
                    <p className="text-sm text-gray-500">
                      Semester {classItem.semester} - Section {classItem.section}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(classItem)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(classItem.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{department?.name || 'Unknown'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Department Code:</span>
                  <span className="font-medium bg-gray-100 px-2 py-1 rounded text-xs">
                    {department?.code || 'N/A'}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Users size={16} />
                      <span className="text-lg font-semibold">{stats.students}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Total Students</p>
                      <p className="text-xs text-green-600">
                        {stats.activeStudents} active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {classes.length === 0 && (
        <div className="card text-center py-8">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
          <p className="text-gray-600 mb-4">
            Start by creating your first class.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            Add First Class
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g., CSE-A"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

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
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.department_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <select
                    {...register('semester', { valueAsNumber: true })}
                    className="input-field w-full"
                  >
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                  {errors.semester && (
                    <p className="text-red-500 text-sm mt-1">{errors.semester.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    {...register('section')}
                    className="input-field w-full"
                  >
                    <option value="">Select</option>
                    {['A', 'B', 'C', 'D'].map(section => (
                      <option key={section} value={section}>
                        Section {section}
                      </option>
                    ))}
                  </select>
                  {errors.section && (
                    <p className="text-red-500 text-sm mt-1">{errors.section.message}</p>
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
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingClass ? 'Update' : 'Create'}
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

export default ClassManagement