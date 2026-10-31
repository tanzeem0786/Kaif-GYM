import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { Button } from '../components/common/Button.jsx'
import { LoadingScreen } from '../components/common/LoadingScreen.jsx'
import { getApiErrorMessage } from '../utils/apiError.js'

export function ProtectedRoute() {
  const { status, error, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingScreen label="Restoring your admin session" />
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-text-primary">
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <h1 className="text-xl font-semibold">Unable to restore session</h1>
          <p className="mt-3 text-sm text-text-secondary">
            {getApiErrorMessage(error, 'The server could not restore your session.')}
          </p>
          <Button className="mt-6 w-full" onClick={() => refreshSession()}>
            Try again
          </Button>
        </section>
      </main>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
