import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import departmentReducer from './slices/departmentSlice'
import userReducer from './slices/userSlice'
import classReducer from './slices/classSlice'
import subjectReducer from './slices/subjectSlice'
import examReducer from './slices/examSlice'
import marksReducer from './slices/marksSlice'
import analyticsReducer from './slices/analyticsSlice'
import copoReducer from './slices/copoSlice'
import advancedAnalyticsReducer from './slices/advancedAnalyticsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    departments: departmentReducer,
    users: userReducer,
    classes: classReducer,
    subjects: subjectReducer,
    exams: examReducer,
    marks: marksReducer,
    analytics: analyticsReducer,
    copo: copoReducer,
    advancedAnalytics: advancedAnalyticsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch