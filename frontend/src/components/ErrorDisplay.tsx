import React from 'react'
import { AlertCircle, X } from 'lucide-react'
import type { AxiosErrorResponse, ValidationErrorDetail } from '../core/types'

interface ValidationError {
  field: string
  message: string
  type: string
}

function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return typeof error === 'object' && error !== null && 'response' in error
}

function isErrorObject(error: unknown): error is Error {
  return error instanceof Error
}

interface ErrorDisplayProps {
  error: AxiosErrorResponse | Error | string
  onClose?: () => void
  className?: string
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClose, className = '' }) => {
  if (!error) return null

  // Handle different error formats
  let errors: ValidationError[] = []

  if ('formattedErrors' in error && Array.isArray((error as any).formattedErrors)) {
    errors = (error as any).formattedErrors
  } else if (isAxiosError(error) && error.response?.data?.detail) {
    if (Array.isArray(error.response.data.detail)) {
      errors = error.response.data.detail.map((err: ValidationErrorDetail) => ({
        field: err.loc ? err.loc.join('.') : 'general',
        message: err.msg,
        type: err.type
      }))
    } else if (typeof error.response.data.detail === 'string') {
      errors = [{
        field: 'general',
        message: error.response.data.detail,
        type: 'error'
      }]
    }
  } else if (isErrorObject(error)) {
    errors = [{
      field: 'general',
      message: error.message,
      type: 'error'
    }]
  } else if (typeof error === 'string') {
    errors = [{
      field: 'general',
      message: error,
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
