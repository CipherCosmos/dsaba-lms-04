/**
 * Class Management Page - DEPRECATED
 * This page has been replaced by BatchInstanceManagement
 * Redirects to the new batch instance management page
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

const ClassManagement = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to new batch instance management
    navigate('/admin/batch-instances', { replace: true })
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h2>
        <p className="text-gray-600">Class Management has been moved to Batch Instance Management</p>
      </div>
    </div>
  )
}

export default ClassManagement