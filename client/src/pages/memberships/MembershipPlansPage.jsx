import { ArrowDown, ArrowUp, Check, Edit3, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { ConfirmDialog } from '../../components/members/ConfirmDialog.jsx'
import { listMembershipPlans, updateMembershipPlanStatus } from '../../services/membershipApi.js'
import { formatRupeesFromPaise } from '../../utils/membershipFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function MembershipPlansPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('isActive') || '')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState('asc')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listMembershipPlans(
      {
        page,
        limit: 10,
        search,
        isActive: activeFilter || undefined,
        sortBy: 'name',
        sortOrder,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        setResult(response)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load membership plans.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [activeFilter, page, refreshToken, search, sortOrder])

  function applySearch(event) {
    event.preventDefault()
    setLoading(true)
    setPage(1)
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) {
      setRefreshToken((value) => value + 1)
    } else {
      setSearch(nextSearch)
    }
  }

  async function changeStatus() {
    setBusy(true)
    setError('')
    try {
      await updateMembershipPlanStatus(confirmation._id, !confirmation.isActive)
      setConfirmation(null)
      setLoading(true)
      setRefreshToken((value) => value + 1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not update the plan status.'))
      setConfirmation(null)
    } finally {
      setBusy(false)
    }
  }

  const plans = result?.plans ?? []
  const pagination = result?.pagination
  const hasFilters = Boolean(search || activeFilter)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-secondary">Membership management</p>
            {/* <Badge variant="neutral">M5</Badge> */}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Membership plans</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Manage the plan options used for member assignments and renewals.
          </p>
        </div>
        <Button as={Link} to="/membership-plans/new">
          <Plus aria-hidden="true" className="size-4" />
          Add plan
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto_auto]" onSubmit={applySearch}>
          <label className="relative">
            <span className="sr-only">Search plans</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search plan names"
              value={searchInput}
            />
          </label>
          <label>
            <span className="sr-only">Filter plans by status</span>
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => {
                setLoading(true)
                setPage(1)
                setActiveFilter(event.target.value)
              }}
              value={activeFilter}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">Search</Button>
          {hasFilters && (
            <Button
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setActiveFilter('')
                setPage(1)
                setLoading(true)
                setSearchParams({})
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">Available plans</h3>
            <p className="mt-1 text-xs text-text-muted">
              {pagination ? `${pagination.total} records` : 'Plan catalogue'}
            </p>
          </div>
          <Button
            aria-label={`Sort by plan name ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            className="min-h-9 px-3"
            onClick={() => {
              setLoading(true)
              setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
            }}
            variant="secondary"
          >
            Plan name
            {sortOrder === 'asc' ? <ArrowUp aria-hidden="true" className="size-4" /> : <ArrowDown aria-hidden="true" className="size-4" />}
          </Button>
        </div>
        {error && (
          <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert">
            <p className="text-sm text-danger">{error}</p>
            <Button className="mt-3" onClick={() => { setLoading(true); setRefreshToken((value) => value + 1) }} variant="secondary">
              Retry
            </Button>
          </div>
        )}
        {loading && (
          <div aria-live="polite" className="space-y-3 p-5">
            <p className="text-sm text-text-secondary">Loading membership plans…</p>
            <div className="h-14 animate-pulse rounded-xl bg-surface-elevated" />
            <div className="h-14 animate-pulse rounded-xl bg-surface-elevated" />
          </div>
        )}
        {!loading && !error && plans.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <h4 className="text-base font-semibold">No membership plans found</h4>
            <p className="mt-2 text-sm text-text-secondary">
              {hasFilters ? 'Try another search or filter.' : 'Create a plan to make it available for member assignments.'}
            </p>
            {!hasFilters && (
              <Button as={Link} className="mt-4" to="/membership-plans/new">
                <Plus aria-hidden="true" className="size-4" />
                Create a plan
              </Button>
            )}
          </div>
        )}
        {!loading && !error && plans.length > 0 && (
          <>
            <div className="divide-y divide-border">
              {plans.map((plan) => (
                <article className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={plan._id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{plan.name}</h4>
                      <Badge variant={plan.isActive ? 'success' : 'neutral'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'} · {formatRupeesFromPaise(plan.pricePaise)}
                    </p>
                    {plan.description && <p className="mt-1 text-sm text-text-muted">{plan.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button as={Link} className="min-h-10" to={`/membership-plans/${plan._id}/edit`} variant="secondary">
                      <Edit3 aria-hidden="true" className="size-4" />
                      Edit
                    </Button>
                    <Button
                      className="min-h-10"
                      onClick={() => setConfirmation(plan)}
                      variant="secondary"
                    >
                      {plan.isActive ? <X aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4" />}
                      {plan.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <p className="text-sm text-text-secondary">Page {page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <Button disabled={page <= 1} onClick={() => { setPage((value) => value - 1); setLoading(true) }} variant="secondary">Previous</Button>
                  <Button disabled={page >= pagination.totalPages} onClick={() => { setPage((value) => value + 1); setLoading(true) }} variant="secondary">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      {confirmation && (
        <ConfirmDialog
          busy={busy}
          confirmLabel={confirmation.isActive ? 'Deactivate plan' : 'Reactivate plan'}
          description={confirmation.isActive
            ? 'The plan will no longer be selectable for new memberships. Existing memberships keep their saved plan and price.'
            : 'The plan will become available for new memberships again.'}
          onCancel={() => setConfirmation(null)}
          onConfirm={changeStatus}
          title={confirmation.isActive ? 'Deactivate this plan?' : 'Reactivate this plan?'}
        />
      )}
    </div>
  )
}
