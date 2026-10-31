import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx'
import { LoginPage } from './pages/auth/LoginPage.jsx'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
