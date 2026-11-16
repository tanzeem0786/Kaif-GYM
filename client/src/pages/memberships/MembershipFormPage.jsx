import { ArrowLeft, Search, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { getMember, listMembers } from '../../services/memberApi.js'
import {
  createMembership,
  getMembership,
  listMemberships,
  listMembershipPlans,
  renewMembership,
} from '../../services/membershipApi.js'
import { formatMembershipDate, formatRupeesFromPaise, getUtcDateInputValue } from '../../utils/membershipFormat.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function getValidationErrors(error) {
  return Object.fromEntries(
    (error.response?.data?.errors ?? []).map(({ field, message }) => [field, message]),
  )
}

export function MembershipFormPage() {
  const { membershipId } = useParams()
  const [searchParams] = useSearchParams()
  const memberQueryId = searchParams.get('memberId')
  const navigate = useNavigate()
  const memberHistoryRequestId = useRef(0)
  const [previousMembership, setPreviousMembership] = useState(null)
  const [plans, setPlans] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [latestMembership, setLatestMembership] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberResults, setMemberResults] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false)
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState(getUtcDateInputValue())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    const requests = [
      listMembershipPlans(
        { page: 1, limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
        { signal: controller.signal },
      ),
    ]
    if (membershipId) {
      requests.push(getMembership(membershipId, { signal: controller.signal }))
    } else if (memberQueryId) {
      requests.push(getMember(memberQueryId, { signal: controller.signal }))
      requests.push(
        listMemberships(
          {
            page: 1,
            limit: 1,
            memberId: memberQueryId,
            sortBy: 'startDate',
            sortOrder: 'desc',
          },
          { signal: controller.signal },
        ),
      )
    }

    Promise.all(requests)
      .then(([planResult, existingRecord, historyResult]) => {
        setPlans(planResult.plans)
        if (membershipId && existingRecord) {
          setPreviousMembership(existingRecord)
          setSelectedMember(existingRecord.member)
          setMemberSearch(
            existingRecord.member?.fullName ?? '',
          )
        } else if (existingRecord) {
          setSelectedMember(existingRecord)
          setMemberSearch(existingRecord.fullName)
          setLatestMembership(historyResult.memberships[0] ?? null)
        }
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load membership information.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [memberQueryId, membershipId])

  useEffect(() => {
    if (membershipId || selectedMember || !memberSearch.trim()) {
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setMembersLoading(true)
      listMembers(
        { page: 1, limit: 20, search: memberSearch.trim(), sortBy: 'fullName', sortOrder: 'asc' },
        { signal: controller.signal },
      )
        .then((result) => setMemberResults(result.members))
        .catch((requestError) => {
          if (requestError.code !== 'ERR_CANCELED') {
            setError(getApiErrorMessage(requestError, 'Could not search for members.'))
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setMembersLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [memberSearch, membershipId, selectedMember])

  const today = getUtcDateInputValue()
  const renewFromExpiry =
    Boolean(previousMembership) &&
    previousMembership.expiryDate.slice(0, 10) > today

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setValidationErrors({})
    try {
      const membership = membershipId
        ? await renewMembership(membershipId, {
            planId,
            ...(!renewFromExpiry ? { startDate } : {}),
          })
        : await createMembership({
            memberId: selectedMember._id,
            planId,
            startDate,
          })
      navigate(`/memberships/${membership._id}`, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save this membership.'))
      setValidationErrors(getValidationErrors(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function selectMember(member) {
    const requestId = memberHistoryRequestId.current + 1
    memberHistoryRequestId.current = requestId
    setSelectedMember(member)
    setMemberResults([])
    setMemberHistoryLoading(true)
    setError('')
    try {
      const history = await listMemberships({
        page: 1,
        limit: 1,
        memberId: member._id,
        sortBy: 'startDate',
        sortOrder: 'desc',
      })
      if (memberHistoryRequestId.current === requestId) {
        setLatestMembership(history.memberships[0] ?? null)
      }
    } catch (requestError) {
      if (memberHistoryRequestId.current === requestId) {
        setError(getApiErrorMessage(requestError, 'Could not load this member’s membership history.'))
      }
    } finally {
      if (memberHistoryRequestId.current === requestId) {
        setMemberHistoryLoading(false)
      }
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading membership options" />
  }

  if (membershipId && error && !previousMembership) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error}</p>
        <Button as={Link} className="mt-4" to="/memberships" variant="secondary">Back to memberships</Button>
      </div>
    )
  }

  if (previousMembership?.status === 'frozen') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-warning/30 bg-warning/10 p-6">
        <p className="text-sm text-warning">A frozen membership cannot be renewed. Freeze and renewal policies are not available in this milestone.</p>
        <Button as={Link} className="mt-4" to={`/memberships/${membershipId}`} variant="secondary">Back to membership</Button>
      </div>
    )
  }

  if (membershipId && previousMembership && !previousMembership.member) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-warning/30 bg-warning/10 p-6">
        <p className="text-sm text-warning">
          {previousMembership.memberSnapshot?.fullName ?? 'This member'} has a deleted profile, so this membership cannot be renewed.
        </p>
        <Button as={Link} className="mt-4" to={`/memberships/${membershipId}`} variant="secondary">
          Back to membership
        </Button>
      </div>
    )
  }

  if (!membershipId && selectedMember && latestMembership) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/memberships">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Memberships
          </Link>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Membership history exists</h2>
        </div>
        <Card className="space-y-4 p-5 sm:p-7">
          <p className="text-sm text-text-secondary">
            {selectedMember.fullName} already has a membership record. Continue through renewal so the validity dates remain sequential and the earlier record is preserved.
          </p>
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="font-medium">{latestMembership.membershipCode}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {latestMembership.planSnapshot?.name} · expires at {formatMembershipDate(latestMembership.expiryDate)}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => { memberHistoryRequestId.current += 1; setSelectedMember(null); setLatestMembership(null); setMemberHistoryLoading(false); setMemberSearch('') }} type="button" variant="secondary">
              Choose another member
            </Button>
            <Button as={Link} to={`/memberships/${latestMembership._id}/renew`}>
              Continue to renewal
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          to={membershipId ? `/memberships/${membershipId}` : '/memberships'}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {membershipId ? 'Membership details' : 'Memberships'}
        </Link>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          {membershipId ? 'Renew membership' : 'Assign membership'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Membership dates use UTC calendar days. The expiry date is the first day the membership is no longer valid.
        </p>
      </div>

      {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      {validationErrors.form && <p className="text-sm text-danger" role="alert">{validationErrors.form}</p>}
      {plans.length === 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          There are no active plans available. <Link className="underline" to="/membership-plans">Create or reactivate a plan</Link> first.
        </div>
      )}

      <Card className="p-5 sm:p-7">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {membershipId ? (
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-xs text-text-muted">Renewing for</p>
              <p className="mt-1 font-medium">
                {selectedMember?.fullName}
              </p>
              <p className="mt-1 text-xs text-text-secondary">{previousMembership?.membershipCode}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary" htmlFor="member-search">Select existing member</label>
              {selectedMember ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-elevated p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary">
                      <UserRound aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{selectedMember.fullName}</p>
                      <p className="mt-1 text-xs text-text-muted">{selectedMember.memberCode} · {selectedMember.phone}</p>
                    </div>
                  </div>
                  <Button aria-label="Change selected member" className="size-9 min-h-9 p-0" onClick={() => { memberHistoryRequestId.current += 1; setSelectedMember(null); setLatestMembership(null); setMemberHistoryLoading(false); setMemberSearch(''); setMemberResults([]); setMembersLoading(false) }} type="button" variant="ghost">
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                    <input
                      autoComplete="off"
                      className="min-h-12 w-full rounded-xl border border-border bg-bg pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
                      id="member-search"
                      onChange={(event) => {
                        setMemberSearch(event.target.value)
                        setMemberResults([])
                        setMembersLoading(false)
                      }}
                      placeholder="Search by name, code, phone or email"
                      value={memberSearch}
                    />
                  </div>
                  {membersLoading && <p className="text-xs text-text-muted">Searching members…</p>}
                  {!membersLoading && memberResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface">
                      {memberResults.map((member) => (
                        <button
                          className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-4 py-2 text-left last:border-0 hover:bg-hover"
                          key={member._id}
                          onClick={() => {
                            selectMember(member)
                          }}
                          type="button"
                        >
                          <span className="text-sm font-medium">{member.fullName}</span>
                          <span className="text-xs text-text-muted">{member.memberCode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!membersLoading && memberSearch.trim() && memberResults.length === 0 && (
                    <p className="text-xs text-text-muted">No matching members found.</p>
                  )}
                  {validationErrors.memberId && <p className="text-sm text-danger">{validationErrors.memberId}</p>}
                </>
              )}
            </div>
          )}
          {memberHistoryLoading && (
            <p className="text-xs text-text-muted">Checking membership history…</p>
          )}

          <label className="block space-y-2 text-sm font-medium text-text-primary" htmlFor="membership-plan">
            <span>Membership plan</span>
            <select
              className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              id="membership-plan"
              onChange={(event) => setPlanId(event.target.value)}
              required
              value={planId}
            >
              <option value="">Choose a plan</option>
              {plans.map((plan) => (
                <option key={plan._id} value={plan._id}>
                  {plan.name} · {plan.durationMonths} {plan.durationMonths === 1 ? 'month' : 'months'} · {formatRupeesFromPaise(plan.pricePaise)}
                </option>
              ))}
            </select>
            {validationErrors.planId && <span className="block text-danger">{validationErrors.planId}</span>}
          </label>

          {renewFromExpiry ? (
            <div className="rounded-xl border border-info/30 bg-info/10 p-4">
              <p className="text-sm font-medium text-info">Sequential early renewal</p>
              <p className="mt-1 text-sm text-text-secondary">
                This membership starts at the current expiry boundary on {formatMembershipDate(previousMembership.expiryDate)}. The date is set by the server to prevent overlapping validity.
              </p>
            </div>
          ) : (
            <label className="block space-y-2 text-sm font-medium text-text-primary" htmlFor="membership-start-date">
              <span>Start date</span>
              <input
                className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
                id="membership-start-date"
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="date"
                value={startDate}
              />
              {validationErrors.startDate && <span className="block text-danger">{validationErrors.startDate}</span>}
              <span className="block text-xs font-normal text-text-muted">
                The date can be set by the admin. Expiry is calculated from this date using the selected plan duration.
              </span>
            </label>
          )}

          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button as={Link} disabled={submitting} to={membershipId ? `/memberships/${membershipId}` : '/memberships'} variant="secondary">Cancel</Button>
            <Button disabled={!plans.length || memberHistoryLoading || (!membershipId && !selectedMember)} loading={submitting} type="submit">
              {membershipId ? 'Renew membership' : 'Assign membership'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
