import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { 
  fetchUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../../store/slices/userSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { userAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import { Plus, Edit2, Trash2, User, Mail, Shield, Search, Filter, Key, UserPlus, Users as UsersIcon, X, CheckCircle2, AlertCircle, Upload, Download, FileSpreadsheet } from 'lucide-react'

const schema = yup.object({
  username: yup.string().required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  role: yup.string().oneOf(['admin', 'hod', 'teacher', 'student']).required('Role is required'),
  department_id: yup.number().nullable().transform((value, originalValue) => {
    return originalValue === '' ? null : value;
  }),
  class_id: yup.number().nullable().transform((value, originalValue) => {
    return originalValue === '' ? null : value;
  }),
  is_active: yup.boolean().default(true),
})

const passwordSchema = yup.object({
  password: yup.string().min(12, 'Password must be at least 12 characters').required('Password is required')
})

type UserForm = yup.InferType<typeof schema> & {
  password?: string
}

const UserManagement = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { users, loading } = useSelector((state: RootState) => state.users)
  const { departments } = useSelector((state: RootState) => state.departments)
  const { classes } = useSelector((state: RootState) => state.classes)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState('')
  
  // Enhanced features
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [passwordResetUser, setPasswordResetUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleModalUser, setRoleModalUser] = useState<any>(null)
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState('')
  const [selectedDeptForRole, setSelectedDeptForRole] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalUsers, setTotalUsers] = useState(0)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkRole, setBulkRole] = useState('student')
  const [bulkDepartment, setBulkDepartment] = useState<string>('')
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true)
  const [bulkPassword, setBulkPassword] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const validationSchema = editingUser ? schema : schema.concat(passwordSchema)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<UserForm>({
    resolver: yupResolver(validationSchema),
  })

  const watchedRole = watch('role')

  useEffect(() => {
    loadUsers()
    dispatch(fetchDepartments())
    dispatch(fetchClasses())
  }, [dispatch, currentPage, roleFilter, statusFilter, departmentFilter])

  const loadUsers = async () => {
    try {
      const filters: any = {}
      if (statusFilter === 'active') filters.is_active = true
      if (statusFilter === 'inactive') filters.is_active = false
      
      const response = await userAPI.getAll((currentPage - 1) * pageSize, pageSize, filters)
      setTotalUsers(response.total || 0)
      // Note: Redux slice will handle the update
    } catch (error) {
      toast.error('Failed to load users')
    }
  }

  useEffect(() => {
    setSelectedRole(watchedRole)
  }, [watchedRole])

  // Filter users based on search and filters - memoized for performance
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active)
      const matchesDepartment = departmentFilter === 'all' || 
        (user.department_ids?.[0] || (user as any).department_id)?.toString() === departmentFilter
      
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment
    })
  }, [users, searchTerm, roleFilter, statusFilter, departmentFilter])

  // Calculate stats - memoized for performance
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.is_active).length,
      inactive: users.filter(u => !u.is_active).length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        hod: users.filter(u => u.role === 'hod').length,
        teacher: users.filter(u => u.role === 'teacher').length,
        student: users.filter(u => u.role === 'student').length,
      }
    }
  }, [users])

  const onSubmit = useCallback(async (data: UserForm) => {
    try {
      if (editingUser) {
        const updateData: any = { 
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          is_active: data.is_active
        }
        if (data.password) {
          updateData.password = data.password
        }
        await dispatch(updateUser({ id: editingUser.id, ...updateData })).unwrap()
        toast.success('User updated successfully!')
      } else {
        // Transform form data to match backend DTO format
        const createData = {
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          password: data.password!,
          roles: [data.role], // Convert single role to array
          department_ids: data.department_id ? [data.department_id] : [] // Convert single department_id to array
        }
        await dispatch(createUser(createData as any)).unwrap()
        toast.success('User created successfully!')
      }
      setIsModalOpen(false)
      setEditingUser(null)
      reset()
      setSelectedRole('')
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }, [editingUser, dispatch, reset, loadUsers, setSelectedRole])

  const handleEdit = useCallback((user: any) => {
    setEditingUser(user)
    // Backend returns roles array and department_ids array
    // Frontend form uses single role and department_id for simplicity
    const primaryRole = user.roles?.[0] || user.role || ''
    const primaryDepartmentId = user.department_ids?.[0] || user.department_id || null
    
    setValue('username', user.username)
    setValue('email', user.email)
    setValue('first_name', user.first_name)
    setValue('last_name', user.last_name)
    setValue('role', primaryRole)
    setValue('department_id', primaryDepartmentId)
    setValue('class_id', user.class_id || null)
    setValue('is_active', user.is_active ?? true)
    setSelectedRole(primaryRole)
    setIsModalOpen(true)
  }, [setValue, setSelectedRole])

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(id)).unwrap()
        toast.success('User deleted successfully!')
        loadUsers()
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete user')
      }
    }
  }, [dispatch, loadUsers])

  const handlePasswordReset = useCallback(async () => {
    if (!passwordResetUser || !newPassword) {
      toast.error('Please enter a new password')
      return
    }
    if (newPassword.length < 12) {
      toast.error('Password must be at least 12 characters')
      return
    }
    try {
      await userAPI.resetPassword(passwordResetUser.id, newPassword)
      toast.success(`Password reset successfully for ${passwordResetUser.first_name} ${passwordResetUser.last_name}`)
      setShowPasswordResetModal(false)
      setPasswordResetUser(null)
      setNewPassword('')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reset password')
    }
  }, [newPassword, passwordResetUser])

  const handleAssignRole = useCallback(async () => {
    if (!roleModalUser || !selectedRoleToAssign) {
      toast.error('Please select a role')
      return
    }
    try {
      await userAPI.assignRole(
        roleModalUser.id,
        selectedRoleToAssign,
        selectedDeptForRole ? parseInt(selectedDeptForRole) : undefined
      )
      toast.success(`Role ${selectedRoleToAssign} assigned successfully`)
      setShowRoleModal(false)
      setRoleModalUser(null)
      setSelectedRoleToAssign('')
      setSelectedDeptForRole('')
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to assign role')
    }
  }, [roleModalUser, selectedRoleToAssign, selectedDeptForRole, loadUsers])

  const handleRemoveRole = useCallback(async (user: any, role: string, departmentId?: number) => {
    if (!window.confirm(`Remove ${role} role from ${user.first_name} ${user.last_name}?`)) {
      return
    }
    try {
      await userAPI.removeRole(user.id, role, departmentId)
      toast.success(`Role ${role} removed successfully`)
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove role')
    }
  }, [loadUsers])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingUser(null)
    reset()
    setSelectedRole('')
  }, [reset])

  const getRoleColor = useCallback((role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'hod': return 'bg-purple-100 text-purple-800'
      case 'teacher': return 'bg-blue-100 text-blue-800'
      case 'student': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'admin': return Shield
      case 'hod': return Shield
      case 'teacher': return User
      case 'student': return User
      default: return User
    }
  }, [])

  const totalPages = useMemo(() => Math.ceil(totalUsers / pageSize), [totalUsers, pageSize])

  // Generate secure password
  const generatePassword = useCallback(() => {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }, [])

  // Handle bulk upload
  const handleBulkUpload = useCallback(async () => {
    if (!bulkFile) {
      toast.error('Please select a file')
      return
    }
    if (!bulkRole) {
      toast.error('Please select a role')
      return
    }

    setBulkLoading(true)
    try {
      // Read CSV/Excel file
      const text = await bulkFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        toast.error('File must contain at least a header row and one data row')
        setBulkLoading(false)
        return
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const usernameIdx = headers.findIndex(h => h.includes('username') || h.includes('user'))
      const emailIdx = headers.findIndex(h => h.includes('email'))
      const firstNameIdx = headers.findIndex(h => h.includes('first') || h.includes('fname') || h.includes('firstname'))
      const lastNameIdx = headers.findIndex(h => h.includes('last') || h.includes('lname') || h.includes('lastname'))

      if (usernameIdx === -1 || emailIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1) {
        toast.error('CSV must contain: username, email, first_name, last_name columns')
        setBulkLoading(false)
        return
      }

      // Parse data
      const users = []
      const errors: string[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length < headers.length) continue

        const username = values[usernameIdx]
        const email = values[emailIdx]
        const firstName = values[firstNameIdx]
        const lastName = values[lastNameIdx]

        if (!username || !email || !firstName || !lastName) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          errors.push(`Row ${i + 1}: Invalid email format: ${email}`)
          continue
        }

        users.push({
          username,
          email,
          first_name: firstName,
          last_name: lastName,
          password: autoGeneratePassword ? generatePassword() : (bulkPassword || generatePassword()),
          roles: [bulkRole],
          department_ids: bulkDepartment ? [parseInt(bulkDepartment)] : []
        })
      }

      if (users.length === 0) {
        toast.error('No valid users found in file')
        setBulkLoading(false)
        return
      }

      // Call bulk create API
      const response = await userAPI.bulkCreate(users)
      
      if (response.created > 0) {
        toast.success(`Successfully created ${response.created} users${response.failed > 0 ? ` (${response.failed} failed)` : ''}`)
      }
      
      if (response.failed > 0 && response.errors && response.errors.length > 0) {
        const errorMessages = response.errors.slice(0, 10).map((e: any) => `${e.username}: ${e.error}`).join('\n')
        logger.error('Bulk upload errors:', response.errors)
        toast.error(`${response.failed} users failed. Check console for details.`)
      }

      // Reset form
      setBulkFile(null)
      setBulkRole('student')
      setBulkDepartment('')
      setBulkPassword('')
      setShowBulkModal(false)
      
      // Reload users
      loadUsers()
    } catch (error: any) {
      logger.error('Bulk upload error:', error)
      
      // Handle different error types
      if (error.response) {
        // Server responded with error status
        const status = error.response.status
        const errorData = error.response.data
        
        if (status === 503) {
          toast.error('Service temporarily unavailable. Please try again in a moment.')
        } else if (status === 500) {
          toast.error(`Server error: ${errorData?.detail || 'Internal server error'}`)
        } else if (status === 400) {
          toast.error(`Bad request: ${errorData?.detail || 'Invalid request'}`)
        } else if (status === 403) {
          toast.error('You do not have permission to bulk create users')
        } else if (status === 422) {
          toast.error(`Validation error: ${errorData?.detail || 'Invalid data provided'}`)
        } else {
          toast.error(`Error ${status}: ${errorData?.detail || error.message || 'Failed to bulk create users'}`)
        }
      } else if (error.request) {
        // Request was made but no response received
        toast.error('Network error: Unable to connect to server. Please check your connection.')
      } else {
        // Error in request setup
        toast.error(`Error: ${error.message || 'Failed to bulk create users'}`)
      }
    } finally {
      setBulkLoading(false)
    }
  }, [bulkFile, bulkRole, bulkDepartment, autoGeneratePassword, bulkPassword, generatePassword, loadUsers])

  // Download template
  const downloadTemplate = useCallback(() => {
    const csvContent = 'username,email,first_name,last_name\nstudent1,student1@example.com,John,Doe\nstudent2,student2@example.com,Jane,Smith'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_upload_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage all system users, roles, and permissions</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Upload size={18} />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlus size={18} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.byRole.admin}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <User className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Teachers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.byRole.teacher}</p>
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
                placeholder="Search users by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="hod">HOD</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
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
            {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                  setDepartmentFilter('all')
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

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Role(s)</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Class</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const department = departments.find(d => d.id === (user.department_ids?.[0] || (user as any).department_id))
                  const userClass = classes.find(c => c.id === user.class_id)
                  const RoleIcon = getRoleIcon(user.role)
                  const userRoles = user.roles || [user.role].filter(Boolean)
                  
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-gray-100 p-2 rounded-full">
                            <User size={16} className="text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <Mail size={14} />
                              <span>{user.email}</span>
                            </div>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map((role: string, idx: number) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}
                            >
                              {role.toUpperCase()}
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              setRoleModalUser(user)
                              setShowRoleModal(true)
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800 text-xs"
                            title="Assign Role"
                          >
                            <UserPlus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900">
                          {department?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900">
                          {userClass?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {user.email_verified && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setPasswordResetUser(user)
                              setShowPasswordResetModal(true)
                            }}
                            className="p-2 text-gray-400 hover:text-yellow-600 rounded-lg"
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                            title="Delete User"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    {...register('username')}
                    type="text"
                    className="input-field w-full"
                    placeholder="Enter username"
                    disabled={!!editingUser}
                  />
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="input-field w-full"
                    placeholder="Enter email"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    {...register('first_name')}
                    type="text"
                    className="input-field w-full"
                    placeholder="Enter first name"
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    {...register('last_name')}
                    type="text"
                    className="input-field w-full"
                    placeholder="Enter last name"
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-gray-500">(min 12 characters)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      {...register('password')}
                      type="password"
                      className="input-field flex-1"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newPassword = generatePassword()
                        setValue('password', newPassword)
                        toast.success('Password generated!')
                      }}
                      className="btn-secondary text-sm"
                    >
                      Generate
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    {...register('role')}
                    className="input-field w-full"
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="hod">HOD</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                  {errors.role && (
                    <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    {...register('department_id', { 
                      setValueAs: (value) => value === '' ? null : Number(value)
                    })}
                    className="input-field w-full"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRole === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    {...register('class_id', { 
                      setValueAs: (value) => value === '' ? null : Number(value)
                    })}
                    className="input-field w-full"
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  {...register('is_active')}
                  type="checkbox"
                  className="rounded border-gray-300"
                />
                <label className="text-sm font-medium text-gray-700">
                  Active User
                </label>
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
                  {loading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && passwordResetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-4">
              Reset password for <strong>{passwordResetUser.first_name} {passwordResetUser.last_name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password <span className="text-gray-500">(min 12 characters)</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordResetModal(false)
                    setPasswordResetUser(null)
                    setNewPassword('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="btn-primary"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showRoleModal && roleModalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Assign Role</h2>
            <p className="text-sm text-gray-600 mb-4">
              Assign role to <strong>{roleModalUser.first_name} {roleModalUser.last_name}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={selectedRoleToAssign}
                  onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="hod">HOD</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
              {(selectedRoleToAssign === 'hod' || selectedRoleToAssign === 'teacher' || selectedRoleToAssign === 'student') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department (Optional)
                  </label>
                  <select
                    value={selectedDeptForRole}
                    onChange={(e) => setSelectedDeptForRole(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false)
                    setRoleModalUser(null)
                    setSelectedRoleToAssign('')
                    setSelectedDeptForRole('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignRole}
                  className="btn-primary"
                >
                  Assign Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Bulk Upload Users</h2>
            
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload CSV File
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={downloadTemplate}
                    className="btn-secondary flex items-center space-x-1"
                    type="button"
                  >
                    <Download size={16} />
                    <span>Template</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Required columns: username, email, first_name, last_name
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role for All Users *
                </label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="hod">HOD</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Department Selection */}
              {(bulkRole === 'student' || bulkRole === 'teacher' || bulkRole === 'hod') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department (Optional)
                  </label>
                  <select
                    value={bulkDepartment}
                    onChange={(e) => setBulkDepartment(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoGeneratePassword}
                      onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label className="text-sm text-gray-700">
                      Auto-generate secure passwords
                    </label>
                  </div>
                  {!autoGeneratePassword && (
                    <input
                      type="password"
                      value={bulkPassword}
                      onChange={(e) => setBulkPassword(e.target.value)}
                      placeholder="Enter password for all users (min 12 characters)"
                      className="input-field w-full"
                      minLength={12}
                    />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Maximum 1000 users per upload. Duplicate usernames/emails will be skipped.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkFile(null)
                    setBulkRole('student')
                    setBulkDepartment('')
                    setBulkPassword('')
                    setAutoGeneratePassword(true)
                  }}
                  className="btn-secondary"
                  disabled={bulkLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkUpload}
                  disabled={bulkLoading || !bulkFile}
                  className="btn-primary disabled:opacity-50"
                >
                  {bulkLoading ? 'Uploading...' : 'Upload Users'}
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

export default UserManagement
