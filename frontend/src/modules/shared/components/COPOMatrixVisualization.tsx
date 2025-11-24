import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
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
  Target,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Grid3X3,
  Zap,
  TrendingUp
} from 'lucide-react'
import { FixedSizeGrid as Grid } from 'react-window'

interface COPOMatrixVisualizationProps {
  className?: string
}

interface MatrixCell {
  coId: number
  poId: number
  strength: 1 | 2 | 3 | null
  isMapped: boolean
}

interface MatrixCellProps {
  cell: MatrixCell
  onClick: () => void
  poIndex: number
  poDefinitions: ProgramOutcome[]
  co: CourseOutcome
}

// Memoized cell component for better performance
const MatrixCellComponent = memo<MatrixCellProps>(({
  cell,
  onClick,
  poIndex,
  poDefinitions,
  co
}) => {
  const getStrengthColor = (strength: 1 | 2 | 3 | null) => {
    switch (strength) {
      case 1: return 'bg-blue-100 border-blue-300 text-blue-800'
      case 2: return 'bg-green-100 border-green-300 text-green-800'
      case 3: return 'bg-purple-100 border-purple-300 text-purple-800'
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }
  }

  const getStrengthLabel = (strength: 1 | 2 | 3 | null) => {
    switch (strength) {
      case 1: return 'Low'
      case 2: return 'Medium'
      case 3: return 'High'
      default: return ''
    }
  }

  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-32 h-16 border border-gray-300 transition-all duration-200 hover:shadow-md ${
        getStrengthColor(cell.strength)
      }`}
      title={`CO: ${co.code} → PO: ${poDefinitions[poIndex].code} (${getStrengthLabel(cell.strength) || 'Not mapped'})`}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {cell.strength ? (
          <>
            <div className="text-lg font-bold">{cell.strength}</div>
            <div className="text-xs opacity-75">{getStrengthLabel(cell.strength)}</div>
          </>
        ) : (
          <div className="text-gray-400 text-xs">Click to map</div>
        )}
      </div>
    </button>
  )
})

MatrixCellComponent.displayName = 'MatrixCellComponent'

// Grid cell renderer for virtualization
const MatrixCellRenderer = ({ columnIndex, rowIndex, style, data }: any) => {
  const { matrixData, coDefinitions, poDefinitions, handleCellClick } = data
  const cell = matrixData[rowIndex][columnIndex]
  const co = coDefinitions[rowIndex]

  return (
    <div style={style} className="border border-gray-300">
      <MatrixCellComponent
        cell={cell}
        onClick={() => handleCellClick(rowIndex, columnIndex)}
        poIndex={columnIndex}
        poDefinitions={poDefinitions}
        co={co}
      />
    </div>
  )
}

const COPOMatrixVisualization: React.FC<COPOMatrixVisualizationProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>()

  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { departments } = useSelector((state: RootState) => state.departments)

  const {
    coDefinitions,
    coDefinitionsLoading,
    poDefinitions,
    poDefinitionsLoading,
    coPoMatrix,
    coPoMatrixLoading,
    selectedSubjectId
  } = useSelector((state: RootState) => state.copo)

  const [matrixData, setMatrixData] = useState<MatrixCell[][]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showStats, setShowStats] = useState(true)

  // Initialize matrix data when COs and POs are loaded
  useEffect(() => {
    if (coDefinitions.length > 0 && poDefinitions.length > 0) {
      const matrix: MatrixCell[][] = coDefinitions.map(co =>
        poDefinitions.map(po => {
          const existingMapping = coPoMatrix.find(
            mapping => mapping.co_id === co.id && mapping.po_id === po.id
          )
          return {
            coId: co.id,
            poId: po.id,
            strength: existingMapping ? existingMapping.strength : null,
            isMapped: !!existingMapping
          }
        })
      )
      setMatrixData(matrix)
      setIsDirty(false)
    }
  }, [coDefinitions, poDefinitions, coPoMatrix])

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

  const handleCellClick = useCallback((coIndex: number, poIndex: number) => {
    setMatrixData(prevMatrix => {
      const newMatrix = prevMatrix.map(row => [...row])
      const cell = newMatrix[coIndex][poIndex]

      // Cycle through strength values: null -> 1 -> 2 -> 3 -> null
      const nextStrength = cell.strength === null ? 1 :
                           cell.strength === 1 ? 2 :
                           cell.strength === 2 ? 3 : null

      cell.strength = nextStrength
      cell.isMapped = nextStrength !== null

      return newMatrix
    })
    setIsDirty(true)
  }, [])

  const handleSave = async () => {
    if (!selectedSubjectId || !isDirty) return

    setSaving(true)
    try {
      // Convert matrix to CO-PO mappings format
      const mappings = matrixData.flat().filter(cell => cell.isMapped).map(cell => ({
        co_id: cell.coId,
        po_id: cell.poId,
        strength: cell.strength!
      }))

      await dispatch(bulkUpdateCOPOMatrix({
        subjectId: selectedSubjectId,
        coPoMatrix: mappings
      })).unwrap()

      setIsDirty(false)
      logger.info('CO-PO matrix saved successfully')
    } catch (error) {
      logger.error('Failed to save CO-PO matrix:', error as any)
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = () => {
    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId)
      if (subject?.department_id) {
        dispatch(fetchCODefinitions(selectedSubjectId))
        dispatch(fetchPODefinitions({ departmentId: subject.department_id }))
        dispatch(fetchCOPOMatrix(selectedSubjectId))
      }
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCells = matrixData.length * matrixData[0]?.length || 0
    const mappedCells = matrixData.flat().filter(cell => cell.isMapped).length
    const mappingPercentage = totalCells > 0 ? (mappedCells / totalCells) * 100 : 0

    const strengthDistribution = {
      1: matrixData.flat().filter(cell => cell.strength === 1).length,
      2: matrixData.flat().filter(cell => cell.strength === 2).length,
      3: matrixData.flat().filter(cell => cell.strength === 3).length,
    }

    const coCoverage = coDefinitions.map(co => {
      const mappedPOs = matrixData[coDefinitions.indexOf(co)]?.filter(cell => cell.isMapped).length || 0
      return { co, mappedPOs, coverage: poDefinitions.length > 0 ? (mappedPOs / poDefinitions.length) * 100 : 0 }
    })

    const poCoverage = poDefinitions.map(po => {
      const mappedCOs = matrixData.map(row => row[poDefinitions.indexOf(po)]).filter(cell => cell.isMapped).length
      return { po, mappedCOs, coverage: coDefinitions.length > 0 ? (mappedCOs / coDefinitions.length) * 100 : 0 }
    })

    return {
      totalCells,
      mappedCells,
      mappingPercentage,
      strengthDistribution,
      coCoverage,
      poCoverage
    }
  }, [matrixData, coDefinitions, poDefinitions])


  if (coDefinitionsLoading || poDefinitionsLoading || coPoMatrixLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading CO-PO matrix...</span>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Grid3X3 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">CO-PO Mapping Matrix</h2>
              <p className="text-sm text-gray-600">Interactive visualization of Course Outcome to Program Outcome mappings</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-md ${showStats ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Toggle statistics"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                isDirty && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Statistics Panel */}
      {showStats && selectedSubjectId && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Mapping Coverage</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-blue-600">{stats.mappingPercentage.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">{stats.mappedCells} of {stats.totalCells} cells mapped</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <Zap className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Strength Distribution</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>High (3):</span>
                  <span className="font-medium">{stats.strengthDistribution[3]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Medium (2):</span>
                  <span className="font-medium">{stats.strengthDistribution[2]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Low (1):</span>
                  <span className="font-medium">{stats.strengthDistribution[1]}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">CO Coverage</span>
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold text-purple-600">
                  {stats.coCoverage.filter(c => c.coverage > 0).length}/{coDefinitions.length}
                </div>
                <div className="text-xs text-gray-500">COs with PO mappings</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">PO Coverage</span>
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold text-orange-600">
                  {stats.poCoverage.filter(p => p.coverage > 0).length}/{poDefinitions.length}
                </div>
                <div className="text-xs text-gray-500">POs with CO mappings</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matrix */}
      {selectedSubjectId && (
        <div className="p-6">
          {matrixData.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CO-PO Matrix Available</h3>
              <p className="text-gray-600">Please ensure COs and POs are defined for this subject.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header Row */}
                <div className="flex mb-2">
                  <div className="w-48 flex-shrink-0 p-3 bg-gray-100 border border-gray-300 rounded-tl-lg">
                    <div className="font-semibold text-gray-900">Course Outcomes →<br/>Program Outcomes ↓</div>
                  </div>
                  {poDefinitions.map((po, index) => (
                    <div
                      key={po.id}
                      className={`flex-1 min-w-32 p-3 bg-gray-100 border border-gray-300 text-center ${
                        index === poDefinitions.length - 1 ? 'rounded-tr-lg' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900 text-sm">{po.code}</div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{po.title}</div>
                    </div>
                  ))}
                </div>

                {/* Virtualized Matrix */}
                <div style={{ height: Math.min(matrixData.length * 68, 600), width: '100%' }}>
                  <Grid
                    columnCount={poDefinitions.length}
                    columnWidth={128} // min-w-32 = 128px
                    height={Math.min(matrixData.length * 68, 600)}
                    rowCount={matrixData.length}
                    rowHeight={68} // h-16 = 64px + margin
                    width={poDefinitions.length * 128 + 192} // columns + CO label width
                    itemData={{
                      matrixData,
                      coDefinitions,
                      poDefinitions,
                      handleCellClick
                    }}
                  >
                    {MatrixCellRenderer}
                  </Grid>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              Mapping Strength Legend
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                <span className="text-xs text-gray-600">Not Mapped</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-xs text-gray-600">Low (1)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-xs text-gray-600">Medium (2)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                <span className="text-xs text-gray-600">High (3)</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click on any cell to cycle through mapping strengths. Changes are saved when you click "Save Changes".
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(COPOMatrixVisualization)