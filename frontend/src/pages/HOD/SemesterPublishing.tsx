import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store/store'
import { academicStructureAPI } from '../../services/api'
import { CheckCircle, XCircle, AlertTriangle, Loader, Calendar, BookOpen, Users, Award, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { logger } from '../../core/utils/logger'

const SemesterPublishing: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [semesters, setSemesters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<any>(null)
  const [publishStatus, setPublishStatus] = useState<any>(null)

  useEffect(() => {
    fetchSemesters()
  }, [])

  const fetchSemesters = async () => {
    try {
      setLoading(true)
      const response = await academicStructureAPI.getAllSemesters(0, 1000)
      const semestersList = response.items || response || []
      
      // Transform to include additional fields needed for display
      // Backend now returns is_published status based on final_marks
      const transformedSemesters = semestersList.map((semester: any) => ({
        ...semester,
        academic_year: semester.batch_year_id ? `Batch Year ${semester.batch_year_id}` : 'N/A',
        is_published: semester.is_published || false // Backend provides this field
      }))
      
      setSemesters(transformedSemesters)
    } catch (error) {
      logger.error('Error fetching semesters:', error)
      toast.error('Failed to fetch semesters')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (semesterId: number) => {
    if (!window.confirm('Are you sure you want to publish this semester? This action cannot be undone.')) {
      return
    }

    try {
      setPublishing(semesterId)
      setPublishStatus(null)
      
      const response = await academicStructureAPI.publishSemester(semesterId)
      
      if (response.status === 'processing') {
        toast.success('Semester publish job started. Results will be published shortly.')
        setPublishStatus({
          status: 'processing',
          task_id: response.task_id,
          message: response.message
        })
        
        // Poll for status (in production, use WebSocket or polling)
        setTimeout(() => {
          setPublishStatus({
            status: 'completed',
            message: 'Semester results published successfully'
          })
        }, 5000)
      }
    } catch (error: any) {
      logger.error('Error publishing semester:', error)
      const errorDetail = error.response?.data?.detail
      
      if (errorDetail?.missing_exams) {
        setPublishStatus({
          status: 'error',
          message: errorDetail.message,
          missing_exams: errorDetail.missing_exams
        })
        toast.error('Cannot publish: Some exams are incomplete')
      } else {
        toast.error(error.response?.data?.detail || 'Failed to publish semester')
        setPublishStatus({
          status: 'error',
          message: error.response?.data?.detail || 'Failed to publish semester'
        })
      }
    } finally {
      setPublishing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semester Publishing</h1>
          <p className="text-gray-600">Publish semester results after all exams are complete</p>
        </div>
        <button
          onClick={fetchSemesters}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Publish Status */}
      {publishStatus && (
        <div className={`card ${
          publishStatus.status === 'completed' ? 'bg-green-50 border-green-200' :
          publishStatus.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start space-x-3">
            {publishStatus.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : publishStatus.status === 'error' ? (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            ) : (
              <Loader className="h-5 w-5 text-blue-600 mt-0.5 animate-spin" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                publishStatus.status === 'completed' ? 'text-green-900' :
                publishStatus.status === 'error' ? 'text-red-900' :
                'text-blue-900'
              }`}>
                {publishStatus.message}
              </p>
              {publishStatus.missing_exams && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-red-900">Missing Exams:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {publishStatus.missing_exams.map((item: any, idx: number) => (
                      <li key={idx} className="text-sm text-red-700">
                        {item.subject_name}: {item.missing.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Semesters List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Semesters</h2>
        {semesters.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No semesters available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {semesters.map((semester) => (
              <div
                key={semester.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Semester {semester.semester_no} - {semester.academic_year}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{semester.start_date} to {semester.end_date}</span>
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          semester.is_published
                            ? 'bg-green-100 text-green-800'
                            : semester.is_current
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {semester.is_published ? 'Published' : semester.is_current ? 'Current' : 'Past'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {!semester.is_published && (
                      <button
                        onClick={() => handlePublish(semester.id)}
                        disabled={publishing === semester.id}
                        className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                      >
                        {publishing === semester.id ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            <span>Publishing...</span>
                          </>
                        ) : (
                          <>
                            <Award className="h-4 w-4" />
                            <span>Publish</span>
                          </>
                        )}
                      </button>
                    )}
                    {semester.is_published && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Published</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Publishing Requirements</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>All required exams (Internal 1, Internal 2, External) must be completed and locked</li>
              <li>All marks must be entered and verified</li>
              <li>Publishing will trigger CO-PO calculation, PDF generation, and email notifications</li>
              <li>Once published, results cannot be unpublished</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SemesterPublishing

