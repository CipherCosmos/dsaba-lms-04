import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login, clearError } from '../store/slices/authSlice'
import { AppDispatch, RootState } from '../store/store'
import { 
  LogIn, 
  User, 
  Lock, 
  GraduationCap, 
  Eye, 
  EyeOff, 
  KeyRound,
  Shield,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

const schema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .trim(),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: yup.boolean().default(false),
})

type LoginForm = yup.InferType<typeof schema>

interface DemoCredential {
  role: string
  username: string
  password: string
  color: string
  icon: typeof Shield
}

// Demo credentials removed for production
const demoCredentials: DemoCredential[] = []

const Login = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<DemoCredential | null>(null)
  const [isFormTouched, setIsFormTouched] = useState(false)
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, touchedFields },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    }
  })

  const watchedUsername = watch('username')
  const watchedPassword = watch('password')

  useEffect(() => {
    if (error) {
      toast.error(error, {
        icon: <AlertCircle className="h-4 w-4" />,
      })
      dispatch(clearError())
    }
  }, [error, dispatch])

  useEffect(() => {
    setIsFormTouched(!!watchedUsername || !!watchedPassword)
  }, [watchedUsername, watchedPassword])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const handleDemoCredentialClick = useCallback((credential: DemoCredential) => {
    setSelectedCredential(credential)
    setValue('username', credential.username, { shouldValidate: true })
    setValue('password', credential.password, { shouldValidate: true })
    toast.success(`Demo credentials loaded for ${credential.role}`, {
      icon: <CheckCircle2 className="h-4 w-4" />,
    })
  }, [setValue])

  const onSubmit = async (data: LoginForm) => {
    try {
      await dispatch(login(data)).unwrap()
      toast.success('Welcome back! Login successful.', {
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    } catch (error) {
      // Error is handled by the slice and displayed via useEffect
    }
  }

  const getInputClassName = (fieldName: keyof LoginForm) => {
    const hasError = errors[fieldName]
    const isTouched = touchedFields[fieldName]
    
    let baseClasses = "input-field pl-10 pr-4 w-full transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
    
    if (hasError) {
      baseClasses += " border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200"
    } else if (isTouched && !hasError) {
      baseClasses += " border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200"
    }
    
    return baseClasses
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 text-center">
            <div className="mx-auto h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              Internal Exam Management
            </h2>
            <p className="mt-2 text-primary-100">
              Secure portal for academic excellence
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className={`h-5 w-5 ${errors.username ? 'text-red-400' : touchedFields.username && !errors.username ? 'text-green-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                      {...register('username')}
                      type="text"
                      autoComplete="username"
                      autoFocus
                      className={getInputClassName('username')}
                      placeholder="Enter your username"
                    />
                    {touchedFields.username && !errors.username && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      </div>
                    )}
                  </div>
                  {errors.username && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.username.message}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={`h-5 w-5 ${errors.password ? 'text-red-400' : touchedFields.password && !errors.password ? 'text-green-400' : 'text-gray-400'}`} />
                    </div>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`${getInputClassName('password')} pr-12`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={togglePasswordVisibility}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.password.message}
                    </div>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      {...register('rememberMe')}
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                      Remember me for 30 days
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isValid}
                className="w-full flex justify-center items-center space-x-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Sign In Securely</span>
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Quick Demo Access</span>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-3">
                {demoCredentials.map((credential) => {
                  const Icon = credential.icon
                  const isSelected = selectedCredential?.role === credential.role
                  
                  return (
                    <button
                      key={credential.role}
                      type="button"
                      onClick={() => handleDemoCredentialClick(credential)}
                      className={`${credential.color} ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:shadow-md'} p-3 rounded-lg border transition-all duration-200 text-left group hover:scale-105`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="font-semibold text-sm text-gray-800">{credential.role}</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div><span className="font-medium">User:</span> {credential.username}</div>
                        <div><span className="font-medium">Pass:</span> {credential.password}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              <p className="mt-4 text-xs text-gray-500 text-center">
                Click any demo card to auto-fill credentials • For testing purposes only
              </p>
            </div>

            {/* Security Notice */}
            {isFormTouched && (
              <div className="mt-6 flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <Shield className="h-4 w-4 text-gray-400" />
                <span>Your login attempt is secured with end-to-end encryption</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
