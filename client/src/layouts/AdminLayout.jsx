import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button.jsx'
import { Sidebar } from '../components/layout/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../utils/apiError.js'

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'A'
  )
}

export function AdminLayout() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const pageTitle = location.pathname.startsWith('/commission-agreements') ||
    location.pathname.includes('/commission-agreements')
    ? 'Commission Agreements'
    : location.pathname.startsWith('/membership-plans')
    ? 'Membership Plans'
    : location.pathname.startsWith('/memberships')
      ? 'Memberships'
      : location.pathname.startsWith('/trainers')
        ? 'Trainers'
        : location.pathname.startsWith('/payments')
          ? 'Payments'
      : location.pathname.startsWith('/members')
        ? 'Members'
        : 'Dashboard'

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(getApiErrorMessage(error, 'Could not log out. Please try again.'))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 lg:hidden">
            <span className="text-sm font-semibold text-text-primary">Navigation</span>
            <Button
              aria-label="Close navigation"
              className="size-10 min-h-10 p-0"
              variant="ghost"
              onClick={() => setSidebarOpen(false)}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                aria-label="Open navigation"
                className="size-10 min-h-10 shrink-0 p-0 lg:hidden"
                variant="ghost"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
              <div>
                <p className="text-xs text-text-muted">Admin workspace</p>
                <h1 className="mt-0.5 truncate text-base font-semibold text-text-primary">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  aria-label={admin?.name || 'Administrator'}
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-text-primary"
                  title={admin?.name || 'Administrator'}
                >
                  {getInitials(admin?.name)}
                </span>
                <span className="hidden max-w-40 sm:block">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {admin?.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">Administrator</span>
                </span>
              </div>
              <Button
                aria-label="Log out"
                className="min-h-10 px-3"
                variant="secondary"
                loading={loggingOut}
                onClick={handleLogout}
              >
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          </div>
          {logoutError && (
            <p className="border-t border-danger/20 px-4 py-2 text-sm text-danger sm:px-7 lg:px-10">
              {logoutError}
            </p>
          )}
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
