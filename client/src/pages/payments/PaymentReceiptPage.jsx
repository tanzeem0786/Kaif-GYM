import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { getPaymentReceipt } from '../../services/paymentApi.js'
import { formatMembershipDate, formatRupeesFromPaise } from '../../utils/membershipFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function PaymentReceiptPage() {
  const { paymentId } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getPaymentReceipt(paymentId, { signal: controller.signal })
      .then((data) => { setReceipt(data); setError('') })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load receipt.'))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [paymentId])

  if (loading) return <p aria-live="polite" className="p-5 text-sm text-text-secondary">Loading receipt…</p>
  if (!receipt) return <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger" role="alert">{error || 'Receipt not found'}</p>

  const payment = receipt.payment
  const netReceivedPaise = payment.amountPaise - (payment.reversedAmountPaise ?? 0)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to={`/payments/${payment._id}`}>
          <ArrowLeft aria-hidden="true" className="size-4" />Payment details
        </Link>
        <Button onClick={() => window.print()} variant="secondary"><Printer aria-hidden="true" className="size-4" />Print receipt</Button>
      </div>
      <Card className="p-6 sm:p-10">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-start">
          <div><p className="text-sm font-semibold text-text-secondary">KAIF&apos;S GYM</p><h1 className="mt-2 text-2xl font-semibold">Payment receipt</h1><p className="mt-1 text-sm text-text-muted">Original payment and linked corrections</p></div>
          <div className="sm:text-right"><p className="text-xs text-text-muted">Transaction reference</p><p className="mt-1 font-mono text-sm font-medium">{payment.transactionCode}</p><p className="mt-1 text-sm text-text-secondary">{formatMembershipDate(payment.paymentDate)}</p></div>
        </div>
        <dl className="grid gap-5 border-b border-border py-6 sm:grid-cols-2">
          <div><dt className="text-xs text-text-muted">Received from</dt><dd className="mt-1 text-sm font-medium">{payment.member?.firstName} {payment.member?.lastName}</dd><dd className="mt-1 text-xs text-text-secondary">{payment.member?.memberCode} · {payment.member?.phone}</dd></div>
          <div><dt className="text-xs text-text-muted">Membership</dt><dd className="mt-1 text-sm font-medium">{payment.membership?.membershipCode}</dd></div>
          <div><dt className="text-xs text-text-muted">Payment method</dt><dd className="mt-1 text-sm">{payment.paymentMethod?.toUpperCase()}</dd></div>
          {payment.referenceNumber && <div><dt className="text-xs text-text-muted">UPI reference</dt><dd className="mt-1 break-all text-sm">{payment.referenceNumber}</dd></div>}
          <div><dt className="text-xs text-text-muted">Recorded by</dt><dd className="mt-1 text-sm">{payment.recordedBy?.name ?? 'Administrator'}</dd></div>
        </dl>
        <div className="flex items-center justify-between gap-3 py-6">
          <p className="text-sm font-medium">Original payment amount</p>
          <p className="text-xl font-semibold">{formatRupeesFromPaise(payment.amountPaise)}</p>
        </div>
        {receipt.reversals?.length > 0 && (
          <div className="border-t border-border py-5">
            <h2 className="text-sm font-semibold">Linked reversals</h2>
            <ul className="mt-3 divide-y divide-border">
              {receipt.reversals.map((reversal) => <li className="flex justify-between gap-3 py-3 text-sm" key={reversal._id}><span>{reversal.transactionCode} · {formatMembershipDate(reversal.paymentDate)}</span><span>−{formatRupeesFromPaise(reversal.amountPaise)}</span></li>)}
            </ul>
            <div className="flex justify-between border-t border-border pt-4 text-sm font-semibold"><span>Net received after corrections</span><span>{formatRupeesFromPaise(netReceivedPaise)}</span></div>
          </div>
        )}
        {payment.notes && <p className="border-t border-border pt-5 text-sm text-text-secondary">Notes: {payment.notes}</p>}
        <p className="mt-7 border-t border-border pt-5 text-xs text-text-muted">This receipt reflects recorded payment history. Reversals are ledger corrections and do not confirm an external cash or UPI payout.</p>
      </Card>
    </div>
  )
}
