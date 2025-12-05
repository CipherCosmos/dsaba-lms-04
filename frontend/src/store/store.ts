import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import departmentReducer from './slices/departmentSlice'
import userReducer from './slices/userSlice'
import subjectReducer from './slices/subjectSlice'
import examReducer from './slices/examSlice'
import marksReducer from './slices/marksSlice'
import analyticsReducer from './slices/analyticsSlice'
import copoReducer from './slices/copoSlice'
import classReducer from './slices/classSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    departments: departmentReducer,
    users: userReducer,
    subjects: subjectReducer,
    exams: examReducer,
    marks: marksReducer,
    analytics: analyticsReducer,
    copo: copoReducer,
    classes: classReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch