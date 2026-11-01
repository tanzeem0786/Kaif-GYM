import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Search, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { MemberStatusBadge } from '../../components/members/MemberStatusBadge.jsx'
import { listMembers } from '../../services/memberApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

const initialFilters = { searchInput: '', search: '', status: '' }

function formatDate(value) {
  if (!value) {
    return '—'
  }
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function MembersPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listMembers(
      {
        page,
        limit: 10,
        search: filters.search,
        status: filters.status || undefined,
        sortBy: 'registrationDate',
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
          setError(getApiErrorMessage(requestError, 'Could not load members.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [filters.search, filters.status, page, refreshToken, sortOrder])

  function applyFilters(event) {
    event.preventDefault()
    setLoading(true)
    setPage(1)
    const search = filters.searchInput.trim()
    if (search === filters.search && page === 1) {
      setRefreshToken((current) => current + 1)
    } else {
      setFilters((current) => ({ ...current, search }))
    }
  }

  function clearFilters() {
    setLoading(true)
    setPage(1)
    setFilters(initialFilters)
    if (filters.search === '' && filters.status === '' && page === 1) {
      setRefreshToken((current) => current + 1)
    }
  }

  function changePage(nextPage) {
    setLoading(true)
    setPage(nextPage)
  }

  function toggleSort() {
    setLoading(true)
    setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'))
  }

  const members = result?.members ?? []
  const pagination = result?.pagination
  const hasFilters = Boolean(filters.search || filters.status)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound aria-hidden="true" className="size-5 text-text-secondary" />
            <p className="text-sm text-text-secondary">Member management</p>
            <Badge variant="neutral">M4</Badge>
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Members</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Create and maintain member profiles, with membership assignment and history available from each profile.
          </p>
        </div>
        <Button as={Link} to="/members/new">
          <Plus aria-hidden="true" className="size-4" />
          Add member
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto_auto]" onSubmit={applyFilters}>
          <label className="relative">
            <span className="sr-only">Search members</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) =>
                setFilters((current) => ({ ...current, searchInput: event.target.value }))
              }
              placeholder="Name, member code, phone or email"
              value={filters.searchInput}
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => {
                setLoading(true)
                setPage(1)
                setFilters((current) => ({ ...current, status: event.target.value }))
              }}
              value={filters.status}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {hasFilters && (
            <Button onClick={clearFilters} type="button" variant="ghost">
              Clear
            </Button>
          )}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">Member directory</h3>
            <p className="mt-1 text-xs text-text-muted">
              {pagination ? `${pagination.total} records` : 'Member profiles'}
            </p>
          </div>
          <Button
            aria-label={`Sort by registration date ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
            className="min-h-9 px-3"
            onClick={toggleSort}
            variant="secondary"
          >
            Registration date
            {sortOrder === 'desc' ? (
              <ArrowDown aria-hidden="true" className="size-4" />
            ) : (
              <ArrowUp aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert">
            <p className="text-sm text-danger">{error}</p>
            <Button
              className="mt-3"
              onClick={() => {
                setLoading(true)
                setRefreshToken((current) => current + 1)
              }}
              variant="secondary"
            >
              Retry
            </Button>
          </div>
        )}

        {loading && (
          <div aria-live="polite" className="space-y-3 p-5">
            <p className="text-sm text-text-secondary">Loading members…</p>
            <div className="h-10 animate-pulse rounded-xl bg-surface-elevated" />
            <div className="h-10 animate-pulse rounded-xl bg-surface-elevated" />
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-text-secondary">
              <UsersRound aria-hidden="true" className="size-5" />
            </span>
            <h4 className="mt-4 text-base font-semibold">
              {hasFilters ? 'No matching members' : 'No members yet'}
            </h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
              {hasFilters
                ? 'Try another search or clear the selected filters.'
                : 'Add a member profile to begin building the directory.'}
            </p>
            {hasFilters ? (
              <Button className="mt-5" onClick={clearFilters} variant="secondary">
                Clear filters
              </Button>
            ) : (
              <Button as={Link} className="mt-5" to="/members/new">
                <Plus aria-hidden="true" className="size-4" />
                Add member
              </Button>
            )}
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <>
            <div className="divide-y divide-border">
              {members.map((member) => (
                <Link
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-hover/60 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] sm:items-center"
                  key={member._id}
                  to={`/members/${member._id}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">{member.memberCode}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text-secondary">{member.phone}</span>
                    <span className="mt-1 block truncate text-xs text-text-muted">
                      {member.email || 'No email provided'}
                    </span>
                  </span>
                  <span className="text-xs text-text-secondary">
                    Registered {formatDate(member.registrationDate)}
                  </span>
                  <MemberStatusBadge status={member.status} />
                </Link>
              ))}
            </div>
            {pagination && (
              <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-text-secondary">
                  Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                  <span className="text-text-muted"> · {pagination.total} members</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Previous page"
                    className="min-h-9 px-3"
                    disabled={pagination.page <= 1}
                    onClick={() => changePage(pagination.page - 1)}
                    variant="secondary"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                    Previous
                  </Button>
                  <Button
                    aria-label="Next page"
                    className="min-h-9 px-3"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => changePage(pagination.page + 1)}
                    variant="secondary"
                  >
                    Next
                    <ChevronRight aria-hidden="true" className="size-4" />
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
