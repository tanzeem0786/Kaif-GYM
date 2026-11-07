import { ArrowLeft, Printer, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/TextField.jsx'
import { ConfirmDialog } from '../../components/members/ConfirmDialog.jsx'
import { PaymentStatusBadge } from '../../components/payments/PaymentStatusBadge.jsx'
import { getPayment, reversePayment } from '../../services/paymentApi.js'
import { formatMembershipDate, formatRupeesFromPaise, parseRupeesToPaise } from '../../utils/membershipFormat.js'
import { makeIdempotencyKey } from '../../utils/paymentFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function PaymentDetailsPage() {
  const { paymentId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showReversal, setShowReversal] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey)
  const [amountError, setAmountError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getPayment(paymentId, { signal: controller.signal })
      .then((data) => { setResult(data); setError('') })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load payment details.'))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [paymentId])

  const payment = result?.payment
  const reversals = result?.reversals ?? []
  const reversedAmountPaise = payment?.type === 'payment'
    ? payment.reversedAmountPaise ?? 0
    : 0
  const remainingPaise = payment ? payment.amountPaise - reversedAmountPaise : 0

  async function submitReversal() {
    const amountPaise = parseRupeesToPaise(amount)
    if (!amountPaise || amountPaise < 1) {
      setAmountError('Enter an amount greater than zero with no more than two decimal places.')
      setConfirmation(false)
      return
    }
    if (amountPaise > remainingPaise) {
      setAmountError('Reversal cannot exceed the remaining unreversed amount.')
      setConfirmation(false)
      return
    }
    setBusy(true)
    setError('')
    try {
      await reversePayment(paymentId, {
        amountPaise,
        paymentDate,
        notes: notes.trim() || null,
        idempotencyKey,
      })
      setConfirmation(false)
      setShowReversal(false)
      setLoading(true)
      const updated = await getPayment(paymentId)
      setResult(updated)
      setAmount('')
      setNotes('')
      setIdempotencyKey(makeIdempotencyKey())
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not record payment reversal.'))
    } finally {
      setBusy(false)
      setLoading(false)
    }
  }

  if (loading && !payment) {
    return <div aria-live="polite" className="p-5 text-sm text-text-secondary">Loading payment…</div>
  }
  if (!payment) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error || 'Payment not found'}</p>
        <Button as={Link} className="mt-4" to="/payments" variant="secondary">Back to payments</Button>
      </div>
    )
  }

  const member = payment.member
  const membership = payment.membership
  const original = payment.reversalOf

  return (
    <div className="space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/payments"><ArrowLeft aria-hidden="true" className="size-4" />Payments</Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-semibold tracking-tight">{payment.transactionCode}</h2>
              <PaymentStatusBadge status={payment.status} />
              <Badge variant={payment.type === 'reversal' ? 'warning' : 'neutral'}>{payment.type === 'reversal' ? 'Reversal' : payment.paymentMethod?.toUpperCase()}</Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{payment.type === 'reversal' ? 'Linked financial correction record' : 'Completed payment record'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to={`/payments/${payment._id}/receipt`} variant="secondary"><Printer aria-hidden="true" className="size-4" />Receipt</Button>
            {payment.type === 'payment' && payment.status !== 'reversed' && (
              <Button onClick={() => setShowReversal((value) => !value)} variant="secondary"><RotateCcw aria-hidden="true" className="size-4" />Record reversal</Button>
            )}
          </div>
        </div>
      </div>
      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <h3 className="text-base font-semibold">Transaction</h3>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-text-muted">Amount</dt><dd className="mt-1 text-lg font-semibold">{formatRupeesFromPaise(payment.amountPaise)}</dd></div>
            <div><dt className="text-xs text-text-muted">Transaction date</dt><dd className="mt-1 text-sm">{formatMembershipDate(payment.paymentDate)}</dd></div>
            <div><dt className="text-xs text-text-muted">Method</dt><dd className="mt-1 text-sm">{payment.paymentMethod?.toUpperCase() ?? 'Correction record'}</dd></div>
            {payment.referenceNumber && <div><dt className="text-xs text-text-muted">UPI reference</dt><dd className="mt-1 break-all text-sm">{payment.referenceNumber}</dd></div>}
            <div><dt className="text-xs text-text-muted">Recorded by</dt><dd className="mt-1 text-sm">{payment.recordedBy?.name ?? 'Administrator'}</dd></div>
            {payment.notes && <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{payment.notes}</dd></div>}
            {original && <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Reverses transaction</dt><dd className="mt-1 text-sm"><Link className="underline" to={`/payments/${original._id}`}>{original.transactionCode}</Link></dd></div>}
          </dl>
        </Card>
        <Card className="p-5 sm:p-7">
          <h3 className="text-base font-semibold">Membership and member</h3>
          <dl className="mt-5 space-y-4">
            <div><dt className="text-xs text-text-muted">Member</dt><dd className="mt-1 text-sm"><Link className="font-medium text-text-primary underline" to={`/members/${member?._id}`}>{member?.firstName} {member?.lastName} · {member?.memberCode}</Link></dd></div>
            <div><dt className="text-xs text-text-muted">Membership</dt><dd className="mt-1 text-sm"><Link className="font-medium text-text-primary underline" to={`/memberships/${membership?._id}`}>{membership?.membershipCode}</Link></dd></div>
            <div><dt className="text-xs text-text-muted">Membership fee</dt><dd className="mt-1 text-sm">{formatRupeesFromPaise(membership?.totalFeePaise ?? 0)}</dd></div>
            <div><dt className="text-xs text-text-muted">Outstanding balance now</dt><dd className="mt-1 text-sm font-medium">{formatRupeesFromPaise(membership?.outstandingBalancePaise ?? 0)}</dd></div>
            {payment.type === 'payment' && <div className="rounded-xl border border-border bg-surface-elevated p-4"><dt className="text-xs text-text-muted">Reversed so far</dt><dd className="mt-1 text-sm font-medium">{formatRupeesFromPaise(reversedAmountPaise)} <span className="font-normal text-text-muted">of {formatRupeesFromPaise(payment.amountPaise)}</span></dd><p className="mt-1 text-xs text-text-muted">Still eligible for reversal: {formatRupeesFromPaise(remainingPaise)}</p></div>}
          </dl>
        </Card>
      </div>

      {showReversal && payment.type === 'payment' && payment.status !== 'reversed' && (
        <Card className="p-5 sm:p-7">
          <h3 className="text-base font-semibold">Record a partial or full reversal</h3>
          <p className="mt-1 text-sm text-text-secondary">
            This is a ledger correction that reduces membership paid amount and restores outstanding balance. It does not initiate a cash or UPI payout.
          </p>
          <form className="mt-5 grid gap-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setAmountError(''); setConfirmation(true) }}>
            <TextField error={amountError} id="reversal-amount" inputMode="decimal" label={`Amount to reverse (INR) · maximum ${formatRupeesFromPaise(remainingPaise)}`} onChange={(event) => { setAmount(event.target.value); setAmountError(''); setIdempotencyKey(makeIdempotencyKey()) }} required value={amount} />
            <TextField id="reversal-date" label="Correction date (UTC)" onChange={(event) => { setPaymentDate(event.target.value); setIdempotencyKey(makeIdempotencyKey()) }} required type="date" value={paymentDate} />
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="reversal-notes">Correction notes (optional)</label>
              <textarea className="min-h-20 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" id="reversal-notes" maxLength={2000} onChange={(event) => { setNotes(event.target.value); setIdempotencyKey(makeIdempotencyKey()) }} value={notes} />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit">Review reversal</Button><Button onClick={() => setShowReversal(false)} type="button" variant="secondary">Cancel</Button></div>
          </form>
        </Card>
      )}

      {payment.type === 'payment' && (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4"><h3 className="text-base font-semibold">Reversal history</h3><p className="mt-1 text-xs text-text-muted">Each correction is a separate linked record.</p></div>
          {reversals.length === 0 ? <p className="p-5 text-sm text-text-secondary">No reversals recorded.</p> : (
            <ul className="divide-y divide-border">{reversals.map((reversal) => <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={reversal._id}><div><Link className="text-sm font-medium underline" to={`/payments/${reversal._id}`}>{reversal.transactionCode}</Link><p className="mt-1 text-xs text-text-muted">{formatMembershipDate(reversal.paymentDate)} · {reversal.recordedBy?.name ?? 'Administrator'}</p></div><span className="text-sm font-medium">{formatRupeesFromPaise(reversal.amountPaise)}</span></li>)}</ul>
          )}
        </Card>
      )}

      {confirmation && (
        <ConfirmDialog
          busy={busy}
          confirmLabel="Record reversal"
          description="This creates a permanent linked correction record and updates the membership balance. It does not transfer money or delete the original transaction."
          onCancel={() => setConfirmation(false)}
          onConfirm={submitReversal}
          title="Confirm this financial reversal?"
        />
      )}
    </div>
  )
}
