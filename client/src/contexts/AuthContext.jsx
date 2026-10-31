import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { getCurrentAdmin, loginAdmin, logoutAdmin } from '../services/authApi.js'

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [admin, setAdmin] = useState(null)
  const [error, setError] = useState(null)

  const refreshSession = useCallback(async (signal) => {
    setStatus('loading')
    setError(null)

    try {
      const currentAdmin = await getCurrentAdmin({ signal })
      setAdmin(currentAdmin)
      setStatus('authenticated')
    } catch (requestError) {
      if (requestError.code === 'ERR_CANCELED') {
        return
      }

      setAdmin(null)
      if (requestError.response?.status === 401) {
        setStatus('unauthenticated')
      } else {
        setStatus('error')
        setError(requestError)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getCurrentAdmin({ signal: controller.signal })
      .then((currentAdmin) => {
        setAdmin(currentAdmin)
        setStatus('authenticated')
      })
      .catch((requestError) => {
        if (requestError.code === 'ERR_CANCELED') {
          return
        }

        setAdmin(null)
        if (requestError.response?.status === 401) {
          setStatus('unauthenticated')
        } else {
          setStatus('error')
          setError(requestError)
        }
      })
    return () => controller.abort()
  }, [])

  const login = useCallback(async (credentials) => {
    const currentAdmin = await loginAdmin(credentials)
    setAdmin(currentAdmin)
    setError(null)
    setStatus('authenticated')
    return currentAdmin
  }, [])

  const logout = useCallback(async () => {
    await logoutAdmin()
    setAdmin(null)
    setError(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo(
    () => ({ status, admin, error, login, logout, refreshSession }),
    [status, admin, error, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
