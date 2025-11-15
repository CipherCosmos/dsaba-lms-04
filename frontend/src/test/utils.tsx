import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { RootState } from '../store/store'
import authReducer from '../store/slices/authSlice'
import userReducer from '../store/slices/userSlice'
import subjectReducer from '../store/slices/subjectSlice'
import examReducer from '../store/slices/examSlice'
import marksReducer from '../store/slices/marksSlice'
import departmentReducer from '../store/slices/departmentSlice'
import classReducer from '../store/slices/classSlice'
import copoReducer from '../store/slices/copoSlice'
import analyticsReducer from '../store/slices/analyticsSlice'

// Create a test store
export function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      users: userReducer,
      subjects: subjectReducer,
      exams: examReducer,
      marks: marksReducer,
      departments: departmentReducer,
      classes: classReducer,
      copo: copoReducer,
      analytics: analyticsReducer,
    },
    preloadedState,
  })
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>
  store?: ReturnType<typeof createTestStore>
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    )
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}

// Re-export everything
export * from '@testing-library/react'
export { renderWithProviders as render }

