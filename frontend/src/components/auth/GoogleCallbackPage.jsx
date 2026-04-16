import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import useAuthStore from '../../store/authStore.js'
import { getMe } from '../../services/authService.js'

export default function GoogleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const completeGoogleLogin = async () => {
      const token = searchParams.get('token')

      if (!token) {
        toast.error('Google login failed. Please try again.')
        navigate('/login', { replace: true })
        return
      }

      try {
        setUser(null, token)
        const profile = await getMe()
        setUser(profile, token)
        toast.success('Logged in with Google!')
        navigate('/dashboard', { replace: true })
      } catch (error) {
        setUser(null, null)
        toast.error(error.response?.data?.message || 'Google login failed. Please try again.')
        navigate('/login', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    completeGoogleLogin()
  }, [navigate, searchParams, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Toaster />
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center">
        <div className="w-10 h-10 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <h1 className="text-2xl font-bold text-blue-600 mb-2">SmartBoard</h1>
        <p className="text-gray-600">
          {loading ? 'Finishing Google login...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
}
