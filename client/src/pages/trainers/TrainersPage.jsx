import { ChevronLeft, ChevronRight, Dumbbell, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
// import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { TrainerStatusBadge } from '../../components/trainers/TrainerStatusBadge.jsx'
import { listTrainers } from '../../services/trainerApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function TrainersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listTrainers(
      { page, limit: 10, search, status: status || undefined, sortBy: 'createdAt', sortOrder: 'desc' },
      { signal: controller.signal },
    )
      .then((response) => {
        setResult(response)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load trainers.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [page, refresh, search, status])

  function applySearch(event) {
    event.preventDefault()
    setPage(1)
    setLoading(true)
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) setRefresh((current) => current + 1)
    else setSearch(nextSearch)
  }

  const trainers = result?.trainers ?? []
  const pagination = result?.pagination
  const hasFilters = Boolean(search || status)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell aria-hidden="true" className="size-5 text-text-secondary" />
            <p className="text-sm text-text-secondary">Trainer management</p>
            {/* <Badge variant="neutral">M6</Badge> */}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Trainers</h2>
          <p className="mt-2 text-sm text-text-secondary">Manage trainer profiles and review member assignment history.</p>
        </div>
        <Button as={Link} to="/trainers/new"><Plus aria-hidden="true" className="size-4" />Add trainer</Button>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto_auto]" onSubmit={applySearch}>
          <label className="relative">
            <span className="sr-only">Search trainers</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, trainer code, phone, email or specialization"
              value={searchInput}
            />
          </label>
          <label>
            <span className="sr-only">Filter by trainer status</span>
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => { setPage(1); setLoading(true); setStatus(event.target.value) }}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">Search</Button>
          {hasFilters && (
            <Button
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setStatus('')
                setPage(1)
                setLoading(true)
              }}
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Trainer directory</h3>
          <p className="mt-1 text-xs text-text-muted">{pagination ? `${pagination.total} records` : 'Trainer profiles'}</p>
        </div>
        {error && (
          <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert">
            <p className="text-sm text-danger">{error}</p>
            <Button className="mt-3" onClick={() => { setLoading(true); setRefresh((value) => value + 1) }} variant="secondary">Retry</Button>
          </div>
        )}
        {loading && <p aria-live="polite" className="p-5 text-sm text-text-secondary">Loading trainers…</p>}
        {!loading && !error && trainers.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <Dumbbell aria-hidden="true" className="size-6 text-text-muted" />
            <h4 className="mt-3 text-base font-semibold">{hasFilters ? 'No matching trainers' : 'No trainers yet'}</h4>
            <p className="mt-1 max-w-md text-sm text-text-secondary">
              {hasFilters ? 'Try another search or clear the filters.' : 'Trainer profiles added to the gym will appear here.'}
            </p>
            {!hasFilters && <Button as={Link} className="mt-4" to="/trainers/new" variant="secondary">Add first trainer</Button>}
          </div>
        )}
        {!loading && trainers.length > 0 && (
          <>
            <div className="divide-y divide-border">
              {trainers.map((trainer) => (
                <Link
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-hover sm:flex-row sm:items-center sm:justify-between"
                  key={trainer._id}
                  to={`/trainers/${trainer._id}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">{trainer.firstName} {trainer.lastName}</p>
                      <TrainerStatusBadge status={trainer.status} />
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{trainer.trainerCode} · {trainer.phone}</p>
                    <p className="mt-1 truncate text-xs text-text-muted">
                      {trainer.specialization?.length ? trainer.specialization.join(' · ') : 'No specializations listed'}
                    </p>
                  </div>
                  <span className="text-sm text-text-secondary">{trainer.email || 'Email not provided'}</span>
                </Link>
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <p className="text-xs text-text-muted">Page {pagination.page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <Button className="min-h-9 px-3" disabled={page <= 1} onClick={() => { setPage((value) => value - 1); setLoading(true) }} variant="secondary">
                    <ChevronLeft aria-hidden="true" className="size-4" />Previous
                  </Button>
                  <Button className="min-h-9 px-3" disabled={page >= pagination.totalPages} onClick={() => { setPage((value) => value + 1); setLoading(true) }} variant="secondary">
                    Next<ChevronRight aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
