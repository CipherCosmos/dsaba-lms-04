/**
 * Enhanced Create Class Wizard
 * Multi-step wizard following Enterprise Academic Architecture
 * Steps: Academic Year → Department → Program → Admission Year → Initial Semester → Sections → Review
 */

import React, { useState, useEffect } from 'react'
import {
  useAcademicYears,
  useCreateAcademicYear,
  useCurrentAcademicYear,
} from '../../core/hooks'
import { useDepartments } from '../../core/hooks'
import { useCreateBatchInstance } from '../../core/hooks'
import { classAPI } from '../../services/api'
import { logger } from '../../core/utils/logger'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Building,
  GraduationCap,
  Users,
  BookOpen,
  FileCheck,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface WizardStep {
  id: number
  title: string
  description: string
  icon: React.ElementType
}

const STEPS: WizardStep[] = [
  { id: 1, title: 'Academic Year', description: 'Select or create academic year', icon: Calendar },
  { id: 2, title: 'Department', description: 'Select department', icon: Building },
  { id: 3, title: 'Program', description: 'Select program (batch)', icon: GraduationCap },
  { id: 4, title: 'Admission Year', description: 'Set admission year', icon: Calendar },
  { id: 5, title: 'Initial Semester', description: 'Configure semester 1', icon: BookOpen },
  { id: 6, title: 'Sections', description: 'Add sections (optional)', icon: Users },
  { id: 7, title: 'Review', description: 'Review and confirm', icon: FileCheck },
]

interface WizardData {
  // Step 1: Academic Year
  academicYearOption: 'select' | 'create'
  selectedAcademicYearId: number | null
  newAcademicYear: {
    start_year: number
    end_year: number
    display_name: string
    start_date: string
    end_date: string
    status: 'planned' | 'active'
    is_current: boolean
  }
  
  // Step 2: Department
  department_id: number | null
  
  // Step 3: Program
  batch_id: number | null
  
  // Step 4: Admission Year
  admission_year: number
  
  // Step 5: Initial Semester (auto-created, just confirmation)
  semester_confirmed: boolean
  
  // Step 6: Sections
  sections: Array<{ name: string; capacity: number | null }>
  
  // Generated class name (read-only)
  generatedClassName: string
}

interface CreateClassWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userRole: string
  userDepartmentId?: number | null
}

