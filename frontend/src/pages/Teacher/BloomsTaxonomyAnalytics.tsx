import React, { useState, useEffect } from 'react'
import { Brain, BarChart3, PieChart, TrendingUp, Download, BookOpen } from 'lucide-react'
import { analyticsAPI, subjectAPI, examAPI } from '../../services/api'
import { BloomsTaxonomyAnalysis } from '../../core/types'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

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
  const [downloading, setDownloading] = useState(false)

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
      const data = await analyticsAPI.getBloomsTaxonomyAnalysis(
        selectedSubject || undefined,
        undefined,
        undefined,
        selectedExam || undefined
      )
      setAnalysisData(data)
    } catch (error) {
      console.error('Failed to load Bloom\'s analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDFReport = async () => {
    if (!analysisData) return

    setDownloading(true)
    try {
      const doc = new jsPDF()

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Bloom\'s Taxonomy Analytics Report', 105, 20, { align: 'center' })

      // Subject and Exam Info
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject)
      const selectedExamData = exams.find(e => e.id === selectedExam)
      doc.text(`Subject: ${selectedSubjectData?.name || 'N/A'} (${selectedSubjectData?.code || 'N/A'})`, 20, 40)
      if (selectedExamData) {
        doc.text(`Exam: ${selectedExamData.name} (${selectedExamData.exam_type})`, 20, 50)
      }
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60)

      // Summary
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, 80)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Questions: ${analysisData.total_questions}`, 20, 95)
      doc.text(`Total Marks: ${analysisData.total_marks}`, 20, 105)
      doc.text(`Balanced Levels: ${BLOOM_LEVELS.filter(level => getLevelData(level.id)?.is_balanced).length}/6`, 20, 115)

      // Level Distribution Table
      let yPos = 130
      const colWidths = [40, 20, 20, 25, 25]
      const headers = ['Level', 'Questions', 'Marks', '%', 'Recommended']

      // Header
      doc.setFillColor(41, 128, 185)
      doc.rect(20, yPos, 140, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      let xPos = 25
      headers.forEach((header, idx) => {
        doc.text(header, xPos, yPos + 7)
        xPos += colWidths[idx]
      })

      // Data rows
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      yPos += 10
      BLOOM_LEVELS.forEach((level, idx) => {
        const levelData = getLevelData(level.id)
        if (!levelData) return

        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(20, yPos, 140, 8, 'F')
        }
        xPos = 25
        const rowData = [
          level.name,
          levelData.questions_count,
          levelData.marks_allocated,
          `${levelData.percentage_of_total.toFixed(1)}%`,
          `${level.recommended}%`
        ]
        rowData.forEach((cell, cellIdx) => {
          doc.text(String(cell), xPos, yPos + 6)
          xPos += colWidths[cellIdx]
        })
        yPos += 8
      })

      // Student Performance Table
      if (yPos > 250) doc.addPage()
      yPos = yPos > 250 ? 20 : yPos + 10

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Student Performance by Level', 20, yPos)
      yPos += 15

      const perfHeaders = ['Level', 'Avg %', '>60%', '>40%', 'Total']
      const perfWidths = [40, 20, 20, 20, 25]

      doc.setFillColor(52, 152, 219)
      doc.rect(20, yPos, 125, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      xPos = 25
      perfHeaders.forEach((header, idx) => {
        doc.text(header, xPos, yPos + 7)
        xPos += perfWidths[idx]
      })

      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      yPos += 10

      Object.entries(analysisData.student_performance_by_level).forEach(([key, performance]: [string, any], idx) => {
        const level = BLOOM_LEVELS.find(l => l.id === key)
        if (!level) return

        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(20, yPos, 125, 8, 'F')
        }
        xPos = 25
        const rowData = [
          level.name,
          `${performance.avg_marks_percentage.toFixed(1)}%`,
          performance.students_above_60,
          performance.students_above_40,
          performance.total_students
        ]
        rowData.forEach((cell, cellIdx) => {
          doc.text(String(cell), xPos, yPos + 6)
          xPos += perfWidths[cellIdx]
        })
        yPos += 8
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Generated by DSABA LMS - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' })
      }

      const fileName = `Blooms_Taxonomy_Report_${selectedSubjectData?.code || 'Subject'}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const downloadExcelReport = async () => {
    if (!analysisData) return

    setDownloading(true)
    try {
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject)
      const selectedExamData = exams.find(e => e.id === selectedExam)

      // Level Distribution Sheet
      const levelData = BLOOM_LEVELS.map(level => {
        const levelData = getLevelData(level.id)
        return levelData ? {
          'Cognitive Level': level.name,
          'Questions': levelData.questions_count,
          'Marks': levelData.marks_allocated,
          'Percentage': `${levelData.percentage_of_total.toFixed(1)}%`,
          'Recommended': `${level.recommended}%`,
          'Balanced': levelData.is_balanced ? 'Yes' : 'No'
        } : null
      }).filter(Boolean)

      // Student Performance Sheet
      const performanceData = Object.entries(analysisData.student_performance_by_level).map(([key, performance]: [string, any]) => {
        const level = BLOOM_LEVELS.find(l => l.id === key)
        return level ? {
          'Cognitive Level': level.name,
          'Average Marks %': performance.avg_marks_percentage.toFixed(1),
          'Students >60%': performance.students_above_60,
          'Students >40%': performance.students_above_40,
          'Total Students': performance.total_students,
          'Pass Rate %': ((performance.students_above_40 / performance.total_students) * 100).toFixed(1)
        } : null
      }).filter(Boolean)

      // Summary Sheet
      const summaryData = [{
        'Metric': 'Total Questions',
        'Value': analysisData.total_questions
      }, {
        'Metric': 'Total Marks',
        'Value': analysisData.total_marks
      }, {
        'Metric': 'Balanced Levels',
        'Value': `${BLOOM_LEVELS.filter(level => getLevelData(level.id)?.is_balanced).length}/6`
      }, {
        'Metric': 'Subject',
        'Value': `${selectedSubjectData?.name || 'N/A'} (${selectedSubjectData?.code || 'N/A'})`
      }, {
        'Metric': 'Exam',
        'Value': selectedExamData ? `${selectedExamData.name} (${selectedExamData.exam_type})` : 'All Exams'
      }, {
        'Metric': 'Generated On',
        'Value': new Date().toLocaleDateString()
      }]

      const workbook = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'Summary')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(levelData), 'Level Distribution')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(performanceData), 'Student Performance')

      const fileName = `Blooms_Taxonomy_Report_${selectedSubjectData?.code || 'Subject'}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Failed to generate Excel:', error)
      alert('Failed to generate Excel report. Please try again.')
    } finally {
      setDownloading(false)
    }
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
          <div className="flex gap-2">
            <button
              onClick={downloadPDFReport}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              <Download className={`h-5 w-5 ${downloading ? 'animate-pulse' : ''}`} />
              PDF Report
            </button>
            <button
              onClick={downloadExcelReport}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
            >
              <Download className={`h-5 w-5 ${downloading ? 'animate-pulse' : ''}`} />
              Excel Report
            </button>
          </div>
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

