/**
 * Academic Year Management Page
 * Principal/Admin can create, activate, and archive academic years
 */

import React, { useState } from 'react'
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
  useActivateAcademicYear,
  useArchiveAcademicYear,
} from '../../core/hooks'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'
import { Plus, Search, X, Calendar, CheckCircle2, Archive, Power } from 'lucide-react'
import toast from 'react-hot-toast'

interface AcademicYear {
  id: number
  start_year: number
  end_year: number
  display_name: string
  is_current: boolean
  status: string
  start_date?: string
  end_date?: string
  archived_at?: string
  created_at: string
}

const AcademicYearManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [formData, setFormData] = useState({
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 1,
    start_date: '',
    end_date: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // React Query hooks
  const { data: academicYearsData, isLoading: loading } = useAcademicYears(0, 200, statusFilter !== 'all' ? { status: statusFilter } : undefined)
  const createMutation = useCreateAcademicYear()
  const updateMutation = useUpdateAcademicYear()
  const activateMutation = useActivateAcademicYear()
  const archiveMutation = useArchiveAcademicYear()

  const academicYears = academicYearsData?.items || []

  // Filter academic years
  const filteredYears = academicYears.filter((year: AcademicYear) => {
    const matchesSearch = 
      year.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      year.start_year.toString().includes(searchTerm) ||
      year.end_year.toString().includes(searchTerm)
    
    return matchesSearch
  })

  // Calculate stats
  const stats = {
    total: academicYears.length,
    active: academicYears.filter((y: AcademicYear) => y.status === 'active').length,
    archived: academicYears.filter((y: AcademicYear) => y.status === 'archived').length,
    planned: academicYears.filter((y: AcademicYear) => y.status === 'planned').length,
    current: academicYears.filter((y: AcademicYear) => y.is_current).length,
  }

  const handleCreate = () => {
    setEditingYear(null)
    setFormData({
      start_year: new Date().getFullYear(),
      end_year: new Date().getFullYear() + 1,
      start_date: '',
      end_date: ''
    })
    setShowModal(true)
  }

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year)
    setFormData({
      start_year: year.start_year,
      end_year: year.end_year,
      start_date: year.start_date || '',
      end_date: year.end_date || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingYear) {
      updateMutation.mutate({
        id: editingYear.id,
        data: {
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined
        }
      }, {
        onSuccess: () => {
          toast.success('Academic year updated successfully!')
          setShowModal(false)
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { detail?: string } } }
          toast.error(err.response?.data?.detail || 'Failed to update academic year')
        }
      })
    } else {
      createMutation.mutate({
        start_year: formData.start_year,
        end_year: formData.end_year,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined
      }, {
        onSuccess: () => {
          toast.success('Academic year created successfully!')
          setShowModal(false)
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { detail?: string } } }
          toast.error(err.response?.data?.detail || 'Failed to create academic year')
        }
      })
    }
  }

  const handleActivate = async (year: AcademicYear) => {
    if (!window.confirm(`Activate academic year ${year.display_name}? This will deactivate the current academic year.`)) {
      return
    }
    activateMutation.mutate(year.id, {
      onSuccess: () => {
        toast.success('Academic year activated successfully!')
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } }
        toast.error(err.response?.data?.detail || 'Failed to activate academic year')
      }
    })
  }

  const handleArchive = async (year: AcademicYear) => {
    if (!window.confirm(`Archive academic year ${year.display_name}? This action cannot be undone.`)) {
      return
    }
    archiveMutation.mutate(year.id, {
      onSuccess: () => {
        toast.success('Academic year archived successfully!')
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } }
        toast.error(err.response?.data?.detail || 'Failed to archive academic year')
      }
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      archived: { color: 'bg-gray-100 text-gray-800', text: 'Archived' },
      planned: { color: 'bg-blue-100 text-blue-800', text: 'Planned' }
    }
    const badge = badges[status] || badges.planned
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
          <h1 className="text-2xl font-bold">Academic Year Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage academic years, activation, and archival</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Create Academic Year</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-500" />
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
            <Archive className="h-8 w-8 text-gray-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Archived</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.archived}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Planned</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.planned}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center">
            <CheckCircle2 className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.current}</p>
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
                placeholder="Search academic years by name or year..."
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
              <option value="archived">Archived</option>
              <option value="planned">Planned</option>
            </select>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
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

      {loading ? (
        <LoadingFallback />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredYears.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No academic years found
                  </td>
                </tr>
              ) : (
                filteredYears.map((year: AcademicYear) => (
                  <tr key={year.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{year.display_name}</div>
                      <div className="text-sm text-gray-500">
                        {year.start_year} - {year.end_year}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(year.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {year.start_date && year.end_date ? (
                        <>
                          {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                        </>
                      ) : (
                        'Not set'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {year.is_current ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {year.status === 'planned' && (
                          <button
                            onClick={() => handleActivate(year)}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            Activate
                          </button>
                        )}
                        {year.status === 'active' && !year.is_current && (
                          <button
                            onClick={() => handleArchive(year)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Archive"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(year)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Year
                </label>
                <input
                  type="number"
                  value={formData.start_year}
                  onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={!!editingYear}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Year
                </label>
                <input
                  type="number"
                  value={formData.end_year}
                  onChange={(e) => setFormData({ ...formData, end_year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={!!editingYear}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingYear
                    ? 'Update'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AcademicYearManagement
