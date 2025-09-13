import React, { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import {
  fetchSubjectAttainment,
  setSelectedSubject
} from '../../store/slices/copoSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'

const AttainmentAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { user } = useSelector((state: RootState) => state.auth)
  const { 
    subjectAttainment,
    subjectAttainmentLoading, 
    subjectAttainmentError,
    selectedSubjectId 
  } = useSelector((state: RootState) => state.copo)

  const [examType, setExamType] = useState<string>('')

  // Filter subjects to only show the ones the teacher owns
  const teacherSubjects = useMemo(() => 
    subjects.filter(subject => subject.teacher_id === user?.id),
    [subjects, user?.id]
  )

  useEffect(() => {
    dispatch(fetchSubjects())
  }, [dispatch])

  useEffect(() => {
    if (selectedSubjectId) {
      // Check if the selected subject is owned by the teacher
      const isOwnedByTeacher = teacherSubjects.some(subject => subject.id === selectedSubjectId)
      if (!isOwnedByTeacher) {
        // Clear the selection if the teacher doesn't own this subject
        dispatch(setSelectedSubject(0))
        return
      }
      dispatch(fetchSubjectAttainment({ subjectId: selectedSubjectId, examType }))
    }
  }, [dispatch, selectedSubjectId, examType, teacherSubjects])

  const handleSubjectChange = (subjectId: number) => {
    dispatch(setSelectedSubject(subjectId))
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'L1': return 'bg-yellow-100 text-yellow-800'
      case 'L2': return 'bg-blue-100 text-blue-800'
      case 'L3': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGapColor = (gap: number) => {
    if (gap > 0) return 'text-green-600'
    if (gap < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Attainment Analytics</h1>
        <p className="text-gray-600">Analyze CO/PO attainment and performance metrics</p>
      </div>

      {/* Subject and Exam Type Selection */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Subject
          </label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => handleSubjectChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a subject...</option>
            {teacherSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exam Type (Optional)
          </label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Exams</option>
            <option value="internal1">Internal 1</option>
            <option value="internal2">Internal 2</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {subjectAttainmentError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{subjectAttainmentError}</p>
        </div>
      )}

      {/* Loading State */}
      {subjectAttainmentLoading && (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading attainment analytics...</p>
        </div>
      )}

      {/* Analytics Content */}
      {subjectAttainment && !subjectAttainmentLoading && (
        <div className="space-y-6">
          {/* Subject Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {subjectAttainment.subject_name} - Attainment Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900">CO Coverage</h3>
                <p className="text-2xl font-bold text-blue-600">{subjectAttainment.co_coverage}%</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-900">Total COs</h3>
                <p className="text-2xl font-bold text-green-600">{subjectAttainment.co_attainment.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-900">Total POs</h3>
                <p className="text-2xl font-bold text-purple-600">{subjectAttainment.po_attainment.length}</p>
              </div>
            </div>
          </div>

          {/* CO Attainment Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">CO Attainment Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CO Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coverage %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjectAttainment.co_attainment.map((co, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {co.co_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {co.target_pct}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {co.actual_pct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(co.level)}`}>
                          {co.level}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getGapColor(co.gap)}`}>
                        {co.gap > 0 ? '+' : ''}{co.gap.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {co.coverage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {co.evidence.length} questions
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PO Attainment Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">PO Attainment Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direct %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indirect %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contributing COs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjectAttainment.po_attainment.map((po, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {po.po_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.direct_pct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {po.indirect_pct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {po.total_pct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(po.level)}`}>
                          {po.level}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getGapColor(po.gap)}`}>
                        {po.gap > 0 ? '+' : ''}{po.gap.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {po.contributing_cos.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloom's Distribution */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Bloom's Taxonomy Distribution</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(subjectAttainment.blooms_distribution).map(([level, data]: [string, any]) => (
                  <div key={level} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900">{level}</h3>
                    <p className="text-2xl font-bold text-gray-600">{data.percentage}%</p>
                    <p className="text-xs text-gray-500">{data.count} questions ({data.marks} marks)</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Difficulty Mix */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Difficulty Mix</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(subjectAttainment.difficulty_mix).map(([level, data]: [string, any]) => (
                  <div key={level} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 capitalize">{level}</h3>
                    <p className="text-2xl font-bold text-gray-600">{data.percentage}%</p>
                    <p className="text-xs text-gray-500">{data.count} questions ({data.marks} marks)</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!selectedSubjectId && !subjectAttainmentLoading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {teacherSubjects.length === 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Assigned</h3>
              <p className="text-gray-500">You don't have any subjects assigned to you yet. Contact your administrator.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Subject Selected</h3>
              <p className="text-gray-500">Please select a subject to view attainment analytics.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default AttainmentAnalytics
