import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { 
  coAPI, 
  poAPI, 
  coTargetAPI, 
  assessmentWeightAPI, 
  coPoMatrixAPI, 
  questionCoWeightAPI, 
  indirectAttainmentAPI,
  attainmentAuditAPI,
  attainmentAnalyticsAPI
} from '../../services/api'

// Types
export interface CODefinition {
  id: number
  subject_id: number
  code: string
  title: string
  description?: string
  created_at: string
}

export interface PODefinition {
  id: number
  department_id: number
  code: string
  title: string
  description?: string
  type: 'PO' | 'PSO'
  created_at: string
}

export interface COTarget {
  id: number
  subject_id: number
  co_code: string
  target_pct: number
  l1_threshold: number
  l2_threshold: number
  l3_threshold: number
  created_at: string
  updated_at?: string
}

export interface AssessmentWeight {
  id: number
  subject_id: number
  exam_type: 'internal1' | 'internal2' | 'final'
  weight_pct: number
  created_at: string
  updated_at?: string
}

export interface COPOMatrix {
  id: number
  subject_id: number
  co_code: string
  po_code: string
  strength: 1 | 2 | 3
  created_at: string
  updated_at?: string
}

export interface QuestionCOWeight {
  id: number
  question_id: number
  co_code: string
  weight_pct: number
  created_at: string
}

export interface IndirectAttainment {
  id: number
  subject_id: number
  source: string
  po_code?: string
  co_code?: string
  value_pct: number
  term?: string
  created_at: string
}

export interface AttainmentAudit {
  id: number
  subject_id: number
  change: string
  user_id: number
  timestamp: string
}

export interface COAttainmentDetail {
  co_code: string
  target_pct: number
  actual_pct: number
  level: string
  gap: number
  coverage: number
  evidence: any[]
}

export interface POAttainmentDetail {
  po_code: string
  direct_pct: number
  indirect_pct: number
  total_pct: number
  level: string
  gap: number
  contributing_cos: string[]
}

export interface SubjectAttainmentResponse {
  subject_id: number
  subject_name: string
  co_attainment: COAttainmentDetail[]
  po_attainment: POAttainmentDetail[]
  blooms_distribution: Record<string, any>
  difficulty_mix: Record<string, any>
  co_coverage: number
}

interface COPOSliceState {
  // CO Definitions
  coDefinitions: CODefinition[]
  coDefinitionsLoading: boolean
  coDefinitionsError: string | null

  // PO Definitions
  poDefinitions: PODefinition[]
  poDefinitionsLoading: boolean
  poDefinitionsError: string | null

  // CO Targets
  coTargets: COTarget[]
  coTargetsLoading: boolean
  coTargetsError: string | null

  // Assessment Weights
  assessmentWeights: AssessmentWeight[]
  assessmentWeightsLoading: boolean
  assessmentWeightsError: string | null

  // CO-PO Matrix
  coPoMatrix: COPOMatrix[]
  coPoMatrixLoading: boolean
  coPoMatrixError: string | null

  // Question CO Weights
  questionCoWeights: QuestionCOWeight[]
  questionCoWeightsLoading: boolean
  questionCoWeightsError: string | null

  // Indirect Attainment
  indirectAttainment: IndirectAttainment[]
  indirectAttainmentLoading: boolean
  indirectAttainmentError: string | null

  // Attainment Audit
  attainmentAudit: AttainmentAudit[]
  attainmentAuditLoading: boolean
  attainmentAuditError: string | null

  // Analytics
  subjectAttainment: SubjectAttainmentResponse | null
  subjectAttainmentLoading: boolean
  subjectAttainmentError: string | null

  // UI State
  selectedSubjectId: number | null
  selectedDepartmentId: number | null
  selectedQuestionId: number | null
}

const initialState: COPOSliceState = {
  coDefinitions: [],
  coDefinitionsLoading: false,
  coDefinitionsError: null,

  poDefinitions: [],
  poDefinitionsLoading: false,
  poDefinitionsError: null,

  coTargets: [],
  coTargetsLoading: false,
  coTargetsError: null,

  assessmentWeights: [],
  assessmentWeightsLoading: false,
  assessmentWeightsError: null,

  coPoMatrix: [],
  coPoMatrixLoading: false,
  coPoMatrixError: null,

  questionCoWeights: [],
  questionCoWeightsLoading: false,
  questionCoWeightsError: null,

  indirectAttainment: [],
  indirectAttainmentLoading: false,
  indirectAttainmentError: null,

  attainmentAudit: [],
  attainmentAuditLoading: false,
  attainmentAuditError: null,

  subjectAttainment: null,
  subjectAttainmentLoading: false,
  subjectAttainmentError: null,

  selectedSubjectId: null,
  selectedDepartmentId: null,
  selectedQuestionId: null,
}

