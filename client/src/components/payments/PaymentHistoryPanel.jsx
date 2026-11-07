import { ArrowUpRight, CreditCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'
import { Card } from '../common/Card.jsx'
import { listMemberPayments } from '../../services/paymentApi.js'
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

export function PaymentHistoryPanel({ memberId }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listMemberPayments(memberId, { page: 1, limit: 5 }, { signal: controller.signal })
      .then((result) => {
        setPayments(result.payments)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load payment history.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [memberId, retry])

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">Payment history</h3>
          <p className="mt-1 text-xs text-text-muted">Payments and linked correction records</p>
        </div>
        <Button as={Link} className="min-h-9 px-3" to={`/payments?memberId=${memberId}`} variant="secondary">
          View all
        </Button>
      </div>
      {loading ? (
        <p aria-live="polite" className="p-5 text-sm text-text-secondary">Loading payment history…</p>
      ) : error ? (
        <div className="p-5">
          <p className="text-sm text-danger" role="alert">{error}</p>
          <Button className="mt-3" onClick={() => { setLoading(true); setRetry((value) => value + 1) }} variant="secondary">Retry</Button>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex min-h-28 items-center justify-center gap-2 px-5 text-sm text-text-secondary">
          <CreditCard aria-hidden="true" className="size-4" />
          No payment records for this member.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((payment) => (
            <li className="flex items-center justify-between gap-3 px-5 py-3" key={payment._id}>
              <div className="min-w-0">
                <Link className="block truncate text-sm font-medium text-text-primary hover:underline" to={`/payments/${payment._id}`}>
                  {payment.transactionCode}
                </Link>
                <p className="mt-1 text-xs text-text-muted">{formatDate(payment.paymentDate)} · {payment.type === 'reversal' ? 'Reversal' : payment.paymentMethod?.toUpperCase()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={payment.type === 'reversal' ? 'warning' : 'neutral'}>
                  {payment.type === 'reversal' ? 'Reversal' : 'Payment'}
                </Badge>
                <span className="text-sm font-medium text-text-primary">{formatRupeesFromPaise(payment.amountPaise)}</span>
                <ArrowUpRight aria-hidden="true" className="size-4 text-text-muted" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
