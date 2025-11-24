import React, { useState, useEffect } from 'react'
import { TrendingUp, Award, BookOpen, Star, BarChart3, Download } from 'lucide-react'
import { smartMarksAPI } from '../../services/api'
import { SGPACalculation, CGPACalculation } from '../../core/types'
import { useAuth } from '../../contexts/AuthContext'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
// @ts-ignore
import autoTable from 'jspdf-autotable'

/**
 * SGPA/CGPA Display Page Component
 *
 * This component displays a student's SGPA (Semester Grade Point Average) and CGPA (Cumulative Grade Point Average).
 *
 * CGPA Data Structure (from smartMarksAPI.calculateCGPA):
 * - cgpa: number - The overall cumulative GPA
 * - total_credits: number - Total credits earned across all semesters
 * - semesters_count: number - Number of semesters completed
 * - semesters: Array<{ semester_id: number; semester_name: string; sgpa: number; credits: number }> - Details for each semester
 *
 * SGPA Data Structure (from smartMarksAPI.calculateSGPA, per semester):
 * - semester_id: number - The semester's unique ID
 * - sgpa: number - The semester GPA
 * - subjects_count: number - Number of subjects in the semester
 * - subjects: Array<{ subject_id: number; subject_code: string; subject_name: string; credits: number; grade: string; grade_point: number }> - Subject details
 */
