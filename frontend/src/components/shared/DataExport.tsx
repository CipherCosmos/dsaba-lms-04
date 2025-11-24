import React from 'react'
import { Download } from 'lucide-react'

export interface ExportData {
  headers: string[]
  rows: (string | number)[][]
}

export interface DataExportProps {
  data: ExportData
  filename: string
  buttonText?: string
  className?: string
  disabled?: boolean
}

const DataExport: React.FC<DataExportProps> = ({
  data,
  filename,
  buttonText = 'Export Report',
  className = '',
  disabled = false
}) => {
  const handleExport = () => {
    if (disabled || !data.rows.length) return

    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data.rows.length}
      className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download className="h-4 w-4 mr-2" />
      {buttonText}
    </button>
  )
}

export default DataExport