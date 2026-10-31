import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { TextField } from '../../components/common/TextField.jsx'
import { Brand } from '../../components/layout/Brand.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Enter your email and password to continue.')
      return
    }

    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      const destination = location.state?.from?.pathname || '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Unable to sign in. Check your details and try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg text-text-primary">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1fr_0.9fr]">
        <section className="flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-16">
          <Brand />
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16">
            <Badge className="mb-6 w-fit" variant="neutral">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Private admin access
            </Badge>
            <p className="text-sm font-medium text-text-secondary">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sign in to your workspace
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Use your administrator account to continue to Kaif&apos;s GYM.
            </p>

            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              <TextField
                autoComplete="username"
                id="email"
                label="Email address"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                type="email"
                value={email}
              />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <TextField
                    autoComplete="current-password"
                    className="pr-12"
                    id="password"
                    label=""
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1 flex size-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-hover hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              {errorMessage && (
                <p
                  aria-live="polite"
                  className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}
              <Button className="w-full" loading={submitting} type="submit">
                Sign in
                {!submitting && <ArrowRight aria-hidden="true" className="size-4" />}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs leading-5 text-text-muted">
              Access is restricted to the gym administrator. Contact your system administrator if
              you need help signing in.
            </p>
          </div>
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} Kaif&apos;s GYM</p>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-border bg-surface px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="pointer-events-none absolute -right-36 -top-32 size-[520px] rounded-full border border-border/70" />
          <div className="pointer-events-none absolute -right-16 -top-12 size-[360px] rounded-full border border-border/70" />
          <div className="relative flex justify-end">
            <Badge variant="neutral">OWNER PORTAL</Badge>
          </div>
          <div className="relative max-w-xl">
            <div className="mb-8 flex size-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated">
              <ShieldCheck aria-hidden="true" className="size-7 text-text-primary" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
              One workspace. One clear view.
            </p>
            <h2 className="mt-5 text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              Built for the everyday work of your gym.
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-text-secondary">
              A focused admin space for managing Kaif&apos;s GYM. Tools will be added milestone by
              milestone.
            </p>
          </div>
          <p className="relative text-xs text-text-muted">Secure access · Designed for the owner</p>
        </aside>
      </div>
    </main>
  )
}
