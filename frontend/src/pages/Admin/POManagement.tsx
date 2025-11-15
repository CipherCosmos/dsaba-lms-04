import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import {
  fetchPODefinitions,
  createPODefinition,
  updatePODefinition,
  deletePODefinition,
  setSelectedDepartment,
  clearErrors
} from '../../store/slices/copoSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { logger } from '../../core/utils/logger'

const POManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { departments } = useSelector((state: RootState) => state.departments)
  const { 
    poDefinitions, 
    poDefinitionsLoading, 
    poDefinitionsError,
    selectedDepartmentId 
  } = useSelector((state: RootState) => state.copo)

  const [showModal, setShowModal] = useState(false)
  const [editingPO, setEditingPO] = useState<any>(null)
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    type: 'PO' as 'PO' | 'PSO'
  })

  useEffect(() => {
    dispatch(fetchDepartments())
  }, [dispatch])

  useEffect(() => {
    if (selectedDepartmentId) {
      dispatch(fetchPODefinitions({ departmentId: selectedDepartmentId }))
    }
  }, [dispatch, selectedDepartmentId])

  const handleDepartmentChange = (departmentId: number) => {
    dispatch(setSelectedDepartment(departmentId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDepartmentId) return

    try {
      if (editingPO) {
        await dispatch(updatePODefinition({
          poId: editingPO.id,
          poData: formData
        })).unwrap()
      } else {
        await dispatch(createPODefinition({
          departmentId: selectedDepartmentId,
          poData: formData
        })).unwrap()
      }
      
      setShowModal(false)
      setEditingPO(null)
      setFormData({ code: '', title: '', description: '', type: 'PO' })
      dispatch(clearErrors())
    } catch (error) {
      logger.error('Error saving PO:', error)
    }
  }

  const handleEdit = (po: any) => {
    setEditingPO(po)
    setFormData({
      code: po.code,
      title: po.title,
      description: po.description || '',
      type: po.type
    })
    setShowModal(true)
  }

  const handleDelete = async (poId: number) => {
    if (window.confirm('Are you sure you want to delete this PO?')) {
      try {
        await dispatch(deletePODefinition(poId)).unwrap()
        dispatch(clearErrors())
      } catch (error) {
        logger.error('Error deleting PO:', error)
      }
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingPO(null)
    setFormData({ code: '', title: '', description: '', type: 'PO' })
    dispatch(clearErrors())
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Program Outcomes (PO) Management</h1>
        <p className="text-gray-600">Define and manage Program Outcomes and Program Specific Outcomes for each department</p>
      </div>

      {/* Department Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Department
        </label>
        <select
          value={selectedDepartmentId || ''}
          onChange={(e) => handleDepartmentChange(Number(e.target.value))}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a department...</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name} ({department.code})
            </option>
          ))}
        </select>
      </div>

      {/* Error Display */}
      {poDefinitionsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{poDefinitionsError}</p>
        </div>
      )}

      {/* PO List */}
      {selectedDepartmentId && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              PO/PSO Definitions for {departments.find(d => d.id === selectedDepartmentId)?.name}
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add PO/PSO
            </button>
          </div>

          {poDefinitionsLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading PO definitions...</p>
            </div>
          ) : poDefinitions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No PO definitions found for this department.</p>
              <p className="mt-2">Click "Add PO/PSO" to create the first Program Outcome.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {poDefinitions.map((po) => (
                    <tr key={po.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          po.type === 'PO' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {po.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {po.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {po.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(po)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(po.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPO ? 'Edit PO/PSO' : 'Add New PO/PSO'}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PO' | 'PSO' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="PO">Program Outcome (PO)</option>
                    <option value="PSO">Program Specific Outcome (PSO)</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PO1 or PSO1"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Engineering Knowledge"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Detailed description of the PO/PSO..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingPO ? 'Update' : 'Create'}
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

export default POManagement
