import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './components/auth/LoginPage.jsx'
import RegisterPage from './components/auth/RegisterPage.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Dashboard from './components/Dashboard.jsx'
import WhiteboardPage from './components/canvas/WhiteboardPage.jsx'
import SharedBoardPage from './components/canvas/SharedBoardPage.jsx'
import useAuthStore from './store/authStore.js'

export default function App() {
  const { token } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/board/:id" element={
          <ProtectedRoute>
            <WhiteboardPage />
          </ProtectedRoute>
        } />
        <Route path="/shared/:token" element={<SharedBoardPage />} />
      </Routes>
    </BrowserRouter>
  )
}