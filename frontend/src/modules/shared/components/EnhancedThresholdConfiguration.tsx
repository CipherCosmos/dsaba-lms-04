import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../../store/store'
import {
  fetchCOTargets,
  bulkUpdateCOTargets,
  setSelectedSubject,
  fetchCODefinitions
} from '../../../store/slices/copoSlice'
import { fetchSubjects } from '../../../store/slices/subjectSlice'
import { logger } from '../../../core/utils/logger'
import type { CourseOutcome } from '../../../core/types/api'
import {
  Target,
  Save,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Gauge,
  RefreshCw,
  BarChart3,
  Zap,
  Info
} from 'lucide-react'

interface EnhancedThresholdConfigurationProps {
  className?: string
}

interface ThresholdValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

const EnhancedThresholdConfiguration: React.FC<EnhancedThresholdConfigurationProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>()

  const { subjects } = useSelector((state: RootState) => state.subjects)
  const {
    coTargets,
    coTargetsLoading,
    coDefinitions,
    selectedSubjectId
  } = useSelector((state: RootState) => state.copo)

  const [targets, setTargets] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showValidation, setShowValidation] = useState(true)

  // Initialize targets when data loads
  useEffect(() => {
    setTargets(coTargets)
  }, [coTargets])

  // Load data when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      dispatch(fetchCODefinitions(selectedSubjectId))
      dispatch(fetchCOTargets(selectedSubjectId))
    }
  }, [dispatch, selectedSubjectId])

  // Load initial subjects
  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

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

  // Validation logic
  const validateThresholds = useMemo(() => {
    const validations: { [key: number]: ThresholdValidation } = {}

    targets.forEach((target, index) => {
      const errors: string[] = []
      const warnings: string[] = []

      // Check if thresholds are in logical order
      if (target.l1_threshold >= target.l2_threshold) {
        errors.push('L1 threshold must be less than L2 threshold')
      }
      if (target.l2_threshold >= target.l3_threshold) {
        errors.push('L2 threshold must be less than L3 threshold')
      }

      // Check if thresholds are reasonable (not too extreme)
      if (target.l1_threshold < 30) {
        warnings.push('L1 threshold is very low (< 30%)')
      }
      if (target.l3_threshold > 90) {
        warnings.push('L3 threshold is very high (> 90%)')
      }

      // Check target percentage
      if (target.target_pct < 50) {
        warnings.push('Target percentage is quite low (< 50%)')
      }
      if (target.target_pct > 90) {
        warnings.push('Target percentage is very high (> 90%)')
      }

      validations[index] = {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    })

    return validations
  }, [targets])

  const handleSave = async () => {
    if (!selectedSubjectId) return

    // Check if all validations pass
    const hasErrors = Object.values(validateThresholds).some(v => !v.isValid)
    if (hasErrors) {
      alert('Please fix validation errors before saving')
      return
    }

    setSaving(true)
    try {
      await dispatch(bulkUpdateCOTargets({
        subjectId: selectedSubjectId,
        coTargets: targets
      })).unwrap()

      setIsEditing(false)
      logger.info('CO targets saved successfully')
    } catch (error) {
      logger.error('Error saving CO targets:', error as any)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTargets(coTargets)
    setIsEditing(false)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (targets.length === 0) return null

    const avgTarget = targets.reduce((sum, t) => sum + t.target_pct, 0) / targets.length
    const avgL1 = targets.reduce((sum, t) => sum + t.l1_threshold, 0) / targets.length
    const avgL2 = targets.reduce((sum, t) => sum + t.l2_threshold, 0) / targets.length
    const avgL3 = targets.reduce((sum, t) => sum + t.l3_threshold, 0) / targets.length

    const totalErrors = Object.values(validateThresholds).reduce((sum, v) => sum + v.errors.length, 0)
    const totalWarnings = Object.values(validateThresholds).reduce((sum, v) => sum + v.warnings.length, 0)

    return {
      avgTarget: Math.round(avgTarget),
      avgL1: Math.round(avgL1),
      avgL2: Math.round(avgL2),
      avgL3: Math.round(avgL3),
      totalErrors,
      totalWarnings,
      validTargets: targets.length - Object.values(validateThresholds).filter(v => !v.isValid).length
    }
  }, [targets, validateThresholds])

  const getThresholdColor = (value: number, level: 'l1' | 'l2' | 'l3') => {
    if (level === 'l1' && value < 50) return 'text-red-600'
    if (level === 'l3' && value > 85) return 'text-green-600'
    return 'text-gray-900'
  }

  const getValidationIcon = (validation: ThresholdValidation) => {
    if (!validation.isValid) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (validation.warnings.length > 0) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Gauge className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Enhanced Threshold Configuration</h2>
              <p className="text-sm text-gray-600">Configure attainment thresholds with visual feedback and validation</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`p-2 rounded-md ${showValidation ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Toggle validation"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            {isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving || (stats?.totalErrors ?? 0) > 0}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    !saving && stats?.totalErrors === 0
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
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Thresholds
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subject Selection */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Subject:</label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => handleSubjectChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a subject...</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && showValidation && selectedSubjectId && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Avg Target</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-blue-600">{stats.avgTarget}%</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Avg Thresholds</span>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div>L1: <span className="font-bold">{stats.avgL1}%</span></div>
                <div>L2: <span className="font-bold">{stats.avgL2}%</span></div>
                <div>L3: <span className="font-bold">{stats.avgL3}%</span></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Valid Targets</span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-green-600">{stats.validTargets}/{targets.length}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center">
                <AlertTriangle className={`h-5 w-5 mr-2 ${stats.totalErrors > 0 ? 'text-red-600' : stats.totalWarnings > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                <span className="text-sm font-medium text-gray-900">Issues</span>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className={stats.totalErrors > 0 ? 'text-red-600' : 'text-gray-600'}>
                  Errors: <span className="font-bold">{stats.totalErrors}</span>
                </div>
                <div className={stats.totalWarnings > 0 ? 'text-yellow-600' : 'text-gray-600'}>
                  Warnings: <span className="font-bold">{stats.totalWarnings}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Configuration */}
      {selectedSubjectId && (
        <div className="p-6">
          {coTargetsLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading threshold configurations...</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Threshold Configurations</h3>
              <p className="text-gray-600 mb-4">Configure attainment thresholds for Course Outcomes.</p>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Start Configuration
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Threshold Table */}
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
                      {showValidation && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      )}
                      {isEditing && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {targets.map((target, index) => {
                      const co = coDefinitions.find(c => c.id === target.co_id)
                      const validation = validateThresholds[index]

                      return (
                        <tr key={index} className={!validation?.isValid ? 'bg-red-50' : validation?.warnings.length > 0 ? 'bg-yellow-50' : ''}>
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
                                {co?.code || 'N/A'}
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
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  target.l1_threshold >= target.l2_threshold ? 'border-red-300' : ''
                                }`}
                              />
                            ) : (
                              <span className={`text-sm ${getThresholdColor(target.l1_threshold, 'l1')}`}>
                                {target.l1_threshold}%
                              </span>
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
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  target.l2_threshold >= target.l3_threshold || target.l2_threshold <= target.l1_threshold ? 'border-red-300' : ''
                                }`}
                              />
                            ) : (
                              <span className={`text-sm ${getThresholdColor(target.l2_threshold, 'l2')}`}>
                                {target.l2_threshold}%
                              </span>
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
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  target.l3_threshold <= target.l2_threshold ? 'border-red-300' : ''
                                }`}
                              />
                            ) : (
                              <span className={`text-sm ${getThresholdColor(target.l3_threshold, 'l3')}`}>
                                {target.l3_threshold}%
                              </span>
                            )}
                          </td>
                          {showValidation && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getValidationIcon(validation)}
                                <span className="ml-2 text-xs">
                                  {validation.errors.length > 0 && <span className="text-red-600">{validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}</span>}
                                  {validation.errors.length === 0 && validation.warnings.length > 0 && <span className="text-yellow-600">{validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}</span>}
                                  {validation.errors.length === 0 && validation.warnings.length === 0 && <span className="text-green-600">Valid</span>}
                                </span>
                              </div>
                            </td>
                          )}
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
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Validation Details */}
              {showValidation && Object.values(validateThresholds).some(v => v.errors.length > 0 || v.warnings.length > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <h4 className="text-sm font-medium text-yellow-900">Validation Issues</h4>
                  </div>
                  <div className="space-y-2">
                    {targets.map((target, index) => {
                      const co = coDefinitions.find(c => c.id === target.co_id)
                      const validation = validateThresholds[index]
                      const issues = [...validation.errors, ...validation.warnings]

                      return issues.length > 0 ? (
                        <div key={index} className="text-xs">
                          <span className="font-medium text-gray-900">{co?.code}:</span>
                          <ul className="ml-4 mt-1 space-y-1">
                            {issues.map((issue, i) => (
                              <li key={i} className={validation.errors.includes(issue) ? 'text-red-700' : 'text-yellow-700'}>
                                • {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* Add Target Button */}
              {isEditing && (
                <div className="flex justify-center">
                  <button
                    onClick={handleAddTarget}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Add Threshold Configuration
                  </button>
                </div>
              )}

              {/* Level Explanation */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Info className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="text-sm font-medium text-gray-900">Attainment Level Thresholds</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">L1 (Basic):</span> Students demonstrate basic understanding and knowledge (typically 50-65%)
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">L2 (Intermediate):</span> Students can apply knowledge to solve problems (typically 65-75%)
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">L3 (Advanced):</span> Students can analyze, evaluate, and create solutions (typically 75-85%)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EnhancedThresholdConfiguration