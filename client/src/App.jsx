import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx'
import { LoginPage } from './pages/auth/LoginPage.jsx'
import { MemberDetailsPage } from './pages/members/MemberDetailsPage.jsx'
import { MemberFormPage } from './pages/members/MemberFormPage.jsx'
import { MembersPage } from './pages/members/MembersPage.jsx'
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
              <Route path="/members" element={<MembersPage />} />
              <Route path="/members/new" element={<MemberFormPage />} />
              <Route path="/members/:memberId/edit" element={<MemberFormPage />} />
              <Route path="/members/:memberId" element={<MemberDetailsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
