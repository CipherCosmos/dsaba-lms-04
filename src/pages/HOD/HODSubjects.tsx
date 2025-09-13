import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import { fetchSubjects, createSubject, updateSubject, deleteSubject } from '../../store/slices/subjectSlice'
import { fetchClasses } from '../../store/slices/classSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { Plus, Edit, Trash2, Search, BookOpen, Users, GraduationCap, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const HODSubjects: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const { subjects, loading } = useSelector((state: RootState) => state.subjects)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { users } = useSelector((state: RootState) => state.users)

  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<any>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: '',
    class_id: null as number | null,
    teacher_id: null as number | null,
    is_active: true
  })

  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchClasses())
    dispatch(fetchUsers())
  }, [dispatch])

  // Filter subjects to only show those from HOD's department
  const departmentClasses = classes.filter(c => c.department_id === user?.department_id)
  const departmentSubjects = subjects.filter(s => {
    const subjectClass = classes.find(c => c.id === s.class_id)
    return subjectClass?.department_id === user?.department_id
  })
  const departmentTeachers = users.filter(u => u.role === 'teacher' && u.department_id === user?.department_id)

  // Filter subjects based on search and class
  const filteredSubjects = departmentSubjects.filter(subject => {
    const matchesSearch = 
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClass = classFilter === 'all' || subject.class_id === Number(classFilter)
    
    return matchesSearch && matchesClass
  })

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const subjectData = {
        ...formData,
        credits: Number(formData.credits),
        class_id: formData.class_id || undefined,
        teacher_id: formData.teacher_id || undefined,
        cos: [],
        pos: []
      }
      
      await dispatch(createSubject(subjectData)).unwrap()
      toast.success('Subject created successfully')
      setShowModal(false)
      setFormData({
        code: '',
        name: '',
        credits: '',
        class_id: null,
        teacher_id: null,
        is_active: true
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to create subject')
    }
  }

  const handleEditSubject = (subjectToEdit: any) => {
    setEditingSubject(subjectToEdit)
    setFormData({
      code: subjectToEdit.code,
      name: subjectToEdit.name,
      credits: subjectToEdit.credits?.toString() || '',
      class_id: subjectToEdit.class_id,
      teacher_id: subjectToEdit.teacher_id,
      is_active: subjectToEdit.is_active
    })
    setShowModal(true)
  }

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSubject) return
    
    try {
      const subjectData = {
        ...formData,
        credits: Number(formData.credits),
        class_id: formData.class_id || undefined,
        teacher_id: formData.teacher_id || undefined,
        cos: [],
        pos: []
      }
      
      await dispatch(updateSubject({ id: editingSubject.id, ...subjectData })).unwrap()
      toast.success('Subject updated successfully')
      setShowModal(false)
      setEditingSubject(null)
      setFormData({
        code: '',
        name: '',
        credits: '',
        class_id: null,
        teacher_id: null,
        is_active: true
      })
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subject')
    }
  }

  const handleDeleteSubject = async (subjectId: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await dispatch(deleteSubject(subjectId)).unwrap()
        toast.success('Subject deleted successfully')
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete subject')
      }
    }
  }

  const getClassInfo = (classId: number | null) => {
    if (!classId) return 'No class assigned'
    const classInfo = departmentClasses.find(c => c.id === classId)
    return classInfo ? `${classInfo.name} (Sem ${classInfo.semester}${classInfo.section})` : 'Unknown class'
  }

  const getTeacherInfo = (teacherId: number | null) => {
    if (!teacherId) return 'No teacher assigned'
    const teacher = departmentTeachers.find(t => t.id === teacherId)
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown teacher'
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Department Subjects</h1>
        <p className="text-gray-600">Manage subjects in your department</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">{departmentSubjects.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Teachers</p>
              <p className="text-2xl font-semibold text-gray-900">{departmentTeachers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Classes</p>
              <p className="text-2xl font-semibold text-gray-900">{departmentClasses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-sm">A</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Subjects</p>
              <p className="text-2xl font-semibold text-gray-900">
                {departmentSubjects.length}
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
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes</option>
              {departmentClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Sem {cls.semester}{cls.section})
                </option>
              ))}
            </select>
            
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </button>
          </div>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
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
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {subject.code}
                        </div>
                        <div className="text-sm text-gray-500">{subject.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getClassInfo(subject.class_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getTeacherInfo(subject.teacher_id || null)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      {subject.credits || 'N/A'}
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
                        onClick={() => handleEditSubject(subject)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              
              <form onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., CS101"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credits
                    </label>
                    <input
                      type="number"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 3"
                      min="1"
                      max="10"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Data Structures"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class
                    </label>
                    <select
                      value={formData.class_id || ''}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Class</option>
                      {departmentClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} (Sem {cls.semester}{cls.section})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teacher
                    </label>
                    <select
                      value={formData.teacher_id || ''}
                      onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Teacher</option>
                      {departmentTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.first_name} {teacher.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    Active subject
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingSubject(null)
                      setFormData({
                        code: '',
                        name: '',
                        credits: '',
                        class_id: null,
                        teacher_id: null,
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
                    {editingSubject ? 'Update' : 'Create'}
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

export default HODSubjects
