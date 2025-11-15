import React from 'react'
import { AlertCircle, X } from 'lucide-react'

interface ValidationError {
  field: string
  message: string
  type: string
}

interface ErrorDisplayProps {
  error: any
  onClose?: () => void
  className?: string
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClose, className = '' }) => {
  if (!error) return null

  // Handle different error formats
  let errors: ValidationError[] = []
  
  if (error.formattedErrors) {
    errors = error.formattedErrors
  } else if (error.response?.data?.detail) {
    if (Array.isArray(error.response.data.detail)) {
      errors = error.response.data.detail.map((err: any) => ({
        field: err.loc ? err.loc.join('.') : 'general',
        message: err.msg,
        type: err.type
      }))
    } else {
      errors = [{
        field: 'general',
        message: error.response.data.detail,
        type: 'error'
      }]
    }
  } else if (error.message) {
    errors = [{
      field: 'general',
      message: error.message,
      type: 'error'
    }]
  }

  if (errors.length === 0) return null

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {errors.length === 1 ? 'Error' : 'Errors occurred'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            {errors.length === 1 ? (
              <p>{errors[0].message}</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((err, index) => (
                  <li key={index}>
                    {err.field !== 'general' && (
                      <span className="font-medium">{err.field}: </span>
                    )}
                    {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                onClick={onClose}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorDisplay
