import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { auditAPI } from '../../services/api'
import { FileText, Search, Filter, Download, RefreshCw, Clock, User, Edit, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '../../core/utils/logger'

const AuditTrail: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [activeTab, setActiveTab] = useState<'marks' | 'system'>('marks')
  const [markLogs, setMarkLogs] = useState<any[]>([])
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    mark_id: '',
    exam_id: '',
    student_id: '',
    changed_by: '',
    user_id: '',
    action: '',
    resource: '',
    skip: 0,
    limit: 100,
  })

  useEffect(() => {
    if (activeTab === 'marks') {
      fetchMarkLogs()
    } else {
      fetchSystemLogs()
    }
  }, [activeTab, filters])

  const fetchMarkLogs = async () => {
    try {
      setLoading(true)
      const filterParams: any = {
        skip: filters.skip,
        limit: filters.limit,
      }
      if (filters.mark_id) filterParams.mark_id = Number(filters.mark_id)
      if (filters.exam_id) filterParams.exam_id = Number(filters.exam_id)
      if (filters.student_id) filterParams.student_id = Number(filters.student_id)
      if (filters.changed_by) filterParams.changed_by = Number(filters.changed_by)

      const response = await auditAPI.getMarkAuditLogs(filterParams)
      setMarkLogs(response.items || [])
    } catch (error) {
      logger.error('Error fetching mark audit logs:', error)
      toast.error('Failed to fetch mark audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemLogs = async () => {
    try {
      setLoading(true)
      const filterParams: any = {
        skip: filters.skip,
        limit: filters.limit,
      }
      if (filters.user_id) filterParams.user_id = Number(filters.user_id)
      if (filters.action) filterParams.action = filters.action
      if (filters.resource) filterParams.resource = filters.resource

      const response = await auditAPI.getSystemAuditLogs(filterParams)
      setSystemLogs(response.items || [])
    } catch (error) {
      logger.error('Error fetching system audit logs:', error)
      toast.error('Failed to fetch system audit logs')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({
      ...filters,
      [key]: value,
      skip: 0, // Reset pagination when filter changes
    })
  }

  const clearFilters = () => {
    setFilters({
      mark_id: '',
      exam_id: '',
      student_id: '',
      changed_by: '',
      user_id: '',
      action: '',
      resource: '',
      skip: 0,
      limit: 100,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">Track all changes and system actions</p>
        </div>
        <button
          onClick={() => activeTab === 'marks' ? fetchMarkLogs() : fetchSystemLogs()}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('marks')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'marks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Mark Changes
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            System Actions
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        </div>
        {activeTab === 'marks' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mark ID
              </label>
              <input
                type="number"
                value={filters.mark_id}
                onChange={(e) => handleFilterChange('mark_id', e.target.value)}
                placeholder="Mark ID"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam ID
              </label>
              <input
                type="number"
                value={filters.exam_id}
                onChange={(e) => handleFilterChange('exam_id', e.target.value)}
                placeholder="Exam ID"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                type="number"
                value={filters.student_id}
                onChange={(e) => handleFilterChange('student_id', e.target.value)}
                placeholder="Student ID"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Changed By (User ID)
              </label>
              <input
                type="number"
                value={filters.changed_by}
                onChange={(e) => handleFilterChange('changed_by', e.target.value)}
                placeholder="User ID"
                className="input-field"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                placeholder="User ID"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="Action keyword"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource
              </label>
              <input
                type="text"
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                placeholder="Resource keyword"
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      ) : activeTab === 'marks' ? (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mark Change Logs</h2>
          {markLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No mark change logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mark ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Changed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Old Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {markLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.changed_at ? new Date(log.changed_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.mark_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.changed_by_name || `User ${log.changed_by}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.field_changed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.old_value !== null ? log.old_value : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.new_value !== null ? log.new_value : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.change_type === 'override' ? 'bg-red-100 text-red-800' :
                          log.change_type === 'recalculation' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.change_type || 'edit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Action Logs</h2>
          {systemLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No system action logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {systemLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.user_name || `User ${log.user_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AuditTrail

