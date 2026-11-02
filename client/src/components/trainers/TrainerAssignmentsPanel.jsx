import { ExternalLink, Plus, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'
import { Card } from '../common/Card.jsx'
import { ConfirmDialog } from '../members/ConfirmDialog.jsx'
import {
  createAssignment,
  endAssignment,
  listMemberAssignments,
  listTrainers,
  listTrainerAssignments,
} from '../../services/trainerApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

function displayDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function trainerName(trainer) {
  return trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Trainer unavailable'
}

export function TrainerAssignmentsPanel({ memberId, trainerId }) {
  const [result, setResult] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadedScope, setLoadedScope] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [endDate, setEndDate] = useState(todayUtc())
  const [form, setForm] = useState({
    trainerId: '',
    startDate: todayUtc(),
    proofUrl: '',
    fileName: '',
    notes: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    const assignmentRequest = memberId
      ? listMemberAssignments(memberId, { limit: 100 }, { signal: controller.signal })
      : listTrainerAssignments(trainerId, { limit: 100 }, { signal: controller.signal })
    const requests = [assignmentRequest]
    if (memberId) {
      requests.push(
        listTrainers(
          { status: 'active', page: 1, limit: 100, sortBy: 'firstName', sortOrder: 'asc' },
          { signal: controller.signal },
        ),
      )
    }
    Promise.all(requests)
      .then(([assignments, trainerResult]) => {
        setResult(assignments)
        if (trainerResult) setTrainers(trainerResult.trainers)
        setLoadedScope(memberId ?? trainerId)
        setError('')
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(getApiErrorMessage(requestError, 'Could not load trainer assignments.'))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [memberId, refresh, trainerId])

  async function submitAssignment() {
    if (!memberId || !form.trainerId) return
    setBusy(true)
    setError('')
    try {
      await createAssignment({
        memberId,
        trainerId: form.trainerId,
        startDate: form.startDate || undefined,
        proof: { url: form.proofUrl.trim(), fileName: form.fileName.trim() },
        notes: form.notes.trim() || null,
      })
      setShowForm(false)
      setConfirmation(null)
      setLoading(true)
      setForm({
        trainerId: '',
        startDate: todayUtc(),
        proofUrl: '',
        fileName: '',
        notes: '',
      })
      setRefresh((current) => current + 1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not assign trainer.'))
    } finally {
      setBusy(false)
    }
  }

  async function confirmEndAssignment() {
    if (!confirmation?.assignmentId) return
    setBusy(true)
    setError('')
    try {
      await endAssignment(confirmation.assignmentId, endDate)
      setConfirmation(null)
      setLoading(true)
      setRefresh((current) => current + 1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not end trainer assignment.'))
    } finally {
      setBusy(false)
    }
  }

  const assignments = result?.assignments ?? []
  const isLoading = loading || loadedScope !== (memberId ?? trainerId)

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold">Trainer assignments</h3>
          <p className="mt-1 text-xs text-text-muted">
            {result?.pagination ? `${result.pagination.total} assignment records` : 'Assignment history'}
          </p>
        </div>
        {memberId && (
          <Button className="min-h-10" onClick={() => setShowForm((value) => !value)} variant="secondary">
            <Plus aria-hidden="true" className="size-4" />
            Assign trainer
          </Button>
        )}
      </div>

      {error && (
        <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 p-4" role="alert">
          <p className="text-sm text-danger">{error}</p>
          <Button className="mt-3" onClick={() => { setLoading(true); setRefresh((value) => value + 1) }} variant="secondary">Retry</Button>
        </div>
      )}

      {showForm && memberId && (
        <form
          className="grid gap-4 border-b border-border bg-surface-elevated/50 p-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            setConfirmation({ kind: 'assign' })
          }}
        >
          <label className="space-y-2 text-sm font-medium text-text-primary">
            Trainer
            <select
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setForm((current) => ({ ...current, trainerId: event.target.value }))}
              required
              value={form.trainerId}
            >
              <option value="">Select an active trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer._id} value={trainer._id}>
                  {trainer.firstName} {trainer.lastName} · {trainer.trainerCode}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-text-primary">
            Assignment start date
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              type="date"
              value={form.startDate}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-text-primary">
            Supporting proof HTTPS link
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              onChange={(event) => setForm((current) => ({ ...current, proofUrl: event.target.value }))}
              placeholder="https://..."
              required
              type="url"
              value={form.proofUrl}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-text-primary">
            Proof display filename
            <input
              className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-focus focus:ring-2 focus:ring-focus/30"
              maxLength={255}
              onChange={(event) => setForm((current) => ({ ...current, fileName: event.target.value }))}
              required
              value={form.fileName}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-text-primary sm:col-span-2">
            Notes (optional)
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
              maxLength={2000}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              value={form.notes}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button loading={busy} type="submit">Review assignment</Button>
            <Button disabled={busy} onClick={() => setShowForm(false)} type="button" variant="secondary">Cancel</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p aria-live="polite" className="p-5 text-sm text-text-secondary">Loading assignments…</p>
      ) : assignments.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center gap-2 px-5 text-sm text-text-secondary">
          <UserRound aria-hidden="true" className="size-4" />
          No trainer assignments have been recorded.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {assignments.map((assignment) => {
            const relatedTrainer = typeof assignment.trainer === 'object' ? assignment.trainer : null
            const relatedMember = typeof assignment.member === 'object' ? assignment.member : null
            const relatedPerson = memberId ? relatedTrainer : relatedMember
            const personLabel = memberId ? trainerName(relatedPerson) : relatedPerson
              ? `${relatedPerson.firstName} ${relatedPerson.lastName}`
              : 'Member unavailable'
            return (
              <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={assignment._id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{personLabel}</p>
                    <Badge variant={assignment.status === 'active' ? 'success' : 'neutral'}>
                      {assignment.status === 'active' ? 'Active' : 'Ended'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {displayDate(assignment.startDate)} – {assignment.endDate ? displayDate(assignment.endDate) : 'Ongoing'}
                  </p>
                  <a
                    className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-info hover:underline"
                    href={assignment.proof.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {assignment.proof.fileName}
                    <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                  </a>
                </div>
                {assignment.status === 'active' && (
                  <Button
                    className="min-h-9 self-start px-3 sm:self-center"
                    onClick={() => {
                      setEndDate(todayUtc() < assignment.startDate.slice(0, 10) ? assignment.startDate.slice(0, 10) : todayUtc())
                      setConfirmation({
                        kind: 'end',
                        assignmentId: assignment._id,
                        startDate: assignment.startDate.slice(0, 10),
                      })
                    }}
                    variant="secondary"
                  >
                    End assignment
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {confirmation?.kind === 'assign' && (
        <ConfirmDialog
          busy={busy}
          confirmLabel="Assign trainer"
          description="This creates a separate assignment record. Existing and historical trainer assignments will remain unchanged."
          onCancel={() => setConfirmation(null)}
          onConfirm={submitAssignment}
          title="Confirm trainer assignment?"
        />
      )}
      {confirmation?.kind === 'end' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <section aria-labelledby="end-assignment-title" aria-modal="true" className="w-full max-w-md rounded-2xl border border-border bg-surface p-6" role="dialog">
            <h2 className="text-lg font-semibold" id="end-assignment-title">End trainer assignment?</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              The selected date is the last active day. The assignment and its proof remain in history.
            </p>
            <label className="mt-5 block space-y-2 text-sm font-medium text-text-primary">
              Last active day
              <input
                className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-focus focus:ring-2 focus:ring-focus/30"
                min={confirmation.startDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
                type="date"
                value={endDate}
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button disabled={busy} onClick={() => setConfirmation(null)} variant="secondary">Cancel</Button>
              <Button loading={busy} onClick={confirmEndAssignment}>End assignment</Button>
            </div>
          </section>
        </div>
      )}
    </Card>
  )
}
