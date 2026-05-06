import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import LoginPage from './components/auth/LoginPage.jsx'
import RegisterPage from './components/auth/RegisterPage.jsx'
import GoogleCallbackPage from './components/auth/GoogleCallbackPage.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Dashboard from './components/Dashboard.jsx'
import LandingPage from './components/LandingPage.jsx'
import useAuthStore from './store/authStore.js'


const WhiteboardPage = lazy(() => import('./components/canvas/WhiteboardPage.jsx'))
const SharedBoardPage = lazy(() => import('./components/canvas/SharedBoardPage.jsx'))

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-screen bg-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading canvas...</p>
    </div>
  </div>
)

export default function App() {
  const { token } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/google-callback" element={token ? <Navigate to="/dashboard" replace /> : <GoogleCallbackPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/board/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <WhiteboardPage />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/shared/:token" element={
          <Suspense fallback={<LoadingFallback />}>
            <SharedBoardPage />
          </Suspense>
        } />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}