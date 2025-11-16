import React, { useState, useEffect } from 'react'
import { Target, TrendingUp, CheckCircle, XCircle, BarChart3, Download, AlertCircle } from 'lucide-react'
import { coPOAttainmentAPI, departmentAPI, academicYearAPI } from '../../services/api'
import { COPOAttainmentSummary, COAttainment, POAttainment } from '../../core/types'
import { useAuth } from '../../contexts/AuthContext'

export default function COPOAttainmentDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<COPOAttainmentSummary | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'co' | 'po' | 'nba'>('co')

  useEffect(() => {
    loadDepartments()
    loadAcademicYears()
  }, [])

  useEffect(() => {
    if (selectedDepartment && selectedAcademicYear) {
      loadAttainmentData()
    }
  }, [selectedDepartment, selectedAcademicYear])

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAll(0, 100, { is_active: true })
      setDepartments(response.items || [])
      if (user?.department_id) {
        setSelectedDepartment(user.department_id)
      }
    } catch (error) {
      console.error('Failed to load departments:', error)
    }
  }

  const loadAcademicYears = async () => {
    try {
      const response = await academicYearAPI.getAll(0, 100, { status: 'active' })
      setAcademicYears(response.items || [])
      const currentYear = response.items?.find((y: any) => y.is_current)
      if (currentYear) {
        setSelectedAcademicYear(currentYear.id)
      }
    } catch (error) {
      console.error('Failed to load academic years:', error)
    }
  }

  const loadAttainmentData = async () => {
    if (!selectedDepartment || !selectedAcademicYear) return
    
    setLoading(true)
    try {
      const data = await coPOAttainmentAPI.getAttainmentSummary(selectedDepartment, {
        academic_year_id: selectedAcademicYear,
        include_trends: true
      })
      setSummary(data)
    } catch (error) {
      console.error('Failed to load attainment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAttainmentColor = (attainment: number, target: number) => {
    if (attainment >= target) return 'text-green-600'
    if (attainment >= target * 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAttainmentBgColor = (attainment: number, target: number) => {
    if (attainment >= target) return 'bg-green-100 border-green-300'
    if (attainment >= target * 0.8) return 'bg-yellow-100 border-yellow-300'
    return 'bg-red-100 border-red-300'
  }

  const downloadNBAReport = () => {
    alert('NBA Report download will be implemented')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Target className="h-16 w-16 animate-pulse text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading attainment data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-600" />
            CO-PO Attainment Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track Course Outcome and Program Outcome attainment for NBA accreditation
          </p>
        </div>
        {summary && (
          <button
            onClick={downloadNBAReport}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            NBA Report
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={selectedDepartment || ''}
              onChange={(e) => setSelectedDepartment(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear || ''}
              onChange={(e) => setSelectedAcademicYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select year...</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {summary ? (
        <>
          {/* Overall Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium opacity-90">Overall CO Attainment</div>
                <Target className="h-6 w-6 opacity-80" />
              </div>
              <div className="text-4xl font-bold mb-2">{summary.overall_co_attainment.toFixed(1)}%</div>
              <div className="text-sm opacity-90">
                {summary.nba_compliance.cos_met} of {summary.nba_compliance.cos_total} COs met
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium opacity-90">Overall PO Attainment</div>
                <BarChart3 className="h-6 w-6 opacity-80" />
              </div>
              <div className="text-4xl font-bold mb-2">{summary.overall_po_attainment.toFixed(1)}%</div>
              <div className="text-sm opacity-90">
                {summary.nba_compliance.pos_met} of {summary.nba_compliance.pos_total} POs met
              </div>
            </div>

            <div className={`rounded-lg p-6 shadow-lg ${summary.nba_compliance.is_compliant ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium opacity-90">NBA Compliance</div>
                {summary.nba_compliance.is_compliant ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>
              <div className="text-3xl font-bold mb-2">
                {summary.nba_compliance.is_compliant ? 'COMPLIANT' : 'NOT COMPLIANT'}
              </div>
              <div className="text-sm opacity-90">
                Threshold: {summary.nba_compliance.co_attainment_threshold}% (CO) / {summary.nba_compliance.po_attainment_threshold}% (PO)
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium opacity-90">Attainment Trend</div>
                <TrendingUp className="h-6 w-6 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-2 capitalize">
                {summary.trends?.co_attainment_trend || 'Stable'}
              </div>
              <div className="text-sm opacity-90">
                CO: {summary.trends?.co_attainment_trend} | PO: {summary.trends?.po_attainment_trend}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex gap-4 px-6">
                <button
                  onClick={() => setActiveTab('co')}
                  className={`py-4 px-4 border-b-2 font-medium transition-colors ${
                    activeTab === 'co'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Course Outcomes ({summary.co_attainments.length})
                </button>
                <button
                  onClick={() => setActiveTab('po')}
                  className={`py-4 px-4 border-b-2 font-medium transition-colors ${
                    activeTab === 'po'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Program Outcomes ({summary.po_attainments.length})
                </button>
                <button
                  onClick={() => setActiveTab('nba')}
                  className={`py-4 px-4 border-b-2 font-medium transition-colors ${
                    activeTab === 'nba'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  NBA Compliance
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* CO Attainment Tab */}
              {activeTab === 'co' && (
                <div className="space-y-4">
                  {summary.co_attainments.map((co: COAttainment) => (
                    <div
                      key={co.co_id}
                      className={`border-2 rounded-lg p-6 ${getAttainmentBgColor(co.actual_attainment, co.target_attainment)}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg text-gray-900">{co.co_code}</span>
                            {co.attainment_met ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{co.co_description}</p>
                          <div className="text-xs text-gray-600 mt-1">
                            Subject: {co.subject_name} | Students Analyzed: {co.students_analyzed}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${getAttainmentColor(co.actual_attainment, co.target_attainment)}`}>
                            {co.actual_attainment.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Target: {co.target_attainment}%
                          </div>
                        </div>
                      </div>

                      {/* Level Distribution */}
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-300">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">L1 (Remember)</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${co.level_distribution.L1.attainment_met ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${co.level_distribution.L1.attainment_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{co.level_distribution.L1.attainment_percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">L2 (Understand)</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${co.level_distribution.L2.attainment_met ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${co.level_distribution.L2.attainment_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{co.level_distribution.L2.attainment_percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">L3 (Apply)</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${co.level_distribution.L3.attainment_met ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${co.level_distribution.L3.attainment_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{co.level_distribution.L3.attainment_percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PO Attainment Tab */}
              {activeTab === 'po' && (
                <div className="space-y-4">
                  {summary.po_attainments.map((po: POAttainment) => (
                    <div
                      key={po.po_id}
                      className={`border-2 rounded-lg p-6 ${getAttainmentBgColor(po.actual_attainment, po.target_attainment)}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg text-gray-900">{po.po_code}</span>
                            {po.attainment_met ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{po.po_description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${getAttainmentColor(po.actual_attainment, po.target_attainment)}`}>
                            {po.actual_attainment.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Target: {po.target_attainment}%
                          </div>
                        </div>
                      </div>

                      {/* Contributing COs */}
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="text-sm font-medium text-gray-700 mb-2">Contributing Course Outcomes</div>
                        <div className="space-y-2">
                          {po.contributing_cos.slice(0, 5).map((co: any) => (
                            <div key={co.co_id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {co.co_code} ({co.subject_name})
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Strength: {co.mapping_strength}</span>
                                <span className="font-medium text-gray-900">{co.co_attainment.toFixed(1)}%</span>
                              </div>
                            </div>
                          ))}
                          {po.contributing_cos.length > 5 && (
                            <div className="text-xs text-gray-500 text-center pt-2">
                              +{po.contributing_cos.length - 5} more COs contributing
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NBA Compliance Tab */}
              {activeTab === 'nba' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">Course Outcomes Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total COs</span>
                          <span className="font-bold text-blue-900">{summary.nba_compliance.cos_total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">COs Met</span>
                          <span className="font-bold text-green-900">{summary.nba_compliance.cos_met}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">COs Not Met</span>
                          <span className="font-bold text-red-900">{summary.nba_compliance.cos_total - summary.nba_compliance.cos_met}</span>
                        </div>
                        <div className="pt-3 border-t border-blue-300">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Threshold</span>
                            <span className="font-bold text-blue-900">{summary.nba_compliance.co_attainment_threshold}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg border-2 border-purple-200 p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4">Program Outcomes Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-purple-700">Total POs</span>
                          <span className="font-bold text-purple-900">{summary.nba_compliance.pos_total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">POs Met</span>
                          <span className="font-bold text-green-900">{summary.nba_compliance.pos_met}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">POs Not Met</span>
                          <span className="font-bold text-red-900">{summary.nba_compliance.pos_total - summary.nba_compliance.pos_met}</span>
                        </div>
                        <div className="pt-3 border-t border-purple-300">
                          <div className="flex justify-between">
                            <span className="text-purple-700">Threshold</span>
                            <span className="font-bold text-purple-900">{summary.nba_compliance.po_attainment_threshold}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg border-2 p-6 ${summary.nba_compliance.is_compliant ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      {summary.nba_compliance.is_compliant ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      )}
                      <h3 className="text-xl font-bold text-gray-900">
                        {summary.nba_compliance.is_compliant ? 'NBA Accreditation Requirements Met' : 'NBA Accreditation Requirements Not Met'}
                      </h3>
                    </div>
                    <p className={`text-sm ${summary.nba_compliance.is_compliant ? 'text-green-700' : 'text-red-700'}`}>
                      {summary.nba_compliance.is_compliant
                        ? 'Your department meets all NBA accreditation requirements for CO-PO attainment. Excellent work!'
                        : 'Some CO-PO attainment targets are not met. Please review and implement improvement actions.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please select department and academic year to view attainment data</p>
        </div>
      )}
    </div>
  )
}

