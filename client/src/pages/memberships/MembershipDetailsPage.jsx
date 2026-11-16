import { ArrowLeft, CalendarDays, Clock3, CreditCard, Dumbbell, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { MembershipStatusBadge } from '../../components/memberships/MembershipStatusBadge.jsx'
import { getMembership } from '../../services/membershipApi.js'
import { formatMembershipDate, formatRupeesFromPaise } from '../../utils/membershipFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

export function MembershipDetailsPage() {
  const { membershipId } = useParams()
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getMembership(membershipId, { signal: controller.signal })
      .then((result) => {
        setMembership(result)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load this membership.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [membershipId])

  if (loading) return <LoadingScreen label="Loading membership details" />

  if (!membership) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error || 'Membership not found'}</p>
        <Button as={Link} className="mt-4" to="/memberships" variant="secondary">Back to memberships</Button>
      </div>
    )
  }

  const member = membership.member ?? membership.memberSnapshot
  const memberProfile = membership.member
  const plan = membership.planSnapshot
  const renewalAllowed =
    Boolean(memberProfile) &&
    membership.status !== 'frozen' &&
    membership.status !== 'inactive'

  return (
    <div className="space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/memberships">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Memberships
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-semibold tracking-tight">{membership.membershipCode}</h2>
              <MembershipStatusBadge status={membership.status} />
            </div>
            <p className="mt-2 text-sm text-text-secondary">{plan.name} · {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {renewalAllowed && (
              <Button as={Link} to={`/memberships/${membershipId}/renew`} variant="primary">
                Renew membership
              </Button>
            )}
            <Button as={Link} to={`/memberships?memberId=${member?.memberId ?? member?._id}`} variant="secondary">
              View member history
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <UserRound aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Member</h3>
              <p className="mt-1 text-xs text-text-muted">Membership is linked to an existing profile</p>
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-xs text-text-muted">Name</dt>
              <dd className="mt-1 text-sm font-medium text-text-primary">
                {memberProfile ? (
                  <Link className="hover:underline" to={`/members/${memberProfile._id}`}>
                    {member.fullName}
                  </Link>
                ) : (
                  <span>{member?.fullName}</span>
                )}
              </dd>
            </div>
            <div><dt className="text-xs text-text-muted">Member code</dt><dd className="mt-1 text-sm">{member?.memberCode}</dd></div>
            <div><dt className="text-xs text-text-muted">Contact</dt><dd className="mt-1 text-sm">{member?.phone || (memberProfile ? 'Not provided' : 'Profile deleted')}</dd></div>
          </dl>
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <Dumbbell aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Plan snapshot</h3>
              <p className="mt-1 text-xs text-text-muted">Saved when this membership was assigned</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-text-muted">Plan</dt><dd className="mt-1 text-sm font-medium">{plan.name}</dd></div>
            <div><dt className="text-xs text-text-muted">Duration</dt><dd className="mt-1 text-sm">{plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'}</dd></div>
            <div><dt className="text-xs text-text-muted">Plan price at assignment</dt><dd className="mt-1 text-sm">{formatRupeesFromPaise(plan.pricePaise)}</dd></div>
            <div><dt className="text-xs text-text-muted">Membership fee</dt><dd className="mt-1 text-sm font-medium">{formatRupeesFromPaise(membership.totalFeePaise)}</dd></div>
          </dl>
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <CalendarDays aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Validity</h3>
              <p className="mt-1 text-xs text-text-muted">UTC calendar dates · expiry is exclusive</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-text-muted">Start date (first valid day)</dt><dd className="mt-1 text-sm">{formatMembershipDate(membership.startDate)}</dd></div>
            <div><dt className="text-xs text-text-muted">Expiry date (first invalid day)</dt><dd className="mt-1 text-sm">{formatMembershipDate(membership.expiryDate)}</dd></div>
            <div><dt className="text-xs text-text-muted">Created</dt><dd className="mt-1 text-sm">{formatMembershipDate(membership.createdAt)}</dd></div>
            {membership.renewalOf && (
              <div>
                <dt className="text-xs text-text-muted">Renewal of</dt>
                <dd className="mt-1 text-sm">
                  <Link className="text-text-primary underline" to={`/memberships/${membership.renewalOf._id}`}>
                    {membership.renewalOf.membershipCode}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <Clock3 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Payment summary</h3>
              <p className="mt-1 text-xs text-text-muted">Amounts are stored in integer paise</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs text-text-muted">Total fee</dt><dd className="mt-1 text-sm">{formatRupeesFromPaise(membership.totalFeePaise)}</dd></div>
            <div><dt className="text-xs text-text-muted">Amount paid</dt><dd className="mt-1 text-sm">{formatRupeesFromPaise(membership.amountPaidPaise)}</dd></div>
            <div><dt className="text-xs text-text-muted">Outstanding</dt><dd className="mt-1 text-sm">{formatRupeesFromPaise(membership.outstandingBalancePaise)}</dd></div>
          </dl>
          <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-text-muted">
            Payments and ledger corrections are tracked as separate financial records.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button as={Link} to={`/payments/new?membershipId=${membership._id}`} variant="primary">
              <CreditCard aria-hidden="true" className="size-4" />Record payment
            </Button>
            <Button as={Link} to={`/payments?membershipId=${membership._id}`} variant="secondary">
              Payment history
            </Button>
          </div>
        </Card>
      </div>
      {membership.status === 'frozen' && (
        <p className="rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
          This record is frozen. Freeze and unfreeze workflows are deferred pending approved business rules.
        </p>
      )}
    </div>
  )
}
