import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import {
  fetchCODefinitions,
  createCODefinition,
  updateCODefinition,
  deleteCODefinition,
  setSelectedSubject,
  clearErrors
} from '../../store/slices/copoSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchPODefinitions } from '../../store/slices/copoSlice'
import { fetchDepartments } from '../../store/slices/departmentSlice'
import { Link, ArrowRight, Target, BarChart3, Plus, Edit, Trash2, CheckCircle } from 'lucide-react'

const COManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { departments } = useSelector((state: RootState) => state.departments)
  const { classes } = useSelector((state: RootState) => state.classes)
  const { 
    coDefinitions, 
    coDefinitionsLoading, 
    coDefinitionsError,
    selectedSubjectId,
    poDefinitions,
    poDefinitionsLoading
  } = useSelector((state: RootState) => state.copo)

  const [showModal, setShowModal] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [editingCO, setEditingCO] = useState<any>(null)
  const [selectedCO, setSelectedCO] = useState<any>(null)
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: ''
  })
  const [mappingData, setMappingData] = useState({
    coId: null as number | null,
    mappedPOs: [] as string[]
  })

  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchDepartments())
  }, [dispatch])

  useEffect(() => {
    if (selectedSubjectId) {
      dispatch(fetchCODefinitions(selectedSubjectId))
      // Get the department ID for the selected subject to fetch POs
      const subject = subjects.find(s => s.id === selectedSubjectId)
      if (subject) {
        const subjectClass = classes.find(c => c.id === subject.class_id)
        if (subjectClass?.department_id) {
          dispatch(fetchPODefinitions(subjectClass.department_id))
        }
      }
    }
  }, [dispatch, selectedSubjectId, subjects, classes])

  const handleSubjectChange = (subjectId: number) => {
    dispatch(setSelectedSubject(subjectId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubjectId) return

    try {
      if (editingCO) {
        await dispatch(updateCODefinition({
          coId: editingCO.id,
          coData: formData
        })).unwrap()
      } else {
        await dispatch(createCODefinition({
          subjectId: selectedSubjectId,
          coData: formData
        })).unwrap()
      }
      
      setShowModal(false)
      setEditingCO(null)
      setFormData({ code: '', title: '', description: '' })
      dispatch(clearErrors())
    } catch (error) {
      console.error('Error saving CO:', error)
    }
  }

  const handleEdit = (co: any) => {
    setEditingCO(co)
    setFormData({
      code: co.code,
      title: co.title,
      description: co.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (coId: number) => {
    if (window.confirm('Are you sure you want to delete this CO?')) {
      try {
        await dispatch(deleteCODefinition(coId)).unwrap()
        dispatch(clearErrors())
      } catch (error) {
        console.error('Error deleting CO:', error)
      }
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingCO(null)
    setFormData({ code: '', title: '', description: '' })
    dispatch(clearErrors())
  }

  const handleMappingOpen = async (co: any) => {
    setSelectedCO(co)
    setMappingData({
      coId: co.id,
      mappedPOs: []
    })
    setShowMappingModal(true)
    
    // Load existing mappings
    if (selectedSubjectId) {
      try {
        const response = await fetch(`/api/subjects/${selectedSubjectId}/co-po-mapping/${co.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setMappingData(prev => ({
            ...prev,
            mappedPOs: data.mapped_pos || []
          }))
        }
      } catch (error) {
        console.error('Error loading existing mappings:', error)
      }
    }
  }

  const handleMappingClose = () => {
    setShowMappingModal(false)
    setSelectedCO(null)
    setMappingData({ coId: null, mappedPOs: [] })
  }

  const handlePOToggle = (poCode: string) => {
    setMappingData(prev => ({
      ...prev,
      mappedPOs: prev.mappedPOs.includes(poCode)
        ? prev.mappedPOs.filter(code => code !== poCode)
        : [...prev.mappedPOs, poCode]
    }))
  }

  const handleMappingSave = async () => {
    if (!selectedSubjectId || !mappingData.coId) return
    
    try {
      const response = await fetch(`/api/subjects/${selectedSubjectId}/co-po-mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          co_id: mappingData.coId,
          mapped_pos: mappingData.mappedPOs
        })
      })
      
      if (response.ok) {
        alert('CO-PO mapping saved successfully!')
        setShowMappingModal(false)
        setSelectedCO(null)
        setMappingData({ coId: null, mappedPOs: [] })
      } else {
        const error = await response.json()
        alert(`Error saving mapping: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error saving CO-PO mapping:', error)
      alert('Failed to save CO-PO mapping')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Course Outcomes (CO) Management</h1>
        <p className="text-gray-600">Define and manage Course Outcomes for each subject</p>
      </div>

      {/* Subject Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Subject
        </label>
        <select
          value={selectedSubjectId || ''}
          onChange={(e) => handleSubjectChange(Number(e.target.value))}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a subject...</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name} ({subject.code})
            </option>
          ))}
        </select>
      </div>

      {/* Error Display */}
      {coDefinitionsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{coDefinitionsError}</p>
        </div>
      )}

      {/* CO List */}
      {selectedSubjectId && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              CO Definitions for {subjects.find(s => s.id === selectedSubjectId)?.name}
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add CO
            </button>
          </div>

          {coDefinitionsLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading CO definitions...</p>
            </div>
          ) : coDefinitions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No CO definitions found for this subject.</p>
              <p className="mt-2">Click "Add CO" to create the first Course Outcome.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CO Code
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
                  {coDefinitions.map((co) => (
                    <tr key={co.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {co.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {co.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {co.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(co)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="Edit CO"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleMappingOpen(co)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Map to POs"
                          >
                            <Target className="h-4 w-4 mr-1" />
                            Map POs
                          </button>
                          <button
                            onClick={() => handleDelete(co.id)}
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title="Delete CO"
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
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCO ? 'Edit CO' : 'Add New CO'}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CO Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., CO1"
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
                    placeholder="e.g., Understand basic concepts"
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
                    placeholder="Detailed description of the CO..."
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
                    {editingCO ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CO-PO Mapping Modal */}
      {showMappingModal && selectedCO && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Map CO to Program Outcomes
                </h3>
                <button
                  onClick={handleMappingClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Selected Course Outcome</h4>
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{selectedCO.code}:</span> {selectedCO.title}
                </p>
                <p className="text-xs text-blue-600 mt-1">{selectedCO.description}</p>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Select Program Outcomes to Map</h4>
                {poDefinitionsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading POs...</p>
                  </div>
                ) : poDefinitions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No Program Outcomes found for this department.</p>
                    <p className="text-sm mt-1">Please create POs first in the PO Management section.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {poDefinitions.map((po) => (
                      <label
                        key={po.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          mappingData.mappedPOs.includes(po.code)
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={mappingData.mappedPOs.includes(po.code)}
                          onChange={() => handlePOToggle(po.code)}
                          className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              po.type === 'PO' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {po.code}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{po.title}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{po.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {mappingData.mappedPOs.length} PO(s) selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleMappingClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMappingSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default COManagement
