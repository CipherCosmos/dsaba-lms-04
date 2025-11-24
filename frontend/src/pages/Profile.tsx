import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { User, Mail, Phone, Image, FileText, Save, Loader2, Camera } from 'lucide-react'
import { profileAPI } from '../services/api'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { fetchCurrentUser } from '../store/slices/authSlice'
import type { AxiosErrorResponse } from '../core/types'

const schema = yup.object({
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .trim(),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .trim(),
  email: yup
    .string()
    .email('Invalid email address')
    .required('Email is required'),
  phone_number: yup
    .string()
    .nullable()
    .matches(/^[\d\s\+\-\(\)]{10,20}$/, 'Invalid phone number format'),
  avatar_url: yup
    .string()
    .nullable()
    .url('Invalid URL format'),
  bio: yup
    .string()
    .nullable()
    .max(500, 'Bio must not exceed 500 characters'),
})

type ProfileForm = yup.InferType<typeof schema>

const Profile = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>({
    resolver: yupResolver(schema),
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const profile = await profileAPI.getMyProfile()
      reset({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: profile.phone_number || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
      })
    } catch (error: AxiosErrorResponse) {
      toast.error(error.response?.data?.detail || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProfileForm) => {
    setIsSubmitting(true)
    try {
      await profileAPI.updateMyProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number || undefined,
        avatar_url: data.avatar_url || undefined,
        bio: data.bio || undefined,
      })
      toast.success('Profile updated successfully')
      // Reload profile to get updated data
      await loadProfile()
      // Refresh user state in Redux
      dispatch(fetchCurrentUser())
    } catch (error: AxiosErrorResponse) {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your profile information</p>
        </div>

        {/* Avatar Section */}
        <div className="mb-8 flex items-center space-x-6">
          <div className="relative">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.full_name || `${user?.first_name} ${user?.last_name}` || 'User Avatar'}
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200">
                <User className="h-12 w-12 text-blue-600" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.full_name || `${user?.first_name} ${user?.last_name}`}
            </h2>
            <p className="text-gray-600">{user?.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                  >
                    {role}
                  </span>
                ))
              ) : (
                user?.role && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {user.role}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                First Name
              </label>
              <input
                {...register('first_name')}
                type="text"
                id="first_name"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Last Name
              </label>
              <input
                {...register('last_name')}
                type="text"
                id="last_name"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
            {user?.email_verified ? (
              <p className="mt-1 text-sm text-green-600">✓ Email verified</p>
            ) : (
              <p className="mt-1 text-sm text-yellow-600">⚠ Email not verified</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Phone Number
            </label>
            <input
              {...register('phone_number')}
              type="tel"
              id="phone_number"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1234567890"
            />
            {errors.phone_number && (
              <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
            )}
          </div>

          {/* Avatar URL */}
          <div>
            <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-2">
              <Image className="inline h-4 w-4 mr-1" />
              Avatar URL
            </label>
            <input
              {...register('avatar_url')}
              type="url"
              id="avatar_url"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/avatar.jpg"
            />
            {errors.avatar_url && (
              <p className="mt-1 text-sm text-red-600">{errors.avatar_url.message}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Bio
            </label>
            <textarea
              {...register('bio')}
              id="bio"
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Profile

