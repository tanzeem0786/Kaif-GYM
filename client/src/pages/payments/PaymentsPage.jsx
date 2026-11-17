import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CreditCard, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { PaymentStatusBadge } from '../../components/payments/PaymentStatusBadge.jsx'
import { listPayments } from '../../services/paymentApi.js'
import { formatRupeesFromPaise } from '../../utils/membershipFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const memberId = searchParams.get('memberId') || ''
  const membershipId = searchParams.get('membershipId') || ''
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState('desc')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listPayments(
      {
        page,
        limit: 10,
        search,
        memberId: memberId || undefined,
        membershipId: membershipId || undefined,
        paymentMethod: paymentMethod || undefined,
        status: status || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortBy: 'paymentDate',
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
          setError(getApiErrorMessage(requestError, 'Could not load payments.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [fromDate, memberId, membershipId, page, paymentMethod, refresh, search, sortOrder, status, toDate])

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setLoading(true)
    const nextSearch = searchInput.trim()
    if (nextSearch === search && page === 1) setRefresh((value) => value + 1)
    else setSearch(nextSearch)
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setPaymentMethod('')
    setStatus('')
    setFromDate('')
    setToDate('')
    setPage(1)
    setLoading(true)
    setSearchParams({})
  }

  const payments = result?.payments ?? []
  const pagination = result?.pagination
  const hasFilters = Boolean(search || paymentMethod || status || fromDate || toDate || memberId || membershipId)

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard aria-hidden="true" className="size-5 text-text-secondary" />
            <p className="text-sm text-text-secondary">Financial records</p>
            {/* <Badge variant="neutral">M7</Badge> */}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Payments</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Review payments and linked reversals. Completed transactions are retained as history.
          </p>
        </div>
        <Button as={Link} to="/payments/new"><Plus aria-hidden="true" className="size-4" />Record payment</Button>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_150px_150px_160px_160px_auto_auto]" onSubmit={applyFilters}>
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Search payments</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Transaction code, member or phone"
              value={searchInput}
            />
          </label>
          <label>
            <span className="sr-only">Payment method</span>
            <select className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" onChange={(event) => { setPaymentMethod(event.target.value); setPage(1); setLoading(true) }} value={paymentMethod}>
              <option value="">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Transaction status</span>
            <select className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" onChange={(event) => { setStatus(event.target.value); setPage(1); setLoading(true) }} value={status}>
              <option value="">All statuses</option><option value="completed">Completed</option><option value="reversed">Reversed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            From date
            <input className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" onChange={(event) => { setFromDate(event.target.value); setPage(1); setLoading(true) }} type="date" value={fromDate} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            To date
            <input className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" onChange={(event) => { setToDate(event.target.value); setPage(1); setLoading(true) }} type="date" value={toDate} />
          </label>
          <Button className="self-end" type="submit" variant="secondary">Search</Button>
          {hasFilters && <Button className="self-end" onClick={clearFilters} type="button" variant="ghost">Clear</Button>}
        </form>
        {(memberId || membershipId) && (
          <p className="mt-3 text-xs text-text-muted">
            {memberId ? 'Showing transactions for the selected member.' : 'Showing transactions for the selected membership.'}
            {' '}Clear filters to view all payments.
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h3 className="text-sm font-semibold">Transaction history</h3><p className="mt-1 text-xs text-text-muted">{pagination ? `${pagination.total} records` : 'Payment and reversal records'}</p></div>
          <Button aria-label={`Sort by payment date ${sortOrder === 'desc' ? 'ascending' : 'descending'}`} className="min-h-9 px-3" onClick={() => { setLoading(true); setSortOrder((value) => value === 'desc' ? 'asc' : 'desc') }} variant="secondary">
            Payment date {sortOrder === 'desc' ? <ArrowDown aria-hidden="true" className="size-4" /> : <ArrowUp aria-hidden="true" className="size-4" />}
          </Button>
        </div>
        {error && <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert"><p className="text-sm text-danger">{error}</p><Button className="mt-3" onClick={() => { setLoading(true); setRefresh((value) => value + 1) }} variant="secondary">Retry</Button></div>}
        {loading && <div aria-live="polite" className="space-y-3 p-5"><p className="text-sm text-text-secondary">Loading payments…</p><div className="h-12 animate-pulse rounded-xl bg-surface-elevated" /></div>}
        {!loading && !error && payments.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
            <CreditCard aria-hidden="true" className="size-6 text-text-muted" />
            <h4 className="mt-3 text-base font-semibold">No payment records found</h4>
            <p className="mt-1 text-sm text-text-secondary">{hasFilters ? 'Try another search or clear the filters.' : 'Recorded payments and reversals will appear here.'}</p>
            {!hasFilters && <Button as={Link} className="mt-4" to="/payments/new" variant="secondary">Record first payment</Button>}
          </div>
        )}
        {!loading && payments.length > 0 && (
          <>
            <div className="divide-y divide-border">
              {payments.map((payment) => (
                <Link className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-hover sm:flex-row sm:items-center sm:justify-between" key={payment._id} to={`/payments/${payment._id}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">{payment.transactionCode}</p>
                      <PaymentStatusBadge status={payment.status} />
                      <Badge variant={payment.type === 'reversal' ? 'warning' : 'neutral'}>{payment.type === 'reversal' ? 'Reversal' : payment.paymentMethod?.toUpperCase()}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{payment.member?.fullName ?? payment.memberSnapshot?.fullName} · {payment.member?.memberCode ?? payment.memberSnapshot?.memberCode} · {payment.membership?.membershipCode}</p>
                    <p className="mt-1 text-xs text-text-muted">{formatDate(payment.paymentDate)}{payment.reversalOf ? ` · Reverses ${payment.reversalOf.transactionCode}` : ''}</p>
                  </div>
                  <span className="text-base font-semibold text-text-primary">{formatRupeesFromPaise(payment.amountPaise)}</span>
                </Link>
              ))}
            </div>
            {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-border px-5 py-4"><p className="text-xs text-text-muted">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><Button className="min-h-9 px-3" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }} variant="secondary"><ChevronLeft aria-hidden="true" className="size-4" />Previous</Button><Button className="min-h-9 px-3" disabled={page >= pagination.totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1) }} variant="secondary">Next<ChevronRight aria-hidden="true" className="size-4" /></Button></div></div>}
          </>
        )}
      </Card>
    </div>
  )
}
