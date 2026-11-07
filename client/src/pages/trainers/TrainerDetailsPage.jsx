import { ArrowLeft, Edit3, RotateCcw, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/common/Badge.jsx'
import { Button } from '../../components/common/Button.jsx'
import { Card } from '../../components/common/Card.jsx'
import { LoadingScreen } from '../../components/common/LoadingScreen.jsx'
import { ConfirmDialog } from '../../components/members/ConfirmDialog.jsx'
import { TrainerAssignmentsPanel } from '../../components/trainers/TrainerAssignmentsPanel.jsx'
import { TrainerCommissionAgreementsPanel } from '../../components/trainers/TrainerCommissionAgreementsPanel.jsx'
import { TrainerStatusBadge } from '../../components/trainers/TrainerStatusBadge.jsx'
import { getTrainer, updateTrainerStatus } from '../../services/trainerApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function formatDate(value) {
  if (!value) return 'Not provided'
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
}

export function TrainerDetailsPage() {
  const { trainerId } = useParams()
  const [trainer, setTrainer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getTrainer(trainerId, { signal: controller.signal })
      .then((data) => { setTrainer(data); setError('') })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError, 'Could not load trainer.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [trainerId])

  async function setStatus() {
    setBusy(true)
    setError('')
    try {
      const updated = await updateTrainerStatus(trainerId, trainer.status === 'active' ? 'inactive' : 'active')
      setTrainer(updated)
      setConfirmation(false)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not update trainer status.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingScreen label="Loading trainer details" />
  if (!trainer) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-sm text-danger" role="alert">{error || 'Trainer not found'}</p>
        <Button as={Link} className="mt-4" to="/trainers" variant="secondary">Back to trainers</Button>
      </div>
    )
  }

  const statusAction = trainer.status === 'active' ? 'inactive' : 'active'

  return (
    <div className="space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary" to="/trainers">
          <ArrowLeft aria-hidden="true" className="size-4" />Trainers
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-semibold tracking-tight">{trainer.firstName} {trainer.lastName}</h2>
              <TrainerStatusBadge status={trainer.status} />
            </div>
            <p className="mt-2 text-sm text-text-secondary">{trainer.trainerCode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to={`/trainers/${trainerId}/edit`} variant="secondary"><Edit3 aria-hidden="true" className="size-4" />Edit details</Button>
            <Button onClick={() => setConfirmation(true)} variant={statusAction === 'active' ? 'primary' : 'secondary'}>
              <RotateCcw aria-hidden="true" className="size-4" />{statusAction === 'active' ? 'Reactivate trainer' : 'Deactivate trainer'}
            </Button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3" role="alert"><p className="text-sm text-danger">{error}</p></div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
              <UserRound aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">Profile information</h3>
              <p className="mt-1 text-xs text-text-muted">Trainer contact and work profile</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs text-text-muted">Phone</dt><dd className="mt-1 text-sm text-text-primary">{trainer.phone}</dd></div>
            <div><dt className="text-xs text-text-muted">Email</dt><dd className="mt-1 break-all text-sm text-text-primary">{trainer.email || 'Not provided'}</dd></div>
            <div><dt className="text-xs text-text-muted">Joining date</dt><dd className="mt-1 text-sm text-text-primary">{formatDate(trainer.joiningDate)}</dd></div>
            <div><dt className="text-xs text-text-muted">Specializations</dt><dd className="mt-1 text-sm text-text-primary">{trainer.specialization?.length ? trainer.specialization.join(' · ') : 'Not provided'}</dd></div>
            {trainer.profileImage && <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Profile image</dt><dd className="mt-1 break-all text-sm text-info"><a href={trainer.profileImage} rel="noreferrer" target="_blank">{trainer.profileImage}</a></dd></div>}
            {trainer.notes && <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Admin notes</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{trainer.notes}</dd></div>}
          </dl>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-base font-semibold">Trainer status</h3><p className="mt-1 text-xs text-text-muted">Current profile state</p></div>
            <TrainerStatusBadge status={trainer.status} />
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs leading-5 text-text-secondary">
              {trainer.status === 'active'
                ? 'This trainer can receive new assignments.'
                : 'This trainer cannot receive new assignments. Existing assignments are preserved.'}
            </p>
          </div>
          <Badge className="mt-4" variant="neutral">Assignments are retained independently</Badge>
        </Card>
      </div>

      <TrainerAssignmentsPanel trainerId={trainerId} />
      <TrainerCommissionAgreementsPanel trainerId={trainerId} />

      {confirmation && (
        <ConfirmDialog
          busy={busy}
          confirmLabel={statusAction === 'active' ? 'Reactivate trainer' : 'Deactivate trainer'}
          description={statusAction === 'inactive'
            ? 'The trainer will not receive new assignments. Existing assignments will remain unchanged and continue to appear in history.'
            : 'The trainer will be eligible for new assignments again.'}
          onCancel={() => setConfirmation(false)}
          onConfirm={setStatus}
          title={statusAction === 'active' ? 'Reactivate this trainer?' : 'Deactivate this trainer?'}
        />
      )}
    </div>
  )
}
