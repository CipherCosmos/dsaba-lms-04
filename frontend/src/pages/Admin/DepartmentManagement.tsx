import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { 
  fetchDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '../../store/slices/departmentSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { Plus, Edit2, Trash2, Building, Users, GraduationCap } from 'lucide-react'

const schema = yup.object({
  name: yup.string().required('Department name is required'),
  code: yup.string().required('Department code is required').max(10, 'Code must be 10 characters or less'),
  hod_id: yup.number().nullable().transform((value, originalValue) => {
    return originalValue === '' ? null : value;
  }),
})

type DepartmentForm = yup.InferType<typeof schema>

const DepartmentManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { departments, loading } = useSelector((state: RootState) => state.departments)
  const { users } = useSelector((state: RootState) => state.users)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<DepartmentForm>({
    resolver: yupResolver(schema),
  })

  useEffect(() => {
    dispatch(fetchDepartments())
    dispatch(fetchUsers())
  }, [dispatch])

  const hods = users.filter(u => u.role === 'hod' || u.role === 'admin')

  const onSubmit = async (data: DepartmentForm) => {
    try {
      const processedData = {
        ...data,
        hod_id: data.hod_id || undefined
      }
      
      if (editingDepartment) {
        await dispatch(updateDepartment({ id: editingDepartment.id, ...processedData })).unwrap()
        toast.success('Department updated successfully!')
      } else {
        await dispatch(createDepartment(processedData)).unwrap()
        toast.success('Department created successfully!')
      }
      closeModal()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  const handleEdit = (department: any) => {
    setEditingDepartment(department)
    setValue('name', department.name)
    setValue('code', department.code)
    setValue('hod_id', department.hod_id)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await dispatch(deleteDepartment(id)).unwrap()
        toast.success('Department deleted successfully!')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete department')
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDepartment(null)
    reset()
  }

  const getDepartmentStats = (deptId: number) => {
    const deptUsers = users.filter(u => u.department_id === deptId)
    return {
      students: deptUsers.filter(u => u.role === 'student').length,
      teachers: deptUsers.filter(u => u.role === 'teacher').length,
      total: deptUsers.length
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map(department => {
          const hod = users.find(u => u.id === department.hod_id)
          const stats = getDepartmentStats(department.id)
          
          return (
            <div key={department.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{department.name}</h3>
                    <p className="text-sm text-gray-500">Code: {department.code}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(department)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(department.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Head of Department:</span>
                  <span className="font-medium">
                    {hod ? `${hod.first_name} ${hod.last_name}` : 'Not assigned'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-blue-600 mb-1">
                      <GraduationCap size={16} />
                      <span className="text-lg font-semibold">{stats.students}</span>
                    </div>
                    <p className="text-xs text-gray-600">Students</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-green-600 mb-1">
                      <Users size={16} />
                      <span className="text-lg font-semibold">{stats.teachers}</span>
                    </div>
                    <p className="text-xs text-gray-600">Teachers</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {departments.length === 0 && (
        <div className="card text-center py-8">
          <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Departments Found</h3>
          <p className="text-gray-600 mb-4">
            Start by creating your first department.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            Add First Department
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">
              {editingDepartment ? 'Edit Department' : 'Add New Department'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g., Computer Science Engineering"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Code
                </label>
                <input
                  {...register('code')}
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g., CSE"
                />
                {errors.code && (
                  <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Head of Department
                </label>
                <select
                  {...register('hod_id', { 
                    setValueAs: (value) => value === '' ? null : Number(value)
                  })}
                  className="input-field w-full"
                >
                  <option value="">Select HOD</option>
                  {hods.map(hod => (
                    <option key={hod.id} value={hod.id}>
                      {hod.first_name} {hod.last_name} ({hod.role.toUpperCase()})
                    </option>
                  ))}
                </select>
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
                  {loading ? 'Saving...' : editingDepartment ? 'Update' : 'Create'}
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

export default DepartmentManagement