export default function SGPACGPADisplayPage() {
   const { user } = useAuth()
   const [cgpaData, setCgpaData] = useState<CGPACalculation | null>(null)
   const [sgpaData, setSgpaData] = useState<SGPACalculation[]>([])
   const [selectedSemester, setSelectedSemester] = useState<number | null>(null)
   const [loading, setLoading] = useState(true)
   const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (user?.student_id) {
      loadCGPA()
    }
  }, [user])

  const loadCGPA = async () => {
    if (!user?.student_id) return
    
    setLoading(true)
    try {
      const cgpa = await smartMarksAPI.calculateCGPA(user.student_id)
      setCgpaData(cgpa)
      
      // Load SGPA for each semester
      const sgpaPromises = cgpa.semesters.map((sem: { semester_id: number; semester_name: string; sgpa: number; credits: number }) =>
        smartMarksAPI.calculateSGPA(user.student_id!, sem.semester_id)
      )
      const sgpaResults = await Promise.all(sgpaPromises)
      setSgpaData(sgpaResults)
    } catch (error) {
      console.error('Failed to load GPA data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGPAColor = (gpa: number) => {
    if (gpa >= 9.0) return 'text-green-600'
    if (gpa >= 8.0) return 'text-blue-600'
    if (gpa >= 7.0) return 'text-yellow-600'
    if (gpa >= 6.0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPerformanceLabel = (gpa: number) => {
    if (gpa >= 9.5) return 'Outstanding'
    if (gpa >= 9.0) return 'Excellent'
    if (gpa >= 8.0) return 'Very Good'
    if (gpa >= 7.0) return 'Good'
    if (gpa >= 6.0) return 'Satisfactory'
    return 'Needs Improvement'
  }

  const downloadReport = async () => {
    if (!cgpaData || !user) return

    setDownloading(true)
    try {
      const doc = new jsPDF()

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('SGPA/CGPA Report', 105, 20, { align: 'center' })

      // Student Info
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Student ID: ${user.student_id}`, 20, 40)
      doc.text(`Name: ${user.name || 'N/A'}`, 20, 50)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60)

      // CGPA Summary
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('CGPA Summary', 20, 80)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Overall CGPA: ${cgpaData.cgpa.toFixed(2)}`, 20, 95)
      doc.text(`Total Credits: ${cgpaData.total_credits}`, 20, 105)
      doc.text(`Semesters Completed: ${cgpaData.semesters_count}`, 20, 115)
      doc.text(`Performance: ${getPerformanceLabel(cgpaData.cgpa)}`, 20, 125)

      // Semester-wise SGPA Table
      let yPos = 140
      const colWidths = [60, 25, 25, 45]
      const headers = ['Semester', 'SGPA', 'Credits', 'Performance']

      // Header
      doc.setFillColor(41, 128, 185)
      doc.rect(20, yPos, 155, 10, 'F')
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
      cgpaData.semesters.forEach((sem: { semester_id: number; semester_name: string; sgpa: number; credits: number }, idx: number) => {
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245)
          doc.rect(20, yPos, 155, 8, 'F')
        }
        xPos = 25
        const rowData = [
          sem.semester_name,
          sem.sgpa.toFixed(2),
          sem.credits,
          getPerformanceLabel(sem.sgpa)
        ]
        rowData.forEach((cell, cellIdx) => {
          doc.text(String(cell), xPos, yPos + 6)
          xPos += colWidths[cellIdx]
        })
        yPos += 8
      })

      // Subject-wise details if semester selected
      if (selectedSemester) {
        const selectedSgpa = sgpaData.find(s => s.semester_id === selectedSemester)
        const selectedSemesterData = cgpaData.semesters.find(s => s.semester_id === selectedSemester)
        if (selectedSgpa && selectedSemesterData) {
          const subjectData = selectedSgpa.subjects.map((subject: any) => [
            subject.subject_code,
            subject.subject_name,
            subject.credits,
            subject.grade,
            subject.grade_point
          ])

          doc.addPage()
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.text(`Subject Details - ${selectedSemesterData.semester_name}`, 20, 20)

          // Manual table drawing
          let yPos = 35
          const colWidths = [30, 70, 20, 20, 25]
          const headers = ['Code', 'Subject', 'Credits', 'Grade', 'Grade Point']

          // Header
          doc.setFillColor(52, 152, 219)
          doc.rect(20, yPos, 165, 10, 'F')
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
          subjectData.forEach((row: any[], rowIdx: number) => {
            if (rowIdx % 2 === 0) {
              doc.setFillColor(245, 245, 245)
              doc.rect(20, yPos, 165, 8, 'F')
            }
            xPos = 25
            row.forEach((cell, cellIdx) => {
              doc.text(String(cell), xPos, yPos + 6)
              xPos += colWidths[cellIdx]
            })
            yPos += 8
          })
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Generated by DSABA LMS - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' })
      }

      // Save the PDF
      const fileName = `SGPA_CGPA_Report_${user.student_id}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 animate-pulse text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your performance data...</p>
        </div>
      </div>
    )
  }

  if (!cgpaData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No GPA data available</p>
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
            <TrendingUp className="h-8 w-8 text-indigo-600" />
            SGPA & CGPA Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Your academic performance overview</p>
        </div>
        <button
          onClick={downloadReport}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          <Download className={`h-5 w-5 ${downloading ? 'animate-pulse' : ''}`} />
          {downloading ? 'Generating...' : 'Download Report'}
        </button>
      </div>

      {/* CGPA Card */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-8 w-8" />
              <h2 className="text-2xl font-bold">Cumulative GPA</h2>
            </div>
            <p className="text-indigo-100 text-sm">Overall academic performance</p>
          </div>
          <div className="text-right">
            <div className="text-6xl font-bold mb-2">{cgpaData.cgpa.toFixed(2)}</div>
            <div className="text-xl font-semibold bg-white/20 px-4 py-1 rounded-full">
              {getPerformanceLabel(cgpaData.cgpa)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <div className="text-indigo-100 text-sm">Total Credits</div>
            <div className="text-2xl font-bold">{cgpaData.total_credits}</div>
          </div>
          <div>
            <div className="text-indigo-100 text-sm">Semesters</div>
            <div className="text-2xl font-bold">{cgpaData.semesters_count}</div>
          </div>
          <div>
            <div className="text-indigo-100 text-sm">Current Rank</div>
            <div className="text-2xl font-bold">-</div>
          </div>
        </div>
      </div>

      {/* Semester-wise SGPA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cgpaData.semesters.map((semester: any, idx: number) => {
          const sgpa = sgpaData.find(s => s.semester_id === semester.semester_id)
          return (
            <div key={semester.semester_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {semester.semester_name}
                </h3>
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div className={`text-4xl font-bold mb-2 ${getGPAColor(semester.sgpa)}`}>
                {semester.sgpa.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {getPerformanceLabel(semester.sgpa)}
              </div>
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Credits</span>
                  <span className="font-medium">{semester.credits}</span>
                </div>
                {sgpa && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subjects</span>
                    <span className="font-medium">{sgpa.subjects_count}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed Subject Performance */}
      {selectedSemester && sgpaData.find(s => s.semester_id === selectedSemester) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Subject-wise Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Subject Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Subject Name</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Credits</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Grade</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Grade Point</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sgpaData.find(s => s.semester_id === selectedSemester)?.subjects.map((subject: any) => (
                  <tr key={subject.subject_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.subject_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{subject.subject_name}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{subject.credits}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        subject.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                        subject.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                        subject.grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {subject.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">{subject.grade_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Trend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          Performance Trend
        </h2>
        <div className="h-64 flex items-end justify-around gap-4">
          {cgpaData.semesters.map((semester: any, idx: number) => {
            const height = (semester.sgpa / 10) * 100
            return (
              <div key={semester.semester_id} className="flex-1 flex flex-col items-center">
                <div className="text-sm font-semibold mb-2 text-gray-700">{semester.sgpa.toFixed(2)}</div>
                <div
                  className={`w-full rounded-t-lg transition-all hover:opacity-80 ${
                    semester.sgpa >= 9 ? 'bg-green-500' :
                    semester.sgpa >= 8 ? 'bg-blue-500' :
                    semester.sgpa >= 7 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <div className="text-xs mt-2 text-gray-600 text-center">
                  Sem {idx + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="font-semibold text-green-900">Strengths</h3>
          </div>
          <p className="text-sm text-green-700">
            Consistent performance across semesters. Strong academic foundation.
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-6 w-6 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Achievements</h3>
          </div>
          <p className="text-sm text-blue-700">
            Maintained {cgpaData.cgpa >= 9 ? 'excellent' : cgpaData.cgpa >= 8 ? 'very good' : 'good'} CGPA throughout the program.
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-6 w-6 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Goals</h3>
          </div>
          <p className="text-sm text-yellow-700">
            {cgpaData.cgpa < 9 ? 'Aim for 9+ CGPA in upcoming semesters' : 'Maintain excellence in remaining semesters'}
          </p>
        </div>
      </div>
    </div>
  )
}

