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
import { departmentAPI } from '../../services/api'
import { Plus, Edit2, Trash2, Building, Users, GraduationCap, Search, X, UserCheck, UserX, Power, PowerOff } from 'lucide-react'

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
  const [showHODModal, setShowHODModal] = useState(false)
  const [hodModalDepartment, setHODModalDepartment] = useState<any>(null)
  const [selectedHODId, setSelectedHODId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [hasHODFilter, setHasHODFilter] = useState<string>('all')

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

  const hods = users.filter(u => {
    const roles = u.roles || [u.role].filter(Boolean)
    return roles.includes('hod') || roles.includes('admin')
  })

  // Filter departments
  const filteredDepartments = departments.filter((dept: any) => {
    const matchesSearch = 
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && (dept.is_active ?? true)) ||
      (statusFilter === 'inactive' && !(dept.is_active ?? true))
    
    const matchesHOD = hasHODFilter === 'all' ||
      (hasHODFilter === 'has' && dept.hod_id) ||
      (hasHODFilter === 'none' && !dept.hod_id)
    
    return matchesSearch && matchesStatus && matchesHOD
  })

  // Calculate stats
  const stats = {
    total: departments.length,
    active: departments.filter((d: any) => d.is_active ?? true).length,
    inactive: departments.filter((d: any) => !(d.is_active ?? true)).length,
    withHOD: departments.filter((d: any) => d.hod_id).length,
    withoutHOD: departments.filter((d: any) => !d.hod_id).length,
  }

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

  const handleActivate = async (id: number) => {
    try {
      await departmentAPI.activate(id)
      toast.success('Department activated successfully!')
      dispatch(fetchDepartments())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to activate department')
    }
  }

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this department?')) {
      return
    }
    try {
      await departmentAPI.deactivate(id)
      toast.success('Department deactivated successfully!')
      dispatch(fetchDepartments())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to deactivate department')
    }
  }

  const handleAssignHOD = async () => {
    if (!hodModalDepartment || !selectedHODId) {
      toast.error('Please select an HOD')
      return
    }
    try {
      await departmentAPI.assignHOD(hodModalDepartment.id, parseInt(selectedHODId))
      toast.success('HOD assigned successfully!')
      setShowHODModal(false)
      setHODModalDepartment(null)
      setSelectedHODId('')
      dispatch(fetchDepartments())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to assign HOD')
    }
  }

  const handleRemoveHOD = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove the HOD from this department?')) {
      return
    }
    try {
      await departmentAPI.removeHOD(id)
      toast.success('HOD removed successfully!')
      dispatch(fetchDepartments())
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove HOD')
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDepartment(null)
    reset()
  }

  const getDepartmentStats = (deptId: number) => {
    const deptUsers = users.filter(u => {
      if (u.department_ids && u.department_ids.length > 0) {
        return u.department_ids.includes(deptId)
      }
      return (u as any).department_id === deptId
    })
    return {
      students: deptUsers.filter(u => {
        const roles = u.roles || [u.role].filter(Boolean)
        return roles.includes('student')
      }).length,
      teachers: deptUsers.filter(u => {
        const roles = u.roles || [u.role].filter(Boolean)
        return roles.includes('teacher')
      }).length,
      total: deptUsers.length
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage departments, HOD assignments, and department status</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Department</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
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
            <UserCheck className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">With HOD</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.withHOD}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <UserX className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Without HOD</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.withoutHOD}</p>
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
                placeholder="Search departments by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={hasHODFilter}
              onChange={(e) => setHasHODFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All HOD Status</option>
              <option value="has">With HOD</option>
              <option value="none">Without HOD</option>
            </select>
            {(searchTerm || statusFilter !== 'all' || hasHODFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setHasHODFilter('all')
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

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.length === 0 ? (
          <div className="col-span-full card text-center py-8">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Departments Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || hasHODFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by creating your first department.'}
            </p>
            {!searchTerm && statusFilter === 'all' && hasHODFilter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary"
              >
                Add First Department
              </button>
            )}
          </div>
        ) : (
          filteredDepartments.map(department => {
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
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setHODModalDepartment(department)
                        setSelectedHODId(department.hod_id?.toString() || '')
                        setShowHODModal(true)
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 rounded-lg"
                      title="Manage HOD"
                    >
                      <UserCheck size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(department)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    {(department as any).is_active ?? true ? (
                      <button
                        onClick={() => handleDeactivate(department.id)}
                        className="p-2 text-gray-400 hover:text-orange-600 rounded-lg"
                        title="Deactivate"
                      >
                        <PowerOff size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(department.id)}
                        className="p-2 text-gray-400 hover:text-green-600 rounded-lg"
                        title="Activate"
                      >
                        <Power size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(department.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (department as any).is_active ?? true
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(department as any).is_active ?? true ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Head of Department:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {hod ? `${hod.first_name} ${hod.last_name}` : 'Not assigned'}
                      </span>
                      {department.hod_id && (
                        <button
                          onClick={() => handleRemoveHOD(department.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                          title="Remove HOD"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
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
          })
        )}
      </div>

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
                  maxLength={10}
                />
                {errors.code && (
                  <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Head of Department (Optional)
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
                      {hod.first_name} {hod.last_name} ({hod.role?.toUpperCase() || 'HOD'})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  You can assign HOD later from the department card
                </p>
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

      {/* HOD Assignment Modal */}
      {showHODModal && hodModalDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Manage HOD</h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign or change HOD for <strong>{hodModalDepartment.name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Head of Department
                </label>
                <select
                  value={selectedHODId}
                  onChange={(e) => setSelectedHODId(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select HOD</option>
                  {hods.map(hod => (
                    <option key={hod.id} value={hod.id.toString()}>
                      {hod.first_name} {hod.last_name} ({hod.role?.toUpperCase() || 'HOD'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowHODModal(false)
                    setHODModalDepartment(null)
                    setSelectedHODId('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignHOD}
                  className="btn-primary"
                >
                  {hodModalDepartment.hod_id ? 'Update HOD' : 'Assign HOD'}
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

export default DepartmentManagement