const CreateClassWizard: React.FC<CreateClassWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userRole,
  userDepartmentId,
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [wizardData, setWizardData] = useState<WizardData>({
    academicYearOption: 'select',
    selectedAcademicYearId: null,
    newAcademicYear: {
      start_year: new Date().getFullYear(),
      end_year: new Date().getFullYear() + 1,
      display_name: '',
      start_date: '',
      end_date: '',
      status: 'planned',
      is_current: false,
    },
    department_id: null,
    batch_id: null,
    admission_year: new Date().getFullYear(),
    semester_confirmed: false,
    sections: [],
    generatedClassName: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  // React Query hooks
  const { data: currentAcademicYear } = useCurrentAcademicYear()
  const { data: academicYearsData } = useAcademicYears(0, 200)
  const { data: departmentsData } = useDepartments(0, 200)
  const createAcademicYearMutation = useCreateAcademicYear()
  const createBatchInstanceMutation = useCreateBatchInstance()

  const academicYears = academicYearsData?.items || []
  const departments = departmentsData?.items || []

  // Filter departments based on role
  const availableDepartments = React.useMemo(() => {
    if (userRole === 'admin' || userRole === 'principal') {
      return departments
    }
    if (userRole === 'hod' && userDepartmentId) {
      return departments.filter((d: { id: number }) => d.id === userDepartmentId)
    }
    return []
  }, [departments, userRole, userDepartmentId])

  // Fetch batches
  useEffect(() => {
    const fetchBatches = async () => {
      setLoadingBatches(true)
      try {
        const response = await classAPI.getBatches(0, 200, true)
        setBatches(response.items || [])
      } catch (error: unknown) {
        logger.error('Error fetching batches:', error)
        toast.error('Failed to fetch programs')
      } finally {
        setLoadingBatches(false)
      }
    }
    fetchBatches()
  }, [])

  // Set default academic year
  useEffect(() => {
    if (currentAcademicYear && !wizardData.selectedAcademicYearId && wizardData.academicYearOption === 'select') {
      setWizardData((prev) => ({ ...prev, selectedAcademicYearId: currentAcademicYear.id }))
    }
  }, [currentAcademicYear, wizardData.selectedAcademicYearId, wizardData.academicYearOption])

  // Generate class name
  useEffect(() => {
    if (wizardData.department_id && wizardData.batch_id && wizardData.admission_year) {
      const dept = departments.find((d: { id: number }) => d.id === wizardData.department_id)
      const batch = batches.find((b: { id: number }) => b.id === wizardData.batch_id)
      if (dept && batch) {
        const className = `${dept.code || dept.name}-${batch.name}-${wizardData.admission_year}`
        setWizardData((prev) => ({ ...prev, generatedClassName: className }))
      }
    }
  }, [wizardData.department_id, wizardData.batch_id, wizardData.admission_year, departments, batches])

  // Auto-generate display name for new academic year
  useEffect(() => {
    if (wizardData.academicYearOption === 'create' && wizardData.newAcademicYear.start_year && wizardData.newAcademicYear.end_year) {
      const displayName = `${wizardData.newAcademicYear.start_year}-${wizardData.newAcademicYear.end_year}`
      setWizardData((prev) => ({
        ...prev,
        newAcademicYear: { ...prev.newAcademicYear, display_name: displayName },
      }))
    }
  }, [wizardData.academicYearOption, wizardData.newAcademicYear.start_year, wizardData.newAcademicYear.end_year])

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1: // Academic Year
        if (wizardData.academicYearOption === 'select') {
          if (!wizardData.selectedAcademicYearId) {
            newErrors.academicYear = 'Please select an academic year'
          }
        } else {
          if (!wizardData.newAcademicYear.start_year || wizardData.newAcademicYear.start_year < 2000) {
            newErrors.start_year = 'Start year must be >= 2000'
          }
          if (!wizardData.newAcademicYear.end_year || wizardData.newAcademicYear.end_year <= wizardData.newAcademicYear.start_year) {
            newErrors.end_year = 'End year must be greater than start year'
          }
          if (!wizardData.newAcademicYear.display_name) {
            newErrors.display_name = 'Display name is required'
          }
          // Check for date overlap (simplified - would need backend validation)
          if (wizardData.newAcademicYear.start_date && wizardData.newAcademicYear.end_date) {
            if (new Date(wizardData.newAcademicYear.start_date) >= new Date(wizardData.newAcademicYear.end_date)) {
              newErrors.dates = 'Start date must be before end date'
            }
          }
        }
        break

      case 2: // Department
        if (!wizardData.department_id) {
          newErrors.department = 'Please select a department'
        }
        break

      case 3: // Program
        if (!wizardData.batch_id) {
          newErrors.batch = 'Please select a program'
        }
        break

      case 4: // Admission Year
        if (!wizardData.admission_year || wizardData.admission_year < 2000) {
          newErrors.admission_year = 'Admission year must be >= 2000'
        }
        if (wizardData.admission_year > new Date().getFullYear()) {
          newErrors.admission_year = 'Admission year cannot exceed current year'
        }
        break

      case 5: // Initial Semester
        if (!wizardData.semester_confirmed) {
          newErrors.semester = 'Please confirm semester creation'
        }
        break

      case 6: // Sections (optional, but validate if provided)
        wizardData.sections.forEach((section, index) => {
          if (!section.name || section.name.length === 0) {
            newErrors[`section_${index}_name`] = 'Section name is required'
          }
          if (section.capacity !== null && section.capacity < 1) {
            newErrors[`section_${index}_capacity`] = 'Capacity must be >= 1'
          }
        })
        // Check for duplicate section names
        const sectionNames = wizardData.sections.map((s) => s.name.toUpperCase())
        const duplicates = sectionNames.filter((name, index) => sectionNames.indexOf(name) !== index)
        if (duplicates.length > 0) {
          newErrors.sections = 'Section names must be unique'
        }
        break

      case 7: // Review - no validation needed
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return
    }

    // Special handling for step 1: Create academic year if needed
    if (currentStep === 1 && wizardData.academicYearOption === 'create') {
      try {
        const newYear = await createAcademicYearMutation.mutateAsync({
          start_year: wizardData.newAcademicYear.start_year,
          end_year: wizardData.newAcademicYear.end_year,
          start_date: wizardData.newAcademicYear.start_date || undefined,
          end_date: wizardData.newAcademicYear.end_date || undefined,
        })
        setWizardData((prev) => ({ ...prev, selectedAcademicYearId: newYear.id, academicYearOption: 'select' }))
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } }
        toast.error(err.response?.data?.detail || 'Failed to create academic year')
        return
      }
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }

  const handleSubmit = async () => {
    if (!wizardData.selectedAcademicYearId || !wizardData.department_id || !wizardData.batch_id) {
      toast.error('Please complete all required steps')
      return
    }

    try {
      await createBatchInstanceMutation.mutateAsync({
        academic_year_id: wizardData.selectedAcademicYearId,
        department_id: wizardData.department_id,
        batch_id: wizardData.batch_id,
        admission_year: wizardData.admission_year,
        sections: wizardData.sections.length > 0 ? wizardData.sections.map((s) => s.name.toUpperCase()) : undefined,
      })

      toast.success('Class created successfully!')
      onSuccess()
      handleClose()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      toast.error(err.response?.data?.detail || 'Failed to create class')
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setWizardData({
      academicYearOption: 'select',
      selectedAcademicYearId: null,
      newAcademicYear: {
        start_year: new Date().getFullYear(),
        end_year: new Date().getFullYear() + 1,
        display_name: '',
        start_date: '',
        end_date: '',
        status: 'planned',
        is_current: false,
      },
      department_id: null,
      batch_id: null,
      admission_year: new Date().getFullYear(),
      semester_confirmed: false,
      sections: [],
      generatedClassName: '',
    })
    setErrors({})
    onClose()
  }

  const addSection = () => {
    setWizardData((prev) => ({
      ...prev,
      sections: [...prev.sections, { name: '', capacity: null }],
    }))
  }

  const removeSection = (index: number) => {
    setWizardData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }))
  }

  const updateSection = (index: number, field: 'name' | 'capacity', value: string | number | null) => {
    setWizardData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }))
  }

  if (!isOpen) return null

  const selectedAcademicYear = academicYears.find((ay: { id: number }) => ay.id === wizardData.selectedAcademicYearId)
  const selectedDepartment = departments.find((d: { id: number }) => d.id === wizardData.department_id)
  const selectedBatch = batches.find((b: { id: number }) => b.id === wizardData.batch_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Class</h2>
              <p className="text-sm text-gray-600 mt-1">Multi-step wizard for class creation</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check size={20} /> : <StepIcon size={20} />}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Academic Year */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Academic Year</h3>
              <p className="text-sm text-gray-600">Select an existing academic year or create a new one</p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="select"
                      checked={wizardData.academicYearOption === 'select'}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          academicYearOption: e.target.value as 'select' | 'create',
                        }))
                      }
                      className="mr-2"
                    />
                    <span>Select Existing Academic Year</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="create"
                      checked={wizardData.academicYearOption === 'create'}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          academicYearOption: e.target.value as 'select' | 'create',
                        }))
                      }
                      className="mr-2"
                    />
                    <span>Create New Academic Year</span>
                  </label>
                </div>

                {wizardData.academicYearOption === 'select' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={wizardData.selectedAcademicYearId || ''}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          selectedAcademicYearId: parseInt(e.target.value) || null,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map((ay: { id: number; display_name: string; is_current?: boolean }) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.display_name} {ay.is_current && '(Current)'}
                        </option>
                      ))}
                    </select>
                    {errors.academicYear && (
                      <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={wizardData.newAcademicYear.start_year}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              newAcademicYear: {
                                ...prev.newAcademicYear,
                                start_year: parseInt(e.target.value) || 0,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          min={2000}
                        />
                        {errors.start_year && (
                          <p className="text-red-500 text-sm mt-1">{errors.start_year}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={wizardData.newAcademicYear.end_year}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              newAcademicYear: {
                                ...prev.newAcademicYear,
                                end_year: parseInt(e.target.value) || 0,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          min={2000}
                        />
                        {errors.end_year && (
                          <p className="text-red-500 text-sm mt-1">{errors.end_year}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={wizardData.newAcademicYear.display_name}
                        onChange={(e) =>
                          setWizardData((prev) => ({
                            ...prev,
                            newAcademicYear: {
                              ...prev.newAcademicYear,
                              display_name: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., 2024-2025"
                      />
                      {errors.display_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.display_name}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={wizardData.newAcademicYear.start_date}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              newAcademicYear: {
                                ...prev.newAcademicYear,
                                start_date: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={wizardData.newAcademicYear.end_date}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              newAcademicYear: {
                                ...prev.newAcademicYear,
                                end_date: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    {errors.dates && (
                      <p className="text-red-500 text-sm">{errors.dates}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Department */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Department</h3>
              <p className="text-sm text-gray-600">Select the department for this class</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={wizardData.department_id || ''}
                  onChange={(e) =>
                    setWizardData((prev) => ({
                      ...prev,
                      department_id: parseInt(e.target.value) || null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {availableDepartments.map((dept: { id: number; name: string; code?: string }) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Program */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Program (Batch)</h3>
              <p className="text-sm text-gray-600">Select the program type for this class</p>
              {loadingBatches ? (
                <div className="text-center py-8">Loading programs...</div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={wizardData.batch_id || ''}
                    onChange={(e) =>
                      setWizardData((prev) => ({
                        ...prev,
                        batch_id: parseInt(e.target.value) || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Program</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.duration_years} years)
                      </option>
                    ))}
                  </select>
                  {errors.batch && (
                    <p className="text-red-500 text-sm mt-1">{errors.batch}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Admission Year */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Admission Year</h3>
              <p className="text-sm text-gray-600">Set the admission year for this class</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={wizardData.admission_year}
                  onChange={(e) =>
                    setWizardData((prev) => ({
                      ...prev,
                      admission_year: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={2000}
                  max={new Date().getFullYear()}
                />
                {errors.admission_year && (
                  <p className="text-red-500 text-sm mt-1">{errors.admission_year}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Must be between 2000 and {new Date().getFullYear()}
                </p>
              </div>
              {wizardData.generatedClassName && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Generated Class Name:</p>
                  <p className="text-lg font-bold text-blue-700">{wizardData.generatedClassName}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Initial Semester */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Initial Semester</h3>
              <p className="text-sm text-gray-600">
                Semester 1 will be automatically created with the following configuration:
              </p>
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><strong>Semester Number:</strong> 1</p>
                <p><strong>Status:</strong> Draft</p>
                <p><strong>Is Current:</strong> Yes</p>
                <p><strong>Academic Year:</strong> {selectedAcademicYear?.display_name || 'N/A'}</p>
                <p><strong>Department:</strong> {selectedDepartment?.name || 'N/A'}</p>
                <p><strong>Program:</strong> {selectedBatch?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-2">
                  All metadata will be automatically propagated to the semester.
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="semester-confirm"
                  checked={wizardData.semester_confirmed}
                  onChange={(e) =>
                    setWizardData((prev) => ({
                      ...prev,
                      semester_confirmed: e.target.checked,
                    }))
                  }
                  className="mr-2"
                />
                <label htmlFor="semester-confirm" className="text-sm text-gray-700">
                  I confirm that Semester 1 will be created automatically
                </label>
              </div>
              {errors.semester && (
                <p className="text-red-500 text-sm">{errors.semester}</p>
              )}
            </div>
          )}

          {/* Step 6: Sections */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Sections (Optional)</h3>
                  <p className="text-sm text-gray-600">Add sections to organize students within the class</p>
                </div>
                <button
                  type="button"
                  onClick={addSection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Section
                </button>
              </div>
              {wizardData.sections.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No sections added. You can skip this step or add sections later.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wizardData.sections.map((section, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Section {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => updateSection(index, 'name', e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="A, B, C, etc."
                            maxLength={10}
                          />
                          {errors[`section_${index}_name`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`section_${index}_name`]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacity (Optional)
                          </label>
                          <input
                            type="number"
                            value={section.capacity || ''}
                            onChange={(e) =>
                              updateSection(
                                index,
                                'capacity',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., 60"
                            min={1}
                          />
                          {errors[`section_${index}_capacity`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`section_${index}_capacity`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {errors.sections && (
                    <p className="text-red-500 text-sm">{errors.sections}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Review & Confirm</h3>
              <p className="text-sm text-gray-600">Please review all details before creating the class</p>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Academic Year</h4>
                  <p>{selectedAcademicYear?.display_name || 'N/A'}</p>
                  {selectedAcademicYear?.start_date && selectedAcademicYear?.end_date && (
                    <p className="text-sm text-gray-600">
                      {new Date(selectedAcademicYear.start_date).toLocaleDateString()} -{' '}
                      {new Date(selectedAcademicYear.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Department</h4>
                  <p>{selectedDepartment?.name || 'N/A'}</p>
                  {selectedDepartment?.code && (
                    <p className="text-sm text-gray-600">Code: {selectedDepartment.code}</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Program</h4>
                  <p>{selectedBatch?.name || 'N/A'}</p>
                  {selectedBatch?.duration_years && (
                    <p className="text-sm text-gray-600">Duration: {selectedBatch.duration_years} years</p>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Admission Year</h4>
                  <p>{wizardData.admission_year}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Generated Class Name</h4>
                  <p className="text-lg font-bold text-blue-700">{wizardData.generatedClassName}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Initial Semester</h4>
                  <p>Semester 1 (Draft, Current)</p>
                  <p className="text-sm text-gray-600">
                    Will be automatically created with all propagated metadata
                  </p>
                </div>

                {wizardData.sections.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Sections ({wizardData.sections.length})</h4>
                    <div className="space-y-1">
                      {wizardData.sections.map((section, index) => (
                        <p key={index} className="text-sm">
                          Section {section.name}
                          {section.capacity && ` (Capacity: ${section.capacity})`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeft size={18} className="mr-1" />
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={createAcademicYearMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <ChevronRight size={18} className="ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createBatchInstanceMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {createBatchInstanceMutation.isPending ? 'Creating...' : 'Create Class'}
                <Check size={18} className="ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateClassWizard

