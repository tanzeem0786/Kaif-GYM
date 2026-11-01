import { ArrowLeft, Archive, CalendarDays, Edit3, Mail, Phone, RotateCcw, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { ConfirmDialog } from '../../components/members/ConfirmDialog.jsx'
import { MemberStatusBadge } from '../../components/members/MemberStatusBadge.jsx'
import { getMember, updateMemberStatus } from '../../services/memberApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function formatDate(value) {
  if (!value) {
    return 'Not provided'
  }
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

const statusActions = {
  active: [
    {
      status: 'inactive',
      title: 'Deactivate this member?',
      label: 'Deactivate member',
      description:
        'The member profile and its historical references will be preserved. You can reactivate this profile later.',
    },
    {
      status: 'archived',
      title: 'Archive this member?',
      label: 'Archive member',
      description:
        'The member will be marked archived. The profile and historical references will be preserved.',
    },
  ],
  inactive: [
    {
      status: 'active',
      title: 'Reactivate this member?',
      label: 'Reactivate member',
      description: 'This will return the member profile to active status.',
    },
    {
      status: 'archived',
      title: 'Archive this member?',
      label: 'Archive member',
      description:
        'The member will be marked archived. The profile and historical references will be preserved.',
    },
  ],
  archived: [
    {
      status: 'active',
      title: 'Reactivate this member?',
      label: 'Reactivate member',
      description: 'This will return the archived profile to active status.',
    },
  ],
}

export function MemberDetailsPage() {
  const { memberId } = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getMember(memberId, { signal: controller.signal })
      .then((result) => {
        setMember(result)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load this member.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [memberId])

  async function confirmStatusChange() {
    if (!confirmation) {
      return
    }

    setBusy(true)
    setError('')
    try {
      const updatedMember = await updateMemberStatus(memberId, confirmation.status)
      setMember(updatedMember)
      setConfirmation(null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not update member status.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading member details" />
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">
          {error || 'Member not found'}
        </p>
        <Button as={Link} className="mt-4" to="/members" variant="secondary">
          Back to members
        </Button>
      </div>
    )
  }

  const actions = statusActions[member.status] ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          to="/members"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Members
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-semibold tracking-tight">
                {member.firstName} {member.lastName}
              </h2>
              <MemberStatusBadge status={member.status} />
            </div>
            <p className="mt-2 text-sm text-text-secondary">{member.memberCode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to={`/members/${memberId}/edit`} variant="secondary">
              <Edit3 aria-hidden="true" className="size-4" />
              Edit details
            </Button>
            {actions.map((action) => (
              <Button
                key={action.status}
                onClick={() => setConfirmation(action)}
                variant={action.status === 'active' ? 'primary' : 'secondary'}
              >
                {action.status === 'active' ? (
                  <RotateCcw aria-hidden="true" className="size-4" />
                ) : (
                  <Archive aria-hidden="true" className="size-4" />
                )}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3" role="alert">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <UserRound aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Profile information</h3>
              <p className="mt-1 text-xs text-text-muted">Member details and contact information</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-text-muted">Phone</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-text-primary">
                <Phone aria-hidden="true" className="size-4 text-text-muted" />
                {member.phone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Email</dt>
              <dd className="mt-1 flex items-center gap-2 break-all text-sm text-text-primary">
                <Mail aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
                {member.email || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Gender</dt>
              <dd className="mt-1 text-sm text-text-primary">{member.gender || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Date of birth</dt>
              <dd className="mt-1 text-sm text-text-primary">{formatDate(member.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Address</dt>
              <dd className="mt-1 text-sm text-text-primary">
                {member.address?.text || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Registration date</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-text-primary">
                <CalendarDays aria-hidden="true" className="size-4 text-text-muted" />
                {formatDate(member.registrationDate)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-text-muted">Emergency contact</dt>
              <dd className="mt-1 text-sm text-text-primary">
                {member.emergencyContact
                  ? `${member.emergencyContact.name} · ${member.emergencyContact.phone}`
                  : 'Not provided'}
              </dd>
            </div>
            {member.profileImage && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-text-muted">Profile image</dt>
                <dd className="mt-1 break-all text-sm text-text-primary">{member.profileImage}</dd>
              </div>
            )}
            {member.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-text-muted">Admin notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                  {member.notes}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Member status</h3>
                <p className="mt-1 text-xs text-text-muted">Current profile state</p>
              </div>
              <MemberStatusBadge status={member.status} />
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs leading-5 text-text-secondary">
                {member.status === 'active'
                  ? 'This member profile is active.'
                  : 'This profile is retained for historical reference.'}
              </p>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">Later milestone</Badge>
            </div>
            <h3 className="mt-4 text-base font-semibold">Membership and payment history</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Memberships and payment records are not part of M4. This area will show historical
              records when those modules are implemented.
            </p>
          </Card>
        </div>
      </div>

      {confirmation && (
        <ConfirmDialog
          busy={busy}
          confirmLabel={confirmation.label}
          description={confirmation.description}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmStatusChange}
          title={confirmation.title}
        />
      )}
    </div>
  )
}
