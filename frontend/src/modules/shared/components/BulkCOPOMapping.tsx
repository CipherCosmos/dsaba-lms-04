import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../../store/store'
import {
  fetchCODefinitions,
  fetchPODefinitions,
  fetchCOPOMatrix,
  bulkUpdateCOPOMatrix,
  setSelectedSubject
} from '../../../store/slices/copoSlice'
import { fetchSubjects } from '../../../store/slices/subjectSlice'
import { fetchDepartments } from '../../../store/slices/departmentSlice'
import { logger } from '../../../core/utils/logger'
import type { CourseOutcome, ProgramOutcome } from '../../../core/types/api'
import {
  Copy,
  Trash2,
  Zap,
  Target,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Upload,
  Download
} from 'lucide-react'

interface BulkCOPOMappingProps {
  className?: string
}

interface BulkOperation {
  type: 'map_all_cos_to_po' | 'map_po_to_all_cos' | 'clear_co_mappings' | 'clear_po_mappings' | 'apply_pattern' | 'copy_from_subject'
  targetId?: number
  strength?: 1 | 2 | 3
  sourceSubjectId?: number
}

const BulkCOPOMapping: React.FC<BulkCOPOMappingProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>()

  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { departments } = useSelector((state: RootState) => state.departments)

  const {
    coDefinitions,
    poDefinitions,
    coPoMatrix,
    selectedSubjectId
  } = useSelector((state: RootState) => state.copo)

  const [operations, setOperations] = useState<BulkOperation[]>([])
  const [currentOperation, setCurrentOperation] = useState<BulkOperation>({
    type: 'map_all_cos_to_po',
    strength: 2
  })
  const [executing, setExecuting] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])

  // Load data when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId)
      if (subject?.department_id) {
        dispatch(fetchCODefinitions(selectedSubjectId))
        dispatch(fetchPODefinitions({ departmentId: subject.department_id }))
        dispatch(fetchCOPOMatrix(selectedSubjectId))
      }
    }
  }, [dispatch, selectedSubjectId, subjects])

  // Load initial data
  useEffect(() => {
    dispatch(fetchSubjects())
    dispatch(fetchDepartments())
  }, [dispatch])

  const generatePreview = (operation: BulkOperation) => {
    if (!selectedSubjectId) return []

    const preview: any[] = []

    switch (operation.type) {
      case 'map_all_cos_to_po':
        if (operation.targetId && operation.strength) {
          const po = poDefinitions.find(p => p.id === operation.targetId)
          coDefinitions.forEach(co => {
            const existing = coPoMatrix.find(m => m.co_id === co.id && m.po_id === operation.targetId)
            if (!existing) {
              preview.push({
                type: 'create',
                co_code: co.code,
                po_code: po?.code,
                strength: operation.strength,
                description: `Map ${co.code} → ${po?.code} with strength ${operation.strength}`
              })
            }
          })
        }
        break

      case 'map_po_to_all_cos':
        if (operation.targetId && operation.strength) {
          const co = coDefinitions.find(c => c.id === operation.targetId)
          poDefinitions.forEach(po => {
            const existing = coPoMatrix.find(m => m.co_id === operation.targetId && m.po_id === po.id)
            if (!existing) {
              preview.push({
                type: 'create',
                co_code: co?.code,
                po_code: po.code,
                strength: operation.strength,
                description: `Map ${co?.code} → ${po.code} with strength ${operation.strength}`
              })
            }
          })
        }
        break

      case 'clear_co_mappings':
        if (operation.targetId) {
          const co = coDefinitions.find(c => c.id === operation.targetId)
          const mappings = coPoMatrix.filter(m => m.co_id === operation.targetId)
          mappings.forEach(mapping => {
            const po = poDefinitions.find(p => p.id === mapping.po_id)
            preview.push({
              type: 'delete',
              co_code: co?.code,
              po_code: po?.code,
              strength: mapping.strength,
              description: `Remove mapping ${co?.code} → ${po?.code}`
            })
          })
        }
        break

      case 'clear_po_mappings':
        if (operation.targetId) {
          const po = poDefinitions.find(p => p.id === operation.targetId)
          const mappings = coPoMatrix.filter(m => m.po_id === operation.targetId)
          mappings.forEach(mapping => {
            const co = coDefinitions.find(c => c.id === mapping.co_id)
            preview.push({
              type: 'delete',
              co_code: co?.code,
              po_code: po?.code,
              strength: mapping.strength,
              description: `Remove mapping ${co?.code} → ${po?.code}`
            })
          })
        }
        break
    }

    return preview
  }

  const addOperation = () => {
    const preview = generatePreview(currentOperation)
    if (preview.length > 0) {
      setOperations([...operations, { ...currentOperation }])
      setPreviewData(preview)
    }
  }

  const removeOperation = (index: number) => {
    const newOperations = operations.filter((_, i) => i !== index)
    setOperations(newOperations)
    if (newOperations.length > 0) {
      setPreviewData(generatePreview(newOperations[newOperations.length - 1]))
    } else {
      setPreviewData([])
    }
  }

  const executeOperations = async () => {
    if (!selectedSubjectId || operations.length === 0) return

    setExecuting(true)
    try {
      // Collect all mappings to create/update/delete
      const mappingsToCreate: any[] = []
      const mappingsToDelete: number[] = []

      for (const operation of operations) {
        switch (operation.type) {
          case 'map_all_cos_to_po':
            if (operation.targetId && operation.strength) {
              coDefinitions.forEach(co => {
                mappingsToCreate.push({
                  co_id: co.id,
                  po_id: operation.targetId,
                  strength: operation.strength
                })
              })
            }
            break

          case 'map_po_to_all_cos':
            if (operation.targetId && operation.strength) {
              poDefinitions.forEach(po => {
                mappingsToCreate.push({
                  co_id: operation.targetId,
                  po_id: po.id,
                  strength: operation.strength
                })
              })
            }
            break

          case 'clear_co_mappings':
            if (operation.targetId) {
              const mappings = coPoMatrix.filter(m => m.co_id === operation.targetId)
              mappingsToDelete.push(...mappings.map(m => m.id))
            }
            break

          case 'clear_po_mappings':
            if (operation.targetId) {
              const mappings = coPoMatrix.filter(m => m.po_id === operation.targetId)
              mappingsToDelete.push(...mappings.map(m => m.id))
            }
            break
        }
      }

      // Execute bulk update
      await dispatch(bulkUpdateCOPOMatrix({
        subjectId: selectedSubjectId,
        coPoMatrix: mappingsToCreate
      })).unwrap()

      // Clear operations after successful execution
      setOperations([])
      setPreviewData([])

      // Refresh data
      const subject = subjects.find(s => s.id === selectedSubjectId)
      if (subject?.department_id) {
        dispatch(fetchCOPOMatrix(selectedSubjectId))
      }

      logger.info('Bulk CO-PO operations executed successfully')
    } catch (error) {
      logger.error('Failed to execute bulk operations:', error as any)
    } finally {
      setExecuting(false)
    }
  }

  const clearAllOperations = () => {
    setOperations([])
    setPreviewData([])
  }

  const getOperationDescription = (operation: BulkOperation) => {
    switch (operation.type) {
      case 'map_all_cos_to_po':
        const po = poDefinitions.find(p => p.id === operation.targetId)
        return `Map all COs to ${po?.code} (strength: ${operation.strength})`
      case 'map_po_to_all_cos':
        const co = coDefinitions.find(c => c.id === operation.targetId)
        return `Map ${co?.code} to all POs (strength: ${operation.strength})`
      case 'clear_co_mappings':
        const co2 = coDefinitions.find(c => c.id === operation.targetId)
        return `Clear all mappings for ${co2?.code}`
      case 'clear_po_mappings':
        const po2 = poDefinitions.find(p => p.id === operation.targetId)
        return `Clear all mappings for ${po2?.code}`
      default:
        return 'Unknown operation'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bulk CO-PO Mapping Operations</h2>
              <p className="text-sm text-gray-600">Perform bulk operations on CO-PO mappings efficiently</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearAllOperations}
              disabled={operations.length === 0}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Clear All
            </button>
            <button
              onClick={executeOperations}
              disabled={operations.length === 0 || executing}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                operations.length > 0 && !executing
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {executing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Execute ({operations.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Subject Selection */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Subject:</label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => dispatch(setSelectedSubject(Number(e.target.value)))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select a subject...</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSubjectId && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operation Builder */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Build Operations</h3>

              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                {/* Operation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation Type
                  </label>
                  <select
                    value={currentOperation.type}
                    onChange={(e) => setCurrentOperation({
                      ...currentOperation,
                      type: e.target.value as BulkOperation['type']
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="map_all_cos_to_po">Map all COs to a PO</option>
                    <option value="map_po_to_all_cos">Map a CO to all POs</option>
                    <option value="clear_co_mappings">Clear all mappings for a CO</option>
                    <option value="clear_po_mappings">Clear all mappings for a PO</option>
                  </select>
                </div>

                {/* Target Selection */}
                {(currentOperation.type === 'map_all_cos_to_po' || currentOperation.type === 'clear_po_mappings') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target PO
                    </label>
                    <select
                      value={currentOperation.targetId || ''}
                      onChange={(e) => setCurrentOperation({
                        ...currentOperation,
                        targetId: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a PO...</option>
                      {poDefinitions.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.code} - {po.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(currentOperation.type === 'map_po_to_all_cos' || currentOperation.type === 'clear_co_mappings') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target CO
                    </label>
                    <select
                      value={currentOperation.targetId || ''}
                      onChange={(e) => setCurrentOperation({
                        ...currentOperation,
                        targetId: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a CO...</option>
                      {coDefinitions.map((co) => (
                        <option key={co.id} value={co.id}>
                          {co.code} - {co.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Strength Selection */}
                {(currentOperation.type === 'map_all_cos_to_po' || currentOperation.type === 'map_po_to_all_cos') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mapping Strength
                    </label>
                    <select
                      value={currentOperation.strength || 2}
                      onChange={(e) => setCurrentOperation({
                        ...currentOperation,
                        strength: Number(e.target.value) as 1 | 2 | 3
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={1}>Low (1)</option>
                      <option value={2}>Medium (2)</option>
                      <option value={3}>High (3)</option>
                    </select>
                  </div>
                )}

                {/* Add Operation Button */}
                <button
                  onClick={addOperation}
                  disabled={!currentOperation.targetId || (currentOperation.type.includes('map') && !currentOperation.strength)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Add Operation
                </button>
              </div>
            </div>

            {/* Operations Queue & Preview */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Operations Queue</h3>

              {/* Operations List */}
              <div className="bg-gray-50 p-4 rounded-lg">
                {operations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No operations added yet. Use the form to add bulk operations.</p>
                ) : (
                  <div className="space-y-2">
                    {operations.map((operation, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getOperationDescription(operation)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {generatePreview(operation).length} changes
                          </p>
                        </div>
                        <button
                          onClick={() => removeOperation(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove operation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              {previewData.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Preview of Changes ({previewData.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {previewData.slice(0, 10).map((change, index) => (
                      <div key={index} className="text-xs text-blue-800 flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          change.type === 'create' ? 'bg-green-500' :
                          change.type === 'delete' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                        <span>{change.description}</span>
                      </div>
                    ))}
                    {previewData.length > 10 && (
                      <p className="text-xs text-blue-700 italic">
                        ... and {previewData.length - 10} more changes
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {operations.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">
                    Ready to Execute {operations.length} Operation{operations.length !== 1 ? 's' : ''}
                  </h4>
                  <p className="text-xs text-green-700 mt-1">
                    Total estimated changes: {operations.reduce((sum, op) => sum + generatePreview(op).length, 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BulkCOPOMapping