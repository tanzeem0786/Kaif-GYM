import { ArrowDown, ArrowUp, Dumbbell, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { MembershipStatusBadge } from '../../components/memberships/MembershipStatusBadge.jsx'
import { listMemberships } from '../../services/membershipApi.js'
import { formatMembershipDate, formatRupeesFromPaise } from '../../utils/membershipFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function MembershipsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const memberId = searchParams.get('memberId') || ''
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState('desc')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listMemberships(
      {
        page,
        limit: 10,
        search,
        status: status || undefined,
        memberId: memberId || undefined,
        sortBy: 'startDate',
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
          setError(getApiErrorMessage(requestError, 'Could not load memberships.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [memberId, page, refreshToken, search, sortOrder, status])

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

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setPage(1)
    setLoading(true)
    setSearchParams({})
  }

  const memberships = result?.memberships ?? []
  const pagination = result?.pagination
  const hasFilters = Boolean(search || status || memberId)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-secondary">Member subscriptions</p>
            {/* <span className="rounded-md border border-border px-2 py-0.5 text-xs text-text-secondary">M5</span> */}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Memberships</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Assignments and renewals are saved as separate historical records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/membership-plans" variant="secondary">Manage plans</Button>
          <Button as={Link} to="/memberships/new">
            <Plus aria-hidden="true" className="size-4" />
            Assign membership
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto_auto]" onSubmit={applySearch}>
          <label className="relative">
            <span className="sr-only">Search memberships</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Code, member or plan"
              value={searchInput}
            />
          </label>
          <label>
            <span className="sr-only">Filter memberships by status</span>
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => {
                setLoading(true)
                setPage(1)
                setStatus(event.target.value)
              }}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
              {/* <option value="frozen">Frozen</option> */}
            </select>
          </label>
          <Button type="submit" variant="secondary">Search</Button>
          {hasFilters && <Button onClick={clearFilters} type="button" variant="ghost">Clear</Button>}
        </form>
        {memberId && (
          <p className="mt-3 text-xs text-text-muted">
            Showing membership history for the selected member. Clear filters to view all members.
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">Membership history</h3>
            <p className="mt-1 text-xs text-text-muted">
              {pagination ? `${pagination.total} records` : 'Membership records'}
            </p>
          </div>
          <Button
            aria-label={`Sort by start date ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
            className="min-h-9 px-3"
            onClick={() => {
              setLoading(true)
              setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
            }}
            variant="secondary"
          >
            Start date
            {sortOrder === 'desc' ? <ArrowDown aria-hidden="true" className="size-4" /> : <ArrowUp aria-hidden="true" className="size-4" />}
          </Button>
        </div>
        {error && (
          <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert">
            <p className="text-sm text-danger">{error}</p>
            <Button className="mt-3" onClick={() => { setLoading(true); setRefreshToken((value) => value + 1) }} variant="secondary">Retry</Button>
          </div>
        )}
        {loading && (
          <div aria-live="polite" className="space-y-3 p-5">
            <p className="text-sm text-text-secondary">Loading memberships…</p>
            <div className="h-14 animate-pulse rounded-xl bg-surface-elevated" />
            <div className="h-14 animate-pulse rounded-xl bg-surface-elevated" />
          </div>
        )}
        {!loading && !error && memberships.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-text-secondary">
              <Dumbbell aria-hidden="true" className="size-5" />
            </span>
            <h4 className="mt-4 text-base font-semibold">No memberships found</h4>
            <p className="mt-2 text-sm text-text-secondary">
              {hasFilters ? 'Try another search or filter.' : 'Assign a plan to an existing member to begin membership history.'}
            </p>
            {!hasFilters && <Button as={Link} className="mt-4" to="/memberships/new"><Plus aria-hidden="true" className="size-4" />Assign membership</Button>}
          </div>
        )}
        {!loading && !error && memberships.length > 0 && (
          <>
            <div className="divide-y divide-border">
              {memberships.map((membership) => (
                <Link
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-hover sm:flex-row sm:items-center sm:justify-between"
                  key={membership._id}
                  to={`/memberships/${membership._id}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-primary">{membership.member?.fullName ?? membership.memberSnapshot?.fullName}</span>
                      <MembershipStatusBadge status={membership.status} />
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {membership.membershipCode}
                      <span className="mx-2 text-text-muted">·</span>
                      {membership.planSnapshot?.name}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatMembershipDate(membership.startDate)} – {formatMembershipDate(membership.expiryDate)} (expiry boundary)
                    </p>
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {formatRupeesFromPaise(membership.totalFeePaise)}
                  </span>
                </Link>
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
    </div>
  )
}
