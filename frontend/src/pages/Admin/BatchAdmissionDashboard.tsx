import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { batchAdmissionAPI, departmentAPI, batchesAPI, academicYearAPI, batchInstanceAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Upload, Users, FileText, CheckCircle, AlertCircle, Download, Loader } from 'lucide-react'

const BatchAdmissionDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [activeTab, setActiveTab] = useState<'create' | 'upload'>('create')
  
  // Data state
  const [departments, setDepartments] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [batchInstances, setBatchInstances] = useState<any[]>([])
  const [initialLoading, setInitialLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    department_id: '',
    batch_id: '',
    academic_year_id: '',
    admission_year: new Date().getFullYear(),
    num_sections: 1
  })
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadBatchId, setUploadBatchId] = useState<string>('')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [admissionResult, setAdmissionResult] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, progRes, yearRes, batchRes] = await Promise.all([
          departmentAPI.getAll(0, 100, { is_active: true }),
          batchesAPI.getAll(0, 100, true),
          academicYearAPI.getAll(0, 100, { status: 'active' }),
          batchInstanceAPI.getAll(0, 100, { is_active: true })
        ])

        setDepartments(deptRes.items || [])
        setPrograms(progRes.items || [])
        setAcademicYears(yearRes.items || [])
        setBatchInstances(batchRes.items || [])
      } catch (error) {
        console.error('Failed to fetch form data:', error)
        toast.error('Failed to load form data. Please refresh.')
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [])
  
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const result = await batchAdmissionAPI.createBatch({
        department_id: parseInt(formData.department_id),
        batch_id: parseInt(formData.batch_id),
        academic_year_id: parseInt(formData.academic_year_id),
        admission_year: formData.admission_year,
        num_sections: formData.num_sections
      })
      
      toast.success(`Batch created successfully! ${formData.num_sections} section(s) initialized.`)
      
      // Refresh batch instances
      const batchRes = await batchInstanceAPI.getAll(0, 100, { is_active: true })
      setBatchInstances(batchRes.items || [])

      // Reset form
      setFormData({
        department_id: '',
        batch_id: '',
        academic_year_id: '',
        admission_year: new Date().getFullYear(),
        num_sections: 1
      })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create batch')
    } finally {
      setLoading(false)
    }
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setValidationResult(null)
      setAdmissionResult(null)
    }
  }
  
  const handleFileUpload = async () => {
    if (!selectedFile || !uploadBatchId) {
      toast.error('Please select a file and batch instance')
      return
    }
    
    setLoading(true)
    
    try {
      const result = await batchAdmissionAPI.uploadFile(
        parseInt(uploadBatchId),
        selectedFile
      )
      
      if (result.status === 'validation_failed') {
        setValidationResult(result.validation)
        toast.error(`Validation failed: ${result.validation.errors.length} errors found`)
      } else {
        setAdmissionResult(result.result)
        toast.success(result.message)
        setSelectedFile(null)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload file')
    } finally {
      setLoading(false)
    }
  }
  
  const downloadTemplate = async () => {
    try {
      const response = await batchAdmissionAPI.downloadTemplate()
      
      // Create blob and download
      const blob = new Blob([response], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bulk_admission_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Template downloaded successfully')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Batch Admission Management
        </h1>
        <p className="text-gray-600">
          Create new batches and bulk admit students for the academic year
        </p>
      </div>
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Create New Batch
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Bulk Student Upload
          </button>
        </nav>
      </div>
      
      {/* Create Batch Tab */}
      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Batch Instance</h2>
          <form onSubmit={handleCreateBatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program
                </label>
                <select
                  value={formData.batch_id}
                  onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Program</option>
                  {programs.map(prog => (
                    <option key={prog.id} value={prog.id}>
                      {prog.batch_name} ({prog.duration_years} Years)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <select
                  value={formData.academic_year_id}
                  onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.start_year}-{year.end_year})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Year
                </label>
                <input
                  type="number"
                  value={formData.admission_year}
                  onChange={(e) => setFormData({ ...formData, admission_year: parseInt(e.target.value) })}
                  min="2000"
                  max="2100"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Sections
                </label>
                <input
                  type="number"
                  value={formData.num_sections}
                  onChange={(e) => setFormData({ ...formData, num_sections: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Batch'}
            </button>
          </form>
        </div>
      )}
      
      {/* Bulk Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FileText className="w-6 h-6 text-blue-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Download Template First
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Download the CSV template and fill in student details before uploading
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          </div>
          
          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Student Data</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Instance
                </label>
                <select
                  value={uploadBatchId}
                  onChange={(e) => setUploadBatchId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Batch</option>
                  {batchInstances.map(batch => {
                     // Find department and program names for better display
                     const dept = departments.find(d => d.id === batch.department_id)
                     const prog = programs.find(p => p.id === batch.batch_id)
                     return (
                       <option key={batch.id} value={batch.id}>
                         {dept?.code || batch.department_id} - {prog?.batch_name || batch.batch_id} ({batch.admission_year})
                       </option>
                     )
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV/Excel File
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || !uploadBatchId || loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Upload & Admit Students'}
              </button>
            </div>
          </div>
          
          {/* Validation Errors */}
          {validationResult && !validationResult.is_valid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1 mr-3" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Validation Failed ({validationResult.errors.length} errors)
                  </h3>
                  <ul className="space-y-1 text-sm text-red-800">
                    {validationResult.errors.slice(0, 5).map((error: any, idx: number) => (
                      <li key={idx}>
                        Row {error.row}: {error.errors.join(', ')}
                      </li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li>... and {validationResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Admission Success */}
          {admissionResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1 mr-3" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Admission Successful!
                  </h3>
                  <p className="text-sm text-green-800 mb-3">
                    {admissionResult.admitted} students admitted out of {admissionResult.total}
                  </p>
                  {admissionResult.admitted_students.slice(0, 5).map((student: any, idx: number) => (
                    <p key={idx} className="text-sm text-green-700">
                      • {student.roll_no} - {student.name} ({student.section})
                    </p>
                  ))}
                  {admissionResult.admitted_students.length > 5 && (
                    <p className="text-sm text-green-700 mt-2">
                      ... and {admissionResult.admitted_students.length - 5} more students
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BatchAdmissionDashboard
