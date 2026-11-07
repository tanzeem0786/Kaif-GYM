import { ArrowDown, ArrowUp, FileClock, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../common/Badge.jsx'
import { Button } from '../common/Button.jsx'
import { Card } from '../common/Card.jsx'
import { LoadingScreen } from '../common/LoadingScreen.jsx'
import { listTrainerCommissionAgreements } from '../../services/commissionAgreementApi.js'
import { getApiErrorMessage } from '../../utils/apiError.js'
import {
  formatAgreementDate,
  getCommissionBasisLabel,
} from '../../utils/commissionAgreementFormat.js'

export function TrainerCommissionAgreementsPanel({ trainerId }) {
  const [requestState, setRequestState] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    listTrainerCommissionAgreements(trainerId, { page, limit: 10 }, {
      signal: controller.signal,
    })
      .then((data) => {
        setRequestState({ trainerId, page, data })
      })
      .catch((requestError) => {
        if (requestError.code !== 'ERR_CANCELED') {
          setRequestState({
            trainerId,
            page,
            error: getApiErrorMessage(requestError, 'Could not load agreement history.'),
          })
        }
      })
    return () => controller.abort()
  }, [page, trainerId])

  const isCurrentRequest = requestState?.trainerId === trainerId && requestState?.page === page
  const result = isCurrentRequest ? requestState.data : null
  const error = isCurrentRequest ? requestState.error : ''
  const loading = !isCurrentRequest

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-elevated text-text-secondary">
            <FileClock aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">Commission agreement history</h3>
            <p className="mt-1 text-xs text-text-muted">Immutable, trainer-specific versions</p>
          </div>
        </div>
        <Button as={Link} to={`/trainers/${trainerId}/commission-agreements/new`} variant="secondary">
          <Plus aria-hidden="true" className="size-4" />
          Add version
        </Button>
      </div>

      {error && <p className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger" role="alert">{error}</p>}
      {loading ? (
        <LoadingScreen label="Loading commission agreement history" />
      ) : result?.agreements?.length ? (
        <div className="mt-5 space-y-3">
          {result.agreements.map((agreement) => (
            <Link
              className="block rounded-xl border border-border bg-bg p-4 transition-colors hover:bg-hover"
              key={agreement._id}
              to={`/commission-agreements/${agreement._id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Version {agreement.agreementVersion}</h4>
                  <Badge variant="info">{getCommissionBasisLabel(agreement.commissionBasis)}</Badge>
                </div>
                <span className="text-xs text-text-muted">View details</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {formatAgreementDate(agreement.effectiveFrom)} – {formatAgreementDate(agreement.effectiveTo)}
              </p>
            </Link>
          ))}
          {result.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-text-muted">
                Page {result.pagination.page} of {result.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous agreement history page"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  variant="secondary"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                  Previous
                </Button>
                <Button
                  aria-label="Next agreement history page"
                  disabled={page >= result.pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  variant="secondary"
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        !error && (
          <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-text-secondary">No commission agreement versions recorded.</p>
            <p className="mt-1 text-xs text-text-muted">Create a version to record its basis and effective dates.</p>
          </div>
        )
      )}
    </Card>
  )
}
