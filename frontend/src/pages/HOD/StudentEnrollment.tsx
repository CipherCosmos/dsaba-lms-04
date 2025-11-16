/**
 * Student Enrollment Management Page
 * HOD can enroll students in semesters for academic years
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  useStudentEnrollments,
  useCreateStudentEnrollment,
  usePromoteStudent,
  useAcademicYears,
} from '../../core/hooks'
import { academicStructureAPI, studentEnrollmentAPI } from '../../services/api'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'
import { AcademicYearSelector } from '../../components/shared/AcademicYearSelector'
import { logger } from '../../core/utils/logger'
import { Plus, Search, X, Users, GraduationCap, ArrowRight, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface Enrollment {
  id: number
  student_id: number
  semester_id: number
  academic_year_id: number
  roll_no: string
  enrollment_date: string
  is_active: boolean
  promotion_status: string
  next_semester_id?: number
}

interface AcademicYear {
  id: number
  display_name: string
  is_current: boolean
  status: string
}

interface Semester {
  id: number
  semester_no: number
  display_name: string
  department_id: number
  academic_year_id: number
}

const StudentEnrollment: React.FC = () => {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all') // 'all', 'active', 'inactive'
  const [promotionFilter, setPromotionFilter] = useState<string>('all') // 'all', 'pending', 'promoted', 'retained', 'failed'
  const [formData, setFormData] = useState({
    student_id: '',
    roll_no: '',
    enrollment_date: new Date().toISOString().split('T')[0]
  })
  const [nextSemesterId, setNextSemesterId] = useState<number | null>(null)
  const [promotionType, setPromotionType] = useState<'regular' | 'lateral' | 'failed' | 'retained'>('regular')
  const [promotionNotes, setPromotionNotes] = useState('')
  const [nextRollNo, setNextRollNo] = useState('')

  // React Query hooks
  const { data: academicYearsData } = useAcademicYears(0, 100)
  const { data: enrollmentsData, isLoading: loading } = useStudentEnrollments(
    0,
    1000,
    selectedAcademicYear || selectedSemester
      ? {
          academic_year_id: selectedAcademicYear || undefined,
          semester_id: selectedSemester || undefined,
        }
      : undefined
  )
  const createMutation = useCreateStudentEnrollment()
  const promoteMutation = usePromoteStudent()

  const academicYears = academicYearsData?.items || []
  const allEnrollments = enrollmentsData?.items || []

  // Filter enrollments - memoized for performance
  const filteredEnrollments = useMemo(() => {
    return allEnrollments.filter((enrollment: Enrollment) => {
      const matchesSearch = 
        enrollment.student_id.toString().includes(searchTerm) ||
        enrollment.roll_no.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && enrollment.is_active) ||
        (statusFilter === 'inactive' && !enrollment.is_active)
      
      const matchesPromotion = promotionFilter === 'all' || 
        enrollment.promotion_status === promotionFilter
      
      return matchesSearch && matchesStatus && matchesPromotion
    })
  }, [allEnrollments, searchTerm, statusFilter, promotionFilter])

  // Calculate stats - memoized for performance
  const stats = useMemo(() => {
    return {
      total: allEnrollments.length,
      active: allEnrollments.filter((e: Enrollment) => e.is_active).length,
      inactive: allEnrollments.filter((e: Enrollment) => !e.is_active).length,
      pending: allEnrollments.filter((e: Enrollment) => e.promotion_status === 'pending').length,
      promoted: allEnrollments.filter((e: Enrollment) => e.promotion_status === 'promoted').length,
      retained: allEnrollments.filter((e: Enrollment) => e.promotion_status === 'retained').length,
      failed: allEnrollments.filter((e: Enrollment) => e.promotion_status === 'failed').length,
    }
  }, [allEnrollments])

  // Set default academic year
  useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYear) {
      const current = academicYears.find((ay: AcademicYear) => ay.is_current)
      if (current) {
        setSelectedAcademicYear(current.id)
      }
    }
  }, [academicYears, selectedAcademicYear])

  // Fetch semesters when academic year changes
  useEffect(() => {
    if (selectedAcademicYear) {
      fetchSemesters()
    }
  }, [selectedAcademicYear])

  const fetchSemesters = async () => {
    if (!selectedAcademicYear) return
    try {
      const response = await academicStructureAPI.getAllSemesters(0, 100, {
        academic_year_id: selectedAcademicYear
      })
      setSemesters(response.items || [])
    } catch (error) {
      logger.error('Error fetching semesters:', error)
    }
  }

  const handleCreate = () => {
    setFormData({
      student_id: '',
      roll_no: '',
      enrollment_date: new Date().toISOString().split('T')[0]
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAcademicYear || !selectedSemester) {
      toast.error('Please select academic year and semester')
      return
    }
    createMutation.mutate({
      student_id: parseInt(formData.student_id),
      semester_id: selectedSemester,
      academic_year_id: selectedAcademicYear,
      roll_no: formData.roll_no,
      enrollment_date: formData.enrollment_date
    }, {
      onSuccess: () => {
        setShowModal(false)
        setFormData({
          student_id: '',
          roll_no: '',
          enrollment_date: new Date().toISOString().split('T')[0]
        })
      }
    })
  }

  const handlePromote = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment)
    setNextRollNo(enrollment.roll_no) // Default to current roll number
    setPromotionType('regular')
    setPromotionNotes('')
    // Find next semester - check both same academic year and next academic year
    const currentSemester = semesters.find(s => s.id === enrollment.semester_id)
    if (currentSemester) {
      // First try same academic year
      let nextSemester = semesters.find(s => 
        s.semester_no === currentSemester.semester_no + 1 && 
        s.academic_year_id === enrollment.academic_year_id
      )
      // If not found, try any semester with next semester number (might be in next academic year)
      if (!nextSemester) {
        nextSemester = semesters.find(s => 
          s.semester_no === currentSemester.semester_no + 1
        )
      }
      if (nextSemester) {
        setNextSemesterId(nextSemester.id)
      }
    }
    setShowPromoteModal(true)
  }

  const handlePromoteSubmit = async () => {
    if (!selectedEnrollment || !nextSemesterId) {
      toast.error('Please select next semester')
      return
    }
    promoteMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      nextSemesterId: nextSemesterId,
      roll_no: nextRollNo || undefined,
      promotion_type: promotionType,
      notes: promotionNotes || undefined
    }, {
      onSuccess: (newEnrollment) => {
        setShowPromoteModal(false)
        setSelectedEnrollment(null)
        setNextSemesterId(null)
        setNextRollNo('')
        setPromotionType('regular')
        setPromotionNotes('')
        // Show success message with new enrollment details
        if (newEnrollment) {
          const nextSem = semesters.find((s: Semester) => s.id === newEnrollment.semester_id)
          toast.success(
            `Student promoted to Semester ${nextSem?.semester_no || newEnrollment.semester_id}. New enrollment ID: ${newEnrollment.id}`,
            { duration: 5000 }
          )
        }
      }
    })
  }

  const handleBulkEnroll = async (file: File) => {
    if (!selectedSemester || !selectedAcademicYear) {
      toast.error('Please select semester and academic year first')
      return
    }

    try {
      // Read CSV/Excel file
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Expected headers: student_id, roll_no, enrollment_date (optional)
      const studentIdIdx = headers.findIndex(h => h.includes('student') && h.includes('id'))
      const rollNoIdx = headers.findIndex(h => h.includes('roll'))
      const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('enrollment'))

      if (studentIdIdx === -1 || rollNoIdx === -1) {
        toast.error('CSV must contain "student_id" and "roll_no" columns')
        return
      }

      // Parse CSV data
      const enrollments = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values[studentIdIdx] && values[rollNoIdx]) {
          enrollments.push({
            student_id: parseInt(values[studentIdIdx]),
            roll_no: values[rollNoIdx],
            enrollment_date: dateIdx >= 0 && values[dateIdx] ? values[dateIdx] : new Date().toISOString().split('T')[0]
          })
        }
      }

      if (enrollments.length === 0) {
        toast.error('No valid enrollment data found in file')
        return
      }

      // Call bulk enrollment API
      const response = await studentEnrollmentAPI.bulkCreate({
        semester_id: selectedSemester,
        academic_year_id: selectedAcademicYear,
        enrollments
      })

      toast.success(`Successfully enrolled ${response.enrolled || enrollments.length} students`)
      logger.info('Bulk enrollment successful', { count: response.enrolled || enrollments.length })
      
      // Invalidate queries to refresh
      setTimeout(() => window.location.reload(), 1000)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message
      logger.error('Bulk enrollment failed', error)
      toast.error(`Error during bulk enrollment: ${errorMessage}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      promoted: { color: 'bg-green-100 text-green-800', text: 'Promoted' },
      retained: { color: 'bg-blue-100 text-blue-800', text: 'Retained' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    }
    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Student Enrollment Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage student enrollments, promotions, and academic progression</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Enroll Student</span>
          </button>
          <button
            onClick={() => document.getElementById('bulk-upload')?.click()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Upload size={18} />
            <span>Bulk Enroll</span>
          </button>
          <input
            id="bulk-upload"
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleBulkEnroll(e.target.files[0])}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-gray-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Promoted</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.promoted}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Retained</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.retained}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by student ID or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedAcademicYear || ''}
              onChange={(e) => {
                setSelectedAcademicYear(parseInt(e.target.value) || null)
                setSelectedSemester(null)
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {academicYears.map((ay: AcademicYear) => (
                <option key={ay.id} value={ay.id}>
                  {ay.display_name} {ay.is_current && '(Current)'}
                </option>
              ))}
            </select>
            <select
              value={selectedSemester || ''}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value) || null)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={!selectedAcademicYear}
            >
              <option value="">All Semesters</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  Semester {sem.semester_no}
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
            <select
              value={promotionFilter}
              onChange={(e) => setPromotionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Promotion</option>
              <option value="pending">Pending</option>
              <option value="promoted">Promoted</option>
              <option value="retained">Retained</option>
              <option value="failed">Failed</option>
            </select>
            {(searchTerm || statusFilter !== 'all' || promotionFilter !== 'all' || selectedAcademicYear || selectedSemester) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPromotionFilter('all')
                  setSelectedAcademicYear(null)
                  setSelectedSemester(null)
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

      {loading ? (
        <LoadingFallback />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Semester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promotion Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No enrollments found
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enrollment: Enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {enrollment.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {enrollment.roll_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Semester {semesters.find((s: Semester) => s.id === enrollment.semester_id)?.semester_no || enrollment.semester_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {academicYears.find((ay: AcademicYear) => ay.id === enrollment.academic_year_id)?.display_name || enrollment.academic_year_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(enrollment.enrollment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {enrollment.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(enrollment.promotion_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {enrollment.promotion_status === 'pending' && (
                        <button
                          onClick={() => handlePromote(enrollment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          title="Promote Student"
                        >
                          <ArrowRight size={16} />
                          <span>Promote</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Enrollment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Enroll Student</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <AcademicYearSelector
                  value={selectedAcademicYear}
                  onChange={setSelectedAcademicYear}
                  required
                  label="Academic Year"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <select
                  value={selectedSemester || ''}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={!selectedAcademicYear}
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      Semester {sem.semester_no}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID *
                </label>
                <input
                  type="number"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number *
                </label>
                <input
                  type="text"
                  value={formData.roll_no}
                  onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Date *
                </label>
                <input
                  type="date"
                  value={formData.enrollment_date}
                  onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promote Modal */}
      {showPromoteModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Promote Student</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Student ID: <span className="font-medium">{selectedEnrollment.student_id}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Roll No: <span className="font-medium">{selectedEnrollment.roll_no}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Current Semester: <span className="font-medium">
                  Semester {semesters.find((s: Semester) => s.id === selectedEnrollment.semester_id)?.semester_no || selectedEnrollment.semester_id}
                </span>
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Semester *
              </label>
              <select
                value={nextSemesterId || ''}
                onChange={(e) => setNextSemesterId(parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Next Semester</option>
                {semesters
                  .filter((s: Semester) => {
                    const currentSem = semesters.find((ss: Semester) => ss.id === selectedEnrollment.semester_id)
                    return currentSem && s.semester_no > currentSem.semester_no
                  })
                  .map((sem) => {
                    const semAY = academicYears.find((ay: AcademicYear) => ay.id === sem.academic_year_id)
                    const isDifferentAY = sem.academic_year_id !== selectedEnrollment.academic_year_id
                    return (
                    <option key={sem.id} value={sem.id}>
                        Semester {sem.semester_no} {isDifferentAY && `(${semAY?.display_name || 'Different AY'})`}
                    </option>
                    )
                  })}
              </select>
              {nextSemesterId && (() => {
                const nextSem = semesters.find((s: Semester) => s.id === nextSemesterId)
                const isDifferentAY = nextSem && nextSem.academic_year_id !== selectedEnrollment.academic_year_id
                return isDifferentAY ? (
                  <p className="text-xs text-blue-600 mt-1">
                    Note: Next semester is in a different academic year. Student will be enrolled in the new academic year.
                  </p>
                ) : null
              })()}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roll Number for Next Semester
              </label>
              <input
                type="text"
                value={nextRollNo}
                onChange={(e) => setNextRollNo(e.target.value)}
                placeholder={selectedEnrollment.roll_no}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use current roll number: {selectedEnrollment.roll_no}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promotion Type *
              </label>
              <select
                value={promotionType}
                onChange={(e) => setPromotionType(e.target.value as 'regular' | 'lateral' | 'failed' | 'retained')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="regular">Regular Promotion</option>
                <option value="lateral">Lateral Entry</option>
                <option value="retained">Retained (Repeating Semester)</option>
                <option value="failed">Failed (Repeating Semester)</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={promotionNotes}
                onChange={(e) => setPromotionNotes(e.target.value)}
                placeholder="Add any notes about this promotion..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowPromoteModal(false)
                  setSelectedEnrollment(null)
                  setNextSemesterId(null)
                  setNextRollNo('')
                  setPromotionType('regular')
                  setPromotionNotes('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteSubmit}
                disabled={!nextSemesterId || promoteMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoteMutation.isPending ? 'Promoting...' : 'Promote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentEnrollment

