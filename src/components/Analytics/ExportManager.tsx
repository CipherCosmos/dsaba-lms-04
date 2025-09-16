import React, { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File, Loader } from 'lucide-react'

interface ExportManagerProps {
  data: any
  filename: string
  exportFormat: 'pdf' | 'excel' | 'csv'
  onExport: (format: 'pdf' | 'excel' | 'csv') => void
  loading?: boolean
}

const ExportManager: React.FC<ExportManagerProps> = ({
  data,
  filename,
  exportFormat,
  onExport,
  loading = false
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true)
    try {
      await onExport(format)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = () => {
    if (!data) return

    // Prepare data for Excel export
    const excelData = prepareExcelData(data)
    
    // Convert to CSV format
    const csvContent = excelData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    if (!data) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = generatePDFContent(data, filename)
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  const prepareExcelData = (data: any) => {
    const rows = []
    
    // Header
    rows.push(['Advanced Attainment Analytics Report'])
    rows.push(['Generated on:', new Date().toLocaleDateString()])
    rows.push([''])
    
    if (data.summary) {
      rows.push(['Summary'])
      rows.push(['Total Students:', data.summary.total_students_analyzed])
      rows.push(['Total Exams:', data.summary.total_exams_analyzed])
      rows.push(['Average Class Attainment:', `${data.summary.average_class_attainment}%`])
      rows.push(['Performance Level:', data.summary.class_performance_level])
      rows.push([''])
    }

    if (data.class_comparison) {
      const classStats = data.class_comparison.class_statistics
      rows.push(['Class Statistics'])
      rows.push(['Total Students:', classStats.total_students])
      rows.push(['Average Attainment:', `${classStats.average_attainment}%`])
      rows.push(['Median Attainment:', `${classStats.median_attainment}%`])
      rows.push(['Standard Deviation:', `${classStats.std_deviation}%`])
      rows.push(['Min Attainment:', `${classStats.min_attainment}%`])
      rows.push(['Max Attainment:', `${classStats.max_attainment}%`])
      rows.push(['Passing Rate:', `${classStats.passing_rate}%`])
      rows.push(['Excellent Rate:', `${classStats.excellent_rate}%`])
      rows.push([''])
    }

    if (data.class_comparison?.grade_distribution) {
      const gradeDist = data.class_comparison.grade_distribution
      rows.push(['Grade Distribution'])
      rows.push(['Grade A:', gradeDist.A_grade])
      rows.push(['Grade B:', gradeDist.B_grade])
      rows.push(['Grade C:', gradeDist.C_grade])
      rows.push(['Grade D:', gradeDist.D_grade])
      rows.push(['Grade F:', gradeDist.F_grade])
      rows.push([''])
    }

    if (data.student_analytics) {
      rows.push(['Student Details'])
      rows.push(['Student Name', 'Username', 'Overall Attainment', 'Target Attainment', 'Gap', 'Grade', 'Exams Attempted', 'Total Exams'])
      
      Object.values(data.student_analytics).forEach((student: any) => {
        const grade = getGradeFromPercentage(student.overall_attainment)
        rows.push([
          student.student_name,
          student.student_username,
          `${student.overall_attainment}%`,
          `${student.target_attainment}%`,
          `${student.gap}%`,
          grade,
          student.exams_attempted,
          student.total_exams
        ])
      })
      rows.push([''])
    }

    if (data.exam_comparison?.exam_trends) {
      rows.push(['Exam Trends'])
      rows.push(['Exam Name', 'Exam Type', 'Average Percentage', 'Passing Rate', 'Students Attempted', 'Date'])
      
      data.exam_comparison.exam_trends.forEach((exam: any) => {
        rows.push([
          exam.exam_name,
          exam.exam_type,
          `${exam.average_percentage}%`,
          `${exam.passing_rate}%`,
          exam.students_attempted,
          exam.created_at ? new Date(exam.created_at).toLocaleDateString() : 'N/A'
        ])
      })
    }

    return rows
  }

  const generatePDFContent = (data: any, filename: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Advanced Attainment Analytics - ${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
          .metric-label { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .insights { background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3; }
          .recommendations { background: #f3e5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #9c27b0; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Advanced Attainment Analytics Report</h1>
          <h2>${filename}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>

        ${data.summary ? `
          <div class="section">
            <h2>Summary</h2>
            <div class="metrics">
              <div class="metric">
                <div class="metric-value">${data.summary.total_students_analyzed}</div>
                <div class="metric-label">Total Students</div>
              </div>
              <div class="metric">
                <div class="metric-value">${data.summary.total_exams_analyzed}</div>
                <div class="metric-label">Total Exams</div>
              </div>
              <div class="metric">
                <div class="metric-value">${data.summary.average_class_attainment}%</div>
                <div class="metric-label">Avg Attainment</div>
              </div>
              <div class="metric">
                <div class="metric-value">${data.summary.class_performance_level.replace('_', ' ')}</div>
                <div class="metric-label">Performance Level</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${data.class_comparison ? `
          <div class="section">
            <h2>Class Statistics</h2>
            <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Total Students</td><td>${data.class_comparison.class_statistics.total_students}</td></tr>
              <tr><td>Average Attainment</td><td>${data.class_comparison.class_statistics.average_attainment}%</td></tr>
              <tr><td>Median Attainment</td><td>${data.class_comparison.class_statistics.median_attainment}%</td></tr>
              <tr><td>Standard Deviation</td><td>${data.class_comparison.class_statistics.std_deviation}%</td></tr>
              <tr><td>Passing Rate</td><td>${data.class_comparison.class_statistics.passing_rate}%</td></tr>
              <tr><td>Excellent Rate</td><td>${data.class_comparison.class_statistics.excellent_rate}%</td></tr>
            </table>
          </div>
        ` : ''}

        ${data.insights && data.insights.length > 0 ? `
          <div class="section">
            <h2>Key Insights</h2>
            <div class="insights">
              <ul>
                ${data.insights.map((insight: string) => `<li>${insight}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}

        ${data.recommendations && data.recommendations.length > 0 ? `
          <div class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">
              <ul>
                ${data.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>This report was generated by the Internal Exam Management System</p>
        </div>
      </body>
      </html>
    `
  }

  const getGradeFromPercentage = (percentage: number) => {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        value={exportFormat}
        onChange={(e) => onExport(e.target.value as 'pdf' | 'excel' | 'csv')}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading || isExporting}
      >
        <option value="excel">Excel/CSV</option>
        <option value="pdf">PDF</option>
      </select>
      
      <button
        onClick={() => {
          if (exportFormat === 'excel' || exportFormat === 'csv') {
            exportToExcel()
          } else if (exportFormat === 'pdf') {
            exportToPDF()
          }
        }}
        disabled={loading || isExporting || !data}
        className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
      </button>
    </div>
  )
}

export default ExportManager
