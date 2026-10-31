import { Navigate, Outlet } from 'react-router-dom'
import { LoadingScreen } from '../components/common/LoadingScreen.jsx'
import { useAuth } from '../hooks/useAuth.js'

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <LoadingScreen label="Checking your admin session" />
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
