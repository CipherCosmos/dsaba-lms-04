/**
 * Batch Instance Management Page
 * Principal/Admin/HOD can create, manage batch instances, sections, and promote batches
 */

import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import {
  useBatchInstances,
  useActivateBatchInstance,
  useDeactivateBatchInstance,
  useSections,
  useCreateSection,
  useUpdateSection,
  usePromoteBatch,
  type BatchInstance,
  type Section,
} from '../../core/hooks'
import { useDepartments } from '../../core/hooks'
import { useAcademicYears, useCurrentAcademicYear } from '../../core/hooks'
import { classAPI } from '../../services/api'
import { LoadingFallback } from '../../modules/shared/components/LoadingFallback'
import CreateClassWizard from '../../components/BatchInstance/CreateClassWizard'
import BatchPromotionModal from '../../components/BatchInstance/BatchPromotionModal'
import {
  Plus,
  Search,
  X,
  Users,
  GraduationCap,
  Building,
  Calendar,
  Power,
  PowerOff,
  ArrowRight,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '../../core/utils/logger'

interface Batch {
  id: number
  name: string
  duration_years: number
  is_active: boolean
}

const BatchInstanceManagement: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const userRole = user?.role || (user?.roles && user.roles.length > 0 ? user.roles[0] : null)
  const userDepartmentId = user?.department_ids?.[0] || (user as { department_id?: number })?.department_id

  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showSectionModal, setShowSectionModal] = useState<number | null>(null)
  const [showPromoteModal, setShowPromoteModal] = useState<number | null>(null)
  const [expandedInstances, setExpandedInstances] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [academicYearFilter, setAcademicYearFilter] = useState<number | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null)

  const [sectionFormData, setSectionFormData] = useState({
    section_name: '',
    capacity: '',
  })


  // React Query hooks
  const { data: currentAcademicYear } = useCurrentAcademicYear()
  const { data: academicYearsData } = useAcademicYears(0, 200)
  const { data: departmentsData } = useDepartments(0, 200)
  const [batches, setBatches] = useState<Batch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  // Fetch batches (program types)
  useEffect(() => {
    const fetchBatches = async () => {
      setLoadingBatches(true)
      try {
        const response = await classAPI.getBatches(0, 200, true)
        setBatches(response.items || [])
      } catch (error: unknown) {
        toast.error('Failed to fetch batches')
        logger.error('Error fetching batches:', error)
      } finally {
        setLoadingBatches(false)
      }
    }
    fetchBatches()
  }, [])

  // Note: Academic year selection is handled in the wizard

  // Build filters
  const filters: Record<string, unknown> = {}
  if (statusFilter !== 'all') {
    filters.is_active = statusFilter === 'active'
  }
  if (academicYearFilter) {
    filters.academic_year_id = academicYearFilter
  }
  if (departmentFilter) {
    filters.department_id = departmentFilter
  }

  const { data: batchInstancesData, isLoading: loading } = useBatchInstances(0, 200, filters)
  const activateMutation = useActivateBatchInstance()
  const deactivateMutation = useDeactivateBatchInstance()
  const createSectionMutation = useCreateSection()
  const updateSectionMutation = useUpdateSection()

  const batchInstances = batchInstancesData?.items || []
  const academicYears = academicYearsData?.items || []
  const departments = departmentsData?.items || []

  // Filter batch instances
  const filteredInstances = batchInstances.filter((instance: BatchInstance) => {
    const matchesSearch =
      instance.admission_year.toString().includes(searchTerm) ||
      batches.find((b) => b.id === instance.batch_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      departments.find((d) => d.id === instance.department_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academicYears.find((ay) => ay.id === instance.academic_year_id)?.display_name.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Calculate stats
  const stats = {
    total: batchInstances.length,
    active: batchInstances.filter((bi: BatchInstance) => bi.is_active).length,
    inactive: batchInstances.filter((bi: BatchInstance) => !bi.is_active).length,
  }

  const handleCreateSuccess = () => {
    // Refresh data after successful creation
    // React Query will automatically refetch
    toast.success('Class created successfully!')
  }

  const handleActivate = async (instance: BatchInstance) => {
    activateMutation.mutate(instance.id, {
      onSuccess: () => {
        toast.success('Batch instance activated successfully!')
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } }
        toast.error(err.response?.data?.detail || 'Failed to activate batch instance')
      },
    })
  }

  const handleDeactivate = async (instance: BatchInstance) => {
    if (!window.confirm('Are you sure you want to deactivate this batch instance?')) {
      return
    }
    deactivateMutation.mutate(instance.id, {
      onSuccess: () => {
        toast.success('Batch instance deactivated successfully!')
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } }
        toast.error(err.response?.data?.detail || 'Failed to deactivate batch instance')
      },
    })
  }

  const handleCreateSection = async (batchInstanceId: number) => {
    if (!sectionFormData.section_name) {
      toast.error('Section name is required')
      return
    }

    createSectionMutation.mutate(
      {
        batch_instance_id: batchInstanceId,
        section_name: sectionFormData.section_name.toUpperCase(),
        capacity: sectionFormData.capacity ? parseInt(sectionFormData.capacity) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Section created successfully!')
          setShowSectionModal(null)
          setSectionFormData({ section_name: '', capacity: '' })
        },
        onError: (error: unknown) => {
          const err = error as { response?: { data?: { detail?: string } } }
          toast.error(err.response?.data?.detail || 'Failed to create section')
        },
      }
    )
  }

  const handlePromoteSuccess = () => {
    // React Query will automatically refetch
    setShowPromoteModal(null)
  }

  const toggleExpand = (instanceId: number) => {
    const newExpanded = new Set(expandedInstances)
    if (newExpanded.has(instanceId)) {
      newExpanded.delete(instanceId)
    } else {
      newExpanded.add(instanceId)
    }
    setExpandedInstances(newExpanded)
  }

  const getBatchName = (batchId: number) => {
    return batches.find((b) => b.id === batchId)?.name || `Batch ${batchId}`
  }

  const getDepartmentName = (deptId: number) => {
    return departments.find((d) => d.id === deptId)?.name || `Dept ${deptId}`
  }

  const getAcademicYearName = (ayId: number) => {
    return academicYears.find((ay) => ay.id === ayId)?.display_name || `AY ${ayId}`
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Batch Instance Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage batch instances, sections, and batch promotion</p>
        </div>
        <button
          onClick={() => setShowCreateWizard(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Create Class</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Instances</p>
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
            <PowerOff className="h-8 w-8 text-gray-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
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
                placeholder="Search by admission year, batch, department, or academic year..."
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
              value={academicYearFilter || ''}
              onChange={(e) => setAcademicYearFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.display_name}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter || ''}
              onChange={(e) => setDepartmentFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {(searchTerm || statusFilter !== 'all' || academicYearFilter || departmentFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setAcademicYearFilter(null)
                  setDepartmentFilter(null)
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

      {loading || loadingBatches ? (
        <LoadingFallback />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Instance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Semester
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
              {filteredInstances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No batch instances found
                  </td>
                </tr>
              ) : (
                filteredInstances.map((instance: BatchInstance) => {
                  const isExpanded = expandedInstances.has(instance.id)
                  return (
                    <React.Fragment key={instance.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(instance.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getBatchName(instance.batch_id)} - {instance.admission_year}
                          </div>
                          <div className="text-sm text-gray-500">{getDepartmentName(instance.department_id)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getAcademicYearName(instance.academic_year_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Semester {instance.current_semester}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {instance.is_active ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {instance.is_active ? (
                              <button
                                onClick={() => handleDeactivate(instance)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Deactivate"
                              >
                                <PowerOff size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(instance)}
                                className="text-green-600 hover:text-green-900"
                                title="Activate"
                              >
                                <Power size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setShowSectionModal(instance.id)
                                setSectionFormData({ section_name: '', capacity: '' })
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Add Section"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={() => setShowPromoteModal(instance.id)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Promote Batch"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <BatchInstanceDetails batchInstanceId={instance.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Class Wizard */}
      <CreateClassWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={handleCreateSuccess}
        userRole={userRole || ''}
        userDepartmentId={userDepartmentId}
      />

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Section</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sectionFormData.section_name}
                onChange={(e) => setSectionFormData({ ...sectionFormData, section_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="A, B, C, etc."
                required
                maxLength={10}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Optional)</label>
              <input
                type="number"
                value={sectionFormData.capacity}
                onChange={(e) => setSectionFormData({ ...sectionFormData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 60"
                min={1}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowSectionModal(null)
                  setSectionFormData({ section_name: '', capacity: '' })
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateSection(showSectionModal)}
                disabled={createSectionMutation.isPending || !sectionFormData.section_name}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSectionMutation.isPending ? 'Creating...' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Promotion Modal */}
      {showPromoteModal && (
        <BatchPromotionModal
          isOpen={!!showPromoteModal}
          onClose={() => setShowPromoteModal(null)}
          batchInstanceId={showPromoteModal}
          currentSemester={batchInstances.find((bi: BatchInstance) => bi.id === showPromoteModal)?.current_semester || 1}
          onSuccess={handlePromoteSuccess}
        />
      )}
    </div>
  )
}

// Component to show batch instance details (sections)
const BatchInstanceDetails: React.FC<{ batchInstanceId: number }> = ({ batchInstanceId }) => {
  const { data: sectionsData, isLoading } = useSections(batchInstanceId)
  const sections = sectionsData?.items || []

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading sections...</div>
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Sections ({sections.length})</h3>
      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">No sections created yet</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {sections.map((section: Section) => (
            <div key={section.id} className="p-2 bg-white rounded border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">Section {section.section_name}</span>
                  {section.capacity && (
                    <span className="text-xs text-gray-500 ml-2">(Capacity: {section.capacity})</span>
                  )}
                </div>
                {section.is_active ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BatchInstanceManagement

