import { ArrowLeft, CreditCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/TextField.jsx'
import { createPayment } from '../../services/paymentApi.js'
import { getMembership, listMemberships } from '../../services/membershipApi.js'
import { formatMembershipDate, formatRupeesFromPaise, getUtcDateInputValue, parseRupeesToPaise } from '../../utils/membershipFormat.js'
import { makeIdempotencyKey } from '../../utils/paymentFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function PaymentFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const presetMembershipId = searchParams.get('membershipId') || ''
  const [memberships, setMemberships] = useState([])
  const [selectedMembershipId, setSelectedMembershipId] = useState(presetMembershipId)
  const [memberSearchInput, setMemberSearchInput] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(getUtcDateInputValue())
  const [notes, setNotes] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [amountError, setAmountError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const membershipRequest = listMemberships(
      { page: 1, limit: 100, search: memberSearch, sortBy: 'createdAt', sortOrder: 'desc' },
      { signal: controller.signal },
    )
    const requests = [membershipRequest]
    if (presetMembershipId) {
      requests.push(getMembership(presetMembershipId, { signal: controller.signal }))
    }
    Promise.all(requests)
      .then(([result, presetMembership]) => {
        const options = result.memberships.filter(
          (membership) => membership.outstandingBalancePaise > 0,
        )
        if (
          presetMembership?.outstandingBalancePaise > 0 &&
          !options.some((membership) => membership._id === presetMembership._id)
        ) {
          options.unshift(presetMembership)
        }
        setMemberships(options)
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
  }, [memberSearch, presetMembershipId])

  const selectedMembership = memberships.find((membership) => membership._id === selectedMembershipId)

  function rotateKey() {
    setIdempotencyKey(makeIdempotencyKey())
  }

  function applyMemberSearch(event) {
    event.preventDefault()
    setLoading(true)
    setMemberSearch(memberSearchInput.trim())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const amountPaise = parseRupeesToPaise(amount)
    if (!amountPaise || amountPaise < 1) {
      setAmountError('Enter an amount greater than zero with no more than two decimal places.')
      return
    }
    if (!selectedMembership) {
      setError('Choose a membership with an outstanding balance.')
      return
    }
    if (amountPaise > selectedMembership.outstandingBalancePaise) {
      setAmountError('Payment cannot exceed the outstanding membership balance.')
      return
    }
    setSubmitting(true)
    setError('')
    setAmountError('')
    try {
      const payment = await createPayment({
        membershipId: selectedMembership._id,
        amountPaise,
        paymentMethod,
        paymentDate,
        referenceNumber: paymentMethod === 'upi' ? referenceNumber.trim() || null : null,
        notes: notes.trim() || null,
        idempotencyKey,
      })
      navigate(`/payments/${payment._id}`, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not record payment.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/payments">
          <ArrowLeft aria-hidden="true" className="size-4" />Payments
        </Link>
        <div className="mt-4 flex items-center gap-2"><CreditCard aria-hidden="true" className="size-5 text-text-secondary" /><Badge variant="neutral">M7</Badge></div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Record payment</h2>
        <p className="mt-2 text-sm text-text-secondary">Record a cash or UPI payment against an outstanding membership balance.</p>
      </div>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}

      <Card className="p-5 sm:p-7">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <TextField id="membership-search" label="Find membership" onChange={(event) => setMemberSearchInput(event.target.value)} placeholder="Membership code, member name, code or phone" value={memberSearchInput} />
            <Button className="self-end" onClick={applyMemberSearch} type="button" variant="secondary">Search</Button>
          </div>

          <label className="block space-y-2 text-sm font-medium text-text-primary" htmlFor="membershipId">
            Membership
            <select
              className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              disabled={loading}
              id="membershipId"
              onChange={(event) => { setSelectedMembershipId(event.target.value); rotateKey() }}
              required
              value={selectedMembershipId}
            >
              <option value="">{loading ? 'Loading memberships…' : 'Select a membership with balance due'}</option>
              {memberships.map((membership) => (
                <option key={membership._id} value={membership._id}>
                  {membership.membershipCode} · {membership.member?.firstName} {membership.member?.lastName} · due {formatRupeesFromPaise(membership.outstandingBalancePaise)}
                </option>
              ))}
            </select>
          </label>
          {selectedMembership && (
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-sm font-medium text-text-primary">{selectedMembership.member?.firstName} {selectedMembership.member?.lastName} · {selectedMembership.member?.memberCode}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {selectedMembership.membershipCode} · {selectedMembership.planSnapshot?.name} · due {formatRupeesFromPaise(selectedMembership.outstandingBalancePaise)}
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              error={amountError}
              id="amount"
              inputMode="decimal"
              label="Amount (INR)"
              onChange={(event) => { setAmount(event.target.value); setAmountError(''); rotateKey() }}
              placeholder="0.00"
              required
              value={amount}
            />
            <label className="block space-y-2 text-sm font-medium text-text-primary" htmlFor="paymentMethod">
              Payment method
              <select className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" id="paymentMethod" onChange={(event) => { setPaymentMethod(event.target.value); rotateKey() }} value={paymentMethod}>
                <option value="cash">Cash</option><option value="upi">UPI</option>
              </select>
            </label>
            {paymentMethod === 'upi' && <TextField id="referenceNumber" label="UPI reference (optional)" maxLength={100} onChange={(event) => { setReferenceNumber(event.target.value); rotateKey() }} value={referenceNumber} />}
            <TextField id="paymentDate" label="Payment date (UTC)" onChange={(event) => { setPaymentDate(event.target.value); rotateKey() }} required type="date" value={paymentDate} />
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-text-primary" htmlFor="notes">Notes (optional)</label>
              <textarea className="min-h-24 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30" id="notes" maxLength={2000} onChange={(event) => { setNotes(event.target.value); rotateKey() }} value={notes} />
            </div>
          </div>
          <p className="text-xs leading-5 text-text-muted">
            Amounts are submitted and stored in integer paise. Full and partial payments are supported; payments cannot exceed the current outstanding balance.
            {selectedMembership ? ` Membership started ${formatMembershipDate(selectedMembership.startDate)}.` : ''}
          </p>
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button as={Link} to="/payments" variant="secondary">Cancel</Button>
            <Button loading={submitting} type="submit">Record payment</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