// Async Thunks
export const fetchCODefinitions = createAsyncThunk(
  'copo/fetchCODefinitions',
  async (subjectId: number) => {
    const response = await coAPI.getBySubject(subjectId)
    return response
  }
)

export const createCODefinition = createAsyncThunk(
  'copo/createCODefinition',
  async ({ subjectId, coData }: { subjectId: number; coData: Partial<CODefinition> }) => {
    const response = await coAPI.create(subjectId, coData)
    return response
  }
)

export const updateCODefinition = createAsyncThunk(
  'copo/updateCODefinition',
  async ({ coId, coData }: { coId: number; coData: Partial<CODefinition> }) => {
    const response = await coAPI.update(coId, coData)
    return response
  }
)

export const deleteCODefinition = createAsyncThunk(
  'copo/deleteCODefinition',
  async (coId: number) => {
    await coAPI.delete(coId)
    return coId
  }
)

export const fetchPODefinitions = createAsyncThunk(
  'copo/fetchPODefinitions',
  async (departmentId: number) => {
    const response = await poAPI.getByDepartment(departmentId)
    return response
  }
)

export const createPODefinition = createAsyncThunk(
  'copo/createPODefinition',
  async ({ departmentId, poData }: { departmentId: number; poData: Partial<PODefinition> }) => {
    const response = await poAPI.create(departmentId, poData)
    return response
  }
)

export const updatePODefinition = createAsyncThunk(
  'copo/updatePODefinition',
  async ({ poId, poData }: { poId: number; poData: Partial<PODefinition> }) => {
    const response = await poAPI.update(poId, poData)
    return response
  }
)

export const deletePODefinition = createAsyncThunk(
  'copo/deletePODefinition',
  async (poId: number) => {
    await poAPI.delete(poId)
    return poId
  }
)

export const fetchCOTargets = createAsyncThunk(
  'copo/fetchCOTargets',
  async (subjectId: number) => {
    const response = await coTargetAPI.getBySubject(subjectId)
    return response
  }
)

export const bulkUpdateCOTargets = createAsyncThunk(
  'copo/bulkUpdateCOTargets',
  async ({ subjectId, coTargets }: { subjectId: number; coTargets: Partial<COTarget>[] }) => {
    const response = await coTargetAPI.bulkUpdate(subjectId, coTargets)
    return response
  }
)

export const fetchAssessmentWeights = createAsyncThunk(
  'copo/fetchAssessmentWeights',
  async (subjectId: number) => {
    const response = await assessmentWeightAPI.getBySubject(subjectId)
    return response
  }
)

export const bulkUpdateAssessmentWeights = createAsyncThunk(
  'copo/bulkUpdateAssessmentWeights',
  async ({ subjectId, assessmentWeights }: { subjectId: number; assessmentWeights: Partial<AssessmentWeight>[] }) => {
    const response = await assessmentWeightAPI.bulkUpdate(subjectId, assessmentWeights)
    return response
  }
)

export const fetchCOPOMatrix = createAsyncThunk(
  'copo/fetchCOPOMatrix',
  async (subjectId: number) => {
    const response = await coPoMatrixAPI.getBySubject(subjectId)
    return response
  }
)

export const bulkUpdateCOPOMatrix = createAsyncThunk(
  'copo/bulkUpdateCOPOMatrix',
  async ({ subjectId, coPoMatrix }: { subjectId: number; coPoMatrix: Partial<COPOMatrix>[] }) => {
    const response = await coPoMatrixAPI.bulkUpdate(subjectId, coPoMatrix)
    return response
  }
)

export const fetchQuestionCOWeights = createAsyncThunk(
  'copo/fetchQuestionCOWeights',
  async (questionId: number) => {
    const response = await questionCoWeightAPI.getByQuestion(questionId)
    return response
  }
)

export const bulkUpdateQuestionCOWeights = createAsyncThunk(
  'copo/bulkUpdateQuestionCOWeights',
  async ({ questionId, coWeights }: { questionId: number; coWeights: Partial<QuestionCOWeight>[] }) => {
    const response = await questionCoWeightAPI.bulkUpdate(questionId, coWeights)
    return response
  }
)

export const fetchIndirectAttainment = createAsyncThunk(
  'copo/fetchIndirectAttainment',
  async (subjectId: number) => {
    const response = await indirectAttainmentAPI.getBySubject(subjectId)
    return response
  }
)

export const createIndirectAttainment = createAsyncThunk(
  'copo/createIndirectAttainment',
  async ({ subjectId, attainmentData }: { subjectId: number; attainmentData: Partial<IndirectAttainment> }) => {
    const response = await indirectAttainmentAPI.create(subjectId, attainmentData)
    return response
  }
)

