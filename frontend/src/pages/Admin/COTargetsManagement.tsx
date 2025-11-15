import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import {
  fetchCOTargets,
  bulkUpdateCOTargets,
  setSelectedSubject,
  clearErrors,
  fetchCODefinitions
} from '../../store/slices/copoSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { logger } from '../../core/utils/logger'

const COTargetsManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { 
    coTargets, 
    coTargetsLoading, 
    coTargetsError,
    selectedSubjectId,
    coDefinitions,
    coDefinitionsLoading
  } = useSelector((state: RootState) => state.copo)

  const [targets, setTargets] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  useEffect(() => {
    if (selectedSubjectId) {
      dispatch(fetchCODefinitions(selectedSubjectId))
      dispatch(fetchCOTargets(selectedSubjectId))
    }
  }, [dispatch, selectedSubjectId])

  useEffect(() => {
    setTargets(coTargets)
  }, [coTargets])

  const handleSubjectChange = (subjectId: number) => {
    dispatch(setSelectedSubject(subjectId))
  }

  const handleTargetChange = (index: number, field: string, value: string | number) => {
    const newTargets = [...targets]
    newTargets[index] = {
      ...newTargets[index],
      [field]: value
    }
    setTargets(newTargets)
  }

  const handleAddTarget = () => {
    if (coDefinitions.length === 0) {
      alert('Please create CO definitions first')
      return
    }
    
    // Find COs that don't have targets yet
    const existingCoIds = targets.map(t => t.co_id)
    const availableCOs = coDefinitions.filter(co => !existingCoIds.includes(co.id))
    
    if (availableCOs.length === 0) {
      alert('All COs already have targets')
      return
    }
    
    const newTarget = {
      co_id: availableCOs[0].id,
      target_pct: 70,
      l1_threshold: 60,
      l2_threshold: 70,
      l3_threshold: 80
    }
    setTargets([...targets, newTarget])
  }

  const handleRemoveTarget = (index: number) => {
    const newTargets = targets.filter((_, i) => i !== index)
    setTargets(newTargets)
  }

  const handleSave = async () => {
    if (!selectedSubjectId) return

    setSaving(true)
    try {
      await dispatch(bulkUpdateCOTargets({
        subjectId: selectedSubjectId,
        coTargets: targets
      })).unwrap()
      
      setIsEditing(false)
      dispatch(clearErrors())
    } catch (error) {
      logger.error('Error saving CO targets:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTargets(coTargets)
    setIsEditing(false)
    dispatch(clearErrors())
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">CO Targets Management</h1>
        <p className="text-gray-600">Set target percentages and level thresholds for Course Outcomes</p>
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
      {coTargetsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{coTargetsError}</p>
        </div>
      )}

      {/* CO Targets */}
      {selectedSubjectId && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              CO Targets for {subjects.find(s => s.id === selectedSubjectId)?.name}
            </h2>
            <div className="space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit Targets
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={handleAddTarget}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Add Target
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {coTargetsLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading CO targets...</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No CO targets found for this subject.</p>
              <p className="mt-2">Click "Edit Targets" to add CO targets.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L1 Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L2 Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      L3 Threshold
                    </th>
                    {isEditing && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {targets.map((target, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={target.co_id || ''}
                            onChange={(e) => handleTargetChange(index, 'co_id', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select CO</option>
                            {coDefinitions.map(co => (
                              <option key={co.id} value={co.id}>
                                {co.code} - {co.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {coDefinitions.find(co => co.id === target.co_id)?.code || 'N/A'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={target.target_pct}
                            onChange={(e) => handleTargetChange(index, 'target_pct', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{target.target_pct}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={target.l1_threshold}
                            onChange={(e) => handleTargetChange(index, 'l1_threshold', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{target.l1_threshold}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={target.l2_threshold}
                            onChange={(e) => handleTargetChange(index, 'l2_threshold', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{target.l2_threshold}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={target.l3_threshold}
                            onChange={(e) => handleTargetChange(index, 'l3_threshold', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{target.l3_threshold}%</span>
                        )}
                      </td>
                      {isEditing && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveTarget(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Level Explanation */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Level Thresholds Explanation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-900">L1 (Basic):</span> Students demonstrate basic understanding and knowledge
              </div>
              <div>
                <span className="font-medium text-gray-900">L2 (Intermediate):</span> Students can apply knowledge to solve problems
              </div>
              <div>
                <span className="font-medium text-gray-900">L3 (Advanced):</span> Students can analyze, evaluate, and create solutions
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default COTargetsManagement
