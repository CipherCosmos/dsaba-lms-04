import React, { useState, useEffect } from 'react'
import { Brain, BarChart3, PieChart, TrendingUp, Download, BookOpen } from 'lucide-react'
import { enhancedAnalyticsAPI, subjectAPI, examAPI } from '../../services/api'
import { BloomsTaxonomyAnalysis } from '../../core/types'

const BLOOM_LEVELS = [
  { id: 'L1_Remember', name: 'L1: Remember', color: 'bg-red-500', recommended: 10 },
  { id: 'L2_Understand', name: 'L2: Understand', color: 'bg-orange-500', recommended: 20 },
  { id: 'L3_Apply', name: 'L3: Apply', color: 'bg-yellow-500', recommended: 30 },
  { id: 'L4_Analyze', name: 'L4: Analyze', color: 'bg-green-500', recommended: 20 },
  { id: 'L5_Evaluate', name: 'L5: Evaluate', color: 'bg-blue-500', recommended: 15 },
  { id: 'L6_Create', name: 'L6: Create', color: 'bg-purple-500', recommended: 5 },
]

export default function BloomsTaxonomyAnalytics() {
  const [analysisData, setAnalysisData] = useState<BloomsTaxonomyAnalysis | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [selectedExam, setSelectedExam] = useState<number | null>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSubjects()
  }, [])

  useEffect(() => {
    if (selectedSubject) {
      loadExams()
    }
  }, [selectedSubject])

  useEffect(() => {
    if (selectedSubject) {
      loadAnalysis()
    }
  }, [selectedSubject, selectedExam])

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll(0, 100, { is_active: true })
      setSubjects(response.items || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    }
  }

  const loadExams = async () => {
    if (!selectedSubject) return
    try {
      const response = await examAPI.getAll(0, 100, { subject_assignment_id: selectedSubject })
      setExams(response.items || [])
    } catch (error) {
      console.error('Failed to load exams:', error)
    }
  }

  const loadAnalysis = async () => {
    if (!selectedSubject) return
    
    setLoading(true)
    try {
      const data = await enhancedAnalyticsAPI.getBloomsTaxonomyAnalysis({
        subject_id: selectedSubject,
        exam_id: selectedExam || undefined
      })
      setAnalysisData(data)
    } catch (error) {
      console.error('Failed to load Bloom\'s analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    alert('Report download will be implemented')
  }

  const getLevelData = (levelKey: string) => {
    if (!analysisData) return null
    return (analysisData.level_distribution as any)[levelKey]
  }

  const getBalanceColor = (isBalanced: boolean) => {
    return isBalanced ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="h-8 w-8 text-indigo-600" />
            Bloom's Taxonomy Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Analyze question distribution and student performance across cognitive levels
          </p>
        </div>
        {analysisData && (
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            Download Report
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject
            </label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose subject...</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Exam (Optional)
            </label>
            <select
              value={selectedExam || ''}
              onChange={(e) => setSelectedExam(e.target.value ? Number(e.target.value) : null)}
              disabled={!selectedSubject}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.exam_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Brain className="h-16 w-16 animate-pulse text-indigo-600" />
        </div>
      ) : analysisData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Total Questions</div>
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{analysisData.total_questions}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Total Marks</div>
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{analysisData.total_marks}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Balanced Levels</div>
                <PieChart className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {BLOOM_LEVELS.filter(level => getLevelData(level.id)?.is_balanced).length}/6
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Overall Balance</div>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {((BLOOM_LEVELS.filter(level => getLevelData(level.id)?.is_balanced).length / 6) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Bloom's Level Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Cognitive Level Distribution</h2>
            <div className="space-y-6">
              {BLOOM_LEVELS.map((level) => {
                const levelData = getLevelData(level.id)
                if (!levelData) return null

                return (
                  <div key={level.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${level.color}`} />
                        <span className="font-medium text-gray-900">{level.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Questions</div>
                          <div className="font-semibold">{levelData.questions_count}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Marks</div>
                          <div className="font-semibold">{levelData.marks_allocated}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Percentage</div>
                          <div className={`font-bold ${getBalanceColor(levelData.is_balanced)}`}>
                            {levelData.percentage_of_total.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Recommended</div>
                          <div className="font-semibold text-gray-700">{level.recommended}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className={`h-full ${level.color} transition-all duration-500 flex items-center justify-center text-white text-sm font-medium`}
                          style={{ width: `${levelData.percentage_of_total}%` }}
                        >
                          {levelData.percentage_of_total > 5 && `${levelData.percentage_of_total.toFixed(1)}%`}
                        </div>
                      </div>
                      {/* Recommended indicator */}
                      <div
                        className="absolute top-0 h-8 border-r-2 border-dashed border-gray-400"
                        style={{ left: `${level.recommended}%` }}
                        title={`Recommended: ${level.recommended}%`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Student Performance by Level */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Student Performance by Cognitive Level</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cognitive Level</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Avg Marks %</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Students Above 60%</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Students Above 40%</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total Students</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(analysisData.student_performance_by_level).map(([key, performance]: [string, any]) => {
                    const level = BLOOM_LEVELS.find(l => l.id === key)
                    if (!level) return null

                    const passRate = (performance.students_above_40 / performance.total_students) * 100

                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${level.color}`} />
                            <span className="font-medium text-gray-900">{level.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-gray-900">{performance.avg_marks_percentage.toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-900">{performance.students_above_60}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-900">{performance.students_above_40}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-900">{performance.total_students}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className={`h-full ${passRate >= 70 ? 'bg-green-500' : passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${passRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{passRate.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              Recommendations
            </h2>
            <div className="space-y-2 text-sm text-gray-700">
              {BLOOM_LEVELS.map(level => {
                const levelData = getLevelData(level.id)
                if (!levelData || levelData.is_balanced) return null

                const diff = levelData.percentage_of_total - level.recommended
                return (
                  <div key={level.id} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${level.color}`} />
                    <p>
                      <strong>{level.name}:</strong>{' '}
                      {diff > 0 ? (
                        `Reduce by ${Math.abs(diff).toFixed(1)}% (currently ${levelData.percentage_of_total.toFixed(1)}%, recommended ${level.recommended}%)`
                      ) : (
                        `Increase by ${Math.abs(diff).toFixed(1)}% (currently ${levelData.percentage_of_total.toFixed(1)}%, recommended ${level.recommended}%)`
                      )}
                    </p>
                  </div>
                )
              })}
              {BLOOM_LEVELS.every(level => getLevelData(level.id)?.is_balanced) && (
                <div className="flex items-center gap-2 text-green-700">
                  <TrendingUp className="h-5 w-5" />
                  <p className="font-medium">Excellent! Your question distribution is well-balanced across all Bloom's Taxonomy levels.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : selectedSubject ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No analysis data available for the selected subject</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please select a subject to view Bloom's Taxonomy analysis</p>
        </div>
      )}
    </div>
  )
}