export const updateIndirectAttainment = createAsyncThunk(
  'copo/updateIndirectAttainment',
  async ({ attainmentId, attainmentData }: { attainmentId: number; attainmentData: Partial<IndirectAttainment> }) => {
    const response = await indirectAttainmentAPI.update(attainmentId, attainmentData)
    return response
  }
)

export const deleteIndirectAttainment = createAsyncThunk(
  'copo/deleteIndirectAttainment',
  async (attainmentId: number) => {
    await indirectAttainmentAPI.delete(attainmentId)
    return attainmentId
  }
)

export const fetchAttainmentAudit = createAsyncThunk(
  'copo/fetchAttainmentAudit',
  async (subjectId: number) => {
    const response = await attainmentAuditAPI.getBySubject(subjectId)
    return response
  }
)

export const fetchSubjectAttainment = createAsyncThunk(
  'copo/fetchSubjectAttainment',
  async ({ subjectId, examType }: { subjectId: number; examType?: string }) => {
    const response = await attainmentAnalyticsAPI.getSubjectAttainment(subjectId, examType)
    return response
  }
)

// Slice
const copoSlice = createSlice({
  name: 'copo',
  initialState,
  reducers: {
    setSelectedSubject: (state, action: PayloadAction<number | null>) => {
      state.selectedSubjectId = action.payload
    },
    setSelectedDepartment: (state, action: PayloadAction<number | null>) => {
      state.selectedDepartmentId = action.payload
    },
    setSelectedQuestion: (state, action: PayloadAction<number | null>) => {
      state.selectedQuestionId = action.payload
    },
    clearErrors: (state) => {
      state.coDefinitionsError = null
      state.poDefinitionsError = null
      state.coTargetsError = null
      state.assessmentWeightsError = null
      state.coPoMatrixError = null
      state.questionCoWeightsError = null
      state.indirectAttainmentError = null
      state.attainmentAuditError = null
      state.subjectAttainmentError = null
    },
  },
  extraReducers: (builder) => {
    // CO Definitions
    builder
      .addCase(fetchCODefinitions.pending, (state) => {
        state.coDefinitionsLoading = true
        state.coDefinitionsError = null
      })
      .addCase(fetchCODefinitions.fulfilled, (state, action) => {
        state.coDefinitionsLoading = false
        state.coDefinitions = action.payload
      })
      .addCase(fetchCODefinitions.rejected, (state, action) => {
        state.coDefinitionsLoading = false
        state.coDefinitionsError = action.error.message || 'Failed to fetch CO definitions'
      })
      .addCase(createCODefinition.fulfilled, (state, action) => {
        state.coDefinitions.push(action.payload)
      })
      .addCase(updateCODefinition.fulfilled, (state, action) => {
        const index = state.coDefinitions.findIndex(co => co.id === action.payload.id)
        if (index !== -1) {
          state.coDefinitions[index] = action.payload
        }
      })
      .addCase(deleteCODefinition.fulfilled, (state, action) => {
        state.coDefinitions = state.coDefinitions.filter(co => co.id !== action.payload)
      })

    // PO Definitions
    builder
      .addCase(fetchPODefinitions.pending, (state) => {
        state.poDefinitionsLoading = true
        state.poDefinitionsError = null
      })
      .addCase(fetchPODefinitions.fulfilled, (state, action) => {
        state.poDefinitionsLoading = false
        state.poDefinitions = action.payload
      })
      .addCase(fetchPODefinitions.rejected, (state, action) => {
        state.poDefinitionsLoading = false
        state.poDefinitionsError = action.error.message || 'Failed to fetch PO definitions'
      })
      .addCase(createPODefinition.fulfilled, (state, action) => {
        state.poDefinitions.push(action.payload)
      })
      .addCase(updatePODefinition.fulfilled, (state, action) => {
        const index = state.poDefinitions.findIndex(po => po.id === action.payload.id)
        if (index !== -1) {
          state.poDefinitions[index] = action.payload
        }
      })
      .addCase(deletePODefinition.fulfilled, (state, action) => {
        state.poDefinitions = state.poDefinitions.filter(po => po.id !== action.payload)
      })

    // CO Targets
    builder
      .addCase(fetchCOTargets.pending, (state) => {
        state.coTargetsLoading = true
        state.coTargetsError = null
      })
      .addCase(fetchCOTargets.fulfilled, (state, action) => {
        state.coTargetsLoading = false
        state.coTargets = action.payload
      })
      .addCase(fetchCOTargets.rejected, (state, action) => {
        state.coTargetsLoading = false
        state.coTargetsError = action.error.message || 'Failed to fetch CO targets'
      })
      .addCase(bulkUpdateCOTargets.fulfilled, (state, action) => {
        state.coTargets = action.payload
      })

    // Assessment Weights
    builder
      .addCase(fetchAssessmentWeights.pending, (state) => {
        state.assessmentWeightsLoading = true
        state.assessmentWeightsError = null
      })
      .addCase(fetchAssessmentWeights.fulfilled, (state, action) => {
        state.assessmentWeightsLoading = false
        state.assessmentWeights = action.payload
      })
      .addCase(fetchAssessmentWeights.rejected, (state, action) => {
        state.assessmentWeightsLoading = false
        state.assessmentWeightsError = action.error.message || 'Failed to fetch assessment weights'
      })
      .addCase(bulkUpdateAssessmentWeights.fulfilled, (state, action) => {
        state.assessmentWeights = action.payload
      })

    // CO-PO Matrix
    builder
      .addCase(fetchCOPOMatrix.pending, (state) => {
        state.coPoMatrixLoading = true
        state.coPoMatrixError = null
      })
      .addCase(fetchCOPOMatrix.fulfilled, (state, action) => {
        state.coPoMatrixLoading = false
        state.coPoMatrix = action.payload
      })
      .addCase(fetchCOPOMatrix.rejected, (state, action) => {
        state.coPoMatrixLoading = false
        state.coPoMatrixError = action.error.message || 'Failed to fetch CO-PO matrix'
      })
      .addCase(bulkUpdateCOPOMatrix.fulfilled, (state, action) => {
        state.coPoMatrix = action.payload
      })

    // Question CO Weights
    builder
      .addCase(fetchQuestionCOWeights.pending, (state) => {
        state.questionCoWeightsLoading = true
        state.questionCoWeightsError = null
      })
      .addCase(fetchQuestionCOWeights.fulfilled, (state, action) => {
        state.questionCoWeightsLoading = false
        state.questionCoWeights = action.payload
      })
      .addCase(fetchQuestionCOWeights.rejected, (state, action) => {
        state.questionCoWeightsLoading = false
        state.questionCoWeightsError = action.error.message || 'Failed to fetch question CO weights'
      })
      .addCase(bulkUpdateQuestionCOWeights.fulfilled, (state, action) => {
        state.questionCoWeights = action.payload
      })

    // Indirect Attainment
    builder
      .addCase(fetchIndirectAttainment.pending, (state) => {
        state.indirectAttainmentLoading = true
        state.indirectAttainmentError = null
      })
      .addCase(fetchIndirectAttainment.fulfilled, (state, action) => {
        state.indirectAttainmentLoading = false
        state.indirectAttainment = action.payload
      })
      .addCase(fetchIndirectAttainment.rejected, (state, action) => {
        state.indirectAttainmentLoading = false
        state.indirectAttainmentError = action.error.message || 'Failed to fetch indirect attainment'
      })
      .addCase(createIndirectAttainment.fulfilled, (state, action) => {
        state.indirectAttainment.push(action.payload)
      })
      .addCase(updateIndirectAttainment.fulfilled, (state, action) => {
        const index = state.indirectAttainment.findIndex(ia => ia.id === action.payload.id)
        if (index !== -1) {
          state.indirectAttainment[index] = action.payload
        }
      })
      .addCase(deleteIndirectAttainment.fulfilled, (state, action) => {
        state.indirectAttainment = state.indirectAttainment.filter(ia => ia.id !== action.payload)
      })

    // Attainment Audit
    builder
      .addCase(fetchAttainmentAudit.pending, (state) => {
        state.attainmentAuditLoading = true
        state.attainmentAuditError = null
      })
      .addCase(fetchAttainmentAudit.fulfilled, (state, action) => {
        state.attainmentAuditLoading = false
        state.attainmentAudit = action.payload
      })
      .addCase(fetchAttainmentAudit.rejected, (state, action) => {
        state.attainmentAuditLoading = false
        state.attainmentAuditError = action.error.message || 'Failed to fetch attainment audit'
      })

    // Subject Attainment Analytics
    builder
      .addCase(fetchSubjectAttainment.pending, (state) => {
        state.subjectAttainmentLoading = true
        state.subjectAttainmentError = null
      })
      .addCase(fetchSubjectAttainment.fulfilled, (state, action) => {
        state.subjectAttainmentLoading = false
        state.subjectAttainment = action.payload
      })
      .addCase(fetchSubjectAttainment.rejected, (state, action) => {
        state.subjectAttainmentLoading = false
        state.subjectAttainmentError = action.error.message || 'Failed to fetch subject attainment'
      })
  },
})

export const {
  setSelectedSubject,
  setSelectedDepartment,
  setSelectedQuestion,
  clearErrors,
} = copoSlice.actions

export default copoSlice.reducer
