import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import { fetchClasses, createClass, updateClass, deleteClass } from '../../store/slices/classSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { Plus, Edit, Trash2, Search, Users, BookOpen, Building } from 'lucide-react'
import toast from 'react-hot-toast'

const HODClasses: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { classes, loading } = useSelector((state: RootState) => state.classes)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { users } = useSelector((state: RootState) => state.users)

  const [searchTerm, setSearchTerm] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    semester: '',
    section: '',
    academic_year: new Date().getFullYear().toString(),
    is_active: true
  })

  useEffect(() => {
    dispatch(fetchClasses())
    dispatch(fetchSubjects())
    dispatch(fetchUsers())
  }, [dispatch])

  // Filter classes to only show those from HOD's department
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  // Subjects belong to departments directly
  const departmentSubjects = subjects.filter(s => s.department_id === user?.department_id)
  const userDeptId = user?.department_ids?.[0] || (user as any)?.department_id
  const departmentStudents = users.filter(u => {
    if (u.role !== 'student') return false
    if (u.department_ids && u.department_ids.length > 0) {
      return u.department_ids[0] === userDeptId
    }
    return (u as any).department_id === userDeptId
  })

  // Filter classes based on search and semester
  const filteredClasses = departmentClasses.filter(cls => {
    const matchesSearch = 
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.semester.toString().toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSemester = semesterFilter === 'all' || cls.semester.toString() === semesterFilter
    
    return matchesSearch && matchesSemester
  })

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const classData = {
        ...formData,
        department_id: user?.department_id!,
        semester: Number(formData.semester),
        academic_year: Number(formData.academic_year)
      }
      
      await dispatch(createClass(classData)).unwrap()
      toast.success('Class created successfully')
      setShowModal(false)
      setFormData({
        name: '',
        semester: '',
        section: '',
        academic_year: new Date().getFullYear().toString(),
        is_active: true
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to create class')
    }
  }

  const handleEditClass = (classToEdit: any) => {
    setEditingClass(classToEdit)
    setFormData({
      name: classToEdit.name,
      semester: classToEdit.semester,
      section: classToEdit.section,
      academic_year: classToEdit.academic_year?.toString() || new Date().getFullYear().toString(),
      is_active: classToEdit.is_active
    })
    setShowModal(true)
  }

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return
    
    try {
      const classData = {
        ...formData,
        department_id: user?.department_id!,
        semester: Number(formData.semester),
        academic_year: Number(formData.academic_year)
      }
      
      await dispatch(updateClass({ id: editingClass.id, ...classData })).unwrap()
      toast.success('Class updated successfully')
      setShowModal(false)
      setEditingClass(null)
      setFormData({
        name: '',
        semester: '',
        section: '',
        academic_year: new Date().getFullYear().toString(),
        is_active: true
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to update class')
    }
  }

  const handleDeleteClass = async (classId: number) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await dispatch(deleteClass(classId)).unwrap()
        toast.success('Class deleted successfully')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete class')
      }
    }
  }

  const getClassStats = (classId: number) => {
    const classStudents = departmentStudents.filter(s => s.class_id === classId)
    const classSubjects = departmentSubjects.filter(s => s.class_id === classId)
    
    return {
      studentCount: classStudents.length,
      subjectCount: classSubjects.length
    }
  }

  const getSemesterOptions = () => {
    const semesters = [...new Set(departmentClasses.map(c => c.semester))].sort()
    return semesters
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Department Classes</h1>
        <p className="text-gray-600">Manage classes in your department</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-2xl font-semibold text-gray-900">{departmentClasses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{departmentStudents.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">{departmentSubjects.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">A</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Classes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {departmentClasses.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Semesters</option>
              {getSemesterOptions().map(semester => (
                <option key={semester} value={semester}>Semester {semester}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </button>
          </div>
        </div>
      </div>

      {/* Classes Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subjects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClasses.map((cls) => {
                const stats = getClassStats(cls.id)
                return (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {cls.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Section {cls.section}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Semester {cls.semester}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        {stats.studentCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 text-gray-400 mr-1" />
                        {stats.subjectCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditClass(cls)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
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

      {/* Add/Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingClass ? 'Edit Class' : 'Add New Class'}
              </h3>
              
              <form onSubmit={editingClass ? handleUpdateClass : handleCreateClass}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Computer Science"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester
                    </label>
                    <input
                      type="text"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1, 2, 3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Section
                    </label>
                    <input
                      type="text"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., A, B, C"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year
                  </label>
                  <input
                    type="number"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="2020"
                    max="2030"
                    required
                  />
                </div>

                <div className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active class
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingClass(null)
                      setFormData({
                        name: '',
                        semester: '',
                        section: '',
                        academic_year: new Date().getFullYear().toString(),
                        is_active: true
                      })
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingClass ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HODClasses
